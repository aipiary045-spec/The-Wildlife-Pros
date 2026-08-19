import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { getSchedule } from "@/lib/data";
import { parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { approvedDayOffError } from "@/lib/day-off-guard";
import { duplicateJobTrip } from "@/lib/jobs";
import { queueJobGoogleCalendarSync } from "@/lib/google-calendar";

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const view = parseScheduleView(url.searchParams.get("view") ?? "week");
  const date = parseDateParam(url.searchParams.get("date"));
  const { from, to } = scheduleRange(view, date);
  const data = await getSchedule(from, to);
  return NextResponse.json({ view, from, to, ...data });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  if (!body.jobId || !body.scheduledStart) {
    return jsonError("jobId and scheduledStart are required");
  }
  const blockedCopy = await approvedDayOffError(body.technicianId, body.scheduledStart);
  if (blockedCopy) return blockedCopy;
  const job = await duplicateJobTrip({
    jobId: body.jobId,
    createdById: session.id,
    technicianId: body.technicianId,
    scheduledStart: new Date(body.scheduledStart),
    scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
    instructions: body.instructions,
    durationMin: body.durationMin ? Number(body.durationMin) : undefined,
  });
  if (!job) return jsonError("Job not found", 404);
  queueJobGoogleCalendarSync(job.id);
  return NextResponse.json({ job }, { status: 201 });
});

export const PATCH = withAuth(async (_session, request) => {
  const body = await request.json();
  const blockedMove = await approvedDayOffError(body.technicianId, body.scheduledStart);
  if (blockedMove) return blockedMove;
  const job = await prisma.job.update({
    where: { id: body.jobId },
    data: {
      technicianId: body.technicianId,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      status: body.technicianId || body.scheduledStart ? "SCHEDULED" : undefined,
    },
    include: { client: true, property: true, technician: true },
  });
  queueJobGoogleCalendarSync(job.id);
  return NextResponse.json({ job });
});
