import Link from "next/link";
import { SchedulingPoolBanner } from "@/components/schedule/SchedulingPoolBanner";
import { CalendarFeedLink } from "@/components/schedule/CalendarFeedLink";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";
import { getActiveCheckIns } from "@/lib/active-checkins.server";
import { getSession } from "@/lib/auth";
import { getSchedule } from "@/lib/data";
import { dateKey, parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { dayAppointmentStats } from "@/lib/schedule-stats";
import { loadSchedulingPool } from "@/lib/scheduling-pool";

export const dynamic = "force-dynamic";

function toCard(job: Awaited<ReturnType<typeof getSchedule>>["jobs"][number]) {
  return {
    id: job.id,
    number: job.number,
    title: job.title,
    type: job.type,
    status: job.status,
    scheduledStart: job.scheduledStart,
    durationMin: job.durationMin,
    instructions: job.instructions,
    technicianId: job.technicianId,
    propertyId: job.propertyId,
    sourceJobId: job.sourceJobId,
    client: job.client,
    property: job.property,
  };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const view = parseScheduleView(params.view);
  const date = parseDateParam(params.date);
  const { from, to } = scheduleRange(view, date);
  const [{ jobs, unscheduled, technicians, clients }, blocks, activeCheckIns, pool] = await Promise.all([
    getSchedule(from, to),
    prisma.availabilityBlock.findMany({
      where: { date: { gte: from, lte: to }, status: "APPROVED" },
    }),
    getActiveCheckIns(),
    loadSchedulingPool(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="hidden font-display text-2xl tracking-wide md:block md:text-3xl">Schedule</h1>
        <p className="text-muted md:mt-0 sm:hidden">Drag jobs onto a tech and a time. Scroll sideways for the rest of the day.</p>
        <p className="hidden text-muted sm:block">
          Dispatch lives here: pull from the needs pool, drop a stop on a tech and a time. Open a job to edit the work order, traps, or invoice.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-orange">
          <Link href="/schedule/pool" className="hover:underline">
            Scheduling pool
            {pool.counts.total > 0 ? ` (${pool.counts.total})` : ""}
          </Link>
          <Link href="/jobs" className="hover:underline">
            Work orders
          </Link>
          <Link href={`/routes?date=${dateKey(date)}`} className="hover:underline">
            Optimize routes
          </Link>
        </p>
      </div>
      <SchedulingPoolBanner counts={pool.counts} />
      <ScheduleToolbar
        view={view}
        date={date}
        basePath="/schedule"
        routesHref={`/routes?date=${dateKey(date)}`}
      />
      {view === "day" ? (
        <DayStats jobs={jobs} />
      ) : null}
      <ScheduleWorkspace
        view={view}
        date={dateKey(date)}
        weekOf={dateKey(from)}
        technicians={technicians}
        jobs={jobs.map(toCard)}
        unscheduled={unscheduled.map(toCard)}
        clients={clients}
        availability={blocks.map((block) => ({
          technicianId: block.userId,
          date: dateKey(block.date),
          reason: block.reason,
        }))}
        activeCheckIns={activeCheckIns.map((checkIn) => ({
          jobId: checkIn.jobId,
          jobNumber: checkIn.jobNumber,
          clientName: checkIn.clientName,
          technicianId: checkIn.technicianId,
          minutesOnSite: checkIn.minutesOnSite,
        }))}
      />
      {session ? <CalendarFeedLink userId={session.id} /> : null}
    </div>
  );
}

function DayStats({ jobs }: { jobs: Array<{ status: string }> }) {
  const stats = dayAppointmentStats(jobs);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <DayStat label="Total" value={stats.total} />
      <DayStat label="To go" value={stats.toGo} />
      <DayStat label="Active" value={stats.active} />
      <DayStat label="Completed" value={stats.completed} />
    </div>
  );
}

function DayStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="font-display text-xl">{value}</p>
    </div>
  );
}
