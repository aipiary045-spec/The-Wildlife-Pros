"use client";

import { format } from "date-fns";
import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
import {
  dateKey,
  dayTimelineSlots,
  formatClockDuration,
  jobTimelinePlacement,
  sameDay,
  slotTimeValue,
} from "@/lib/dates";
import { AppointmentChip, DragGhost } from "./AppointmentChip";
import type { CopyRequest, ScheduleMode } from "./useScheduleBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import { useScheduleBoard } from "./useScheduleBoard";

const TRACK_MIN = "min-w-[99rem]";
const SLOT_COUNT = dayTimelineSlots().length;

export function DayBoard({
  jobs,
  unscheduled = [],
  technicians,
  date,
  mode,
  compact = false,
  onCopyRequest,
  onNewJob,
  availability = [],
}: {
  jobs: ScheduleJobCard[];
  unscheduled?: ScheduleJobCard[];
  technicians: ScheduleTech[];
  date: string;
  mode: ScheduleMode;
  compact?: boolean;
  onCopyRequest?: (request: CopyRequest) => void;
  onNewJob?: (technicianId: string, day: Date, time?: string) => void;
  availability?: Array<{ technicianId: string; date: string; reason: string | null }>;
}) {
  const { saving, error, drag, placeJob, onChipPointerDown, wasRecentDrop } = useScheduleBoard(
    [...jobs, ...unscheduled],
    mode,
    onCopyRequest,
  );
  const day = new Date(date.includes("T") ? date : `${date}T12:00:00`);
  const dayKey = dateKey(day);
  const slots = dayTimelineSlots();
  const dayJobs = jobs.filter((job) => job.scheduledStart && sameDay(new Date(job.scheduledStart), day));
  const unassigned = dayJobs.filter((job) => !job.technicianId);
  const draggingJob = drag ? [...jobs, ...unscheduled].find((job) => job.id === drag.jobId) : null;
  const [focusTech, setFocusTech] = useState("all");
  const phoneTechs = useMemo(
    () => (focusTech === "all" ? technicians : technicians.filter((tech) => tech.id === focusTech)),
    [focusTech, technicians],
  );

  function chipProps(job: ScheduleJobCard, layout: "card" | "timeline" | "list" = "card") {
    return {
      job,
      technicians,
      layout,
      showVisit: false,
      dragging: drag?.jobId === job.id,
      onPointerDown: (event: React.PointerEvent, immediate?: boolean) =>
        onChipPointerDown(event, job.id, immediate),
      onReassign: (technicianId: string) => void placeJob(job.id, technicianId, day),
    };
  }

  return (
    <div className="space-y-3">
      {compact ? (
        <p className="text-xs text-stone-500">Hold a job and drop it, or pick a name under the job.</p>
      ) : (
        <p className="text-xs text-stone-500">
          {mode === "copy"
            ? "Drop a job on a tech to copy that trip."
            : "On a phone, pick a tech and assign the stop. On a computer, drag it onto the timeline."}{" "}
          {saving ? "Saving…" : "Changes save immediately."}
        </p>
      )}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3 md:hidden">
        {technicians.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <TechFilterChip label="All techs" active={focusTech === "all"} onClick={() => setFocusTech("all")} />
            {technicians.map((tech) => (
              <TechFilterChip
                key={tech.id}
                label={tech.firstName}
                color={tech.color}
                active={focusTech === tech.id}
                onClick={() => setFocusTech(tech.id)}
              />
            ))}
          </div>
        ) : null}
        {unassigned.length > 0 || unscheduled.length > 0 ? (
          <section className="rounded-2xl border border-dashed border-line bg-panel p-3">
            <h2 className="mb-2 text-sm font-semibold">Needs a tech</h2>
            <div className="space-y-2">
              {[...unassigned, ...unscheduled].map((job) => (
                <AppointmentChip key={job.id} {...chipProps(job, "list")} />
              ))}
            </div>
          </section>
        ) : null}
        {phoneTechs.map((tech) => {
          const techJobs = dayJobs
            .filter((job) => job.technicianId === tech.id)
            .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
          const minutes = techJobs.reduce((sum, job) => sum + (job.durationMin ?? 0), 0);
          const off = availability.find((block) => block.technicianId === tech.id && block.date === dayKey);
          return (
            <section
              key={tech.id}
              data-drop-tech={tech.id}
              data-drop-day={dayKey}
              className={`rounded-2xl border border-line bg-panel p-3 ${
                drag?.overTechId === tech.id ? "ring-2 ring-orange" : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: tech.color }}
                  >
                    {tech.firstName.charAt(0)}
                    {tech.lastName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {tech.firstName} {tech.lastName}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {formatClockDuration(minutes)}
                      {off ? ` · off${off.reason ? ` · ${off.reason}` : ""}` : ""}
                    </p>
                  </div>
                </div>
                {off ? null : (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-orange px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => onNewJob?.(tech.id, day, nextOpenTime(techJobs))}
                  >
                    + Job
                  </button>
                )}
              </div>
              {techJobs.length === 0 ? (
                <p className="py-4 text-center text-xs text-stone-500">No stops yet</p>
              ) : (
                <div className="space-y-2">
                  {techJobs.map((job) => (
                    <AppointmentChip key={job.id} {...chipProps(job, "list")} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex border-b border-line bg-background">
              <div className="sticky left-0 z-20 flex w-36 shrink-0 items-end border-r border-line bg-background px-3 py-2 md:w-44">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Time</p>
              </div>
              <div className={`relative grid flex-1 ${TRACK_MIN}`} style={{ gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(0, 1fr))` }}>
                {slots.map((slot) => (
                  <div
                    key={`${slot.hour}-${slot.minute}`}
                    className={`border-r px-0.5 py-2 text-center last:border-r-0 ${
                      slot.minute === 0 ? "border-stone-300" : "border-stone-200/80"
                    }`}
                  >
                    <p className={`text-[10px] leading-none ${slot.minute === 0 ? "font-bold text-ink" : "text-stone-400"}`}>
                      {slot.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {technicians.map((tech) => {
              const techJobs = dayJobs
                .filter((job) => job.technicianId === tech.id)
                .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
              const minutes = techJobs.reduce((sum, job) => sum + (job.durationMin ?? 0), 0);
              const stacked = stackTimelineJobs(techJobs);
              const off = availability.find((block) => block.technicianId === tech.id && block.date === dayKey);
              const trackHeight = Math.max(7, stacked.lanes * 6.75);
              return (
                <Lane
                  key={tech.id}
                  label={`${tech.firstName} ${tech.lastName}`}
                  initials={`${tech.firstName.charAt(0)}${tech.lastName.charAt(0)}`}
                  color={tech.color}
                  hours={formatClockDuration(minutes)}
                  technicianId={tech.id}
                  dayKey={dayKey}
                  off={off}
                  active={drag?.overTechId === tech.id}
                  onAdd={() => onNewJob?.(tech.id, day, nextOpenTime(techJobs))}
                >
                  <div
                    data-drop-track
                    className={`relative flex-1 ${TRACK_MIN}`}
                    style={{ minHeight: `${trackHeight}rem` }}
                  >
                    <div
                      className="absolute inset-0 grid"
                      style={{ gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(0, 1fr))` }}
                    >
                      {slots.map((slot) => (
                        <button
                          key={`${slot.hour}-${slot.minute}`}
                          type="button"
                          aria-label={`Add job at ${slot.label}`}
                          className={`border-r last:border-r-0 hover:bg-orange/10 ${
                            slot.minute === 0 ? "border-stone-300/80" : "border-stone-200/60"
                          }`}
                          onClick={() => {
                            if (wasRecentDrop()) return;
                            onNewJob?.(tech.id, day, slotTimeValue(slot.hour, slot.minute));
                          }}
                        />
                      ))}
                    </div>
                    {drag?.overTechId === tech.id && drag.overStartAt ? (
                      <div
                        className="pointer-events-none absolute inset-y-0 z-10 bg-orange/20"
                        style={{
                          left: `${jobTimelinePlacement(drag.overStartAt, 30).left}%`,
                          width: `${jobTimelinePlacement(drag.overStartAt, 30).width}%`,
                        }}
                      />
                    ) : null}
                    {stacked.placed.map(({ job, lane }) => {
                      const start = job.scheduledStart ? new Date(job.scheduledStart) : day;
                      const place = jobTimelinePlacement(start, job.durationMin ?? 60);
                      return (
                        <div
                          key={job.id}
                          className="absolute z-20 px-0.5"
                          style={{
                            left: `${place.left}%`,
                            width: `${place.width}%`,
                            top: `calc(${(lane / stacked.lanes) * 100}% + 0.25rem)`,
                            height: `calc(${100 / stacked.lanes}% - 0.5rem)`,
                          }}
                        >
                          <AppointmentChip {...chipProps(job, "timeline")} />
                        </div>
                      );
                    })}
                  </div>
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
                <div className="flex min-w-[16rem] flex-1 items-stretch gap-2 px-2 py-2.5">
                  {[...unassigned, ...unscheduled].map((job) => (
                    <AppointmentChip key={job.id} {...chipProps(job)} />
                  ))}
                </div>
              </Lane>
            ) : null}
          </div>
        </div>
      </div>
      {draggingJob && drag ? (
        <DragGhost job={draggingJob} x={drag.x} y={drag.y} snapTime={drag.overStartAt} />
      ) : null}
      <p className="sr-only">{dayKey}</p>
    </div>
  );
}

function TechFilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active ? "border-orange bg-orange text-white" : "border-line bg-panel text-stone-600"
      }`}
    >
      {color ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> : null}
      {label}
    </button>
  );
}

function Lane({
  label,
  initials,
  color,
  hours,
  technicianId,
  dayKey,
  off,
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
  off?: { reason: string | null };
  active?: boolean;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  return (
    <div
      data-drop-tech={technicianId}
      data-drop-day={dayKey}
      className={`flex min-h-[7rem] w-full items-stretch border-b border-line last:border-b-0 ${
        active ? "bg-orange/10" : ""
      }`}
    >
      <div
        className={`sticky left-0 z-30 flex w-36 shrink-0 items-center gap-2 border-r border-line px-3 py-3 md:w-44 ${
          active ? "bg-orange/10" : "bg-panel"
        }`}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: color }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{label}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
            <Clock size={11} />
            {hours}
          </p>
          {off ? (
            <p className="mt-1 text-[11px] font-semibold text-rose-700">
              Off{off.reason ? ` · ${off.reason}` : ""}
            </p>
          ) : (
            <button
              type="button"
              className="mt-1 text-[11px] font-semibold text-orange hover:underline"
              onClick={onAdd}
            >
              + Job
            </button>
          )}
        </div>
      </div>
      {children}
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

function stackTimelineJobs(jobs: ScheduleJobCard[]) {
  const ends: number[] = [];
  const placed = jobs.map((job) => {
    const start = job.scheduledStart ? new Date(job.scheduledStart).getTime() : 0;
    const end = start + Math.max(30, job.durationMin || 60) * 60_000;
    let lane = ends.findIndex((busyUntil) => busyUntil <= start);
    if (lane === -1) {
      lane = ends.length;
      ends.push(end);
    } else {
      ends[lane] = end;
    }
    return { job, lane };
  });
  return { placed, lanes: Math.max(1, ends.length) };
}
