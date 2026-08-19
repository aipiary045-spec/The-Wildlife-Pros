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
  return <PeriodToolbar view={view} date={date} basePath={basePath} routesHref={routesHref} />;
}
