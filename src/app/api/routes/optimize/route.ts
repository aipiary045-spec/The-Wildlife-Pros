import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { dateKey } from "@/lib/dates";
import { isTechnician } from "@/lib/paths";
import {
  buildDayPlan,
  dayWindow,
  parseOptimizeMode,
  parsePlanDate,
  parseStartHour,
  persistPlan,
} from "@/lib/route-plan";

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as {
    date?: string;
    technicianIds?: string[];
    persist?: boolean;
    mode?: string;
    startHour?: number | string;
  };

  const day = parsePlanDate(body.date);
  const persist = body.persist === true;
  if (persist && isTechnician(session.role)) {
    return jsonError("Office only.", 403);
  }
  const technicianIds = Array.isArray(body.technicianIds)
    ? body.technicianIds.filter((id) => typeof id === "string" && id.length > 0)
    : undefined;

  const { plan, jobs, geoTechs } = await buildDayPlan({
    day,
    mode: parseOptimizeMode(body.mode),
    startHour: parseStartHour(body.startHour),
    persist,
    technicianIds,
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
