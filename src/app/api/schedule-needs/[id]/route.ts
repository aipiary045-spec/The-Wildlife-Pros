import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { approvedDayOffError } from "@/lib/day-off-guard";
import { duplicateJobTrip } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: "OPEN" | "SCHEDULED" | "CANCELLED";
    technicianId?: string;
    scheduledStart?: string;
    durationMin?: number;
    notes?: string;
  };

  const need = await prisma.scheduleNeed.findUnique({ where: { id } });
  if (!need) return jsonError("That customer is not in the pool.", 404);

  if (body.status === "CANCELLED") {
    const updated = await prisma.scheduleNeed.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ need: updated });
  }

  if (!body.scheduledStart) {
    return jsonError("Pick a date and time to put this on the calendar.");
  }
  const scheduledStart = new Date(body.scheduledStart);
  if (Number.isNaN(scheduledStart.getTime())) {
    return jsonError("Pick a valid date and time.");
  }
  const durationMin = Number(body.durationMin) || 60;
  const technicianId = body.technicianId || need.preferredTechId || undefined;
  const blocked = await approvedDayOffError(technicianId, scheduledStart);
  if (blocked) return blocked;

  let job = null;
  if (need.sourceJobId) {
    job = await duplicateJobTrip({
      jobId: need.sourceJobId,
      createdById: session.id,
      technicianId,
      scheduledStart,
      scheduledEnd: addMinutes(scheduledStart, durationMin),
      durationMin,
      instructions: body.notes ?? need.notes,
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
        instructions: body.notes ?? need.notes,
        scheduledStart,
        scheduledEnd: addMinutes(scheduledStart, durationMin),
        durationMin,
      },
      include: { client: true, property: true, technician: true },
    });
  }

  const updated = await prisma.scheduleNeed.update({
    where: { id },
    data: { status: "SCHEDULED", scheduledJobId: job.id, preferredTechId: technicianId ?? need.preferredTechId },
    include: { client: true, property: true, scheduledJob: true },
  });

  return NextResponse.json({ need: updated, job });
}
