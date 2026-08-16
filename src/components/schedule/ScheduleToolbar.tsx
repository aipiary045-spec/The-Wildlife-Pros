import { PeriodToolbar } from "./PeriodToolbar";
import type { ScheduleView } from "@/lib/dates";

export function ScheduleToolbar({
  view,
  date,
  basePath,
}: {
  view: ScheduleView;
  date: Date;
  basePath: "/schedule" | "/field";
}) {
  return <PeriodToolbar view={view} date={date} basePath={basePath} />;
}
