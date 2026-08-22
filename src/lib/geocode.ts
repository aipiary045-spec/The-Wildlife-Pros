import {
  applyMeasuredLegs,
  haversineEstimator,
  matrixTravelEstimator,
  planDayRoutes,
  type OptimizeMode,
  type RouteJob,
  type TechnicianHome,
  type TechnicianRoute,
  type TravelEstimator,
} from "@/lib/routing";
import { propertyAddress } from "@/lib/utils";

const METERS_PER_MILE = 1609.344;
/** Mapbox Matrix free-tier coordinate limit. */
export const MAPBOX_MATRIX_MAX_POINTS = 25;
/** OpenRouteService public API location cap for matrix / directions batches. */
export const ORS_MATRIX_MAX_POINTS = 50;

export type GeocodeProvider = "mapbox" | "openrouteservice" | "nominatim";
export type DriveTimesSource = "haversine" | "mapbox" | "openrouteservice";

export type GeocodeHit = {
  lat: number;
  lng: number;
  provider: GeocodeProvider;
};

export type DrivingMatrix = {
  points: Array<{ lat: number; lng: number }>;
  miles: number[][];
  minutes: number[][];
};

export type MeasuredRoute = {
  legs: Array<{ miles: number; minutes: number }>;
  /** [lng, lat] polyline for the full trip including return home when requested. */
  geometry: Array<[number, number]>;
};

export function mapboxToken() {
  return process.env.MAPBOX_TOKEN?.trim() || "";
}

export function openRouteServiceKey() {
  return process.env.OPENROUTESERVICE_API_KEY?.trim() || "";
}

export function hasMapboxDirections() {
  return Boolean(mapboxToken());
}

export function hasOpenRouteService() {
  return Boolean(openRouteServiceKey());
}

/** True when either Mapbox or OpenRouteService can provide road distances. */
export function hasRoadRouting() {
  return hasOpenRouteService() || hasMapboxDirections();
}

/** Prefer OpenRouteService when both keys are set (no billing card required). */
export function roadRoutingProvider(): "openrouteservice" | "mapbox" | null {
  if (hasOpenRouteService()) return "openrouteservice";
  if (hasMapboxDirections()) return "mapbox";
  return null;
}

export function isRoadDriveTimes(source: DriveTimesSource) {
  return source === "mapbox" || source === "openrouteservice";
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

function orsHeaders(key: string) {
  return {
    Authorization: key,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function matrixFromMetersAndSeconds(
  distances: Array<Array<number | null>>,
  durations: Array<Array<number | null>>,
) {
  const miles = distances.map((row) =>
    row.map((meters) => (meters == null || !Number.isFinite(meters) ? Number.NaN : meters / METERS_PER_MILE)),
  );
  const minutes = durations.map((row) =>
    row.map((seconds) => (seconds == null || !Number.isFinite(seconds) ? Number.NaN : seconds / 60)),
  );
  return { miles, minutes };
}

export async function geocodeWithOpenRouteService(query: string, key: string): Promise<GeocodeHit | null> {
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("text", query);
  url.searchParams.set("size", "1");
  url.searchParams.set("boundary.country", "USA");
  const response = await fetch(url, {
    headers: { Authorization: key, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  return { lng: coords[0], lat: coords[1], provider: "openrouteservice" };
}

export async function geocodeAddress(query: string): Promise<GeocodeHit | null> {
  const q = query.replace(/\s+/g, " ").trim();
  if (q.length < 8) return null;

  const orsKey = openRouteServiceKey();
  if (orsKey) {
    const hit = await geocodeWithOpenRouteService(q, orsKey);
    if (hit) return hit;
  }

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

async function fetchOpenRouteServiceMatrix(
  points: Array<{ lat: number; lng: number }>,
  key: string,
): Promise<DrivingMatrix | null> {
  if (points.length < 2 || points.length > ORS_MATRIX_MAX_POINTS) return null;
  const response = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
    method: "POST",
    headers: orsHeaders(key),
    body: JSON.stringify({
      locations: points.map((point) => [point.lng, point.lat]),
      metrics: ["distance", "duration"],
    }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    distances?: Array<Array<number | null>>;
    durations?: Array<Array<number | null>>;
  };
  if (!data.distances?.length || !data.durations?.length) return null;
  const { miles, minutes } = matrixFromMetersAndSeconds(data.distances, data.durations);
  return { points, miles, minutes };
}

async function fetchMapboxMatrix(points: Array<{ lat: number; lng: number }>, token: string): Promise<DrivingMatrix | null> {
  if (points.length < 2 || points.length > MAPBOX_MATRIX_MAX_POINTS) return null;
  const path = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = new URL(`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("annotations", "distance,duration");
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    code?: string;
    distances?: Array<Array<number | null>>;
    durations?: Array<Array<number | null>>;
  };
  if (data.code !== "Ok" || !data.distances?.length || !data.durations?.length) return null;
  const { miles, minutes } = matrixFromMetersAndSeconds(data.distances, data.durations);
  return { points, miles, minutes };
}

export async function fetchDrivingMatrix(
  points: Array<{ lat: number; lng: number }>,
): Promise<{ matrix: DrivingMatrix; provider: Exclude<DriveTimesSource, "haversine"> } | null> {
  const orsKey = openRouteServiceKey();
  if (orsKey) {
    const matrix = await fetchOpenRouteServiceMatrix(points, orsKey);
    if (matrix) return { matrix, provider: "openrouteservice" };
  }
  const token = mapboxToken();
  if (token) {
    const matrix = await fetchMapboxMatrix(points, token);
    if (matrix) return { matrix, provider: "mapbox" };
  }
  return null;
}

function uniquePoints(points: Array<{ lat: number; lng: number }>) {
  const unique: Array<{ lat: number; lng: number }> = [];
  const seen = new Set<string>();
  for (const point of points) {
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(point);
  }
  return unique;
}

export async function travelEstimatorForPoints(
  points: Array<{ lat: number; lng: number }>,
): Promise<{ travel: TravelEstimator; driveTimes: DriveTimesSource }> {
  const unique = uniquePoints(points);
  const maxPoints = hasOpenRouteService() ? ORS_MATRIX_MAX_POINTS : MAPBOX_MATRIX_MAX_POINTS;

  if (!hasRoadRouting() || unique.length < 2 || unique.length > maxPoints) {
    return { travel: haversineEstimator(), driveTimes: "haversine" };
  }

  const result = await fetchDrivingMatrix(unique);
  if (!result) {
    return { travel: haversineEstimator(), driveTimes: "haversine" };
  }
  return {
    travel: matrixTravelEstimator(result.matrix.points, result.matrix.miles, result.matrix.minutes),
    driveTimes: result.provider,
  };
}

async function measureOpenRouteServiceRoute(
  points: Array<{ lat: number; lng: number }>,
  key: string,
): Promise<MeasuredRoute | null> {
  if (points.length < 2) return null;
  const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: orsHeaders(key),
    body: JSON.stringify({
      coordinates: points.map((point) => [point.lng, point.lat]),
    }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: Array<[number, number]> };
      properties?: {
        segments?: Array<{ distance: number; duration: number }>;
      };
    }>;
  };
  const feature = data.features?.[0];
  const segments = feature?.properties?.segments;
  if (!feature || !segments?.length) return null;
  return {
    legs: segments.map((segment) => ({
      miles: Number((segment.distance / METERS_PER_MILE).toFixed(2)),
      minutes: Math.max(0, Math.round(segment.duration / 60)),
    })),
    geometry: feature.geometry?.coordinates ?? [],
  };
}

async function measureMapboxRoute(
  points: Array<{ lat: number; lng: number }>,
  token: string,
): Promise<MeasuredRoute | null> {
  if (points.length < 2) return null;
  const path = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    code?: string;
    routes?: Array<{
      legs?: Array<{ distance: number; duration: number }>;
      geometry?: { coordinates?: Array<[number, number]> };
    }>;
  };
  const route = data.routes?.[0];
  const legs = route?.legs;
  if (data.code !== "Ok" || !route || !legs?.length) return null;
  return {
    legs: legs.map((leg) => ({
      miles: Number((leg.distance / METERS_PER_MILE).toFixed(2)),
      minutes: Math.max(0, Math.round(leg.duration / 60)),
    })),
    geometry: route.geometry?.coordinates ?? [],
  };
}

export async function measureDrivingRoute(
  points: Array<{ lat: number; lng: number }>,
): Promise<{ route: MeasuredRoute; provider: Exclude<DriveTimesSource, "haversine"> } | null> {
  const orsKey = openRouteServiceKey();
  if (orsKey) {
    const route = await measureOpenRouteServiceRoute(points, orsKey);
    if (route) return { route, provider: "openrouteservice" };
  }
  const token = mapboxToken();
  if (token) {
    const route = await measureMapboxRoute(points, token);
    if (route) return { route, provider: "mapbox" };
  }
  return null;
}

/** @deprecated Prefer measureDrivingRoute when geometry is needed. */
export async function measureDrivingLegs(points: Array<{ lat: number; lng: number }>) {
  const measured = await measureDrivingRoute(points);
  return measured?.route.legs ?? null;
}

export async function planAssignmentsWithRoadCosts(
  geoTechs: TechnicianHome[],
  geoJobs: RouteJob[],
  mode: OptimizeMode,
) {
  const points = [...geoTechs, ...geoJobs];
  const { travel, driveTimes } = await travelEstimatorForPoints(points);
  const assignments = planDayRoutes(geoTechs, geoJobs, mode, travel);
  return { assignments, driveTimes };
}

export async function snapAssignmentsToRoads(assignments: TechnicianRoute[], geoTechs: TechnicianHome[]) {
  if (!hasRoadRouting()) {
    return {
      assignments,
      driveTimes: "haversine" as const,
      geometries: new Map<string, Array<[number, number]>>(),
    };
  }

  let driveTimes: DriveTimesSource = "haversine";
  const next: TechnicianRoute[] = [];
  const geometries = new Map<string, Array<[number, number]>>();

  for (const assignment of assignments) {
    const home = geoTechs.find((tech) => tech.id === assignment.technicianId);
    if (!home || assignment.route.stops.length === 0) {
      next.push(assignment);
      continue;
    }
    const points = [home, ...assignment.route.stops, home];
    const measured = await measureDrivingRoute(points);
    if (!measured || measured.route.legs.length < assignment.route.stops.length) {
      next.push(assignment);
      continue;
    }
    driveTimes = measured.provider;
    if (measured.route.geometry.length > 1) {
      geometries.set(assignment.technicianId, measured.route.geometry);
    }
    next.push({
      technicianId: assignment.technicianId,
      route: applyMeasuredLegs(
        assignment.route,
        measured.route.legs.slice(0, assignment.route.stops.length),
        measured.route.legs[assignment.route.stops.length],
      ),
    });
  }

  return {
    assignments: next,
    driveTimes,
    geometries,
  };
}
