import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { FREQUENCY_RETURN_DAYS, dueOnFromReturnDays, parseReturnInDays } from "@/lib/schedule-needs";
import { prisma } from "@/lib/prisma";

const FREQUENCIES = Object.keys(FREQUENCY_RETURN_DAYS);

export const POST = withAuth(async (_session, request) => {
  const body = (await request.json()) as {
    jobId?: string;
    frequency?: string;
    returnInDays?: number;
    notes?: string;
  };
  if (!body.jobId) return jsonError("jobId is required");
  const source = await prisma.job.findUnique({ where: { id: body.jobId } });
  if (!source) return jsonError("Job not found", 404);

  let returnInDays: number;
  try {
    returnInDays = body.returnInDays
      ? parseReturnInDays(body.returnInDays)
      : FREQUENCY_RETURN_DAYS[body.frequency ?? ""] ?? 30;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Enter days until return.");
  }

  if (body.frequency && FREQUENCIES.includes(body.frequency)) {
    const schedule = await prisma.recurringSchedule.create({
      data: {
        frequency: body.frequency as never,
        interval: 1,
        active: true,
      },
    });
    await prisma.job.update({ where: { id: source.id }, data: { scheduleId: schedule.id } });
  }

  const need = await prisma.scheduleNeed.create({
    data: {
      clientId: source.clientId,
      propertyId: source.propertyId,
      sourceJobId: source.id,
      preferredTechId: source.technicianId,
      title: source.title,
      notes: body.notes?.trim() || `Return about every ${returnInDays} days.`,
      returnInDays,
      dueOn: dueOnFromReturnDays(returnInDays, source.scheduledStart ?? new Date()),
      status: "OPEN",
    },
    include: { client: true, property: true },
  });

  return NextResponse.json({ need }, { status: 201 });
});
