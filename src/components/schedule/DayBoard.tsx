"use client";

import { format } from "date-fns";
import { Clock } from "lucide-react";
import { dateKey, formatClockDuration, sameDay } from "@/lib/dates";
import { AppointmentChip } from "./AppointmentChip";
import type { CopyRequest, ScheduleMode } from "./useScheduleBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import { useScheduleBoard } from "./useScheduleBoard";

export function DayBoard({
  jobs,
  unscheduled = [],
  technicians,
  date,
  mode,
  compact = false,
  onCopyRequest,
  onNewJob,
}: {
  jobs: ScheduleJobCard[];
  unscheduled?: ScheduleJobCard[];
  technicians: ScheduleTech[];
  date: string;
  mode: ScheduleMode;
  compact?: boolean;
  onCopyRequest?: (request: CopyRequest) => void;
  onNewJob?: (technicianId: string, day: Date, time?: string) => void;
}) {
  const { saving, onDragStart, onDragOver, onDrop } = useScheduleBoard(
    [...jobs, ...unscheduled],
    mode,
    onCopyRequest,
  );
  const day = new Date(date.includes("T") ? date : `${date}T12:00:00`);
  const dayJobs = jobs.filter((job) => job.scheduledStart && sameDay(new Date(job.scheduledStart), day));
  const unassigned = dayJobs.filter((job) => !job.technicianId);

  return (
    <div className="space-y-3">
      {compact ? null : (
        <p className="text-xs text-stone-500">
          {mode === "copy"
            ? "Drop a job on a tech row to copy it. Check in when you arrive; check out asks if they need a follow-up."
            : "Each row is one person. Jobs sit left to right in order. Drag a stop onto a row, or tap + Job."}{" "}
          {saving ? "Saving…" : "Changes save immediately."}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="overflow-x-auto">
          {technicians.map((tech) => {
            const techJobs = dayJobs
              .filter((job) => job.technicianId === tech.id)
              .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
            const minutes = techJobs.reduce((sum, job) => sum + (job.durationMin ?? 0), 0);
            return (
              <Lane
                key={tech.id}
                label={`${tech.firstName} ${tech.lastName}`}
                initials={`${tech.firstName.charAt(0)}${tech.lastName.charAt(0)}`}
                color={tech.color}
                hours={formatClockDuration(minutes)}
                onDragOver={onDragOver}
                onDrop={(event) => onDrop(event, tech.id, day)}
                onAdd={() => onNewJob?.(tech.id, day, nextOpenTime(techJobs))}
              >
                {techJobs.length === 0 ? (
                  <p className="self-center whitespace-nowrap px-2 text-xs text-stone-400">No stops — drop a job here</p>
                ) : (
                  techJobs.map((job) => (
                    <AppointmentChip
                      key={job.id}
                      job={job}
                      technicians={technicians}
                      showVisit={!compact}
                      onDragStart={onDragStart}
                    />
                  ))
                )}
              </Lane>
            );
          })}
          {unassigned.length > 0 || unscheduled.length > 0 ? (
            <Lane
              label="Unassigned"
              initials="—"
              color="#78716c"
              hours={formatClockDuration(
                [...unassigned, ...unscheduled].reduce((sum, job) => sum + (job.durationMin ?? 0), 0),
              )}
              onDragOver={onDragOver}
              onDrop={(event) => event.preventDefault()}
              onAdd={() => onNewJob?.(technicians[0]?.id ?? "", day, "09:00")}
            >
              {[...unassigned, ...unscheduled].map((job) => (
                <AppointmentChip
                  key={job.id}
                  job={job}
                  technicians={technicians}
                  showVisit={!compact}
                  onDragStart={onDragStart}
                />
              ))}
            </Lane>
          ) : null}
        </div>
      </div>
      <p className="sr-only">{dateKey(day)}</p>
    </div>
  );
}

function Lane({
  label,
  initials,
  color,
  hours,
  children,
  onDragOver,
  onDrop,
  onAdd,
}: {
  label: string;
  initials: string;
  color: string;
  hours: string;
  children: React.ReactNode;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-[5.5rem] w-full min-w-max items-stretch border-b border-line last:border-b-0">
      <div className="sticky left-0 z-10 flex w-36 shrink-0 items-center gap-2 border-r border-line bg-panel px-3 py-3 md:w-44">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: color }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{label}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
            <Clock size={11} />
            {hours}
          </p>
        </div>
      </div>
      <div className="flex min-w-[16rem] flex-1 items-stretch gap-2 px-2 py-2.5" onDragOver={onDragOver} onDrop={onDrop}>
        {children}
        <button
          type="button"
          className="w-16 shrink-0 self-stretch rounded-lg border border-dashed border-line text-xs font-semibold text-stone-500 hover:border-orange hover:text-orange"
          onClick={onAdd}
        >
          + Job
        </button>
      </div>
    </div>
  );
}

function nextOpenTime(jobs: ScheduleJobCard[]) {
  if (jobs.length === 0) return "09:00";
  const last = jobs[jobs.length - 1];
  if (!last.scheduledStart) return "09:00";
  const end = new Date(last.scheduledStart);
  end.setMinutes(end.getMinutes() + (last.durationMin || 60));
  return format(end, "HH:mm");
}
