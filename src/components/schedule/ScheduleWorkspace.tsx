"use client";

import { useState } from "react";
import { DayBoard } from "./DayBoard";
import { ScheduleModeToggle } from "./ScheduleModeToggle";
import { WeekBoard } from "./WeekBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import type { ScheduleMode } from "./useScheduleBoard";

export function ScheduleWorkspace({
  view,
  date,
  weekOf,
  technicians,
  jobs,
}: {
  view: "day" | "week";
  date: string;
  weekOf: string;
  technicians: ScheduleTech[];
  jobs: ScheduleJobCard[];
}) {
  const [mode, setMode] = useState<ScheduleMode>("move");

  return (
    <div className="space-y-3">
      <ScheduleModeToggle mode={mode} onChange={setMode} />
      {view === "day" ? (
        <DayBoard date={date} technicians={technicians} jobs={jobs} mode={mode} />
      ) : (
        <WeekBoard weekOf={weekOf} technicians={technicians} jobs={jobs} mode={mode} />
      )}
    </div>
  );
}
