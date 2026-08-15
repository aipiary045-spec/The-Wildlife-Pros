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

export const DAY_TIMELINE_START_HOUR = 7;
export const DAY_TIMELINE_END_HOUR = 18;
export const DAY_TIMELINE_SNAP_MIN = 30;

export function dayTimelineHours(
  startHour = DAY_TIMELINE_START_HOUR,
  endHour = DAY_TIMELINE_END_HOUR,
) {
  return Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
}

export function hourLabel(hour: number) {
  return clockLabel(hour, 0);
}

export function clockLabel(hour: number, minute = 0) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  if (!minute) return `${display} ${period}`;
  return `${display}:${String(minute).padStart(2, "0")}`;
}

export function dayTimelineSlots(
  startHour = DAY_TIMELINE_START_HOUR,
  endHour = DAY_TIMELINE_END_HOUR,
  snap = DAY_TIMELINE_SNAP_MIN,
) {
  const slots: Array<{ hour: number; minute: number; label: string }> = [];
  for (let total = startHour * 60; total < endHour * 60; total += snap) {
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    slots.push({ hour, minute, label: clockLabel(hour, minute) });
  }
  return slots;
}

export function formatClockDuration(totalMin: number) {
  const safe = Math.max(0, Math.round(totalMin));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function snapMinutes(totalMinutes: number, snap = DAY_TIMELINE_SNAP_MIN) {
  return Math.round(totalMinutes / snap) * snap;
}

export function timeFromTimelineRatio(
  day: Date,
  ratio: number,
  startHour = DAY_TIMELINE_START_HOUR,
  endHour = DAY_TIMELINE_END_HOUR,
) {
  const span = (endHour - startHour) * 60;
  const clamped = Math.max(0, Math.min(1, ratio));
  const minutesFromStart = snapMinutes(clamped * span);
  const next = new Date(day);
  next.setHours(startHour, 0, 0, 0);
  next.setMinutes(minutesFromStart);
  return next;
}

export function startAtFromTrackX(
  day: Date,
  clientX: number,
  trackLeft: number,
  trackWidth: number,
) {
  if (trackWidth <= 0) return timeFromTimelineRatio(day, 0);
  return timeFromTimelineRatio(day, (clientX - trackLeft) / trackWidth);
}

export function slotTimeValue(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function jobTimelinePlacement(
  start: Date,
  durationMin: number,
  startHour = DAY_TIMELINE_START_HOUR,
  endHour = DAY_TIMELINE_END_HOUR,
) {
  const span = (endHour - startHour) * 60;
  const startMin = start.getHours() * 60 + start.getMinutes() - startHour * 60;
  const leftMin = Math.max(0, Math.min(span - 15, startMin));
  const left = (leftMin / span) * 100;
  const width = Math.min((Math.max(30, durationMin) / span) * 100, 100 - left);
  return { left, width };
}
