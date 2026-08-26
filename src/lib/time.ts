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

export function openPunch(punches: PunchLike[]) {
  return punches.find((punch) => !punch.clockOutAt) ?? null;
}

export function currentPunchElapsedMs(punches: PunchLike[], now = new Date()) {
  const active = openPunch(punches);
  if (!active) return 0;
  return Math.max(0, new Date(now).getTime() - new Date(active.clockInAt).getTime());
}

export function formatElapsedClock(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
