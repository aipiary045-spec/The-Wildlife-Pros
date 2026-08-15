import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { getSchedule } from "@/lib/data";
import { parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const view = parseScheduleView(url.searchParams.get("view") ?? "week");
  const date = parseDateParam(url.searchParams.get("date"));
  const { from, to } = scheduleRange(view, date);
  const data = await getSchedule(from, to);
  return NextResponse.json({ view, from, to, ...data });
});

export const PATCH = withAuth(async (_session, request) => {
  const body = await request.json();
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
  return NextResponse.json({ job });
});
