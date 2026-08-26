import { startOfDay } from "date-fns";
import { dateKey } from "@/lib/dates";

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

export type HoursPerson = {
  id: string;
  firstName: string;
  lastName: string;
  color?: string | null;
};

export type HoursGridRow = {
  user: HoursPerson;
  /** Minutes keyed by yyyy-MM-dd */
  byDay: Record<string, number>;
  weekMinutes: number;
  open: boolean;
};

export type HoursGrid = {
  days: Date[];
  rows: HoursGridRow[];
  dayTotals: number[];
  weekTotal: number;
};

export function buildHoursGrid<
  T extends {
    userId: string;
    date: Date | string;
    status?: string;
    breakMin?: number;
    punches: PunchLike[];
    user: HoursPerson;
  },
>(sheets: T[], days: Date[], now = new Date()): HoursGrid {
  const dayKeys = days.map((day) => dateKey(day));
  const byUser = new Map<string, HoursGridRow>();

  for (const sheet of sheets) {
    const key = dateKey(new Date(sheet.date));
    if (!dayKeys.includes(key)) continue;
    const row =
      byUser.get(sheet.userId) ??
      ({
        user: sheet.user,
        byDay: Object.fromEntries(dayKeys.map((dayKey) => [dayKey, 0])),
        weekMinutes: 0,
        open: false,
      } satisfies HoursGridRow);
    const minutes = punchMinutes(sheet.punches, sheet.breakMin ?? 0, now);
    row.byDay[key] = (row.byDay[key] ?? 0) + minutes;
    row.weekMinutes += minutes;
    if (sheet.status === "CLOCKED_IN") row.open = true;
    byUser.set(sheet.userId, row);
  }

  const rows = [...byUser.values()].sort((a, b) => {
    const left = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
    const right = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();
    return left.localeCompare(right);
  });

  const dayTotals = dayKeys.map((key) => rows.reduce((sum, row) => sum + (row.byDay[key] ?? 0), 0));
  const weekTotal = dayTotals.reduce((sum, value) => sum + value, 0);

  return { days, rows, dayTotals, weekTotal };
}
