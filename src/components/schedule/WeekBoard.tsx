"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { dateKey } from "@/lib/dates";
import { AppointmentChip, DragGhost } from "./AppointmentChip";
import type { CopyRequest, ScheduleMode } from "./useScheduleBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import { useScheduleBoard } from "./useScheduleBoard";

export function WeekBoard({
  jobs,
  unscheduled = [],
  technicians,
  weekOf,
  mode,
  onCopyRequest,
  onNewJob,
}: {
  jobs: ScheduleJobCard[];
  unscheduled?: ScheduleJobCard[];
  technicians: ScheduleTech[];
  weekOf: string;
  mode: ScheduleMode;
  onCopyRequest?: (request: CopyRequest) => void;
  onNewJob?: (technicianId: string, day: Date, time?: string) => void;
}) {
  const { saving, error, drag, placeJob, onChipPointerDown } = useScheduleBoard(
    [...jobs, ...unscheduled],
    mode,
    onCopyRequest,
  );
  const start = startOfWeek(new Date(weekOf.includes("T") ? weekOf : `${weekOf}T12:00:00`), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const draggingJob = drag ? [...jobs, ...unscheduled].find((job) => job.id === drag.jobId) : null;

  function chipProps(job: ScheduleJobCard, day: Date) {
    return {
      job,
      technicians,
      dragging: drag?.jobId === job.id,
      onPointerDown: (event: React.PointerEvent, immediate?: boolean) =>
        onChipPointerDown(event, job.id, immediate),
      onReassign: (technicianId: string) => void placeJob(job.id, technicianId, day),
    };
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Hold a job or drag the grip onto a tech and day. You can also pick a name under the job.{" "}
        {saving ? "Saving…" : "Changes save immediately."}
      </p>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {unscheduled.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-panel p-3">
          <h2 className="mb-2 text-sm font-semibold">Unscheduled — drop onto a tech</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unscheduled.map((job) => (
              <AppointmentChip key={job.id} {...chipProps(job, start)} />
            ))}
          </div>
        </section>
      ) : null}
      <div className="space-y-3 md:hidden">
        {days.map((day) => {
          const dayJobs = jobs
            .filter((job) => job.scheduledStart && dateKey(new Date(job.scheduledStart)) === dateKey(day))
            .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
          return (
            <section key={day.toISOString()} className="rounded-2xl border border-line bg-panel p-3">
              <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>
                  {format(day, "EEEE, MMM d")}
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    {dayJobs.length} stop{dayJobs.length === 1 ? "" : "s"}
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-orange px-2 py-1 text-xs font-bold text-white"
                  onClick={() => onNewJob?.(technicians[0]?.id ?? "", day, "09:00")}
                >
                  + Job
                </button>
              </h2>
              {dayJobs.length === 0 ? (
                <p className="py-3 text-center text-xs text-stone-500">No stops</p>
              ) : (
                <div className="space-y-3">
                  {technicians.map((tech) => {
                    const techJobs = dayJobs.filter((job) => job.technicianId === tech.id);
                    if (techJobs.length === 0) return null;
                    return (
                      <div
                        key={tech.id}
                        data-drop-tech={tech.id}
                        data-drop-day={dateKey(day)}
                        className={drag?.overTechId === tech.id ? "rounded-xl bg-orange/10 p-1" : ""}
                      >
                        <p className="mb-1 text-xs font-semibold text-stone-600">
                          {tech.firstName} {tech.lastName}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {techJobs.map((job) => (
                            <AppointmentChip key={job.id} showVisit {...chipProps(job, day)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-panel md:block">
        <table className="min-w-[1100px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-background">
              <th className="w-40 px-3 py-3 text-left">Technician</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="px-3 py-3 text-left">
                  {format(day, "EEE MMM d")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {technicians.map((tech) => (
              <tr key={tech.id} className="border-t border-line align-top">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: tech.color }}
                    >
                      {tech.firstName.charAt(0)}
                      {tech.lastName.charAt(0)}
                    </span>
                    {tech.firstName} {tech.lastName}
                  </div>
                </td>
                {days.map((day) => {
                  const cellJobs = jobs
                    .filter((job) => {
                      if (job.technicianId !== tech.id || !job.scheduledStart) return false;
                      return dateKey(new Date(job.scheduledStart)) === dateKey(day);
                    })
                    .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
                  return (
                    <td key={`${tech.id}-${day.toISOString()}`} className="h-36 px-2 py-2">
                      <div
                        data-drop-tech={tech.id}
                        data-drop-day={dateKey(day)}
                        className={`flex min-h-28 gap-2 overflow-x-auto rounded-xl p-1 ${
                          drag?.overTechId === tech.id ? "bg-orange/15" : "bg-background/70"
                        }`}
                      >
                        {cellJobs.map((job) => (
                          <AppointmentChip key={job.id} {...chipProps(job, day)} />
                        ))}
                        <button
                          type="button"
                          className="w-16 shrink-0 rounded-lg border border-dashed border-line text-[11px] font-semibold text-stone-500 hover:border-orange hover:text-orange"
                          onClick={() => onNewJob?.(tech.id, day, "09:00")}
                        >
                          + Job
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {draggingJob && drag ? <DragGhost job={draggingJob} x={drag.x} y={drag.y} /> : null}
    </div>
  );
}
