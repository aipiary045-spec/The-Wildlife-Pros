import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { hasOpenPunch } from "@/lib/time";
import type { SessionUser } from "@/lib/auth";
import { claimEmergencyOnCheckIn } from "@/lib/emergency-claim";
import { JobVisitError, checkoutSummary, visitActionForStatus, type CheckoutInput } from "@/lib/job-visit";
import { resolveSpeciesId } from "@/lib/species";

export { JobVisitError };

async function ensureDayClock(userId: string, at: Date) {
  const open = await prisma.timePunch.findFirst({
    where: { clockOutAt: null, timesheet: { userId } },
    include: { timesheet: true },
  });
  if (open) return open.timesheet;

  const day = startOfDay(at);
  const existing = await prisma.timesheet.findUnique({
    where: { userId_date: { userId, date: day } },
    include: { punches: { orderBy: { clockInAt: "asc" } } },
  });

  if (!existing) {
    return prisma.timesheet.create({
      data: {
        userId,
        date: day,
        status: "CLOCKED_IN",
        punches: { create: { clockInAt: at, note: "Job check-in" } },
      },
    });
  }

  if (hasOpenPunch(existing.punches)) return existing;

  return prisma.timesheet.update({
    where: { id: existing.id },
    data: {
      status: "CLOCKED_IN",
      punches: { create: { clockInAt: at, note: "Job check-in" } },
    },
  });
}

const CLOSED_JOB_STATUSES = new Set(["COMPLETED", "CANCELLED", "INVOICED"]);

export async function checkInToJob(jobId: string, user: SessionUser, occurredAt = new Date()) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new JobVisitError("Job not found", 404);

  const action = visitActionForStatus(job.status);
  if (action !== "check-in") {
    if (action === "check-out") throw new JobVisitError("Already checked in. Check out when you leave.");
    throw new JobVisitError("This job is not open for check-in.");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId: user.id, endedAt: null },
    include: { job: { select: { id: true, number: true, title: true, status: true } } },
  });
  if (openEntry) {
    if (openEntry.jobId === jobId) {
      // Time entry exists but job status may still be SCHEDULED — repair so UI shows Check out.
      if (visitActionForStatus(job.status) !== "check-out") {
        const technicianId = job.technicianId ?? user.id;
        const repaired = await prisma.job.update({
          where: { id: jobId },
          data: { status: "ON_SITE", technicianId },
          include: { client: true, property: true, technician: true },
        });
        const openVisit = await prisma.visit.findFirst({
          where: { jobId, departedAt: null },
          orderBy: { createdAt: "desc" },
        });
        if (!openVisit) {
          await prisma.visit.create({
            data: {
              jobId,
              technicianId,
              status: "ON_SITE",
              scheduledStart: job.scheduledStart ?? occurredAt,
              arrivedAt: openEntry.startedAt ?? occurredAt,
            },
          });
        }
        await claimEmergencyOnCheckIn({
          jobId,
          organizationId: user.organizationId,
          technicianId: user.id,
        });
        const repairedFresh = await prisma.job.findUnique({
          where: { id: jobId },
          include: { client: true, property: true, technician: true },
        });
        return { job: repairedFresh ?? repaired, already: true as const, repaired: true as const };
      }
      return { job, already: true as const, repaired: false as const };
    }
    // Stale open punch on a finished job — close it so the tech is not stuck.
    if (!openEntry.job || CLOSED_JOB_STATUSES.has(openEntry.job.status)) {
      await prisma.timeEntry.update({
        where: { id: openEntry.id },
        data: { endedAt: occurredAt, notes: "Auto-closed: job was already finished." },
      });
    } else {
      const openJob = {
        id: openEntry.job.id,
        number: openEntry.job.number,
        title: openEntry.job.title,
      };
      throw new JobVisitError(
        `Still checked in at ${openJob.number} — ${openJob.title}. Check out there before starting another.`,
        409,
        openJob,
      );
    }
  }

  const sheet = await ensureDayClock(user.id, occurredAt);
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
        startedAt: occurredAt,
        billable: true,
      },
    }),
    prisma.visit.create({
      data: {
        jobId,
        technicianId,
        status: "ON_SITE",
        scheduledStart: job.scheduledStart ?? occurredAt,
        arrivedAt: occurredAt,
      },
    }),
  ]);

  await claimEmergencyOnCheckIn({
    jobId,
    organizationId: user.organizationId,
    technicianId: user.id,
  });

  const refreshed = await prisma.job.findUnique({
    where: { id: jobId },
    include: { client: true, property: true, technician: true },
  });

  return { job: refreshed ?? updated, already: false as const };
}

export async function checkOutOfJob(jobId: string, user: SessionUser, input: CheckoutInput, occurredAt = new Date()) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new JobVisitError("Job not found", 404);

  const openEntry = await prisma.timeEntry.findFirst({
    where: { jobId, userId: user.id, endedAt: null },
  });

  const statusAllowsCheckout = visitActionForStatus(job.status) === "check-out";
  if (!statusAllowsCheckout && !openEntry) {
    throw new JobVisitError("Check in before you check out.");
  }

  if (input.outcome === "follow_up" && !input.followUp) {
    throw new JobVisitError("Enter about how many days until they need a return trip.");
  }

  const openVisit = await prisma.visit.findFirst({
    where: { jobId, departedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const summary = checkoutSummary(input);

  await prisma.$transaction(async (tx) => {
    if (openEntry) {
      await tx.timeEntry.update({
        where: { id: openEntry.id },
        data: { endedAt: occurredAt, notes: summary },
      });
    }
    if (openVisit) {
      await tx.visit.update({
        where: { id: openVisit.id },
        data: {
          departedAt: occurredAt,
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

    for (const capture of input.captures ?? []) {
      const speciesId = await resolveSpeciesId(user.organizationId, {
        speciesId: capture.speciesId,
        speciesName: capture.speciesName,
      });
      await tx.captureEvent.create({
        data: {
          jobId,
          speciesId,
          technicianId: user.id,
          deploymentId: capture.deploymentId,
          quantity: capture.quantity,
          disposition: capture.disposition as never,
          locationNote: capture.locationNote,
          capturedAt: occurredAt,
        },
      });
      if (capture.deploymentId) {
        await tx.equipmentDeployment.update({
          where: { id: capture.deploymentId },
          data: { status: "ACTIVE_CAPTURE" },
        });
      }
    }

    if (input.exclusion) {
      let entryPointId: string | undefined;
      if (input.exclusion.entryLabel) {
        const entry = await tx.entryPoint.create({
          data: {
            propertyId: job.propertyId,
            jobId,
            label: input.exclusion.entryLabel,
            area: input.exclusion.entryArea,
          },
        });
        entryPointId = entry.id;
      }
      await tx.exclusionWork.create({
        data: {
          jobId,
          entryPointId,
          material: input.exclusion.material,
          quantity: input.exclusion.quantity,
          notes: input.exclusion.notes,
        },
      });
    }

    await tx.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: occurredAt,
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
