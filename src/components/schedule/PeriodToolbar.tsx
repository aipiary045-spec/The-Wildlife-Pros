import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adjacentDate, dateKey, periodLabel, scheduleRange, type ScheduleView } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function PeriodToolbar({
  view,
  date,
  basePath,
  viewParam = "view",
  dayLabel = "Day",
  weekLabel = "Week",
  routesHref,
  footer,
}: {
  view: ScheduleView;
  date: Date;
  basePath: string;
  viewParam?: string;
  dayLabel?: string;
  weekLabel?: string;
  routesHref?: string;
  footer?: React.ReactNode;
}) {
  const dateParam = dateKey(date);
  const prev = dateKey(adjacentDate(view, date, -1));
  const next = dateKey(adjacentDate(view, date, 1));
  const today = dateKey(new Date());
  const { from, to } = scheduleRange(view, date);
  const onToday = today >= dateKey(from) && today <= dateKey(to);

  function href(nextView: ScheduleView, nextDate = dateParam) {
    return `${basePath}?${viewParam}=${nextView}&date=${nextDate}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-full border border-line bg-panel p-1">
        {routesHref ? (
          <Link
            href={routesHref}
            className="flex-1 rounded-full py-2.5 text-center text-sm font-semibold text-stone-600"
          >
            <span className="sm:hidden">Routes</span>
            <span className="hidden sm:inline">Optimize routes</span>
          </Link>
        ) : null}
        <ViewLink href={href("day")} active={view === "day"}>
          {dayLabel}
        </ViewLink>
        <ViewLink href={href("week")} active={view === "week"}>
          {weekLabel}
        </ViewLink>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={href(view, prev)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold">{periodLabel(view, date)}</p>
          {onToday ? (
            <p className="text-[11px] font-medium text-orange">{view === "week" ? "This week" : "Today"}</p>
          ) : (
            <Link href={href(view, today)} className="text-[11px] font-semibold text-orange hover:underline">
              Jump to today
            </Link>
          )}
        </div>
        <Link
          href={href(view, next)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
      {footer ? <div className="pt-1">{footer}</div> : null}
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
