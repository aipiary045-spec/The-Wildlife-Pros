export type GeoPoint = {
  id: string;
  lat: number;
  lng: number;
  durationMin?: number;
  title?: string;
};

export type RouteJob = GeoPoint & {
  technicianId?: string | null;
};

export type TechnicianHome = GeoPoint & {
  capacity?: number;
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
  returnMiles: number;
  returnDriveMin: number;
};

export type TechnicianRoute = {
  technicianId: string;
  route: OptimizedRoute;
};

export type OptimizeMode = "reorder" | "rebalance";

export const EARTH_MILES = 3958.8;
export const AVG_MPH = 22;
export const DEFAULT_START_HOUR = 8;
export const DEFAULT_CAPACITY = 8;

function emptyRoute(): OptimizedRoute {
  return {
    stops: [],
    totalMiles: 0,
    totalDriveMin: 0,
    totalServiceMin: 0,
    returnMiles: 0,
    returnDriveMin: 0,
  };
}

export function parseOptimizeMode(value?: string | null): OptimizeMode {
  return value === "rebalance" ? "rebalance" : "reorder";
}

export function parseStartHour(value?: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_START_HOUR;
  return Math.min(12, Math.max(5, Math.round(n)));
}

/** Local clock for the first roll-out of the day, then each stop's ETA offset. */
export function applyStartClock(
  day: Date,
  startHour: number,
  etaMinutesFromStart: number,
  durationMin = 60,
) {
  const hour = parseStartHour(startHour);
  const origin = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
  const scheduledStart = new Date(origin.getTime() + etaMinutesFromStart * 60_000);
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMin * 60_000);
  return { origin, scheduledStart, scheduledEnd, eta: scheduledStart };
}

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

export function driveMinutes(miles: number) {
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

export function nearestTechnician<T extends GeoPoint>(job: GeoPoint, technicians: T[]) {
  let best = technicians[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const tech of technicians) {
    const dist = haversineMiles(tech, job);
    if (dist < bestDist) {
      bestDist = dist;
      best = tech;
    }
  }
  return best;
}

export function optimizeRoute(stops: GeoPoint[], start: GeoPoint): OptimizedRoute {
  if (stops.length === 0) {
    return emptyRoute();
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

  const last = result[result.length - 1] ?? start;
  const retMiles = haversineMiles(last, start);
  const retMin = driveMinutes(retMiles);

  return {
    stops: result,
    totalMiles: Number(miles.toFixed(2)),
    totalDriveMin: drive,
    totalServiceMin: service,
    returnMiles: Number(retMiles.toFixed(2)),
    returnDriveMin: retMin,
  };
}

export function assignJobsToTechnicians<T extends GeoPoint>(
  jobs: T[],
  techs: Array<GeoPoint & { capacity?: number }>,
): TechnicianRoute[] {
  if (techs.length === 0) return [];

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
      if (assigned.length >= (tech.capacity ?? DEFAULT_CAPACITY)) continue;
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

/** Keep each job on its technician; only fix driving order. Unassigned → nearest home. */
export function reorderJobsByTechnician(technicians: TechnicianHome[], jobs: RouteJob[]): TechnicianRoute[] {
  if (technicians.length === 0) return [];

  const buckets = new Map<string, RouteJob[]>();
  technicians.forEach((tech) => buckets.set(tech.id, []));
  const techIds = new Set(technicians.map((tech) => tech.id));

  for (const job of jobs) {
    const keepId = job.technicianId && techIds.has(job.technicianId) ? job.technicianId : nearestTechnician(job, technicians).id;
    buckets.get(keepId)?.push(job);
  }

  return technicians.map((tech) => ({
    technicianId: tech.id,
    route: optimizeRoute(buckets.get(tech.id) ?? [], tech),
  }));
}

export function planDayRoutes(
  technicians: TechnicianHome[],
  jobs: RouteJob[],
  mode: OptimizeMode = "reorder",
): TechnicianRoute[] {
  if (mode === "rebalance") {
    return assignJobsToTechnicians(jobs, technicians);
  }
  return reorderJobsByTechnician(technicians, jobs);
}

/** Replace Haversine legs with measured road miles/minutes after the stop order is chosen. */
export function applyMeasuredLegs(
  route: OptimizedRoute,
  stopLegs: Array<{ miles: number; minutes: number }>,
  returnLeg?: { miles: number; minutes: number },
): OptimizedRoute {
  let elapsed = 0;
  let miles = 0;
  let drive = 0;
  const stops = route.stops.map((stop, index) => {
    const leg = stopLegs[index] ?? { miles: stop.milesFromPrev, minutes: stop.driveMinFromPrev };
    elapsed += leg.minutes;
    miles += leg.miles;
    drive += leg.minutes;
    const eta = elapsed;
    elapsed += stop.durationMin ?? 60;
    return {
      ...stop,
      milesFromPrev: Number(leg.miles.toFixed(2)),
      driveMinFromPrev: Math.round(leg.minutes),
      etaMinutesFromStart: eta,
    };
  });
  const back = returnLeg ?? { miles: route.returnMiles, minutes: route.returnDriveMin };
  return {
    ...route,
    stops,
    totalMiles: Number(miles.toFixed(2)),
    totalDriveMin: Math.round(drive),
    returnMiles: Number(back.miles.toFixed(2)),
    returnDriveMin: Math.round(back.minutes),
  };
}
