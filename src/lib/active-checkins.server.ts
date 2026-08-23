import { differenceInMinutes } from "date-fns";
import type { ActiveCheckIn } from "@/lib/active-checkins";
import { prisma } from "@/lib/prisma";
import { clientName, propertyAddress } from "@/lib/utils";

const CLOSED_JOB_STATUSES = new Set(["COMPLETED", "CANCELLED", "INVOICED"]);

export async function getMyOpenCheckIn(userId: string, now = new Date()): Promise<ActiveCheckIn | null> {
  const entry = await prisma.timeEntry.findFirst({
    where: { userId, endedAt: null, jobId: { not: null } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      job: {
        include: {
          client: true,
          property: true,
          technician: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });
  if (!entry?.job) return null;
  if (CLOSED_JOB_STATUSES.has(entry.job.status)) {
    await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { endedAt: now, notes: "Auto-closed: job was already finished." },
    });
    return null;
  }
  const job = entry.job;
  const tech = job.technician ?? entry.user;
  return {
    jobId: job.id,
    jobNumber: job.number,
    jobTitle: job.title,
    clientName: clientName(job.client),
    address: propertyAddress(job.property),
    technicianId: job.technicianId ?? entry.userId,
    technicianName: `${tech.firstName} ${tech.lastName}`,
    startedAt: entry.startedAt,
    minutesOnSite: Math.max(0, differenceInMinutes(now, entry.startedAt)),
  };
}

export async function getActiveCheckIns(now = new Date()): Promise<ActiveCheckIn[]> {
  const entries = await prisma.timeEntry.findMany({
    where: { endedAt: null, jobId: { not: null } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      job: {
        include: {
          client: true,
          property: true,
          technician: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  return entries
    .filter((entry) => entry.job && ["ON_SITE", "IN_PROGRESS"].includes(entry.job.status))
    .map((entry) => {
      const job = entry.job!;
      const tech = job.technician ?? entry.user;
      return {
        jobId: job.id,
        jobNumber: job.number,
        jobTitle: job.title,
        clientName: clientName(job.client),
        address: propertyAddress(job.property),
        technicianId: job.technicianId ?? entry.userId,
        technicianName: `${tech.firstName} ${tech.lastName}`,
        startedAt: entry.startedAt,
        minutesOnSite: Math.max(0, differenceInMinutes(now, entry.startedAt)),
      };
    });
}
