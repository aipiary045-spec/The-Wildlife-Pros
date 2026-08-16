import { addDays, startOfDay } from "date-fns";

export type NeedPriority = "overdue" | "due" | "upcoming";

export const FREQUENCY_RETURN_DAYS: Record<string, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
  QUARTERLY: 90,
  SEASONAL: 90,
  CUSTOM: 14,
};

export function dueOnFromReturnDays(returnInDays: number, from = new Date()) {
  const days = Math.max(1, Math.round(Number(returnInDays) || 1));
  return startOfDay(addDays(from, days));
}

export function needPriority(dueOn: Date | string, now = new Date()): NeedPriority {
  const due = startOfDay(new Date(dueOn)).getTime();
  const today = startOfDay(now).getTime();
  if (due < today) return "overdue";
  if (due === today) return "due";
  return "upcoming";
}

export function groupNeedsByPriority<T extends { dueOn: Date | string }>(needs: T[], now = new Date()) {
  const overdue: T[] = [];
  const due: T[] = [];
  const upcoming: T[] = [];
  for (const need of needs) {
    const priority = needPriority(need.dueOn, now);
    if (priority === "overdue") overdue.push(need);
    else if (priority === "due") due.push(need);
    else upcoming.push(need);
  }
  return { overdue, due, upcoming };
}

export function parseReturnInDays(value: unknown) {
  const days = Number(value);
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new Error("Enter about how many days until they need a return trip (1–365).");
  }
  return Math.round(days);
}
