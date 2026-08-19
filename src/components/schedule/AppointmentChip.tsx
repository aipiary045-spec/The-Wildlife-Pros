"use client";

import Link from "next/link";
import { format } from "date-fns";
import { GripVertical } from "lucide-react";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
import { JOB_TYPE_BAR, JOB_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";

const DONE = new Set(["COMPLETED", "INVOICED", "CANCELLED"]);
const LIVE = new Set(["EN_ROUTE", "ON_SITE", "IN_PROGRESS"]);

export function AppointmentChip({
  job,
  technicians,
  showVisit,
  dragging,
  layout = "card",
  onPointerDown,
  onReassign,
  onCopyTrip,
}: {
  job: ScheduleJobCard;
  technicians: ScheduleTech[];
  showVisit?: boolean;
  dragging?: boolean;
  layout?: "card" | "timeline" | "list" | "stack";
  onPointerDown: (event: React.PointerEvent, immediate?: boolean) => void;
  onReassign: (technicianId: string) => void;
  onCopyTrip?: () => void;
}) {
  const start = job.scheduledStart ? new Date(job.scheduledStart) : null;
  const typeLabel = JOB_TYPE_LABEL[job.type ?? ""] ?? job.title;
  const timeline = layout === "timeline";
  const list = layout === "list";
  const stack = layout === "stack";
  return (
    <article
      data-job-chip
      onPointerDown={(event) => onPointerDown(event)}
      className={cn(
        "touch-manipulation rounded-lg border border-line border-l-4 bg-white shadow-sm select-none",
        timeline && "flex h-full min-w-0 flex-col overflow-hidden px-1.5 py-1",
        list && "flex w-full min-w-0 flex-col px-3 py-2.5",
        stack && "flex w-full min-w-0 items-start gap-1 px-1.5 py-1",
        !timeline && !list && !stack && "w-40 shrink-0 px-2.5 py-2",
        JOB_TYPE_BAR[job.type ?? ""] ?? "border-l-orange",
        DONE.has(job.status) && "opacity-60",
        LIVE.has(job.status) && "ring-2 ring-orange/40",
        dragging && "opacity-30",
      )}
    >
      {stack ? (
        <>
          <button
            type="button"
            aria-label="Drag to another day or technician"
            className="mt-0.5 touch-none rounded p-0.5 text-stone-400 hover:text-ink"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onPointerDown(event, true);
            }}
          >
            <GripVertical size={12} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 text-[10px] font-bold tabular-nums text-stone-600">
                {start ? format(start, "h:mma") : "Any"}
              </span>
              <Link
                href={`/jobs/${job.id}`}
                draggable={false}
                onClick={(event) => {
                  if (dragging) event.preventDefault();
                }}
                className="min-w-0 truncate text-xs font-semibold leading-tight hover:underline"
              >
                {typeLabel}
              </Link>
            </div>
            <p className="truncate text-[10px] leading-tight text-stone-500">
              {job.client.lastName}
              {job.property.address1 ? ` · ${job.property.address1}` : ""}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-1">
            <button
              type="button"
              aria-label="Drag to another technician"
              className="mt-0.5 -ml-1 touch-none rounded p-0.5 text-stone-400 hover:text-ink"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPointerDown(event, true);
              }}
            >
              <GripVertical size={timeline ? 12 : 14} />
            </button>
            <p className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-wide text-stone-700">
              {start ? format(start, "h:mma") : "Anytime"}
            </p>
          </div>
          <Link
            href={`/jobs/${job.id}`}
            draggable={false}
            onClick={(event) => {
              if (dragging) event.preventDefault();
            }}
            className="mt-0.5 block truncate text-sm font-semibold leading-tight hover:underline"
          >
            {typeLabel}
          </Link>
          <p className={cn("text-xs text-stone-500", list ? "leading-snug" : "truncate")}>
            {job.client.lastName}
            {job.property.address1 ? ` · ${job.property.address1}` : ""}
          </p>
          <label className="mt-1 block">
            <span className="sr-only">Move to technician</span>
            <select
              className={cn(
                "w-full rounded-md border border-line bg-white px-1 py-1 text-[11px]",
                list && "min-h-10 px-2 py-2 text-sm",
              )}
              value={job.technicianId ?? ""}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => {
                if (event.target.value) onReassign(event.target.value);
              }}
            >
              <option value="">{job.technicianId ? "Move to…" : "Assign to…"}</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {onCopyTrip && !stack ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onCopyTrip();
          }}
          className={cn(
            "mt-1 text-left font-semibold text-orange",
            timeline ? "text-[10px] leading-tight" : "text-xs",
            list && "min-h-10",
          )}
        >
          Copy trip
        </button>
      ) : null}
      {showVisit ? (
        <JobVisitControls
          jobId={job.id}
          status={job.status}
          technicianId={job.technicianId}
          technicians={technicians}
          compact
        />
      ) : null}
    </article>
  );
}

export function DragGhost({
  job,
  x,
  y,
  snapTime,
}: {
  job: ScheduleJobCard;
  x: number;
  y: number;
  snapTime?: Date | null;
}) {
  const typeLabel = JOB_TYPE_LABEL[job.type ?? ""] ?? job.title;
  return (
    <div
      className="pointer-events-none fixed z-50 w-44 rounded-lg border border-orange bg-white px-2.5 py-2 text-sm shadow-lg"
      style={{ left: x + 8, top: y - 16 }}
    >
      <p className="font-semibold leading-tight">{typeLabel}</p>
      <p className="text-xs text-stone-500">{job.client.lastName}</p>
      {snapTime ? (
        <p className="mt-1 text-xs font-bold text-orange">
          Drop at {format(snapTime, "h:mm a")}
        </p>
      ) : null}
    </div>
  );
}
