import { addMonths, addWeeks } from "date-fns";

export type RecurrenceKind = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEASONAL" | "CUSTOM";

export function nextOccurrences(input: {
  frequency: RecurrenceKind;
  interval?: number;
  start: Date;
  count: number;
  endsOn?: Date;
}) {
  const interval = Math.max(1, input.interval ?? 1);
  const dates: Date[] = [];
  let cursor = new Date(input.start);
  while (dates.length < input.count) {
    cursor = stepOccurrence(cursor, input.frequency, interval);
    if (input.endsOn && cursor > input.endsOn) break;
    dates.push(new Date(cursor));
  }
  return dates;
}

function stepOccurrence(date: Date, frequency: RecurrenceKind, interval: number) {
  if (frequency === "MONTHLY") return addMonths(date, interval);
  if (frequency === "QUARTERLY" || frequency === "SEASONAL") return addMonths(date, 3 * interval);
  if (frequency === "BIWEEKLY") return addWeeks(date, 2 * interval);
  return addWeeks(date, interval);
}
