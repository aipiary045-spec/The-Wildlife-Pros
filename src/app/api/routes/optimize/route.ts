import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { dateKey } from "@/lib/dates";
import {
  buildPlanPayload,
  dayWindow,
  loadDayJobs,
  loadRoutableTechnicians,
  parseOptimizeMode,
  parsePlanDate,
  parseStartHour,
  persistPlan,
  splitRoutableJobs,
  technicianWarnings,
  toGeoTechnicians,
} from "@/lib/route-plan";

export const POST = withAuth(async (_session, request) => {
  const body = (await request.json()) as {
    date?: string;
    technicianIds?: string[];
    persist?: boolean;
    mode?: string;
    startHour?: number | string;
  };

  const day = parsePlanDate(body.date);
  const mode = parseOptimizeMode(body.mode);
  const startHour = parseStartHour(body.startHour);
  const persist = body.persist === true;
  const technicianIds = Array.isArray(body.technicianIds)
    ? body.technicianIds.filter((id) => typeof id === "string" && id.length > 0)
    : undefined;

  const technicians = await loadRoutableTechnicians(technicianIds);
  const geoTechs = toGeoTechnicians(technicians);
  const warnings = technicianWarnings(technicians);
  const jobs = await loadDayJobs(day);
  const selectedIds = new Set(technicians.map((tech) => tech.id));
  const geoTechIds = new Set(geoTechs.map((tech) => tech.id));
  const { geoJobs, skipped } = splitRoutableJobs(jobs, selectedIds, geoTechIds);

  const plan = buildPlanPayload({
    day,
    mode,
    startHour,
    persisted: persist,
    technicians,
    geoTechs,
    geoJobs,
    skipped,
    warnings,
  });

  if (persist) {
    await persistPlan(day, plan, jobs, geoTechs);
  }

  return NextResponse.json(plan);
});

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const day = parsePlanDate(url.searchParams.get("date"));
  const { date } = dayWindow(day);
  const routes = await prisma.routeDay.findMany({
    where: { date },
    include: {
      technician: { select: { id: true, firstName: true, lastName: true } },
      stops: {
        include: { job: { include: { client: true, property: true } } },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ date: dateKey(day), routes });
});
