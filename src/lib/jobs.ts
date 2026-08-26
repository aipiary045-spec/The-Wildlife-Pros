import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { nextNumber } from "@/lib/utils";

export async function duplicateJobTrip(input: {
  jobId: string;
  createdById: string;
  technicianId?: string | null;
  scheduledStart: Date;
  scheduledEnd?: Date;
  instructions?: string | null;
  durationMin?: number;
}) {
  const source = await prisma.job.findUnique({
    where: { id: input.jobId },
  });
  if (!source) return null;

  const durationMin = input.durationMin ?? source.durationMin;
  const scheduledStart = input.scheduledStart;
  const scheduledEnd = input.scheduledEnd ?? addMinutes(scheduledStart, durationMin);
  const instructions =
    input.instructions === undefined ? null : input.instructions?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const count = await tx.job.count();
    return tx.job.create({
      data: {
        number: nextNumber("JOB", count),
        clientId: source.clientId,
        propertyId: source.propertyId,
        quoteId: source.quoteId,
        technicianId: input.technicianId === undefined ? source.technicianId : input.technicianId,
        createdById: input.createdById,
        type: source.type,
        status: "SCHEDULED",
        title: source.title,
        instructions,
        scheduledStart,
        scheduledEnd,
        durationMin,
        includedTrips: source.includedTrips,
        sourceJobId: source.sourceJobId ?? source.id,
      },
      include: { client: true, property: true, technician: true },
    });
  });
}
