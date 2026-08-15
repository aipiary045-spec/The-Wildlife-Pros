import { addMinutes, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { assignJobsToTechnicians, optimizeRoute, type GeoPoint } from "@/lib/routing";

export const POST = withAuth(async (_session, request) => {
  const body = (await request.json()) as {
    date?: string;
    technicianIds?: string[];
    persist?: boolean;
  };
  const day = body.date ? new Date(body.date) : new Date();
  const start = startOfDay(day);
  const end = addMinutes(start, 24 * 60 - 1);

  const technicians = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["TECHNICIAN", "OWNER", "DISPATCHER"] },
      id: body.technicianIds?.length ? { in: body.technicianIds } : undefined,
    },
  });

  const jobs = await prisma.job.findMany({
    where: {
      scheduledStart: { gte: start, lte: end },
      status: { in: ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE"] },
    },
    include: { property: true, client: true },
  });

  const geoJobs = jobs
    .filter((job) => job.property.lat != null && job.property.lng != null)
    .map((job) => ({
      id: job.id,
      lat: job.property.lat as number,
      lng: job.property.lng as number,
      durationMin: job.durationMin,
      title: `${job.number} · ${job.client.lastName}`,
    }));

  const geoTechs = technicians
    .filter((tech) => tech.homeLat != null && tech.homeLng != null)
    .map((tech) => ({
      id: tech.id,
      lat: tech.homeLat as number,
      lng: tech.homeLng as number,
      capacity: 8,
    }));

  const assignments = assignJobsToTechnicians(geoJobs, geoTechs);

  if (body.persist) {
    for (const assignment of assignments) {
      const tech = technicians.find((item) => item.id === assignment.technicianId);
      if (!tech) continue;
      const route = await prisma.routeDay.upsert({
        where: { technicianId_date: { technicianId: tech.id, date: start } },
        create: {
          technicianId: tech.id,
          date: start,
          status: "OPTIMIZED",
          startLat: tech.homeLat,
          startLng: tech.homeLng,
          totalMiles: assignment.route.totalMiles,
          totalDriveMin: assignment.route.totalDriveMin,
        },
        update: {
          status: "OPTIMIZED",
          totalMiles: assignment.route.totalMiles,
          totalDriveMin: assignment.route.totalDriveMin,
        },
      });
      await prisma.routeStop.deleteMany({ where: { routeDayId: route.id } });
      await prisma.routeStop.createMany({
        data: assignment.route.stops.map((stop) => ({
          routeDayId: route.id,
          jobId: stop.id,
          sequence: stop.sequence,
          eta: addMinutes(addMinutes(start, 8 * 60), stop.etaMinutesFromStart),
          milesFromPrev: stop.milesFromPrev,
          driveMinFromPrev: stop.driveMinFromPrev,
        })),
      });

      let cursor = addMinutes(start, 8 * 60);
      for (const stop of assignment.route.stops) {
        const job = jobs.find((item) => item.id === stop.id);
        const duration = job?.durationMin ?? 60;
        await prisma.job.update({
          where: { id: stop.id },
          data: {
            technicianId: tech.id,
            scheduledStart: addMinutes(cursor, stop.driveMinFromPrev),
            scheduledEnd: addMinutes(cursor, stop.driveMinFromPrev + duration),
            status: "SCHEDULED",
          },
        });
        cursor = addMinutes(cursor, stop.driveMinFromPrev + duration);
      }
    }
  }

  return NextResponse.json({
    date: start,
    assignments: assignments.map((assignment) => ({
      technician: technicians.find((tech) => tech.id === assignment.technicianId),
      ...assignment.route,
    })),
  });
});

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ? new Date(url.searchParams.get("date")!) : new Date();
  const start = startOfDay(date);
  const routes = await prisma.routeDay.findMany({
    where: { date: start },
    include: {
      technician: true,
      stops: { include: { job: { include: { client: true, property: true } } }, orderBy: { sequence: "asc" } },
    },
  });
  return NextResponse.json({ routes });
});

export function previewSingle(stops: GeoPoint[], start: GeoPoint) {
  return optimizeRoute(stops, start);
}
