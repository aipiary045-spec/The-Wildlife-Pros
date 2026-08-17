import { endOfDay, startOfDay } from "date-fns";
import { isLateForCheckIn } from "@/lib/late-checkin";

export const WORK_ORDER_BUCKETS = [
  "late",
  "today",
  "needs_day",
  "upcoming",
  "needs_invoice",
  "closed",
  "parked",
] as const;

export type WorkOrderBucket = (typeof WORK_ORDER_BUCKETS)[number];

export type WorkOrderViewKey =
  | "action"
  | "late"
  | "today"
  | "needs_day"
  | "upcoming"
  | "needs_invoice"
  | "closed"
  | "parked"
  | "done"
  | "all";

export type WorkOrderView = {
  key: WorkOrderViewKey;
  label: string;
  hint: string;
  buckets: WorkOrderBucket[] | null;
};

export const OFFICE_WORK_ORDER_VIEWS: WorkOrderView[] = [
  {
    key: "action",
    label: "Action needed",
    hint: "Leftover late stops, today, and jobs with no day yet.",
    buckets: ["late", "today", "needs_day"],
  },
  { key: "late", label: "Late", hint: "Scheduled before today and still open.", buckets: ["late"] },
  { key: "today", label: "Today", hint: "On the schedule for today, including anyone already on site.", buckets: ["today"] },
  { key: "needs_day", label: "Needs a day", hint: "No calendar slot yet. Put these on the schedule.", buckets: ["needs_day"] },
  { key: "upcoming", label: "Upcoming", hint: "On the schedule for a later day.", buckets: ["upcoming"] },
  { key: "needs_invoice", label: "Needs invoice", hint: "Work is done. Still needs to be billed.", buckets: ["needs_invoice"] },
  { key: "closed", label: "Closed", hint: "Invoiced work orders.", buckets: ["closed"] },
  { key: "parked", label: "On hold", hint: "Held or cancelled.", buckets: ["parked"] },
  { key: "all", label: "All", hint: "Every work order, grouped by stage.", buckets: null },
];

export const TECH_WORK_ORDER_VIEWS: WorkOrderView[] = [
  { key: "today", label: "Today", hint: "Your stops for today.", buckets: ["today"] },
  { key: "late", label: "Late", hint: "Older assigned stops that are still open.", buckets: ["late"] },
  { key: "upcoming", label: "Upcoming", hint: "Assigned to you on a later day.", buckets: ["upcoming"] },
  { key: "done", label: "Done", hint: "Finished and invoiced jobs assigned to you.", buckets: ["needs_invoice", "closed"] },
  { key: "all", label: "All", hint: "Everything assigned to you.", buckets: null },
];

const BUCKET_TITLE: Record<WorkOrderBucket, string> = {
  late: "Late — still open from an earlier day",
  today: "Today",
  needs_day: "Needs a day on the schedule",
  upcoming: "Upcoming",
  needs_invoice: "Needs an invoice",
  closed: "Closed",
  parked: "On hold / cancelled",
};

export function workOrderViews(techView: boolean) {
  return techView ? TECH_WORK_ORDER_VIEWS : OFFICE_WORK_ORDER_VIEWS;
}

export function parseWorkOrderView(value: string | null | undefined, techView: boolean): WorkOrderViewKey {
  const views = workOrderViews(techView);
  if (value && views.some((view) => view.key === value)) return value as WorkOrderViewKey;
  return techView ? "today" : "action";
}

export function workOrderBucket(
  job: { status: string; scheduledStart: Date | string | null },
  now = new Date(),
): WorkOrderBucket {
  if (job.status === "ON_HOLD" || job.status === "CANCELLED") return "parked";
  if (job.status === "INVOICED") return "closed";
  if (job.status === "COMPLETED") return "needs_invoice";
  if (job.status === "UNSCHEDULED" || !job.scheduledStart) return "needs_day";
  if (job.status === "ON_SITE" || job.status === "IN_PROGRESS") return "today";
  const start = new Date(job.scheduledStart);
  if (start.getTime() < startOfDay(now).getTime()) return "late";
  if (start.getTime() > endOfDay(now).getTime()) return "upcoming";
  return "today";
}

export function jobIsLateOnToday(
  job: { status: string; scheduledStart: Date | string | null },
  now = new Date(),
) {
  return workOrderBucket(job, now) === "today" && isLateForCheckIn(job, now);
}

export function matchesWorkOrderSearch(
  job: {
    number: string;
    title: string;
    typeLabel?: string;
    clientName: string;
    address: string;
    technicianName: string | null;
  },
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [job.number, job.title, job.typeLabel ?? "", job.clientName, job.address, job.technicianName ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function workOrderCounts<T extends { status: string; scheduledStart: Date | string | null }>(
  jobs: T[],
  views: WorkOrderView[],
  now = new Date(),
) {
  const buckets = jobs.map((job) => workOrderBucket(job, now));
  return Object.fromEntries(
    views.map((view) => [
      view.key,
      view.buckets ? buckets.filter((bucket) => view.buckets?.includes(bucket)).length : jobs.length,
    ]),
  ) as Record<WorkOrderViewKey, number>;
}

export function groupWorkOrders<T extends { status: string; scheduledStart: Date | string | null }>(
  jobs: T[],
  view: WorkOrderView,
  now = new Date(),
) {
  const visible = view.buckets ? jobs.filter((job) => view.buckets?.includes(workOrderBucket(job, now))) : jobs;
  const byBucket = new Map<WorkOrderBucket, T[]>();
  for (const job of visible) {
    const bucket = workOrderBucket(job, now);
    const list = byBucket.get(bucket) ?? [];
    list.push(job);
    byBucket.set(bucket, list);
  }
  const order = view.buckets ?? [...WORK_ORDER_BUCKETS];
  return order
    .filter((bucket) => (byBucket.get(bucket)?.length ?? 0) > 0)
    .map((bucket) => ({
      key: bucket,
      title: BUCKET_TITLE[bucket],
      items: byBucket.get(bucket) ?? [],
    }));
}
