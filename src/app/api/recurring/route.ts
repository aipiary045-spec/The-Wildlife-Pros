import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { jsonError, withAuth } from "@/lib/api";
import { duplicateJobTrip } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { nextOccurrences, type RecurrenceKind } from "@/lib/recurring";
import { tripStartOnDay } from "@/lib/dates";

const FREQUENCIES: RecurrenceKind[] = ["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "SEASONAL"];

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as {
    jobId?: string;
    frequency?: RecurrenceKind;
    interval?: number;
    count?: number;
    endsOn?: string;
  };
  if (!body.jobId || !body.frequency || !FREQUENCIES.includes(body.frequency)) {
    return jsonError("jobId and frequency are required");
  }
  const source = await prisma.job.findUnique({ where: { id: body.jobId } });
  if (!source) return jsonError("Job not found", 404);

  const count = Math.min(24, Math.max(1, Number(body.count) || 4));
  const start = source.scheduledStart ?? new Date();
  const dates = nextOccurrences({
    frequency: body.frequency,
    interval: body.interval,
    start,
    count,
    endsOn: body.endsOn ? new Date(body.endsOn) : undefined,
  });

  const schedule = await prisma.recurringSchedule.create({
    data: {
      frequency: body.frequency,
      interval: Math.max(1, Number(body.interval) || 1),
      endsOn: body.endsOn ? new Date(body.endsOn) : null,
      active: true,
    },
  });

  await prisma.job.update({
    where: { id: source.id },
    data: { scheduleId: schedule.id },
  });

  const jobs = [];
  for (const day of dates) {
    const scheduledStart = tripStartOnDay(source.scheduledStart, day);
    const job = await duplicateJobTrip({
      jobId: source.id,
      createdById: session.id,
      technicianId: source.technicianId,
      scheduledStart,
      scheduledEnd: addMinutes(scheduledStart, source.durationMin || 60),
      durationMin: source.durationMin,
      instructions: source.instructions,
    });
    if (job) {
      await prisma.job.update({
        where: { id: job.id },
        data: { scheduleId: schedule.id, type: "RECURRING" },
      });
      jobs.push(job);
    }
  }

  return NextResponse.json({ schedule, jobs }, { status: 201 });
});
