"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { dateKey } from "@/lib/dates";
import { AppointmentChip } from "./AppointmentChip";
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
  const { saving, onDragStart, onDragOver, onDrop } = useScheduleBoard(
    [...jobs, ...unscheduled],
    mode,
    onCopyRequest,
  );
  const start = startOfWeek(new Date(weekOf.includes("T") ? weekOf : `${weekOf}T12:00:00`), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        {mode === "copy"
          ? "Drop a job on another day to copy it. Check in when you arrive; check out asks if they need a follow-up."
          : "Tap + Job on a square, or drag a stop onto a tech and day. Check in on site. Check out asks follow-up vs complete."}{" "}
        {saving ? "Saving…" : "Changes save immediately."}
      </p>
      {unscheduled.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-panel p-3">
          <h2 className="mb-2 text-sm font-semibold">Unscheduled — drag onto a tech</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unscheduled.map((job) => (
              <AppointmentChip key={job.id} job={job} technicians={technicians} onDragStart={onDragStart} />
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
                      <div key={tech.id}>
                        <p className="mb-1 text-xs font-semibold text-stone-600">
                          {tech.firstName} {tech.lastName}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {techJobs.map((job) => (
                            <AppointmentChip
                              key={job.id}
                              job={job}
                              technicians={technicians}
                              showVisit
                              onDragStart={onDragStart}
                            />
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
                        className="flex min-h-28 gap-2 overflow-x-auto rounded-xl bg-background/70 p-1"
                        onDragOver={onDragOver}
                        onDrop={(event) => onDrop(event, tech.id, day)}
                      >
                        {cellJobs.map((job) => (
                          <AppointmentChip
                            key={job.id}
                            job={job}
                            technicians={technicians}
                            onDragStart={onDragStart}
                          />
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
    </div>
  );
}
