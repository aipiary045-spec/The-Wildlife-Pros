import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  SCHEDULED: "bg-sky-100 text-sky-800",
  EN_ROUTE: "bg-indigo-100 text-indigo-800",
  ON_SITE: "bg-violet-100 text-violet-800",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  INVOICED: "bg-teal-100 text-teal-800",
  CANCELLED: "bg-zinc-200 text-zinc-600",
  ON_HOLD: "bg-orange-100 text-orange-800",
  UNSCHEDULED: "bg-stone-200 text-stone-700",
  DRAFT: "bg-stone-200 text-stone-700",
  SENT: "bg-sky-100 text-sky-800",
  VIEWED: "bg-indigo-100 text-indigo-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-rose-100 text-rose-800",
  EXPIRED: "bg-zinc-200 text-zinc-600",
  CONVERTED: "bg-teal-100 text-teal-800",
  PARTIAL: "bg-amber-100 text-amber-900",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-rose-100 text-rose-800",
  VOID: "bg-zinc-200 text-zinc-600",
  DEPLOYED: "bg-orange-100 text-orange-800",
  ACTIVE_CAPTURE: "bg-rose-100 text-rose-800",
  NEEDS_CHECK: "bg-amber-100 text-amber-900",
  IN_INVENTORY: "bg-stone-200 text-stone-700",
  RETRIEVED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  LEAD: "bg-sky-100 text-sky-800",
  CLOCKED_IN: "bg-emerald-100 text-emerald-800",
  CLOCKED_OUT: "bg-stone-200 text-stone-700",
  SUBMITTED: "bg-sky-100 text-sky-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("status-pill", TONES[status] ?? "bg-stone-200 text-stone-700")}>
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
