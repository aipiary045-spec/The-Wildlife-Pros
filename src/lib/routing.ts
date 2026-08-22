export type GeoPoint = {
  id: string;
  lat: number;
  lng: number;
  durationMin?: number;
  title?: string;
};

export type RouteJob = GeoPoint & {
  technicianId?: string | null;
  /** Emergency dispatches stay first in driving order. */
  priority?: boolean;
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

export type TravelLeg = { miles: number; minutes: number };

export type TravelEstimator = {
  between(a: { lat: number; lng: number }, b: { lat: number; lng: number }): TravelLeg;
};

export function pointKey(point: { lat: number; lng: number }) {
  return `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
}

export function haversineEstimator(): TravelEstimator {
  return {
    between(a, b) {
      const miles = haversineMiles(a, b);
      return { miles, minutes: driveMinutes(miles) };
    },
  };
}

/** Prefer road matrix cells; fall back to Haversine when a cell is missing. */
export function matrixTravelEstimator(
  points: Array<{ lat: number; lng: number }>,
  miles: number[][],
  minutes: number[][],
  fallback: TravelEstimator = haversineEstimator(),
): TravelEstimator {
  const index = new Map(points.map((point, idx) => [pointKey(point), idx]));
  return {
    between(a, b) {
      const i = index.get(pointKey(a));
      const j = index.get(pointKey(b));
      if (i == null || j == null) return fallback.between(a, b);
      const legMiles = miles[i]?.[j];
      const legMinutes = minutes[i]?.[j];
      if (
        legMiles == null ||
        legMinutes == null ||
        !Number.isFinite(legMiles) ||
        !Number.isFinite(legMinutes)
      ) {
        return fallback.between(a, b);
      }
      return { miles: legMiles, minutes: Math.max(0, Math.round(legMinutes)) };
    },
  };
}

function pathCost(order: GeoPoint[], start: GeoPoint, travel: TravelEstimator) {
  let miles = 0;
  let prev = start;
  for (const stop of order) {
    miles += travel.between(prev, stop).miles;
    prev = stop;
  }
  return miles;
}

function nearestNeighbor(stops: GeoPoint[], start: GeoPoint, travel: TravelEstimator) {
  const remaining = [...stops];
  const ordered: GeoPoint[] = [];
  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    remaining.forEach((stop, idx) => {
      const dist = travel.between(current, stop).miles;
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

function twoOpt(order: GeoPoint[], start: GeoPoint, travel: TravelEstimator) {
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
        if (pathCost(candidate, start, travel) + 0.05 < pathCost(path, start, travel)) {
          path.splice(0, path.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return path;
}

export function nearestTechnician<T extends GeoPoint>(
  job: GeoPoint,
  technicians: T[],
  travel: TravelEstimator = haversineEstimator(),
) {
  let best = technicians[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const tech of technicians) {
    const dist = travel.between(tech, job).miles;
    if (dist < bestDist) {
      bestDist = dist;
      best = tech;
    }
  }
  return best;
}

export function optimizeRoute(
  stops: GeoPoint[],
  start: GeoPoint,
  travel: TravelEstimator = haversineEstimator(),
): OptimizedRoute {
  if (stops.length === 0) {
    return emptyRoute();
  }

  const pinned = stops.filter((stop) => (stop as RouteJob).priority);
  const flexible = stops.filter((stop) => !(stop as RouteJob).priority);
  let current = start;
  const head: GeoPoint[] = [];
  if (pinned.length > 0) {
    const pinnedOrder = nearestNeighbor(pinned, current, travel);
    head.push(...pinnedOrder);
    current = pinnedOrder[pinnedOrder.length - 1] ?? current;
  }
  const tail = flexible.length ? twoOpt(nearestNeighbor(flexible, current, travel), current, travel) : [];
  const ordered = [...head, ...tail];

  let prev = start;
  let miles = 0;
  let drive = 0;
  let elapsed = 0;
  let service = 0;

  const result: OptimizedStop[] = ordered.map((stop, index) => {
    const leg = travel.between(prev, stop);
    miles += leg.miles;
    drive += leg.minutes;
    elapsed += leg.minutes;
    const eta = elapsed;
    elapsed += stop.durationMin ?? 60;
    service += stop.durationMin ?? 60;
    prev = stop;
    return {
      ...stop,
      sequence: index + 1,
      milesFromPrev: Number(leg.miles.toFixed(2)),
      driveMinFromPrev: Math.round(leg.minutes),
      etaMinutesFromStart: eta,
    };
  });

  const last = result[result.length - 1] ?? start;
  const ret = travel.between(last, start);

  return {
    stops: result,
    totalMiles: Number(miles.toFixed(2)),
    totalDriveMin: Math.round(drive),
    totalServiceMin: service,
    returnMiles: Number(ret.miles.toFixed(2)),
    returnDriveMin: Math.round(ret.minutes),
  };
}

export function assignJobsToTechnicians<T extends GeoPoint>(
  jobs: T[],
  techs: Array<GeoPoint & { capacity?: number }>,
  travel: TravelEstimator = haversineEstimator(),
): TechnicianRoute[] {
  if (techs.length === 0) return [];

  const buckets = new Map<string, T[]>();
  techs.forEach((tech) => buckets.set(tech.id, []));

  const unused = [...jobs];
  unused.sort((a, b) => {
    const aNearest = Math.min(...techs.map((t) => travel.between(t, a).miles));
    const bNearest = Math.min(...techs.map((t) => travel.between(t, b).miles));
    return aNearest - bNearest;
  });

  for (const job of unused) {
    let bestTech = techs[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const tech of techs) {
      const assigned = buckets.get(tech.id) ?? [];
      if (assigned.length >= (tech.capacity ?? DEFAULT_CAPACITY)) continue;
      const last = assigned[assigned.length - 1] ?? tech;
      const score = travel.between(last, job).miles + assigned.length * 0.4;
      if (score < bestScore) {
        bestScore = score;
        bestTech = tech;
      }
    }
    buckets.get(bestTech.id)?.push(job);
  }

  return techs.map((tech) => ({
    technicianId: tech.id,
    route: optimizeRoute(buckets.get(tech.id) ?? [], tech, travel),
  }));
}

/** Keep each job on its technician; only fix driving order. Unassigned → nearest home. */
export function reorderJobsByTechnician(
  technicians: TechnicianHome[],
  jobs: RouteJob[],
  travel: TravelEstimator = haversineEstimator(),
): TechnicianRoute[] {
  if (technicians.length === 0) return [];

  const buckets = new Map<string, RouteJob[]>();
  technicians.forEach((tech) => buckets.set(tech.id, []));
  const techIds = new Set(technicians.map((tech) => tech.id));

  for (const job of jobs) {
    const keepId =
      job.technicianId && techIds.has(job.technicianId)
        ? job.technicianId
        : nearestTechnician(job, technicians, travel).id;
    buckets.get(keepId)?.push(job);
  }

  return technicians.map((tech) => ({
    technicianId: tech.id,
    route: optimizeRoute(buckets.get(tech.id) ?? [], tech, travel),
  }));
}

export function planDayRoutes(
  technicians: TechnicianHome[],
  jobs: RouteJob[],
  mode: OptimizeMode = "reorder",
  travel: TravelEstimator = haversineEstimator(),
): TechnicianRoute[] {
  if (mode === "rebalance") {
    return assignJobsToTechnicians(jobs, technicians, travel);
  }
  return reorderJobsByTechnician(technicians, jobs, travel);
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
