import Link from "next/link";
import { PeriodToolbar } from "./PeriodToolbar";
import type { ScheduleView } from "@/lib/dates";

export function ScheduleToolbar({
  view,
  date,
  basePath,
  routesHref,
}: {
  view: ScheduleView;
  date: Date;
  basePath: "/schedule" | "/field";
  routesHref?: string;
}) {
  return (
    <div className="space-y-3">
      {routesHref ? (
        <div className="flex rounded-full border border-line bg-panel p-1">
          <Link
            href={routesHref}
            className="flex-1 rounded-full py-2.5 text-center text-sm font-semibold text-stone-600"
          >
            Optimize routes
          </Link>
        </div>
      ) : null}
      <PeriodToolbar view={view} date={date} basePath={basePath} />
    </div>
  );
}
