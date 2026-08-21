import { differenceInMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { clientName, propertyAddress } from "@/lib/utils";

export type ActiveCheckIn = {
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  clientName: string;
  address: string;
  technicianId: string;
  technicianName: string;
  startedAt: Date;
  minutesOnSite: number;
};

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

export function checkInsByTechnician(checkIns: ActiveCheckIn[]) {
  return Object.fromEntries(checkIns.map((checkIn) => [checkIn.technicianId, checkIn]));
}

export function formatOnSiteDuration(minutes: number) {
  if (minutes < 1) return "Just checked in";
  if (minutes < 60) return `${minutes}m on site`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m on site` : `${hours}h on site`;
}
