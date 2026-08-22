import { prisma } from "@/lib/prisma";
import { geocodeAddress, planAssignmentsWithRoadCosts, snapAssignmentsToRoads } from "@/lib/geocode";
import { dateKey, parseDateParam } from "@/lib/dates";
import { clientName, propertyAddress } from "@/lib/utils";
import {
  applyStartClock,
  parseOptimizeMode,
  parseStartHour,
  type OptimizeMode,
  type RouteJob,
  type TechnicianHome,
  type TechnicianRoute,
} from "@/lib/routing";

export const ROUTABLE_STATUSES = ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE"] as const;

export type SkippedJob = {
  id: string;
  number: string;
  title: string;
  reason: "missing_coordinates" | "tech_missing_home";
};

export type RouteWarning = {
  technicianId: string;
  name: string;
  reason: "missing_home_gps";
  message: string;
};

const jobInclude = {
  property: true,
  client: true,
  technician: true,
} as const;

type LoadedJob = Awaited<ReturnType<typeof loadDayJobs>>[number];

export function parsePlanDate(value?: string | null) {
  return parseDateParam(value);
}

export async function loadRoutableTechnicians(technicianIds?: string[]) {
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["TECHNICIAN", "ADMIN"] },
      id: technicianIds?.length ? { in: technicianIds } : undefined,
    },
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      homeLat: true,
      homeLng: true,
      homeAddress: true,
    },
  });
}

export async function loadDayJobs(day: Date) {
  const { from, to } = dayWindow(day);
  return prisma.job.findMany({
    where: {
      scheduledStart: { gte: from, lte: to },
      status: { in: [...ROUTABLE_STATUSES] },
    },
    include: jobInclude,
    orderBy: { scheduledStart: "asc" },
  });
}

export function dayWindow(day: Date) {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return { from, to, date: from };
}

export function splitRoutableJobs(
  jobs: LoadedJob[],
  selectedIds: Set<string>,
  geoTechIds: Set<string>,
) {
  const geoJobs: Array<RouteJob & { job: LoadedJob }> = [];
  const skipped: SkippedJob[] = [];

  for (const job of jobs) {
    const assignedToSelected = Boolean(job.technicianId && selectedIds.has(job.technicianId));
    const unassigned = !job.technicianId;
    if (!assignedToSelected && !unassigned) continue;

    const lat = job.property.lat;
    const lng = job.property.lng;
    if (lat == null || lng == null) {
      skipped.push({
        id: job.id,
        number: job.number,
        title: job.title,
        reason: "missing_coordinates",
      });
      continue;
    }
    if (job.technicianId && !geoTechIds.has(job.technicianId)) {
      skipped.push({
        id: job.id,
        number: job.number,
        title: job.title,
        reason: "tech_missing_home",
      });
      continue;
    }

    geoJobs.push({
      id: job.id,
      lat,
      lng,
      durationMin: job.durationMin,
      title: `${job.number} · ${job.client.lastName}`,
      technicianId: job.technicianId,
      job,
    });
  }

  return { geoJobs, skipped };
}

export function technicianWarnings(
  technicians: Awaited<ReturnType<typeof loadRoutableTechnicians>>,
): RouteWarning[] {
  return technicians
    .filter((tech) => tech.homeLat == null || tech.homeLng == null)
    .map((tech) => ({
      technicianId: tech.id,
      name: `${tech.firstName} ${tech.lastName}`,
      reason: "missing_home_gps" as const,
      message: `${tech.firstName} ${tech.lastName} has no home GPS and was left out of the plan.`,
    }));
}

export function toGeoTechnicians(
  technicians: Awaited<ReturnType<typeof loadRoutableTechnicians>>,
): TechnicianHome[] {
  return technicians
    .filter((tech) => tech.homeLat != null && tech.homeLng != null)
    .map((tech) => ({
      id: tech.id,
      lat: tech.homeLat as number,
      lng: tech.homeLng as number,
      capacity: 8,
      title: `${tech.firstName} ${tech.lastName}`,
    }));
}

export async function hydrateMissingCoordinates(
  technicians: Awaited<ReturnType<typeof loadRoutableTechnicians>>,
  jobs: LoadedJob[],
  selectedIds: Set<string>,
) {
  for (const tech of technicians) {
    if (tech.homeLat != null && tech.homeLng != null) continue;
    const query = tech.homeAddress?.replace(/^Shop\s*·\s*/i, "").trim();
    if (!query) continue;
    const hit = await geocodeAddress(query);
    if (!hit) continue;
    await prisma.user.update({
      where: { id: tech.id },
      data: { homeLat: hit.lat, homeLng: hit.lng },
    });
    tech.homeLat = hit.lat;
    tech.homeLng = hit.lng;
  }

  for (const job of jobs) {
    const assignedToSelected = Boolean(job.technicianId && selectedIds.has(job.technicianId));
    const unassigned = !job.technicianId;
    if (!assignedToSelected && !unassigned) continue;
    if (job.property.lat != null && job.property.lng != null) continue;
    const hit = await geocodeAddress(propertyAddress(job.property));
    if (!hit) continue;
    await prisma.property.update({
      where: { id: job.property.id },
      data: { lat: hit.lat, lng: hit.lng },
    });
    job.property.lat = hit.lat;
    job.property.lng = hit.lng;
  }
}

export function buildPlanPayload(input: {
  day: Date;
  mode: OptimizeMode;
  startHour: number;
  persisted: boolean;
  driveTimes: "haversine" | "mapbox";
  technicians: Awaited<ReturnType<typeof loadRoutableTechnicians>>;
  geoTechs: TechnicianHome[];
  geoJobs: Array<RouteJob & { job: LoadedJob }>;
  assignments: TechnicianRoute[];
  geometries?: Map<string, Array<[number, number]>>;
  skipped: SkippedJob[];
  warnings: RouteWarning[];
}) {
  const jobsById = new Map(input.geoJobs.map((item) => [item.id, item.job]));

  return {
    date: dateKey(input.day),
    mode: input.mode,
    startHour: input.startHour,
    persisted: input.persisted,
    driveTimes: input.driveTimes,
    assignments: input.assignments.map((assignment) => {
      const tech = input.technicians.find((item) => item.id === assignment.technicianId);
      const home = input.geoTechs.find((item) => item.id === assignment.technicianId);
      return {
        technicianId: assignment.technicianId,
        technician: tech
          ? { id: tech.id, firstName: tech.firstName, lastName: tech.lastName }
          : { id: assignment.technicianId, firstName: "Tech", lastName: "" },
        home: home ? { lat: home.lat, lng: home.lng } : null,
        geometry: input.geometries?.get(assignment.technicianId) ?? [],
        stops: assignment.route.stops.map((stop) => {
          const job = jobsById.get(stop.id);
          const durationMin = stop.durationMin ?? job?.durationMin ?? 60;
          const clock = applyStartClock(input.day, input.startHour, stop.etaMinutesFromStart, durationMin);
          return {
            id: stop.id,
            jobId: stop.id,
            sequence: stop.sequence,
            title: job?.title ?? stop.title ?? stop.id,
            number: job?.number,
            address: job ? propertyAddress(job.property) : undefined,
            lat: job?.property.lat ?? stop.lat,
            lng: job?.property.lng ?? stop.lng,
            clientName: job ? clientName(job.client) : undefined,
            milesFromPrev: stop.milesFromPrev,
            driveMinFromPrev: stop.driveMinFromPrev,
            etaMinutesFromStart: stop.etaMinutesFromStart,
            durationMin,
            eta: clock.eta.toISOString(),
            scheduledStart: clock.scheduledStart.toISOString(),
            scheduledEnd: clock.scheduledEnd.toISOString(),
          };
        }),
        totalMiles: assignment.route.totalMiles,
        totalDriveMin: assignment.route.totalDriveMin,
        totalServiceMin: assignment.route.totalServiceMin,
        returnMiles: assignment.route.returnMiles,
        returnDriveMin: assignment.route.returnDriveMin,
      };
    }),
    skipped: input.skipped,
    warnings: input.warnings,
  };
}

export type PlanPayload = ReturnType<typeof buildPlanPayload>;

export async function buildDayPlan(input: {
  day: Date;
  mode: OptimizeMode;
  startHour: number;
  persist: boolean;
  technicianIds?: string[];
}) {
  const technicians = await loadRoutableTechnicians(input.technicianIds);
  const jobs = await loadDayJobs(input.day);
  const selectedIds = new Set(technicians.map((tech) => tech.id));
  await hydrateMissingCoordinates(technicians, jobs, selectedIds);
  const geoTechs = toGeoTechnicians(technicians);
  const warnings = technicianWarnings(technicians);
  const geoTechIds = new Set(geoTechs.map((tech) => tech.id));
  const { geoJobs, skipped } = splitRoutableJobs(jobs, selectedIds, geoTechIds);
  const planned = await planAssignmentsWithRoadCosts(geoTechs, geoJobs, input.mode);
  const snapped = await snapAssignmentsToRoads(planned.assignments, geoTechs);
  const driveTimes =
    planned.driveTimes === "mapbox" || snapped.driveTimes === "mapbox" ? "mapbox" : "haversine";
  const plan = buildPlanPayload({
    day: input.day,
    mode: input.mode,
    startHour: input.startHour,
    persisted: input.persist,
    driveTimes,
    technicians,
    geoTechs,
    geoJobs,
    assignments: snapped.assignments,
    geometries: snapped.geometries,
    skipped,
    warnings,
  });
  return { plan, jobs, geoTechs };
}

export async function persistPlan(day: Date, plan: PlanPayload, jobs: LoadedJob[], geoTechs: TechnicianHome[]) {
  const { date } = dayWindow(day);
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const homes = new Map(geoTechs.map((tech) => [tech.id, tech]));

  await prisma.$transaction(async (tx) => {
    for (const assignment of plan.assignments) {
      const home = homes.get(assignment.technicianId);

      if (assignment.stops.length === 0) {
        await tx.routeDay.deleteMany({
          where: { technicianId: assignment.technicianId, date },
        });
        continue;
      }

      const route = await tx.routeDay.upsert({
        where: { technicianId_date: { technicianId: assignment.technicianId, date } },
        create: {
          technicianId: assignment.technicianId,
          date,
          status: "OPTIMIZED",
          startLat: home?.lat,
          startLng: home?.lng,
          totalMiles: assignment.totalMiles,
          totalDriveMin: assignment.totalDriveMin,
          returnMiles: assignment.returnMiles,
          returnDriveMin: assignment.returnDriveMin,
          startHour: plan.startHour,
          mode: plan.mode,
        },
        update: {
          status: "OPTIMIZED",
          startLat: home?.lat,
          startLng: home?.lng,
          totalMiles: assignment.totalMiles,
          totalDriveMin: assignment.totalDriveMin,
          returnMiles: assignment.returnMiles,
          returnDriveMin: assignment.returnDriveMin,
          startHour: plan.startHour,
          mode: plan.mode,
        },
      });

      await tx.routeStop.deleteMany({ where: { routeDayId: route.id } });
      await tx.routeStop.createMany({
        data: assignment.stops.map((stop) => ({
          routeDayId: route.id,
          jobId: stop.jobId,
          sequence: stop.sequence,
          eta: new Date(stop.eta),
          milesFromPrev: stop.milesFromPrev,
          driveMinFromPrev: stop.driveMinFromPrev,
        })),
      });

      for (const stop of assignment.stops) {
        const job = jobsById.get(stop.jobId);
        await tx.job.update({
          where: { id: stop.jobId },
          data: {
            technicianId: assignment.technicianId,
            scheduledStart: new Date(stop.scheduledStart),
            scheduledEnd: new Date(stop.scheduledEnd),
            status: job?.status === "EN_ROUTE" ? "EN_ROUTE" : "SCHEDULED",
          },
        });
      }
    }
  });
}

export { parseOptimizeMode, parseStartHour };
