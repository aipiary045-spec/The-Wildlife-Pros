import { format } from "date-fns";
import { formatMinutesLate, type LateCheckInJob } from "@/lib/late-checkin";
import { needPriority } from "@/lib/schedule-needs";

export const NOTIFICATION_KINDS = [
  "emergency_dispatch",
  "late_checkin",
  "follow_up",
  "time_off",
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
  stealJobId?: string;
};

const KIND_ORDER = new Map(NOTIFICATION_KINDS.map((kind, index) => [kind, index]));

export function emergencyDispatchItems(
  dispatches: Array<{
    jobId: string;
    title: string;
    address: string;
    techName: string;
    acknowledged: boolean;
    overdue: boolean;
    assignedToMe?: boolean;
    unassigned?: boolean;
  }>,
  techView: boolean,
): NotificationItem[] {
  return dispatches.map((dispatch) => ({
    id: `emergency:${dispatch.jobId}`,
    kind: "emergency_dispatch" as const,
    urgency: "high" as const,
    title: techView
      ? dispatch.assignedToMe
        ? dispatch.acknowledged
          ? "Emergency acknowledged"
          : "Emergency — go now"
        : dispatch.unassigned
          ? "Emergency — unassigned, steal it"
          : "Emergency — steal if you're closer"
      : dispatch.overdue
        ? "Emergency not acknowledged yet"
        : "Emergency dispatched",
    body: [dispatch.title, dispatch.techName, dispatch.address].filter(Boolean).join(" · "),
    href: `/jobs/${dispatch.jobId}`,
    stealJobId: techView && !dispatch.assignedToMe && !dispatch.acknowledged ? dispatch.jobId : undefined,
  }));
}

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
  kind: Extract<NotificationKind, "needs_day">,
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
  emergencyDispatches?: Array<{
    jobId: string;
    title: string;
    address: string;
    techName: string;
    acknowledged: boolean;
    overdue: boolean;
    assignedToMe?: boolean;
    unassigned?: boolean;
  }>;
  lateJobs: LateCheckInJob[];
  followUps?: Array<{ id: string; title: string; dueOn: Date | string; clientName: string; address: string }>;
  timeOff?: Array<{ id: string; date: Date | string; name: string; reason?: string | null }>;
  needsADay?: number;
}, now = new Date()) {
  if (input.techView) {
    return sortNotifications([
      ...emergencyDispatchItems(input.emergencyDispatches ?? [], true),
      ...lateCheckInItems(input.lateJobs, true),
    ]);
  }
  return sortNotifications(
    [
      ...emergencyDispatchItems(input.emergencyDispatches ?? [], false),
      ...lateCheckInItems(input.lateJobs, false),
      ...followUpItems(input.followUps ?? [], now),
      ...timeOffItems(input.timeOff ?? []),
      countItem("needs_day", input.needsADay ?? 0, {
        title:
          (input.needsADay ?? 0) === 1
            ? "1 job needs a day on the schedule"
            : `${input.needsADay} jobs need a day on the schedule`,
        body: "Put them on a tech and a time.",
        href: "/jobs?view=needs_day",
      }),
    ].filter((item): item is NotificationItem => item != null),
  );
}
