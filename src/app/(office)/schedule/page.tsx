import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";
import { getSchedule } from "@/lib/data";
import { dateKey, parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = parseScheduleView(params.view ?? "week");
  const date = parseDateParam(params.date);
  const { from, to } = scheduleRange(view, date);
  const { jobs, technicians } = await getSchedule(from, to);
  const cards = jobs.map((job) => ({
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
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Schedule & dispatch</h1>
        <p className="text-stone-600">
          Drag to move a stop. Copy trip keeps the same client and job, then asks for this visit’s date, tech, and notes.
        </p>
      </div>
      <ScheduleToolbar view={view} date={date} basePath="/schedule" />
      <ScheduleWorkspace
        view={view}
        date={dateKey(date)}
        weekOf={dateKey(from)}
        technicians={technicians}
        jobs={cards}
      />
    </div>
  );
}
