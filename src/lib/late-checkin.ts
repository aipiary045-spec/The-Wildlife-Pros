import { visitActionForStatus } from "@/lib/job-visit";

export const LATE_CHECKIN_MS = 60 * 60 * 1000;
export const LATE_SNOOZE_MS = 15 * 60 * 1000;

export type LateCheckInJob = {
  id: string;
  number: string;
  title: string;
  status: string;
  scheduledStart: string;
  minutesLate: number;
  clientName: string;
  address: string;
  technicianName: string | null;
};

export function isLateForCheckIn(
  job: { status: string; scheduledStart: Date | string | null },
  now = new Date(),
) {
  if (!job.scheduledStart) return false;
  if (visitActionForStatus(job.status) !== "check-in") return false;
  return now.getTime() - new Date(job.scheduledStart).getTime() >= LATE_CHECKIN_MS;
}

export function minutesLate(scheduledStart: Date | string, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - new Date(scheduledStart).getTime()) / 60_000));
}

export function formatMinutesLate(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} minute${safe === 1 ? "" : "s"} late`;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  const hourPart = `${hours} hour${hours === 1 ? "" : "s"}`;
  if (mins === 0) return `${hourPart} late`;
  return `${hourPart} ${mins} minute${mins === 1 ? "" : "s"} late`;
}

export function unsnoozedJobs<T extends { id: string }>(
  jobs: T[],
  snoozeUntil: Record<string, number>,
  now = Date.now(),
) {
  return jobs.filter((job) => (snoozeUntil[job.id] ?? 0) <= now);
}

export function snoozeJobs(
  current: Record<string, number>,
  jobIds: string[],
  now = Date.now(),
  duration = LATE_SNOOZE_MS,
) {
  const next = { ...current };
  for (const id of jobIds) next[id] = now + duration;
  return next;
}

export function parseSnoozeMap(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) next[id] = value;
    }
    return next;
  } catch {
    return {};
  }
}
