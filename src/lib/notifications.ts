import { format } from "date-fns";
import { formatMinutesLate, type LateCheckInJob } from "@/lib/late-checkin";
import { needPriority } from "@/lib/schedule-needs";

export const NOTIFICATION_KINDS = [
  "late_checkin",
  "follow_up",
  "time_off",
  "past_due",
  "needs_invoice",
  "quote_waiting",
  "needs_day",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export type NotificationUrgency = "high" | "normal";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  urgency: NotificationUrgency;
};

const KIND_ORDER = new Map(NOTIFICATION_KINDS.map((kind, index) => [kind, index]));

export function lateCheckInItems(jobs: LateCheckInJob[], techView: boolean): NotificationItem[] {
  return jobs.map((job) => ({
    id: `late:${job.id}`,
    kind: "late_checkin",
    urgency: "high",
    title: techView
      ? `${job.title} is late for check-in`
      : `${job.technicianName ?? "Unassigned"} is late for check-in`,
    body: [job.number, formatMinutesLate(job.minutesLate), job.clientName, job.address].filter(Boolean).join(" · "),
    href: `/jobs/${job.id}`,
  }));
}

export function followUpItems(
  needs: Array<{
    id: string;
    title: string;
    dueOn: Date | string;
    clientName: string;
    address: string;
  }>,
  now = new Date(),
): NotificationItem[] {
  return needs.map((need) => {
    const overdue = needPriority(need.dueOn, now) === "overdue";
    return {
      id: `follow-up:${need.id}`,
      kind: "follow_up" as const,
      urgency: overdue ? ("high" as const) : ("normal" as const),
      title: overdue ? "Return trip is overdue" : "Return trip is due today",
      body: [need.title, need.clientName, need.address, format(new Date(need.dueOn), "MMM d")].filter(Boolean).join(" · "),
      href: "/schedule",
    };
  });
}

export function timeOffItems(
  requests: Array<{ id: string; date: Date | string; name: string; reason?: string | null }>,
): NotificationItem[] {
  return requests.map((request) => ({
    id: `time-off:${request.id}`,
    kind: "time_off",
    urgency: "normal",
    title: `${request.name} asked for time off`,
    body: [format(new Date(request.date), "EEE, MMM d"), request.reason?.trim()].filter(Boolean).join(" · "),
    href: "/time-off",
  }));
}

export function countItem(
  kind: Extract<NotificationKind, "past_due" | "needs_invoice" | "quote_waiting" | "needs_day">,
  count: number,
  copy: { title: string; body: string; href: string; urgency?: NotificationUrgency },
): NotificationItem | null {
  if (count <= 0) return null;
  return {
    id: `${kind}:${count}`,
    kind,
    urgency: copy.urgency ?? "normal",
    title: copy.title,
    body: copy.body,
    href: copy.href,
  };
}

export function sortNotifications(items: NotificationItem[]) {
  return [...items].sort((left, right) => {
    if (left.urgency !== right.urgency) return left.urgency === "high" ? -1 : 1;
    return (KIND_ORDER.get(left.kind) ?? 99) - (KIND_ORDER.get(right.kind) ?? 99);
  });
}

export function buildNotifications(input: {
  techView: boolean;
  lateJobs: LateCheckInJob[];
  followUps?: Array<{ id: string; title: string; dueOn: Date | string; clientName: string; address: string }>;
  timeOff?: Array<{ id: string; date: Date | string; name: string; reason?: string | null }>;
  pastDueInvoices?: number;
  needsInvoice?: number;
  quotesWaiting?: number;
  needsADay?: number;
}, now = new Date()) {
  if (input.techView) {
    return sortNotifications(lateCheckInItems(input.lateJobs, true));
  }
  return sortNotifications(
    [
      ...lateCheckInItems(input.lateJobs, false),
      ...followUpItems(input.followUps ?? [], now),
      ...timeOffItems(input.timeOff ?? []),
      countItem("past_due", input.pastDueInvoices ?? 0, {
        title:
          (input.pastDueInvoices ?? 0) === 1
            ? "1 invoice is past due"
            : `${input.pastDueInvoices} invoices are past due`,
        body: "Open invoices to collect.",
        href: "/invoices",
        urgency: "high",
      }),
      countItem("needs_invoice", input.needsInvoice ?? 0, {
        title:
          (input.needsInvoice ?? 0) === 1
            ? "1 finished job still needs an invoice"
            : `${input.needsInvoice} finished jobs still need an invoice`,
        body: "Close them out when the work is billed.",
        href: "/jobs?view=needs_invoice",
      }),
      countItem("quote_waiting", input.quotesWaiting ?? 0, {
        title:
          (input.quotesWaiting ?? 0) === 1
            ? "1 quote is waiting on the customer"
            : `${input.quotesWaiting} quotes are waiting on the customer`,
        body: "Sent or viewed, not approved yet.",
        href: "/quotes",
      }),
      countItem("needs_day", input.needsADay ?? 0, {
        title:
          (input.needsADay ?? 0) === 1
            ? "1 job needs a day on the board"
            : `${input.needsADay} jobs need a day on the board`,
        body: "Put them on a tech and a time.",
        href: "/jobs?view=needs_day",
      }),
    ].filter((item): item is NotificationItem => item != null),
  );
}
