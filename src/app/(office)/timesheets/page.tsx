import { format } from "date-fns";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { ApproveButton } from "@/components/timesheets/ApproveButton";
import { DayOffPanel } from "@/components/timesheets/DayOffPanel";
import { PeriodToolbar } from "@/components/schedule/PeriodToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { dateKey, parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { canReviewDayOff } from "@/lib/day-off";
import { hoursByDay } from "@/lib/hours";
import { prisma } from "@/lib/prisma";
import { formatDuration, workedMinutes } from "@/lib/time";
import { getMyTimesheet } from "@/lib/timesheets";

export const dynamic = "force-dynamic";

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const view = parseScheduleView(params.view);
  const date = parseDateParam(params.date);
  const { from, to } = scheduleRange(view, date);
  const myTime = session ? await getMyTimesheet(session.id) : { current: null, recent: [] };
  const office = Boolean(session && canReviewDayOff(session.role));
  const canApproveHours = Boolean(session && ["OWNER", "ADMIN", "DISPATCHER", "ACCOUNTING"].includes(session.role));

  const [sheets, dayOffs] = await Promise.all([
    prisma.timesheet.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, color: true, role: true } },
        punches: { orderBy: { clockInAt: "asc" } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.availabilityBlock.findMany({
      where: {
        date: { gte: from },
        ...(office ? {} : session ? { userId: session.id } : { userId: "__none__" }),
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const onClock = sheets.filter((sheet) => sheet.status === "CLOCKED_IN");
  const periodMin = sheets.reduce((sum, sheet) => sum + workedMinutes(sheet.punches, sheet.breakMin), 0);
  const byUser = Object.entries(
    sheets.reduce<Record<string, typeof sheets>>((acc, sheet) => {
      (acc[sheet.userId] ??= []).push(sheet);
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Timesheets</h1>
        <p className="text-stone-600">
          Clock in and out, request a day off, and review hours by day or by week.
        </p>
      </div>
      <PeriodToolbar view={view} date={date} basePath="/timesheets" dayLabel="Day hours" weekLabel="Week hours" />
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wider text-stone-500">On the clock</p>
          <p className="mt-2 font-display text-3xl">{onClock.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wider text-stone-500">
            Hours {view === "week" ? "this week" : "this day"}
          </p>
          <p className="mt-2 font-display text-3xl">{formatDuration(periodMin)}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-stone-500">Your clock</p>
          <ClockControls compact initialCurrent={myTime.current} initialRecent={myTime.recent} />
        </article>
      </div>
      {session ? (
        <DayOffPanel
          userId={session.id}
          canReview={office}
          requests={dayOffs.map((item) => ({
            id: item.id,
            userId: item.userId,
            date: dateKey(item.date),
            reason: item.reason,
            status: item.status,
            userName: `${item.user.firstName} ${item.user.lastName}`,
          }))}
        />
      ) : null}
      {onClock.length ? (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Currently clocked in</h2>
          <div className="flex flex-wrap gap-2">
            {onClock.map((sheet) => (
              <span key={sheet.id} className="rounded-full bg-background px-3 py-1 text-sm">
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: sheet.user.color }} />
                {sheet.user.firstName} {sheet.user.lastName} · {formatDuration(workedMinutes(sheet.punches, sheet.breakMin))}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-semibold">Hours by technician</h2>
        {byUser.length === 0 ? <p className="text-sm text-stone-500">No punches in this period.</p> : null}
        {byUser.map(([userId, userSheets]) => {
          const name = `${userSheets[0]?.user.firstName} ${userSheets[0]?.user.lastName}`;
          const days = hoursByDay(userSheets);
          const total = days.reduce((sum, day) => sum + day.minutes, 0);
          return (
            <div key={userId} className="mb-4 border-b border-line pb-3 last:mb-0 last:border-b-0 last:pb-0">
              <p className="flex justify-between text-sm font-semibold">
                <span>{name}</span>
                <span>{formatDuration(total)}</span>
              </p>
              {view === "week" ? (
                <ul className="mt-1 space-y-0.5 text-sm text-stone-600">
                  {days.map((day) => (
                    <li key={day.date.toISOString()} className="flex justify-between">
                      <span>{format(day.date, "EEE MMM d")}</span>
                      <span>{formatDuration(day.minutes)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </section>
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Tech</th>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Punches</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
              {canApproveHours ? <th className="px-4 py-3">Review</th> : null}
            </tr>
          </thead>
          <tbody>
            {sheets.map((sheet) => (
              <tr key={sheet.id} className="border-t border-line">
                <td className="px-4 py-3">
                  {sheet.user.firstName} {sheet.user.lastName}
                </td>
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
    </div>
  );
}
