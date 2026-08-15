import { format, startOfWeek } from "date-fns";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { ApproveButton } from "@/components/timesheets/ApproveButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration, workedMinutes } from "@/lib/time";
import { getMyTimesheet } from "@/lib/timesheets";

export const dynamic = "force-dynamic";

export default async function TimesheetsPage() {
  const session = await getSession();
  const myTime = session ? await getMyTimesheet(session.id) : { current: null, recent: [] };
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sheets = await prisma.timesheet.findMany({
    where: { date: { gte: weekStart } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, color: true, role: true } },
      punches: { orderBy: { clockInAt: "asc" } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const onClock = sheets.filter((sheet) => sheet.status === "CLOCKED_IN");
  const weekMin = sheets.reduce((sum, sheet) => sum + workedMinutes(sheet.punches, sheet.breakMin), 0);
  const office = session && ["OWNER", "ADMIN", "DISPATCHER", "ACCOUNTING"].includes(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Timesheets</h1>
        <p className="text-stone-600">Technicians clock in and out for the day. Office can review and approve hours.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wider text-stone-500">On the clock</p>
          <p className="mt-2 font-display text-3xl">{onClock.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wider text-stone-500">Hours this week</p>
          <p className="mt-2 font-display text-3xl">{formatDuration(weekMin)}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-stone-500">Your clock</p>
          <ClockControls compact initialCurrent={myTime.current} initialRecent={myTime.recent} />
        </article>
      </div>
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
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Tech</th>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Punches</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
              {office ? <th className="px-4 py-3">Review</th> : null}
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
                {office ? (
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
