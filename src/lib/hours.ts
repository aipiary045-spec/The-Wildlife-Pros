import { startOfDay } from "date-fns";

export type PunchLike = { clockInAt: Date | string; clockOutAt?: Date | string | null };

export function punchMinutes(punches: PunchLike[], breakMin = 0, now = new Date()) {
  const raw = punches.reduce((sum, punch) => {
    const start = new Date(punch.clockInAt).getTime();
    const end = punch.clockOutAt ? new Date(punch.clockOutAt).getTime() : now.getTime();
    return sum + Math.max(0, (end - start) / 60000);
  }, 0);
  return Math.max(0, raw - breakMin);
}

export function hoursByDay<T extends { date: Date | string; punches: PunchLike[]; breakMin?: number }>(
  sheets: T[],
  now = new Date(),
) {
  const days = new Map<string, { date: Date; minutes: number; sheets: T[] }>();
  for (const sheet of sheets) {
    const date = startOfDay(new Date(sheet.date));
    const key = date.toISOString();
    const current = days.get(key) ?? { date, minutes: 0, sheets: [] as T[] };
    current.minutes += punchMinutes(sheet.punches, sheet.breakMin ?? 0, now);
    current.sheets.push(sheet);
    days.set(key, current);
  }
  return [...days.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}
