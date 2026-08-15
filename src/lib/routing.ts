export type GeoPoint = {
  id: string;
  lat: number;
  lng: number;
  durationMin?: number;
  title?: string;
};

export type OptimizedStop = GeoPoint & {
  sequence: number;
  milesFromPrev: number;
  driveMinFromPrev: number;
  etaMinutesFromStart: number;
};

export type OptimizedRoute = {
  stops: OptimizedStop[];
  totalMiles: number;
  totalDriveMin: number;
  totalServiceMin: number;
};

const EARTH_MILES = 3958.8;
const AVG_MPH = 22;

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

function driveMinutes(miles: number) {
  return Math.round((miles / AVG_MPH) * 60);
}

function pathCost(order: GeoPoint[], start: GeoPoint) {
  let miles = 0;
  let prev = start;
  for (const stop of order) {
    miles += haversineMiles(prev, stop);
    prev = stop;
  }
  return miles;
}

function nearestNeighbor(stops: GeoPoint[], start: GeoPoint) {
  const remaining = [...stops];
  const ordered: GeoPoint[] = [];
  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    remaining.forEach((stop, idx) => {
      const dist = haversineMiles(current, stop);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }
  return ordered;
}

function twoOpt(order: GeoPoint[], start: GeoPoint) {
  const path = [...order];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < path.length - 1; i += 1) {
      for (let k = i + 1; k < path.length; k += 1) {
        const candidate = [
          ...path.slice(0, i),
          ...path.slice(i, k + 1).reverse(),
          ...path.slice(k + 1),
        ];
        if (pathCost(candidate, start) + 0.05 < pathCost(path, start)) {
          path.splice(0, path.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return path;
}

export function optimizeRoute(stops: GeoPoint[], start: GeoPoint): OptimizedRoute {
  if (stops.length === 0) {
    return { stops: [], totalMiles: 0, totalDriveMin: 0, totalServiceMin: 0 };
  }

  const seeded = nearestNeighbor(stops, start);
  const ordered = twoOpt(seeded, start);

  let prev = start;
  let miles = 0;
  let drive = 0;
  let elapsed = 0;
  let service = 0;

  const result: OptimizedStop[] = ordered.map((stop, index) => {
    const legMiles = haversineMiles(prev, stop);
    const legMin = driveMinutes(legMiles);
    miles += legMiles;
    drive += legMin;
    elapsed += legMin;
    const eta = elapsed;
    elapsed += stop.durationMin ?? 60;
    service += stop.durationMin ?? 60;
    prev = stop;
    return {
      ...stop,
      sequence: index + 1,
      milesFromPrev: Number(legMiles.toFixed(2)),
      driveMinFromPrev: legMin,
      etaMinutesFromStart: eta,
    };
  });

  return {
    stops: result,
    totalMiles: Number(miles.toFixed(2)),
    totalDriveMin: drive,
    totalServiceMin: service,
  };
}

export function assignJobsToTechnicians<T extends GeoPoint>(
  jobs: T[],
  techs: Array<GeoPoint & { capacity?: number }>,
) {
  const buckets = new Map<string, T[]>();
  techs.forEach((tech) => buckets.set(tech.id, []));

  const unused = [...jobs];
  unused.sort((a, b) => {
    const aNearest = Math.min(...techs.map((t) => haversineMiles(t, a)));
    const bNearest = Math.min(...techs.map((t) => haversineMiles(t, b)));
    return aNearest - bNearest;
  });

  for (const job of unused) {
    let bestTech = techs[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const tech of techs) {
      const assigned = buckets.get(tech.id) ?? [];
      if (assigned.length >= (tech.capacity ?? 8)) continue;
      const last = assigned[assigned.length - 1] ?? tech;
      const score = haversineMiles(last, job) + assigned.length * 0.4;
      if (score < bestScore) {
        bestScore = score;
        bestTech = tech;
      }
    }
    buckets.get(bestTech.id)?.push(job);
  }

  return techs.map((tech) => ({
    technicianId: tech.id,
    route: optimizeRoute(buckets.get(tech.id) ?? [], tech),
  }));
}
