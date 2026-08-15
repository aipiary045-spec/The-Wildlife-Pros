import { addDays, endOfDay, endOfWeek, format, startOfDay, startOfWeek } from "date-fns";

export type ScheduleView = "day" | "week";

export function parseDateParam(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return startOfDay(new Date());
}

export function dateKey(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function parseScheduleView(value?: string | null): ScheduleView {
  return value === "week" ? "week" : "day";
}

export function scheduleRange(view: ScheduleView, date: Date) {
  if (view === "week") {
    const from = startOfWeek(date, { weekStartsOn: 1 });
    const to = endOfWeek(date, { weekStartsOn: 1 });
    return { from, to, days: Array.from({ length: 7 }, (_, index) => addDays(from, index)) };
  }
  return { from: startOfDay(date), to: endOfDay(date), days: [startOfDay(date)] };
}

export function adjacentDate(view: ScheduleView, date: Date, direction: -1 | 1) {
  return addDays(date, view === "week" ? direction * 7 : direction);
}

export function periodLabel(view: ScheduleView, date: Date) {
  if (view === "week") {
    const { from, to } = scheduleRange(view, date);
    return `${format(from, "MMM d")} – ${format(to, "MMM d")}`;
  }
  return format(date, "EEEE, MMM d");
}

export function sameDay(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

export function tripStartOnDay(sourceStart: Date | string | null, day: Date) {
  const nextStart = new Date(day);
  if (sourceStart) {
    const current = new Date(sourceStart);
    nextStart.setHours(current.getHours(), current.getMinutes(), 0, 0);
  } else {
    nextStart.setHours(9, 0, 0, 0);
  }
  return nextStart;
}
