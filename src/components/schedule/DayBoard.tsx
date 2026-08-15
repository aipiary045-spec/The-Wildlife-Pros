"use client";

import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
import { JOB_TYPE_BAR } from "@/lib/constants";
import {
  dateKey,
  dayTimelineHours,
  hourLabel,
  jobTimelinePlacement,
  sameDay,
  timeFromTimelineRatio,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CopyRequest, ScheduleMode } from "./useScheduleBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import { useScheduleBoard } from "./useScheduleBoard";

export function DayBoard({
  jobs,
  unscheduled = [],
  technicians,
  date,
  mode,
  onCopyRequest,
  onNewJob,
}: {
  jobs: ScheduleJobCard[];
  unscheduled?: ScheduleJobCard[];
  technicians: ScheduleTech[];
  date: string;
  mode: ScheduleMode;
  onCopyRequest?: (request: CopyRequest) => void;
  onNewJob?: (technicianId: string, day: Date, time?: string) => void;
}) {
  const { saving, placeJob, onDragStart, onDragOver, onDrop } = useScheduleBoard(
    [...jobs, ...unscheduled],
    mode,
    onCopyRequest,
  );
  const day = new Date(date.includes("T") ? date : `${date}T12:00:00`);
  const hours = dayTimelineHours();
  const now = new Date();
  const showNow = sameDay(day, now);
  const nowPlace = showNow ? jobTimelinePlacement(now, 15) : null;

  function dropOnTrack(event: React.DragEvent, technicianId: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    const startAt = timeFromTimelineRatio(day, (event.clientX - rect.left) / rect.width);
    onDrop(event, technicianId, day, startAt);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        {mode === "copy"
          ? "Drop a job on a time to open a copy. Check in when you arrive; check out asks if they need a follow-up."
          : "Tap + Job, click an hour, or drag a stop onto a tech and time. Check in on site. Check out asks follow-up vs complete."}{" "}
        {saving ? "Saving…" : "Changes save immediately."}
      </p>

      <div className="space-y-3 md:hidden">
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
                <TechLabel tech={tech} />
                <button
                  type="button"
                  className="rounded-lg bg-orange px-2 py-1 text-xs font-bold text-white"
                  onClick={() => onNewJob?.(tech.id, day, "09:00")}
                >
                  + Job
                </button>
              </div>
              <div className="min-h-24 space-y-2 rounded-xl bg-background/70 p-1">
                {techJobs.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-stone-500">No stops — drop a job here</p>
                ) : (
                  techJobs.map((job, index) => (
                    <JobBlock
                      key={job.id}
                      job={job}
                      index={index}
                      technicians={technicians}
                      onDragStart={onDragStart}
                      onReassign={(technicianId) => void placeJob(job.id, technicianId, day, false)}
                      mobile
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-panel md:block">
        <div className="min-w-[1100px]">
          <div className="grid bg-background" style={{ gridTemplateColumns: "11rem 1fr" }}>
            <div className="px-3 py-3 text-sm font-semibold">Technician</div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}>
              {hours.map((hour) => (
                <div key={hour} className="border-l border-line px-1 py-3 text-xs font-semibold text-stone-500">
                  {hourLabel(hour)}
                </div>
              ))}
            </div>
          </div>
          {technicians.map((tech) => {
            const techJobs = jobs
              .filter((job) => job.technicianId === tech.id && job.scheduledStart && sameDay(new Date(job.scheduledStart), day))
              .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
            return (
              <div key={tech.id} className="grid border-t border-line" style={{ gridTemplateColumns: "11rem 1fr" }}>
                <div className="flex items-center justify-between gap-2 px-3 py-3">
                  <TechLabel tech={tech} />
                  <button
                    type="button"
                    className="rounded-lg bg-orange px-2 py-1 text-xs font-bold text-white"
                    onClick={() => onNewJob?.(tech.id, day, "09:00")}
                  >
                    + Job
                  </button>
                </div>
                <div
                  className="relative min-h-28"
                  onDragOver={onDragOver}
                  onDrop={(event) => dropOnTrack(event, tech.id)}
                >
                  <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
                  >
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        className="border-l border-line/70 hover:bg-orange/5"
                        aria-label={`Add job at ${hourLabel(hour)} for ${tech.firstName}`}
                        onClick={() => onNewJob?.(tech.id, day, `${String(hour).padStart(2, "0")}:00`)}
                      />
                    ))}
                  </div>
                  {nowPlace ? (
                    <div
                      className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-orange"
                      style={{ left: `${nowPlace.left}%` }}
                      aria-hidden
                    />
                  ) : null}
                  {techJobs.map((job) => {
                    const start = new Date(job.scheduledStart!);
                    const place = jobTimelinePlacement(start, job.durationMin ?? 60);
                    return (
                      <article
                        key={job.id}
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          onDragStart(event, job.id);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className={cn(
                          "absolute top-2 z-20 cursor-grab overflow-hidden rounded-lg border border-line border-l-4 px-2 py-1.5 shadow-sm",
                          JOB_TYPE_BAR[job.type ?? ""] ?? "border-l-orange bg-white",
                        )}
                        style={{ left: `${place.left}%`, width: `${Math.max(place.width, 8)}%` }}
                      >
                        <p className="text-[11px] font-semibold text-orange">
                          {format(start, "h:mm a")}
                          {job.sourceJobId ? " · Trip" : ""}
                        </p>
                        <Link href={`/jobs/${job.id}`} className="block font-medium leading-tight hover:underline">
                          {job.title}
                        </Link>
                        <p className="truncate text-xs text-stone-500">
                          {job.client.lastName} · {job.property.address1}
                        </p>
                        <JobVisitControls
                          jobId={job.id}
                          status={job.status}
                          technicianId={job.technicianId}
                          technicians={technicians}
                          compact
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="sr-only">{dateKey(day)}</p>
    </div>
  );
}

function TechLabel({ tech }: { tech: ScheduleTech }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: tech.color }}
      >
        {tech.firstName.charAt(0)}
        {tech.lastName.charAt(0)}
      </span>
      <h2 className="truncate font-semibold">
        {tech.firstName} {tech.lastName}
      </h2>
    </div>
  );
}

function JobBlock({
  job,
  index,
  technicians,
  onDragStart,
  onReassign,
  mobile,
}: {
  job: ScheduleJobCard;
  index: number;
  technicians: ScheduleTech[];
  onDragStart: (event: React.DragEvent, jobId: string) => void;
  onReassign: (technicianId: string) => void;
  mobile?: boolean;
}) {
  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, job.id)}
      className={cn(
        "rounded-lg border border-line border-l-4 bg-white px-3 py-2 shadow-sm md:cursor-grab",
        JOB_TYPE_BAR[job.type ?? ""] ?? "border-l-orange",
      )}
    >
      <p className="text-xs font-semibold text-orange">
        Stop {index + 1} · {job.scheduledStart ? format(new Date(job.scheduledStart), "h:mm a") : "Anytime"}
        {job.sourceJobId ? " · Trip" : ""}
      </p>
      <Link href={`/jobs/${job.id}`} className="font-medium leading-tight hover:underline">
        {job.title}
      </Link>
      <p className="text-xs text-stone-500">
        {job.client.lastName} · {job.property.address1}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={job.status} />
        {mobile ? (
          <>
            <label className="sr-only" htmlFor={`assign-${job.id}`}>
              Reassign
            </label>
            <select
              id={`assign-${job.id}`}
              className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
              value={job.technicianId ?? ""}
              onChange={(event) => onReassign(event.target.value)}
            >
              {technicians.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.firstName} {option.lastName}
                </option>
              ))}
            </select>
            <JobVisitControls
              jobId={job.id}
              status={job.status}
              technicianId={job.technicianId}
              technicians={technicians}
              compact
            />
          </>
        ) : null}
      </div>
    </article>
  );
}
