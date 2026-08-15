import Link from "next/link";
import { adjacentDate, dateKey, periodLabel, type ScheduleView } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ScheduleToolbar({
  view,
  date,
  basePath,
}: {
  view: ScheduleView;
  date: Date;
  basePath: "/schedule" | "/field";
}) {
  const dateParam = dateKey(date);
  const prev = dateKey(adjacentDate(view, date, -1));
  const next = dateKey(adjacentDate(view, date, 1));
  const today = dateKey(new Date());

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex rounded-full border border-line bg-panel p-1">
        <ViewLink href={`${basePath}?view=day&date=${dateParam}`} active={view === "day"}>
          Day
        </ViewLink>
        <ViewLink href={`${basePath}?view=week&date=${dateParam}`} active={view === "week"}>
          Week
        </ViewLink>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`${basePath}?view=${view}&date=${prev}`}
          className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium"
        >
          Prev
        </Link>
        <p className="min-w-40 text-center text-sm font-semibold">{periodLabel(view, date)}</p>
        <Link
          href={`${basePath}?view=${view}&date=${next}`}
          className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium"
        >
          Next
        </Link>
        <Link
          href={`${basePath}?view=${view}&date=${today}`}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white"
        >
          Today
        </Link>
      </div>
    </div>
  );
}

function ViewLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-semibold",
        active ? "bg-orange text-white" : "text-stone-600",
      )}
    >
      {children}
    </Link>
  );
}
