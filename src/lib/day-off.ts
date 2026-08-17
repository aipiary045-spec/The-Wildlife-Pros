import { startOfDay } from "date-fns";

export const DAY_OFF_STATUS = ["REQUESTED", "APPROVED", "DENIED"] as const;
export type DayOffStatus = (typeof DAY_OFF_STATUS)[number];

export const DAY_OFF_LABEL: Record<DayOffStatus, string> = {
  REQUESTED: "Waiting on office",
  APPROVED: "Approved — schedule blocked",
  DENIED: "Denied",
};

export type DayOffRow = {
  id: string;
  userId: string;
  date: string;
  reason: string | null;
  status: DayOffStatus;
  userName: string;
};

export function parseDayOffDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    throw new Error("Pick the day you need off.");
  }
  const date = startOfDay(new Date(value.includes("T") ? value : `${value}T12:00:00`));
  if (Number.isNaN(date.getTime())) {
    throw new Error("Pick a valid day.");
  }
  return date;
}

export function isApprovedDayOff(status: string) {
  return status === "APPROVED";
}

export function canReviewDayOff(role: string) {
  return ["OWNER", "ADMIN", "DISPATCHER"].includes(role);
}

export function nextDayOffStatus(bodyStatus: unknown): DayOffStatus | null {
  if (bodyStatus === "APPROVED" || bodyStatus === "DENIED" || bodyStatus === "REQUESTED") {
    return bodyStatus;
  }
  return null;
}

export function offKey(technicianId: string, date: string) {
  return `${technicianId}:${date}`;
}

export function visibleOnTimeOffCalendar(status: string) {
  return status === "REQUESTED" || status === "APPROVED";
}

export function groupTimeOffByDate<T extends { date: string; status: string }>(rows: T[]) {
  const byDate = new Map<string, T[]>();
  for (const row of rows) {
    if (!visibleOnTimeOffCalendar(row.status)) continue;
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }
  return byDate;
}
