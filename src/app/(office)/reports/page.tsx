import { format, startOfMonth, startOfWeek } from "date-fns";
import { PipelineOverview } from "@/components/reports/PipelineOverview";
import { PeriodToolbar } from "@/components/schedule/PeriodToolbar";
import { getReportsOverview } from "@/lib/data";
import { parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { hoursByDay } from "@/lib/hours";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/time";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const hoursView = parseScheduleView(params.view);
  const hoursDate = parseDateParam(params.date);
  const hoursRange = scheduleRange(hoursView, hoursDate);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  const [overview, weekPayments, monthPayments, openInvoices, completedWeek, captures, traps, timesheets] = await Promise.all([
    getReportsOverview(),
    prisma.payment.aggregate({ where: { createdAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({
      where: { status: { notIn: ["PAID", "VOID"] } },
      _sum: { balance: true },
      _count: true,
    }),
    prisma.job.count({
      where: { status: { in: ["COMPLETED", "INVOICED"] }, completedAt: { gte: weekStart } },
    }),
    prisma.captureEvent.groupBy({
      by: ["speciesId"],
      _sum: { quantity: true },
    }),
    prisma.equipmentDeployment.count({
      where: { status: { in: ["DEPLOYED", "ACTIVE_CAPTURE", "NEEDS_CHECK"] } },
    }),
    prisma.timesheet.findMany({
      where: { date: { gte: hoursRange.from, lte: hoursRange.to } },
      include: { user: true, punches: true },
    }),
  ]);

  const species = await prisma.species.findMany({
    where: { id: { in: captures.map((row) => row.speciesId) } },
  });
  const speciesName = Object.fromEntries(species.map((item) => [item.id, item.commonName]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Reports</h1>
        <p className="text-stone-600">
          Pipeline, money collected, work finished, and what came out of the traps.
        </p>
      </div>
      <PipelineOverview
        requests={overview.requests}
        quotes={overview.quotes}
        jobs={overview.jobs}
        invoices={overview.invoices}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected this week" value={formatMoney(weekPayments._sum.amount ?? 0)} />
        <Stat label="Collected this month" value={formatMoney(monthPayments._sum.amount ?? 0)} />
        <Stat
          label="Still on the books"
          value={formatMoney(openInvoices._sum.balance ?? 0)}
          hint={`${openInvoices._count} open invoice${openInvoices._count === 1 ? "" : "s"}`}
        />
        <Stat label="Jobs finished this week" value={String(completedWeek)} />
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Field pulse</h2>
          <p className="text-sm text-stone-600">Traps in the field</p>
          <p className="font-display text-2xl">{overview.activeTraps}</p>
          <p className="mt-3 text-sm text-stone-600">Clocked in</p>
          <p className="font-display text-2xl">{overview.clockedIn}</p>
          {overview.recentCaptures[0] ? (
            <p className="mt-3 text-sm text-stone-600">
              Latest capture: {overview.recentCaptures[0].species.commonName} at{" "}
              {overview.recentCaptures[0].job.property.address1}
            </p>
          ) : (
            <p className="mt-3 text-sm text-stone-500">No captures logged yet today.</p>
          )}
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Captures</h2>
          {captures.length === 0 ? <p className="text-sm text-stone-500">No captures logged yet.</p> : null}
          {captures.map((row) => (
            <p key={row.speciesId} className="flex justify-between py-1 text-sm">
              <span>{speciesName[row.speciesId] ?? "Unknown"}</span>
              <span className="font-medium">{row._sum.quantity ?? 0}</span>
            </p>
          ))}
          <p className="mt-3 text-xs text-stone-500">{traps} trap{traps === 1 ? "" : "s"} still in the field.</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Tech hours</h2>
          <div className="mb-4">
            <PeriodToolbar view={hoursView} date={hoursDate} basePath="/reports" dayLabel="Day" weekLabel="Week" />
          </div>
          {timesheets.length === 0 ? (
            <p className="text-sm text-stone-500">No punches in this period.</p>
          ) : (
            Object.entries(
              timesheets.reduce<Record<string, typeof timesheets>>((acc, sheet) => {
                (acc[sheet.userId] ??= []).push(sheet);
                return acc;
              }, {}),
            ).map(([userId, sheets]) => {
              const name = `${sheets[0]?.user.firstName} ${sheets[0]?.user.lastName}`;
              const days = hoursByDay(sheets);
              const total = days.reduce((sum, day) => sum + day.minutes, 0);
              return (
                <div key={userId} className="mb-4 border-b border-line pb-3 last:mb-0 last:border-b-0 last:pb-0">
                  <p className="flex justify-between text-sm font-semibold">
                    <span>{name}</span>
                    <span>{formatDuration(total)}</span>
                  </p>
                  {hoursView === "week" ? (
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
            })
          )}
        </article>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </article>
  );
}
