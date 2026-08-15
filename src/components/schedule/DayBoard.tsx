"use client";

import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dateKey, sameDay } from "@/lib/dates";
import { CopyTripForm } from "./CopyTripForm";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import type { ScheduleMode } from "./useScheduleBoard";
import { useScheduleBoard } from "./useScheduleBoard";

export function DayBoard({
  jobs,
  technicians,
  date,
  mode,
}: {
  jobs: ScheduleJobCard[];
  technicians: ScheduleTech[];
  date: string;
  mode: ScheduleMode;
}) {
  const { saving, placeJob, onDragStart, onDragOver, onDrop } = useScheduleBoard(jobs, mode);
  const day = new Date(date.includes("T") ? date : `${date}T12:00:00`);

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        {mode === "copy"
          ? "Drop a job on a tech to add another trip that day. The original stay put."
          : "Stops in time order. Drag to reassign, or hold Alt/Option while dropping to copy a trip."}{" "}
        {saving ? "Saving…" : "Changes save immediately."}
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {technicians.map((tech) => {
          const techJobs = jobs
            .filter((job) => job.technicianId === tech.id && job.scheduledStart && sameDay(new Date(job.scheduledStart), day))
            .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
          return (
            <section
              key={tech.id}
              className="rounded-2xl border border-line bg-panel p-3"
              onDragOver={onDragOver}
              onDrop={(event) => onDrop(event, tech.id, day)}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: tech.color }} />
                  <h2 className="font-semibold">
                    {tech.firstName} {tech.lastName}
                  </h2>
                </div>
                <p className="text-xs text-stone-500">
                  {techJobs.length} stop{techJobs.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="min-h-24 space-y-2 rounded-xl bg-background/70 p-1 md:min-h-40">
                {techJobs.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-stone-500">No stops</p>
                ) : (
                  techJobs.map((job, index) => (
                    <article
                      key={job.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, job.id)}
                      className="rounded-lg border border-line bg-white px-3 py-2 shadow-sm md:cursor-grab"
                    >
                      <p className="text-xs font-semibold text-orange">
                        Stop {index + 1} · {format(new Date(job.scheduledStart!), "h:mm a")}
                        {job.sourceJobId ? " · Trip" : ""}
                      </p>
                      <p className="font-medium leading-tight">{job.title}</p>
                      <p className="text-xs text-stone-500">
                        {job.client.lastName} · {job.property.address1}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={job.status} />
                        <label className="sr-only" htmlFor={`assign-${job.id}`}>
                          Reassign
                        </label>
                        <select
                          id={`assign-${job.id}`}
                          className="rounded-lg border border-line bg-white px-2 py-1 text-xs md:hidden"
                          value={job.technicianId ?? ""}
                          onChange={(event) => void placeJob(job.id, event.target.value, day, false)}
                        >
                          {technicians.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.firstName} {option.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:hidden">
                        <CopyTripForm job={job} technicians={technicians} onCopy={(id, techId, nextDay) => placeJob(id, techId, nextDay, true)} />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="sr-only">{dateKey(day)}</p>
    </div>
  );
}
