import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isTechnician } from "@/lib/paths";
import { isLateForCheckIn, minutesLate, type LateCheckInJob } from "@/lib/late-checkin";
import { clientName, propertyAddress } from "@/lib/utils";

export const GET = async () => {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);

  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const jobs = await prisma.job.findMany({
    where: {
      scheduledStart: { lte: cutoff },
      status: { in: ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE"] },
      ...(isTechnician(session.role) ? { technicianId: session.id } : {}),
    },
    include: { client: true, property: true, technician: true },
    orderBy: { scheduledStart: "asc" },
  });

  const now = new Date();
  const late: LateCheckInJob[] = jobs.filter((job) => isLateForCheckIn(job, now)).map((job) => ({
    id: job.id,
    number: job.number,
    title: job.title,
    status: job.status,
    scheduledStart: (job.scheduledStart ?? now).toISOString(),
    minutesLate: minutesLate(job.scheduledStart ?? now, now),
    clientName: clientName(job.client),
    address: propertyAddress(job.property),
    technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : null,
  }));

  return NextResponse.json({ jobs: late });
};
