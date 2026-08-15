import { dateKey } from "./dates";

export function jobNeedsMove(
  job: { technicianId: string | null; scheduledStart: string | Date | null },
  technicianId: string,
  dayKey: string,
  startAt?: Date,
) {
  if (!technicianId) return false;
  if (job.technicianId !== technicianId) return true;
  if (!job.scheduledStart) return true;
  if (dateKey(new Date(job.scheduledStart)) !== dayKey) return true;
  if (!startAt) return false;
  return new Date(job.scheduledStart).getTime() !== startAt.getTime();
}
