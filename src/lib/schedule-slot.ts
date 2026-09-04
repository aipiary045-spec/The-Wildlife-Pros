import { format } from "date-fns";

/** Suggest the next open clock time after the last stop on a tech's day. */
export function nextOpenTime(
  jobs: Array<{ scheduledStart: string | Date | null; durationMin?: number | null }>,
) {
  if (jobs.length === 0) return "09:00";
  const last = jobs[jobs.length - 1];
  if (!last.scheduledStart) return "09:00";
  const end = new Date(last.scheduledStart);
  end.setMinutes(end.getMinutes() + (last.durationMin || 60));
  return format(end, "HH:mm");
}
