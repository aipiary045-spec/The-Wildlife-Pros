import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { hasOpenPunch } from "@/lib/time";
import { duplicateJobTrip } from "@/lib/jobs";
import type { SessionUser } from "@/lib/auth";
import { JobVisitError, visitActionForStatus, type CheckoutInput } from "@/lib/job-visit";

export { JobVisitError };

async function ensureDayClock(userId: string) {
  const today = startOfDay(new Date());
  const now = new Date();
  const existing = await prisma.timesheet.findUnique({
    where: { userId_date: { userId, date: today } },
    include: { punches: { orderBy: { clockInAt: "asc" } } },
  });

  if (!existing) {
    return prisma.timesheet.create({
      data: {
        userId,
        date: today,
        status: "CLOCKED_IN",
        punches: { create: { clockInAt: now, note: "Job check-in" } },
      },
    });
  }

  if (hasOpenPunch(existing.punches)) return existing;

  return prisma.timesheet.update({
    where: { id: existing.id },
    data: {
      status: "CLOCKED_IN",
      punches: { create: { clockInAt: now, note: "Job check-in" } },
    },
  });
}

export async function checkInToJob(jobId: string, user: SessionUser) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new JobVisitError("Job not found", 404);

  const action = visitActionForStatus(job.status);
  if (action !== "check-in") {
    if (action === "check-out") throw new JobVisitError("Already checked in. Check out when you leave.");
    throw new JobVisitError("This job is not open for check-in.");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (openEntry) {
    if (openEntry.jobId === jobId) {
      return { job, already: true as const };
    }
    throw new JobVisitError("Check out of the job you are on before starting another.");
  }

  const sheet = await ensureDayClock(user.id);
  const now = new Date();
  const technicianId = job.technicianId ?? user.id;

  const [updated] = await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { status: "ON_SITE", technicianId },
      include: { client: true, property: true, technician: true },
    }),
    prisma.timeEntry.create({
      data: {
        userId: user.id,
        jobId,
        timesheetId: sheet.id,
        startedAt: now,
        billable: true,
      },
    }),
    prisma.visit.create({
      data: {
        jobId,
        technicianId,
        status: "ON_SITE",
        scheduledStart: job.scheduledStart ?? now,
        arrivedAt: now,
      },
    }),
  ]);

  return { job: updated, already: false as const };
}

export async function checkOutOfJob(jobId: string, user: SessionUser, input: CheckoutInput) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new JobVisitError("Job not found", 404);

  if (visitActionForStatus(job.status) !== "check-out") {
    throw new JobVisitError("Check in before you check out.");
  }

  if (input.outcome === "follow_up" && !input.followUp?.scheduledStart) {
    throw new JobVisitError("Pick a date and time for the follow-up visit.");
  }

  const now = new Date();
  const openEntry = await prisma.timeEntry.findFirst({
    where: { jobId, userId: user.id, endedAt: null },
  });
  const openVisit = await prisma.visit.findFirst({
    where: { jobId, departedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const summary =
    input.outcome === "complete"
      ? input.notes || "Job complete"
      : input.notes || "Needs follow-up visit";

  await prisma.$transaction(async (tx) => {
    if (openEntry) {
      await tx.timeEntry.update({
        where: { id: openEntry.id },
        data: { endedAt: now, notes: summary },
      });
    }
    if (openVisit) {
      await tx.visit.update({
        where: { id: openVisit.id },
        data: { departedAt: now, status: "COMPLETED", summary },
      });
    }
    await tx.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        ...(input.notes
          ? { instructions: [job.instructions, input.notes].filter(Boolean).join("\n\n") }
          : {}),
      },
    });
  });

  let followUp = null;
  if (input.outcome === "follow_up" && input.followUp) {
    followUp = await duplicateJobTrip({
      jobId,
      createdById: user.id,
      technicianId: input.followUp.technicianId ?? job.technicianId ?? user.id,
      scheduledStart: input.followUp.scheduledStart,
      scheduledEnd: input.followUp.scheduledEnd,
      durationMin: input.followUp.durationMin,
      instructions: input.followUp.instructions ?? input.notes,
    });
    if (!followUp) {
      throw new JobVisitError("Visit closed, but the follow-up job could not be created. Schedule it from the calendar.");
    }
  }

  const updated = await prisma.job.findUnique({
    where: { id: jobId },
    include: { client: true, property: true, technician: true },
  });

  return { job: updated, followUp };
}
