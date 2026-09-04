import { dateKey } from "./dates";

export function jobNeedsMove(
  job: { technicianId: string | null; scheduledStart: string | Date | null },
  technicianId: string | null,
  dayKey: string,
  startAt?: Date,
) {
  if (job.technicianId !== technicianId) return true;
  if (!job.scheduledStart) return Boolean(technicianId) || Boolean(startAt);
  if (dateKey(new Date(job.scheduledStart)) !== dayKey) return true;
  if (!startAt) return false;
  return new Date(job.scheduledStart).getTime() !== startAt.getTime();
}
