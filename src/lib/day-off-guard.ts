import { startOfDay } from "date-fns";
import { jsonError } from "@/lib/api";
import { dateKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export async function approvedDayOffError(technicianId?: string | null, scheduledStart?: Date | string | null) {
  if (!technicianId || !scheduledStart) return null;
  const date = startOfDay(new Date(scheduledStart));
  if (Number.isNaN(date.getTime())) return null;
  const off = await prisma.availabilityBlock.findUnique({
    where: { userId_date: { userId: technicianId, date } },
  });
  if (off?.status === "APPROVED") {
    return jsonError(`That tech has an approved day off on ${dateKey(date)}.`);
  }
  return null;
}
