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
  onPointerDown,
  onReassign,
}: {
  job: ScheduleJobCard;
  technicians: ScheduleTech[];
  showVisit?: boolean;
  dragging?: boolean;
  onPointerDown: (event: React.PointerEvent, immediate?: boolean) => void;
  onReassign: (technicianId: string) => void;
}) {
  const start = job.scheduledStart ? new Date(job.scheduledStart) : null;
  const typeLabel = JOB_TYPE_LABEL[job.type ?? ""] ?? job.title;
  return (
    <article
      onPointerDown={(event) => onPointerDown(event)}
      className={cn(
        "w-40 shrink-0 touch-manipulation rounded-lg border border-line border-l-4 px-2.5 py-2 shadow-sm select-none",
        JOB_TYPE_BAR[job.type ?? ""] ?? "border-l-orange bg-white",
        DONE.has(job.status) && "opacity-60",
        LIVE.has(job.status) && "ring-2 ring-orange/40",
        dragging && "opacity-30",
      )}
    >
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
          <GripVertical size={14} />
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
      <p className="truncate text-xs text-stone-500">
        {job.client.lastName}
        {job.property.address1 ? ` · ${job.property.address1}` : ""}
      </p>
      <label className="mt-1 block">
        <span className="sr-only">Move to technician</span>
        <select
          className="w-full rounded-md border border-line bg-white px-1 py-1 text-[11px]"
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
}: {
  job: ScheduleJobCard;
  x: number;
  y: number;
}) {
  const typeLabel = JOB_TYPE_LABEL[job.type ?? ""] ?? job.title;
  return (
    <div
      className="pointer-events-none fixed z-50 w-40 rounded-lg border border-orange bg-white px-2.5 py-2 text-sm shadow-lg"
      style={{ left: x + 8, top: y - 16 }}
    >
      <p className="font-semibold leading-tight">{typeLabel}</p>
      <p className="text-xs text-stone-500">{job.client.lastName}</p>
    </div>
  );
}
