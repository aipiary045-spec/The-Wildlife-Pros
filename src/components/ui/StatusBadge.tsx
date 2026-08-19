import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-800",
  EN_ROUTE: "border-indigo-200 bg-indigo-50 text-indigo-800",
  ON_SITE: "border-violet-200 bg-violet-50 text-violet-800",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-900",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  INVOICED: "border-teal-200 bg-teal-50 text-teal-800",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-600",
  ON_HOLD: "border-orange-200 bg-orange-50 text-orange-800",
  UNSCHEDULED: "border-stone-200 bg-stone-100 text-stone-700",
  DRAFT: "border-stone-200 bg-stone-100 text-stone-700",
  SENT: "border-sky-200 bg-sky-50 text-sky-800",
  VIEWED: "border-indigo-200 bg-indigo-50 text-indigo-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DECLINED: "border-rose-200 bg-rose-50 text-rose-800",
  EXPIRED: "border-zinc-200 bg-zinc-100 text-zinc-600",
  CONVERTED: "border-teal-200 bg-teal-50 text-teal-800",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-900",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  OVERDUE: "border-rose-200 bg-rose-50 text-rose-800",
  VOID: "border-zinc-200 bg-zinc-100 text-zinc-600",
  DEPLOYED: "border-orange-200 bg-orange-50 text-orange-800",
  ACTIVE_CAPTURE: "border-rose-200 bg-rose-50 text-rose-800",
  NEEDS_CHECK: "border-amber-200 bg-amber-50 text-amber-900",
  IN_INVENTORY: "border-stone-200 bg-stone-100 text-stone-700",
  RETRIEVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DISABLED: "border-zinc-200 bg-zinc-100 text-zinc-600",
  INVITED: "border-sky-200 bg-sky-50 text-sky-800",
  LEAD: "border-sky-200 bg-sky-50 text-sky-800",
  CLOCKED_IN: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CLOCKED_OUT: "border-stone-200 bg-stone-100 text-stone-700",
  SUBMITTED: "border-sky-200 bg-sky-50 text-sky-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  REQUESTED: "border-amber-200 bg-amber-50 text-amber-900",
  DENIED: "border-rose-200 bg-rose-50 text-rose-800",
  NEW: "border-orange-200 bg-orange-50 text-orange",
  ASSESSED: "border-amber-200 bg-amber-50 text-amber-900",
  CONVERTED_QUOTE: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  CONVERTED_JOB: "border-teal-200 bg-teal-50 text-teal-800",
  CLOSED: "border-zinc-200 bg-zinc-100 text-zinc-600",
  SPAM: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("status-pill", TONES[status] ?? "border-stone-200 bg-stone-100 text-stone-700")}>
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
