import { applyMeasuredLegs, type TechnicianHome, type TechnicianRoute } from "@/lib/routing";
import { propertyAddress } from "@/lib/utils";

const METERS_PER_MILE = 1609.344;

export type GeocodeHit = {
  lat: number;
  lng: number;
  provider: "mapbox" | "nominatim";
};

export function mapboxToken() {
  return process.env.MAPBOX_TOKEN?.trim() || "";
}

export function hasMapboxDirections() {
  return Boolean(mapboxToken());
}

function nominatimUserAgent() {
  return process.env.NOMINATIM_USER_AGENT?.trim() || "CritterOps/0.1 (The Wildlife Pros; critterops)";
}

let lastNominatimAt = 0;

async function throttleNominatim() {
  const wait = 1100 - (Date.now() - lastNominatimAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimAt = Date.now();
}

export async function geocodeAddress(query: string): Promise<GeocodeHit | null> {
  const q = query.replace(/\s+/g, " ").trim();
  if (q.length < 8) return null;
  const token = mapboxToken();
  if (token) {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "US");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!response?.ok) return null;
    const data = (await response.json()) as { features?: Array<{ center?: [number, number] }> };
    const center = data.features?.[0]?.center;
    if (!center) return null;
    return { lng: center[0], lat: center[1], provider: "mapbox" };
  }

  await throttleNominatim();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": nominatimUserAgent() },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const hit = data[0];
  if (!hit?.lat || !hit?.lon) return null;
  return { lat: Number(hit.lat), lng: Number(hit.lon), provider: "nominatim" };
}

export async function resolvePropertyCoordinates(property: {
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  lat?: number | null;
  lng?: number | null;
}) {
  if (property.lat != null && property.lng != null) {
    return { lat: property.lat, lng: property.lng, geocoded: false as const };
  }
  const hit = await geocodeAddress(propertyAddress(property));
  if (!hit) return { lat: property.lat ?? null, lng: property.lng ?? null, geocoded: false as const };
  return { lat: hit.lat, lng: hit.lng, geocoded: true as const };
}

export async function measureDrivingLegs(points: Array<{ lat: number; lng: number }>) {
  const token = mapboxToken();
  if (!token || points.length < 2) return null;
  const path = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("overview", "false");
  url.searchParams.set("geometries", "geojson");
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    code?: string;
    routes?: Array<{ legs?: Array<{ distance: number; duration: number }> }>;
  };
  const legs = data.routes?.[0]?.legs;
  if (data.code !== "Ok" || !legs?.length) return null;
  return legs.map((leg) => ({
    miles: Number((leg.distance / METERS_PER_MILE).toFixed(2)),
    minutes: Math.max(0, Math.round(leg.duration / 60)),
  }));
}

export async function snapAssignmentsToRoads(assignments: TechnicianRoute[], geoTechs: TechnicianHome[]) {
  if (!hasMapboxDirections()) {
    return { assignments, driveTimes: "haversine" as const };
  }

  let used = false;
  const next: TechnicianRoute[] = [];
  for (const assignment of assignments) {
    const home = geoTechs.find((tech) => tech.id === assignment.technicianId);
    if (!home || assignment.route.stops.length === 0) {
      next.push(assignment);
      continue;
    }
    const points = [home, ...assignment.route.stops, home];
    const legs = await measureDrivingLegs(points);
    if (!legs || legs.length < assignment.route.stops.length) {
      next.push(assignment);
      continue;
    }
    used = true;
    next.push({
      technicianId: assignment.technicianId,
      route: applyMeasuredLegs(
        assignment.route,
        legs.slice(0, assignment.route.stops.length),
        legs[assignment.route.stops.length],
      ),
    });
  }

  return { assignments: next, driveTimes: used ? ("mapbox" as const) : ("haversine" as const) };
}
