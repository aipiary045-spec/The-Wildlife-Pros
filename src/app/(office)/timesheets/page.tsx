import { format } from "date-fns";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { ApproveButton } from "@/components/timesheets/ApproveButton";
import { HoursTotalsTable } from "@/components/timesheets/HoursTotalsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodToolbar } from "@/components/schedule/PeriodToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAppContext } from "@/lib/app-context";
import { dateKey, parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { buildHoursGrid } from "@/lib/hours";
import { isOfficeRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { formatDuration, workedMinutes } from "@/lib/time";
import { getMyTimesheet } from "@/lib/timesheets";

export const dynamic = "force-dynamic";

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const context = await getAppContext();
  const session = context?.session ?? null;
  const params = await searchParams;
  // Week first so daily columns + week total are visible immediately.
  const view = params.view ? parseScheduleView(params.view) : "week";
  const date = parseDateParam(params.date);
  const detailRange = scheduleRange(view, date);
  const weekRange = scheduleRange("week", date);
  const myTime = session ? await getMyTimesheet(session.id) : { current: null, recent: [] };
  const techView = Boolean(context?.fieldView);
  const canApproveHours = Boolean(session && isOfficeRole(session.role));

  const weekSheets = await prisma.timesheet.findMany({
    where: {
      date: { gte: weekRange.from, lte: weekRange.to },
      ...(techView && session ? { userId: session.id } : {}),
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, color: true, role: true } },
      punches: { orderBy: { clockInAt: "asc" } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const detailKeys = new Set(detailRange.days.map((day) => dateKey(day)));
  const sheets =
    view === "week" ? weekSheets : weekSheets.filter((sheet) => detailKeys.has(dateKey(sheet.date)));

  const onClock = weekSheets.filter((sheet) => sheet.status === "CLOCKED_IN");
  const grid = buildHoursGrid(weekSheets, weekRange.days);

  return (
    <div className="space-y-6">
      <PageHeader
        title={techView ? "Clock & hours" : "Timesheets"}
        description={
          techView
            ? "Clock in for the day. Daily hours and your week total are in the table below."
            : "Daily and weekly hours for the crew. Days off are approved on Time off."
        }
        related={techView ? undefined : [{ href: "/time-off", label: "Time off" }, { href: "/reports", label: "Reports" }]}
      />
      <ClockControls initialCurrent={myTime.current} initialRecent={myTime.recent} />
      <PeriodToolbar view={view} date={date} basePath="/timesheets" dayLabel="Day detail" weekLabel="Week detail" />

      <HoursTotalsTable grid={grid} showTech={!techView} highlightDate={view === "day" ? date : undefined} />

      {!techView && onClock.length ? (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Currently clocked in</h2>
          <div className="flex flex-wrap gap-2">
            {onClock.map((sheet) => (
              <span key={sheet.id} className="rounded-full bg-background px-3 py-1 text-sm">
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: sheet.user.color }} />
                {sheet.user.firstName} {sheet.user.lastName} ·{" "}
                {formatDuration(workedMinutes(sheet.punches, sheet.breakMin))}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">{view === "week" ? "Punch detail this week" : "Punch detail today"}</h2>
          <p className="text-sm text-stone-600">
            {view === "week"
              ? "Every clock-in and clock-out in the selected week."
              : "Punches for the highlighted day. Switch to Week detail to see the full week’s punches."}
          </p>
        </div>

        {sheets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-stone-500">
            No punches in this {view === "week" ? "week" : "day"}.
          </p>
        ) : null}

        <div className="space-y-2 md:hidden">
          {sheets.map((sheet) => (
            <article key={sheet.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {techView ? null : (
                    <p className="font-semibold">
                      {sheet.user.firstName} {sheet.user.lastName}
                    </p>
                  )}
                  <p className={techView ? "font-semibold" : "text-sm text-stone-600"}>
                    {format(sheet.date, "EEE MMM d")}
                  </p>
                  <p className="text-xs text-stone-500">
                    {sheet.punches.map((punch) => (
                      <span key={punch.id} className="mr-2">
                        {format(punch.clockInAt, "h:mm a")}
                        {punch.clockOutAt ? ` – ${format(punch.clockOutAt, "h:mm a")}` : " – open"}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDuration(workedMinutes(sheet.punches, sheet.breakMin))}
                  </p>
                </div>
                <StatusBadge status={sheet.status} />
              </div>
              {canApproveHours && (sheet.status === "CLOCKED_OUT" || sheet.status === "SUBMITTED") ? (
                <div className="mt-3">
                  <ApproveButton id={sheet.id} />
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-line bg-panel md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
              <tr>
                {techView ? null : <th className="px-4 py-3">Tech</th>}
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Clock in / out</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Status</th>
                {canApproveHours ? <th className="px-4 py-3">Review</th> : null}
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr key={sheet.id} className="border-t border-line">
                  {techView ? null : (
                    <td className="px-4 py-3">
                      {sheet.user.firstName} {sheet.user.lastName}
                    </td>
                  )}
                  <td className="px-4 py-3">{format(sheet.date, "EEE MMM d")}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {sheet.punches.map((punch) => (
                      <p key={punch.id}>
                        {format(punch.clockInAt, "h:mm a")}
                        {punch.clockOutAt ? ` – ${format(punch.clockOutAt, "h:mm a")}` : " – open"}
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3">{formatDuration(workedMinutes(sheet.punches, sheet.breakMin))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sheet.status} />
                  </td>
                  {canApproveHours ? (
                    <td className="px-4 py-3">
                      {sheet.status === "CLOCKED_OUT" || sheet.status === "SUBMITTED" ? (
                        <ApproveButton id={sheet.id} />
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
