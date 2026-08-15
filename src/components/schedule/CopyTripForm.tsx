"use client";

import { addDays } from "date-fns";
import { dateKey } from "@/lib/dates";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";

export function CopyTripForm({
  job,
  technicians,
  onCopy,
}: {
  job: ScheduleJobCard;
  technicians: ScheduleTech[];
  onCopy: (jobId: string, technicianId: string, day: Date) => Promise<void>;
}) {
  const source = job.scheduledStart ? new Date(job.scheduledStart) : new Date();
  const defaultDate = dateKey(addDays(source, 1));

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const day = String(data.get("date") || defaultDate);
        const technicianId = String(data.get("technicianId") || job.technicianId || "");
        if (!technicianId) return;
        const [year, month, date] = day.split("-").map(Number);
        void onCopy(job.id, technicianId, new Date(year, month - 1, date));
      }}
    >
      <input
        name="date"
        type="date"
        defaultValue={defaultDate}
        className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
      />
      <select
        name="technicianId"
        defaultValue={job.technicianId ?? technicians[0]?.id}
        className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
      >
        {technicians.map((tech) => (
          <option key={tech.id} value={tech.id}>
            {tech.firstName} {tech.lastName}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-lg bg-ink px-2 py-1 text-xs font-semibold text-white">
        Copy trip
      </button>
    </form>
  );
}
