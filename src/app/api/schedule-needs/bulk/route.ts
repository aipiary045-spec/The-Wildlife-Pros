import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { approvedDayOffError } from "@/lib/day-off-guard";
import { duplicateJobTrip } from "@/lib/jobs";
import { queueJobGoogleCalendarSync } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);

  const body = (await request.json()) as {
    needIds?: string[];
    technicianId?: string;
    scheduledStart?: string;
    durationMin?: number;
    staggerMin?: number;
  };

  const needIds = Array.isArray(body.needIds) ? body.needIds.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  if (needIds.length === 0) {
    return jsonError("Pick at least one stop to schedule.");
  }
  if (!body.scheduledStart) {
    return jsonError("Pick a date and time to put these on the calendar.");
  }
  const baseStart = new Date(body.scheduledStart);
  if (Number.isNaN(baseStart.getTime())) {
    return jsonError("Pick a valid date and time.");
  }

  const durationMin = Number(body.durationMin) || 60;
  const staggerMin = Number(body.staggerMin) || 60;

  const needs = await prisma.scheduleNeed.findMany({
    where: { id: { in: needIds }, status: "OPEN" },
  });
  const byId = new Map(needs.map((need) => [need.id, need]));
  const ordered = needIds.map((id) => byId.get(id)).filter((need): need is NonNullable<typeof need> => Boolean(need));
  if (ordered.length === 0) {
    return jsonError("Those customers are not in the pool anymore.");
  }

  const jobs = [];
  let scheduled = 0;

  for (let index = 0; index < ordered.length; index += 1) {
    const need = ordered[index]!;
    const scheduledStart = addMinutes(baseStart, index * staggerMin);
    const technicianId = body.technicianId || need.preferredTechId || undefined;
    const blocked = await approvedDayOffError(technicianId, scheduledStart);
    if (blocked) {
      if (index === 0) return blocked;
      continue;
    }

    let job = null;
    if (need.sourceJobId) {
      job = await duplicateJobTrip({
        jobId: need.sourceJobId,
        createdById: session.id,
        technicianId,
        scheduledStart,
        scheduledEnd: addMinutes(scheduledStart, durationMin),
        durationMin,
        instructions: need.notes,
      });
    }
    if (!job) {
      const count = await prisma.job.count();
      const { nextNumber } = await import("@/lib/utils");
      job = await prisma.job.create({
        data: {
          number: nextNumber("JOB", count),
          clientId: need.clientId,
          propertyId: need.propertyId,
          technicianId,
          createdById: session.id,
          type: "FOLLOW_UP",
          status: "SCHEDULED",
          title: need.title,
          instructions: need.notes,
          scheduledStart,
          scheduledEnd: addMinutes(scheduledStart, durationMin),
          durationMin,
        },
        include: { client: true, property: true, technician: true },
      });
    }

    await prisma.scheduleNeed.update({
      where: { id: need.id },
      data: { status: "SCHEDULED", scheduledJobId: job.id, preferredTechId: technicianId ?? need.preferredTechId },
    });

    queueJobGoogleCalendarSync(job.id);
    jobs.push(job);
    scheduled += 1;
  }

  if (scheduled === 0) {
    return jsonError("Could not schedule any of the selected stops.");
  }

  return NextResponse.json({ scheduled, jobs });
}
