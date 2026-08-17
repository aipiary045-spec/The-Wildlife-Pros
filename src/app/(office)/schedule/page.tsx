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
      where: { date: { gte: from, lte: to }, status: "APPROVED" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">Board</h1>
          <p className="text-stone-600 sm:hidden">Who is out, and when. Open a stop to see the work order.</p>
          <p className="hidden text-stone-600 sm:block">
            Dispatch lives here: pull from the needs pool, drop a stop on a tech and a time. Open a job to edit the work order, traps, or invoice.
          </p>
        </div>
        <Link
          href={`/routes?date=${dateKey(date)}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold sm:w-auto"
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
