import { format } from "date-fns";
import { redirect } from "next/navigation";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { ApproveButton } from "@/components/timesheets/ApproveButton";
import { DayOffPanel } from "@/components/timesheets/DayOffPanel";
import { HoursTotalsTable } from "@/components/timesheets/HoursTotalsTable";
import { TimesheetTabs } from "@/components/timesheets/TimesheetTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodToolbar } from "@/components/schedule/PeriodToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAppContext } from "@/lib/app-context";
import { dateKey, monthGrid, monthKey, parseDateParam, parseMonthParam, scheduleRange } from "@/lib/dates";
import { applyDayOffsToGrid, buildHoursGrid } from "@/lib/hours";
import { canReviewDayOff } from "@/lib/day-off";
import { isOfficeRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { formatDuration, workedMinutes } from "@/lib/time";
import { getMyTimesheet } from "@/lib/timesheets";

export const dynamic = "force-dynamic";

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string; month?: string }>;
}) {
  const context = await getAppContext();
  if (!context) redirect("/login");
  const { session, fieldView } = context;
  const params = await searchParams;
  const tab = params.tab === "time-off" ? "time-off" : "hours";
  const techView = Boolean(fieldView);
  const canApproveHours = isOfficeRole(session.role);
  const canReviewOff = canReviewDayOff(session.role) && !fieldView;

  const date = parseDateParam(params.date);
  const weekRange = scheduleRange("week", date);
  const month = parseMonthParam(params.month);
  const monthRange = monthGrid(month);
  const myTime = await getMyTimesheet(session.id);

  const [weekSheets, weekOffs, monthOffs] = await Promise.all([
    prisma.timesheet.findMany({
      where: {
        date: { gte: weekRange.from, lte: weekRange.to },
        ...(techView ? { userId: session.id } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, color: true, role: true } },
        punches: { orderBy: { clockInAt: "asc" } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.availabilityBlock.findMany({
      where: {
        status: "APPROVED",
        date: { gte: weekRange.from, lte: weekRange.to },
        ...(techView ? { userId: session.id } : {}),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, color: true } } },
    }),
    tab === "time-off"
      ? prisma.availabilityBlock.findMany({
          where: canReviewOff
            ? { date: { gte: monthRange.start, lte: monthRange.end } }
            : { userId: session.id, date: { gte: monthRange.start, lte: monthRange.end } },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const onClock = weekSheets.filter((sheet) => sheet.status === "CLOCKED_IN");
  const { grid, offKeys } = applyDayOffsToGrid(
    buildHoursGrid(weekSheets, weekRange.days),
    weekOffs.map((item) => ({
      userId: item.userId,
      date: item.date,
      user: {
        id: item.user.id,
        firstName: item.user.firstName,
        lastName: item.user.lastName,
        color: item.user.color,
      },
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time tracker"
        description={
          techView
            ? "Clock in, see hours by day this week, and request time off — all in one place."
            : "Crew hours by day this week, plus time-off requests and approvals."
        }
        related={techView ? undefined : [{ href: "/reports", label: "Reports" }, { href: "/schedule", label: "Schedule" }]}
      />

      <TimesheetTabs active={tab} month={monthKey(month)} />

      {tab === "time-off" ? (
        <DayOffPanel
          userId={session.id}
          canReview={canReviewOff}
          month={monthKey(month)}
          requests={monthOffs.map((item) => ({
            id: item.id,
            userId: item.userId,
            date: dateKey(item.date),
            reason: item.reason,
            status: item.status,
            userName: `${item.user.firstName} ${item.user.lastName}`,
          }))}
        />
      ) : (
        <>
          <ClockControls initialCurrent={myTime.current} initialRecent={myTime.recent} />
          <PeriodToolbar view="week" date={date} basePath="/timesheets" hideViewToggle />

          <HoursTotalsTable grid={grid} showTech={!techView} offKeys={offKeys} />

          {!techView && onClock.length ? (
            <section className="rounded-2xl border border-line bg-panel p-5">
              <h2 className="mb-3 font-semibold">Currently clocked in</h2>
              <div className="flex flex-wrap gap-2">
                {onClock.map((sheet) => (
                  <span key={sheet.id} className="rounded-full bg-background px-3 py-1 text-sm">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: sheet.user.color }} />
                    {sheet.user.firstName} {sheet.user.lastName} ·{" "}
                    {formatDuration(workedMinutes(sheet.punches, sheet.breakMin, new Date(), sheet.date))}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div>
              <h2 className="font-semibold">Punch detail this week</h2>
              <p className="text-sm text-stone-600">Every clock-in and clock-out in the selected week.</p>
            </div>

            {weekSheets.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-stone-500">
                No punches this week.
              </p>
            ) : null}

            <div className="space-y-2 md:hidden">
              {weekSheets.map((sheet) => (
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
                        {formatDuration(workedMinutes(sheet.punches, sheet.breakMin, new Date(), sheet.date))}
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
                  {weekSheets.map((sheet) => (
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
                      <td className="px-4 py-3">
                        {formatDuration(workedMinutes(sheet.punches, sheet.breakMin, new Date(), sheet.date))}
                      </td>
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
        </>
      )}
    </div>
  );
}
