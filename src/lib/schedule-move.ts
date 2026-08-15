import { dateKey } from "./dates";

export function jobNeedsMove(
  job: { technicianId: string | null; scheduledStart: string | Date | null },
  technicianId: string,
  dayKey: string,
) {
  if (!technicianId) return false;
  if (job.technicianId !== technicianId) return true;
  if (!job.scheduledStart) return true;
  return dateKey(new Date(job.scheduledStart)) !== dayKey;
}
