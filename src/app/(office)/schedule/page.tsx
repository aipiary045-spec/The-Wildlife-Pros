import { DayBoard } from "@/components/schedule/DayBoard";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { WeekBoard } from "@/components/schedule/WeekBoard";
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
    status: job.status,
    scheduledStart: job.scheduledStart,
    durationMin: job.durationMin,
    technicianId: job.technicianId,
    client: job.client,
    property: job.property,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Schedule & dispatch</h1>
        <p className="text-stone-600">
          Daily and weekly boards for techs with multiple stops. Drag jobs between technicians and days, then
          optimize driving order on Routes.
        </p>
      </div>
      <ScheduleToolbar view={view} date={date} basePath="/schedule" />
      {view === "day" ? (
        <DayBoard date={dateKey(date)} technicians={technicians} jobs={cards} />
      ) : (
        <WeekBoard weekOf={dateKey(from)} technicians={technicians} jobs={cards} />
      )}
    </div>
  );
}
