"use client";

import Link from "next/link";
import { format } from "date-fns";
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
  onDragStart,
}: {
  job: ScheduleJobCard;
  technicians: ScheduleTech[];
  showVisit?: boolean;
  onDragStart: (event: React.DragEvent, jobId: string) => void;
}) {
  const start = job.scheduledStart ? new Date(job.scheduledStart) : null;
  const typeLabel = JOB_TYPE_LABEL[job.type ?? ""] ?? job.title;
  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, job.id)}
      className={cn(
        "w-40 shrink-0 cursor-grab rounded-lg border border-line border-l-4 px-2.5 py-2 shadow-sm",
        JOB_TYPE_BAR[job.type ?? ""] ?? "border-l-orange bg-white",
        DONE.has(job.status) && "opacity-60",
        LIVE.has(job.status) && "ring-2 ring-orange/40",
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-stone-700">
        {start ? format(start, "h:mma") : "Anytime"}
      </p>
      <Link href={`/jobs/${job.id}`} className="mt-0.5 block truncate text-sm font-semibold leading-tight hover:underline">
        {typeLabel}
      </Link>
      <p className="truncate text-xs text-stone-500">
        {job.client.lastName}
        {job.property.address1 ? ` · ${job.property.address1}` : ""}
      </p>
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
