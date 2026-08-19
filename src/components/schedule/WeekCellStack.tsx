"use client";

import { useState } from "react";
import { AppointmentChip } from "./AppointmentChip";
import type { ScheduleJobCard } from "./job-card";

const VISIBLE_LIMIT = 3;

export function WeekCellStack({
  jobs,
  day,
  chipProps,
}: {
  jobs: ScheduleJobCard[];
  day: Date;
  chipProps: (
    job: ScheduleJobCard,
    day: Date,
    layout?: "card" | "list" | "stack",
  ) => React.ComponentProps<typeof AppointmentChip>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, jobs.length - VISIBLE_LIMIT);
  const visible = expanded ? jobs : jobs.slice(0, VISIBLE_LIMIT);

  return (
    <div className="flex min-h-16 flex-col gap-1">
      {visible.map((job) => (
        <AppointmentChip key={job.id} {...chipProps(job, day, "stack")} />
      ))}
      {!expanded && hidden > 0 ? (
        <button
          type="button"
          className="rounded-md border border-line bg-white px-1.5 py-0.5 text-left text-[10px] font-semibold text-orange hover:bg-orange/5"
          onClick={() => setExpanded(true)}
        >
          +{hidden} more
        </button>
      ) : null}
      {expanded && hidden > 0 ? (
        <button
          type="button"
          className="rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold text-stone-500 hover:text-ink"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}
