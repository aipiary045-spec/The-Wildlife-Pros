import { differenceInMinutes } from "date-fns";

export type PunchLike = {
  clockInAt: Date | string;
  clockOutAt?: Date | string | null;
};

export function punchMinutes(punches: PunchLike[], now = new Date()) {
  return punches.reduce((sum, punch) => {
    const start = new Date(punch.clockInAt);
    const end = punch.clockOutAt ? new Date(punch.clockOutAt) : now;
    return sum + Math.max(0, differenceInMinutes(end, start));
  }, 0);
}

export function workedMinutes(punches: PunchLike[], breakMin = 0, now = new Date()) {
  return Math.max(0, punchMinutes(punches, now) - breakMin);
}

export function formatDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function hasOpenPunch(punches: PunchLike[]) {
  return punches.some((punch) => !punch.clockOutAt);
}
