"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { checkInsByTechnician, formatOnSiteDuration } from "@/lib/active-checkins";
import {
  dateKey,
  dayTimelineSlots,
  formatClockDuration,
  jobTimelinePlacement,
  sameDay,
  slotTimeValue,
} from "@/lib/dates";
import { nextOpenTime } from "@/lib/schedule-slot";
import { AppointmentChip, DragGhost } from "./AppointmentChip";
import type { CopyRequest, ScheduleMode } from "./useScheduleBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import { useScheduleBoard } from "./useScheduleBoard";

const TRACK_MIN = "min-w-[72rem] md:min-w-[99rem]";
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
  activeCheckIns = [],
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
  activeCheckIns?: Array<{
    jobId: string;
    jobNumber: string;
    clientName: string;
    technicianId: string;
    minutesOnSite: number;
  }>;
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
  const [phoneLayout, setPhoneLayout] = useState<"calendar" | "list">("calendar");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const phoneTechs = useMemo(
    () => (focusTech === "all" ? technicians : technicians.filter((tech) => tech.id === focusTech)),
    [focusTech, technicians],
  );
  const checkInsByTech = useMemo(() => checkInsByTechnician(activeCheckIns), [activeCheckIns]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const hour = sameDay(day, new Date()) ? Math.max(7, Math.min(16, new Date().getHours())) : 8;
    const marker = scroller.querySelector<HTMLElement>(`[data-slot-hour="${hour}"]`);
    if (!marker) return;
    const left = marker.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    scroller.scrollLeft = Math.max(0, left - 8);
  }, [dayKey]);

  function chipProps(job: ScheduleJobCard, layout: "card" | "timeline" | "list" = "card") {
    return {
      job,
      technicians,
      layout,
      showVisit: false,
      dragging: drag?.jobId === job.id,
      onPointerDown: (event: React.PointerEvent, immediate?: boolean) =>
        onChipPointerDown(event, job.id, immediate),
      onReassign: (technicianId: string) => void placeJob(job.id, technicianId || null, day),
      onCopyTrip: onCopyRequest
        ? () =>
            onCopyRequest({
              job,
              technicianId: job.technicianId ?? technicians[0]?.id ?? "",
              day: job.scheduledStart ? new Date(job.scheduledStart) : day,
            })
        : undefined,
    };
  }

  return (
    <div className="space-y-3">
      {saving ? <p className="text-xs text-stone-500">Saving…</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {compact ? null : (
        <div className="flex rounded-full border border-line bg-panel p-1 md:hidden">
          <button
            type="button"
            onClick={() => setPhoneLayout("calendar")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold ${
              phoneLayout === "calendar" ? "bg-orange text-white" : "text-stone-600"
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setPhoneLayout("list")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold ${
              phoneLayout === "list" ? "bg-orange text-white" : "text-stone-600"
            }`}
          >
            List
          </button>
        </div>
      )}

      {compact || phoneLayout === "calendar" ? null : (
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
          const onSite = checkInsByTech[tech.id];
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
                    {onSite ? (
                      <Link
                        href={`/jobs/${onSite.jobId}`}
                        className="mt-1 block truncate text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        On site · {onSite.clientName} · {formatOnSiteDuration(onSite.minutesOnSite)}
                      </Link>
                    ) : null}
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
      )}

      <div
        className={`overflow-hidden rounded-2xl border border-line bg-panel ${
          compact || phoneLayout === "calendar" ? "" : "max-md:hidden"
        }`}
      >
        <div ref={scrollerRef} className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex border-b border-line bg-background">
              <div className="sticky left-0 z-20 flex w-24 shrink-0 items-end border-r border-line bg-background px-2 py-2 md:w-44 md:px-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Time</p>
              </div>
              <div className={`relative grid flex-1 ${TRACK_MIN}`} style={{ gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(0, 1fr))` }}>
                {slots.map((slot) => (
                  <div
                    key={`${slot.hour}-${slot.minute}`}
                    data-slot-hour={slot.minute === 0 ? String(slot.hour) : undefined}
                    className={`border-r px-0.5 py-2 text-center last:border-r-0 ${
                      slot.minute === 0 ? "border-stone-300" : "border-stone-200/80"
                    }`}
                  >
                    <p className={`text-[10px] leading-none ${slot.minute === 0 ? "font-bold text-ink" : "hidden text-stone-400 md:block"}`}>
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
              const onSite = checkInsByTech[tech.id];
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
                  onSite={onSite}
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
                onAdd={() => onNewJob?.(technicians[0]?.id ?? "", day, nextOpenTime([...unassigned, ...unscheduled]))}
                active={drag?.overTechId === "unassigned"}
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
  onSite,
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
  onSite?: {
    jobId: string;
    jobNumber: string;
    clientName: string;
    minutesOnSite: number;
  };
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
        className={`sticky left-0 z-30 flex w-24 shrink-0 items-center gap-2 border-r border-line px-2 py-3 md:w-44 md:px-3 ${
          active ? "bg-orange/10" : "bg-panel"
        }`}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white md:h-9 md:w-9 md:text-xs"
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
          {onSite ? (
            <Link
              href={`/jobs/${onSite.jobId}`}
              className="mt-1 block truncate text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              On site · {onSite.clientName} · {formatOnSiteDuration(onSite.minutesOnSite)}
            </Link>
          ) : off ? (
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
