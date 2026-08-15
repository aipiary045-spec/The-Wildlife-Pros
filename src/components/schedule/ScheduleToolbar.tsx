import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="space-y-3">
      <div className="flex rounded-full border border-line bg-panel p-1">
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
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </Link>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold">{periodLabel(view, date)}</p>
        <Link
          href={`${basePath}?view=${view}&date=${next}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </Link>
        <Link
          href={`${basePath}?view=${view}&date=${today}`}
          className="h-11 rounded-xl bg-ink px-3 text-sm font-semibold leading-11 text-white"
        >
          <span className="flex h-11 items-center">Today</span>
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
        "flex-1 rounded-full py-2.5 text-center text-sm font-semibold",
        active ? "bg-orange text-white" : "text-stone-600",
      )}
    >
      {children}
    </Link>
  );
}
