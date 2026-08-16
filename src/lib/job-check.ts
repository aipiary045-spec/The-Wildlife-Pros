import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { hasOpenPunch } from "@/lib/time";
import type { SessionUser } from "@/lib/auth";
import { JobVisitError, checkoutSummary, visitActionForStatus, type CheckoutInput } from "@/lib/job-visit";

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

  if (input.outcome === "follow_up" && !input.followUp) {
    throw new JobVisitError("Enter about how many days until they need a return trip.");
  }

  const now = new Date();
  const openEntry = await prisma.timeEntry.findFirst({
    where: { jobId, userId: user.id, endedAt: null },
  });
  const openVisit = await prisma.visit.findFirst({
    where: { jobId, departedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const summary = checkoutSummary(input);

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
        data: {
          departedAt: now,
          status: "COMPLETED",
          summary,
          checkoutWork: {
            workDone: input.workDone,
            siteLeft: input.siteLeft ?? null,
          },
          trapPlaced: input.trapPlaced,
          trapLat: input.trapLat ?? null,
          trapLng: input.trapLng ?? null,
          trapNote: input.trapNote ?? null,
        },
      });
    }
    if (input.trapPlaced && (input.trapLat != null || input.trapNote)) {
      const live = await tx.equipmentDeployment.findFirst({
        where: { jobId, retrievedAt: null },
        orderBy: { deployedAt: "desc" },
      });
      if (live) {
        await tx.equipmentDeployment.update({
          where: { id: live.id },
          data: {
            lat: input.trapLat ?? live.lat,
            lng: input.trapLng ?? live.lng,
            locationNote: input.trapNote || live.locationNote,
          },
        });
      }
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
    followUp = await prisma.scheduleNeed.create({
      data: {
        clientId: job.clientId,
        propertyId: job.propertyId,
        sourceJobId: job.id,
        preferredTechId: job.technicianId,
        title: job.title,
        notes: input.followUp.notes ?? input.notes,
        returnInDays: input.followUp.returnInDays,
        dueOn: input.followUp.dueOn,
        status: "OPEN",
      },
      include: { client: true, property: true },
    });
  }

  const updated = await prisma.job.findUnique({
    where: { id: jobId },
    include: { client: true, property: true, technician: true },
  });

  return { job: updated, followUp };
}
