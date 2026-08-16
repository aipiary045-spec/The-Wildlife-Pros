import Link from "next/link";
import { NeedsPool } from "@/components/schedule/NeedsPool";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";
import { getSchedule } from "@/lib/data";
import { dateKey, parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

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
  const params = await searchParams;
  const view = parseScheduleView(params.view);
  const date = parseDateParam(params.date);
  const { from, to } = scheduleRange(view, date);
  const [{ jobs, unscheduled, technicians, clients }, needs, blocks] = await Promise.all([
    getSchedule(from, to),
    prisma.scheduleNeed.findMany({
      where: { status: "OPEN" },
      include: {
        client: true,
        property: true,
        preferredTech: { select: { id: true, firstName: true, lastName: true, color: true } },
      },
      orderBy: { dueOn: "asc" },
    }),
    prisma.availabilityBlock.findMany({
      where: { date: { gte: from, lte: to } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">Schedule & dispatch</h1>
          <p className="text-stone-600">
            Pull from the needs-scheduled pool, then drop the stop on a time. Off days show as a blocker on that tech&apos;s row.
          </p>
        </div>
        <Link
          href={`/routes?date=${dateKey(date)}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold"
        >
          Optimize routes
        </Link>
      </div>
      <NeedsPool
        needs={needs.map((need) => ({
          ...need,
          dueOn: need.dueOn.toISOString(),
        }))}
        technicians={technicians}
      />
      <ScheduleToolbar view={view} date={date} basePath="/schedule" />
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
      />
    </div>
  );
}
