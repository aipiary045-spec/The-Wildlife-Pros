import { startOfWeek } from "date-fns";
import { WeekBoard } from "@/components/schedule/WeekBoard";
import { getSchedule } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const weekOf = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { jobs, technicians } = await getSchedule(weekOf, new Date(weekOf.getTime() + 6 * 86400000));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Schedule & dispatch</h1>
        <p className="text-stone-600">
          Jobber-style week board. Drag jobs between technicians and days, then optimize driving order on Routes.
        </p>
      </div>
      <WeekBoard
        weekOf={weekOf.toISOString()}
        technicians={technicians}
        jobs={jobs.map((job) => ({
          id: job.id,
          title: job.title,
          status: job.status,
          scheduledStart: job.scheduledStart,
          durationMin: job.durationMin,
          technicianId: job.technicianId,
          client: job.client,
          property: job.property,
        }))}
      />
    </div>
  );
}
