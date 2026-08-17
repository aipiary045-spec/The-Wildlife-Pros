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
  availability = [],
}: {
  jobs: ScheduleJobCard[];
  unscheduled?: ScheduleJobCard[];
  technicians: ScheduleTech[];
  weekOf: string;
  mode: ScheduleMode;
  onCopyRequest?: (request: CopyRequest) => void;
  onNewJob?: (technicianId: string, day: Date, time?: string) => void;
  availability?: Array<{ technicianId: string; date: string; reason: string | null }>;
}) {
  const { saving, error, drag, placeJob, onChipPointerDown } = useScheduleBoard(
    [...jobs, ...unscheduled],
    mode,
    onCopyRequest,
  );
  const start = startOfWeek(new Date(weekOf.includes("T") ? weekOf : `${weekOf}T12:00:00`), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const draggingJob = drag ? [...jobs, ...unscheduled].find((job) => job.id === drag.jobId) : null;

  function chipProps(job: ScheduleJobCard, day: Date, layout: "card" | "list" = "card") {
    return {
      job,
      technicians,
      layout,
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
          <div className="space-y-2 md:hidden">
            {unscheduled.map((job) => (
              <AppointmentChip key={job.id} {...chipProps(job, start, "list")} />
            ))}
          </div>
          <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
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
              <h2 className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="min-w-0">
                  {format(day, "EEE, MMM d")}
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    {dayJobs.length} stop{dayJobs.length === 1 ? "" : "s"}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-orange px-3 py-1.5 text-xs font-bold text-white"
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
                    const off = availability.find((block) => block.technicianId === tech.id && block.date === dateKey(day));
                    if (techJobs.length === 0 && !off) return null;
                    return (
                      <div
                        key={tech.id}
                        data-drop-tech={tech.id}
                        data-drop-day={dateKey(day)}
                        className={`relative rounded-xl p-1 ${drag?.overTechId === tech.id ? "bg-orange/10" : ""}`}
                      >
                        <p className="mb-1 text-xs font-semibold text-stone-600">
                          {tech.firstName} {tech.lastName}
                          {off ? ` · off${off.reason ? ` · ${off.reason}` : ""}` : ""}
                        </p>
                        <div className="space-y-2">
                          {techJobs.map((job) => (
                            <AppointmentChip key={job.id} {...chipProps(job, day, "list")} />
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
                  const off = availability.find((block) => block.technicianId === tech.id && block.date === dateKey(day));
                  return (
                    <td key={`${tech.id}-${day.toISOString()}`} className="h-36 px-2 py-2">
                      <div
                        data-drop-tech={tech.id}
                        data-drop-day={dateKey(day)}
                        className={`relative flex min-h-28 gap-2 overflow-x-auto rounded-xl p-1 ${
                          drag?.overTechId === tech.id ? "bg-orange/15" : "bg-background/70"
                        }`}
                      >
                        {cellJobs.map((job) => (
                          <AppointmentChip key={job.id} {...chipProps(job, day)} />
                        ))}
                        {off ? (
                          <p className="flex w-20 shrink-0 items-center justify-center rounded-lg bg-rose-50 px-1 text-center text-[11px] font-semibold text-rose-800">
                            Off{off.reason ? ` · ${off.reason}` : ""}
                          </p>
                        ) : (
                          <button
                            type="button"
                            className="w-16 shrink-0 rounded-lg border border-dashed border-line text-[11px] font-semibold text-stone-500 hover:border-orange hover:text-orange"
                            onClick={() => onNewJob?.(tech.id, day, "09:00")}
                          >
                            + Job
                          </button>
                        )}
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
