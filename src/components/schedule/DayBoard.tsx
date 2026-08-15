"use client";

import { format } from "date-fns";
import { Clock } from "lucide-react";
import { dateKey, formatClockDuration, sameDay } from "@/lib/dates";
import { AppointmentChip, DragGhost } from "./AppointmentChip";
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
  const { saving, error, drag, placeJob, onChipPointerDown } = useScheduleBoard(
    [...jobs, ...unscheduled],
    mode,
    onCopyRequest,
  );
  const day = new Date(date.includes("T") ? date : `${date}T12:00:00`);
  const dayKey = dateKey(day);
  const dayJobs = jobs.filter((job) => job.scheduledStart && sameDay(new Date(job.scheduledStart), day));
  const unassigned = dayJobs.filter((job) => !job.technicianId);
  const draggingJob = drag ? [...jobs, ...unscheduled].find((job) => job.id === drag.jobId) : null;

  function chipProps(job: ScheduleJobCard) {
    return {
      job,
      technicians,
      showVisit: !compact,
      dragging: drag?.jobId === job.id,
      onPointerDown: (event: React.PointerEvent, immediate?: boolean) =>
        onChipPointerDown(event, job.id, immediate),
      onReassign: (technicianId: string) => void placeJob(job.id, technicianId, day),
    };
  }

  return (
    <div className="space-y-3">
      {compact ? (
        <p className="text-xs text-stone-500">
          Hold a job or use the grip, then drop it on a person. Or pick a name under the job.
        </p>
      ) : (
        <p className="text-xs text-stone-500">
          {mode === "copy"
            ? "Drop a job on a tech row to copy it."
            : "Hold a job (or drag the grip) and drop it on a person. You can also pick a name under the job."}{" "}
          {saving ? "Saving…" : "Changes save immediately."}
        </p>
      )}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

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
                technicianId={tech.id}
                dayKey={dayKey}
                active={drag?.overTechId === tech.id}
                onAdd={() => onNewJob?.(tech.id, day, nextOpenTime(techJobs))}
              >
                {techJobs.length === 0 ? (
                  <p className="self-center whitespace-nowrap px-2 text-xs text-stone-400">No stops — drop a job here</p>
                ) : (
                  techJobs.map((job) => <AppointmentChip key={job.id} {...chipProps(job)} />)
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
              technicianId="unassigned"
              dayKey={dayKey}
              onAdd={() => onNewJob?.(technicians[0]?.id ?? "", day, "09:00")}
            >
              {[...unassigned, ...unscheduled].map((job) => (
                <AppointmentChip key={job.id} {...chipProps(job)} />
              ))}
            </Lane>
          ) : null}
        </div>
      </div>
      {draggingJob && drag ? <DragGhost job={draggingJob} x={drag.x} y={drag.y} /> : null}
      <p className="sr-only">{dayKey}</p>
    </div>
  );
}

function Lane({
  label,
  initials,
  color,
  hours,
  technicianId,
  dayKey,
  active,
  children,
  onAdd,
}: {
  label: string;
  initials: string;
  color: string;
  hours: string;
  technicianId: string;
  dayKey: string;
  active?: boolean;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  return (
    <div
      data-drop-tech={technicianId}
      data-drop-day={dayKey}
      className={`flex min-h-[5.5rem] w-full min-w-max items-stretch border-b border-line last:border-b-0 ${
        active ? "bg-orange/10" : ""
      }`}
    >
      <div
        className={`sticky left-0 z-10 flex w-36 shrink-0 items-center gap-2 border-r border-line px-3 py-3 md:w-44 ${
          active ? "bg-orange/10" : "bg-panel"
        }`}
      >
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
      <div className="flex min-w-[16rem] flex-1 items-stretch gap-2 px-2 py-2.5">
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
