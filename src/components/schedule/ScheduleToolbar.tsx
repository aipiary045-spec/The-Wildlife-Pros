import { CalendarFeedLink } from "./CalendarFeedLink";
import { PeriodToolbar } from "./PeriodToolbar";
import type { ScheduleView } from "@/lib/dates";

export function ScheduleToolbar({
  view,
  date,
  basePath,
  routesHref,
  calendarUserId,
}: {
  view: ScheduleView;
  date: Date;
  basePath: "/schedule" | "/field";
  routesHref?: string;
  calendarUserId?: string;
}) {
  return (
    <PeriodToolbar
      view={view}
      date={date}
      basePath={basePath}
      routesHref={routesHref}
      footer={calendarUserId ? <CalendarFeedLink userId={calendarUserId} /> : null}
    />
  );
}
