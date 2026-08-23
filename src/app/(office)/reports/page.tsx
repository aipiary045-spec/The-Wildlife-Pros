import { format, startOfWeek } from "date-fns";
import { PipelineOverview } from "@/components/reports/PipelineOverview";
import { AreaDensityReport } from "@/components/reports/AreaDensityReport";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodToolbar } from "@/components/schedule/PeriodToolbar";
import { getReportsOverview } from "@/lib/data";
import { parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { hoursByDay } from "@/lib/hours";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/time";

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

  const [overview, completedWeek, captures, traps, timesheets] = await Promise.all([
    getReportsOverview(),
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
      <PageHeader
        title="Reports"
        description="Scheduling, field activity, and labor hours."
        related={[
          { href: "/schedule", label: "Schedule" },
          { href: "/jobs", label: "Work orders" },
        ]}
      />
      <PipelineOverview
        jobs={overview.jobs}
        field={{
          activeTraps: overview.activeTraps,
          captureWeek: overview.captureWeek,
          clockedIn: overview.clockedIn,
        }}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Jobs completed this week" value={String(completedWeek)} />
        <Stat label="Active traps in the field" value={String(overview.activeTraps)} />
        <Stat label="Technicians on the clock" value={String(overview.clockedIn)} />
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <article className="card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Service area density</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Where open and completed jobs cluster by city and ZIP.</p>
          <AreaDensityReport />
        </article>
        <article className="card p-5">
          <h2 className="text-base font-semibold">Field activity</h2>
          <p className="text-sm text-stone-600">Active traps</p>
          <p className="stat-value">{overview.activeTraps}</p>
          <p className="mt-3 text-sm text-muted">Technicians on the clock</p>
          <p className="stat-value">{overview.clockedIn}</p>
          {overview.recentCaptures[0] ? (
            <p className="mt-3 text-sm text-stone-600">
              Latest capture: {overview.recentCaptures[0].species.commonName} at{" "}
              {overview.recentCaptures[0].job.property.address1}
            </p>
          ) : (
            <p className="mt-3 text-sm text-stone-500">No captures recorded today.</p>
          )}
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Captures</h2>
          {captures.length === 0 ? <p className="text-sm text-stone-500">No captures recorded yet.</p> : null}
          {captures.map((row) => (
            <p key={row.speciesId} className="flex justify-between py-1 text-sm">
              <span>{speciesName[row.speciesId] ?? "Unknown"}</span>
              <span className="font-medium">{row._sum.quantity ?? 0}</span>
            </p>
          ))}
          <p className="mt-3 text-xs text-stone-500">{traps} trap{traps === 1 ? "" : "s"} still in the field.</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Labor hours</h2>
          <div className="mb-4">
            <PeriodToolbar view={hoursView} date={hoursDate} basePath="/reports" dayLabel="Day" weekLabel="Week" />
          </div>
          {timesheets.length === 0 ? (
            <p className="text-sm text-stone-500">No hours recorded for this period.</p>
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
    <article className="card p-4">
      <p className="text-xs font-medium text-muted-soft">{label}</p>
      <p className="stat-value mt-2">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}
