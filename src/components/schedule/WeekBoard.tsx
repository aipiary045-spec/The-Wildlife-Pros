"use client";

import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
import { JOB_TYPE_BAR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { dateKey } from "@/lib/dates";
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
                <div className="space-y-2">
                  {dayJobs.map((job) => {
                    const tech = technicians.find((item) => item.id === job.technicianId);
                    return (
                      <article key={job.id} className="rounded-lg border border-line bg-white px-3 py-2">
                        <p className="text-xs font-semibold text-orange">
                          {format(new Date(job.scheduledStart!), "h:mm a")}
                          {tech ? ` · ${tech.firstName} ${tech.lastName}` : ""}
                          {job.sourceJobId ? " · Trip" : ""}
                        </p>
                        <Link href={`/jobs/${job.id}`} className="font-medium leading-tight hover:underline">
                          {job.title}
                        </Link>
                        <p className="text-xs text-stone-500">
                          {job.client.lastName} · {job.property.address1}
                        </p>
                        <div className="mt-1">
                          <StatusBadge status={job.status} />
                        </div>
                        <div className="mt-2">
                          <JobVisitControls
                            jobId={job.id}
                            status={job.status}
                            technicianId={job.technicianId}
                            technicians={technicians}
                            compact
                          />
                        </div>
                      </article>
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
                    <td
                      key={`${tech.id}-${day.toISOString()}`}
                      className="h-36 px-2 py-2"
                      onDragOver={onDragOver}
                      onDrop={(event) => onDrop(event, tech.id, day)}
                    >
                      <div className="min-h-28 space-y-2 rounded-xl bg-background/70 p-1">
                        {cellJobs.map((job) => (
                          <article
                            key={job.id}
                            draggable
                            onDragStart={(event) => onDragStart(event, job.id)}
                            className={cn(
                              "cursor-grab rounded-lg border border-line border-l-4 bg-white px-2 py-2 shadow-sm",
                              JOB_TYPE_BAR[job.type ?? ""] ?? "border-l-orange",
                            )}
                          >
                            <p className="text-xs font-semibold text-orange">
                              {format(new Date(job.scheduledStart!), "h:mm a")}
                              {job.sourceJobId ? " · Trip" : ""}
                            </p>
                            <Link href={`/jobs/${job.id}`} className="font-medium leading-tight hover:underline">
                              {job.title}
                            </Link>
                            <p className="text-xs text-stone-500">
                              {job.client.lastName} · {job.property.address1}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={job.status} />
                            </div>
                            <JobVisitControls
                              jobId={job.id}
                              status={job.status}
                              technicianId={job.technicianId}
                              technicians={technicians}
                              compact
                            />
                          </article>
                        ))}
                        <button
                          type="button"
                          className="w-full rounded-lg border border-dashed border-line py-1 text-[11px] font-semibold text-stone-500 hover:border-orange hover:text-orange"
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
