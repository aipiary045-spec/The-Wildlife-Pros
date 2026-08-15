import { NextResponse } from "next/server";
import { endOfWeek, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { getSchedule } from "@/lib/data";

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ? new Date(url.searchParams.get("date")!) : new Date();
  const from = startOfWeek(date, { weekStartsOn: 1 });
  const to = endOfWeek(date, { weekStartsOn: 1 });
  const data = await getSchedule(from, to);
  return NextResponse.json({ from, to, ...data });
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
