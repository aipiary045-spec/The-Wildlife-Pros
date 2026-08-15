"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DayBoard } from "./DayBoard";
import { NewTripDialog } from "./NewTripDialog";
import { ScheduleModeToggle } from "./ScheduleModeToggle";
import { WeekBoard } from "./WeekBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import type { CopyRequest, ScheduleMode } from "./useScheduleBoard";

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
  const router = useRouter();
  const [mode, setMode] = useState<ScheduleMode>("move");
  const [copyRequest, setCopyRequest] = useState<CopyRequest | null>(null);

  return (
    <div className="space-y-3">
      <ScheduleModeToggle mode={mode} onChange={setMode} />
      {view === "day" ? (
        <DayBoard date={date} technicians={technicians} jobs={jobs} mode={mode} onCopyRequest={setCopyRequest} />
      ) : (
        <WeekBoard weekOf={weekOf} technicians={technicians} jobs={jobs} mode={mode} onCopyRequest={setCopyRequest} />
      )}
      <NewTripDialog
        request={copyRequest}
        technicians={technicians}
        onClose={() => setCopyRequest(null)}
        onCreated={() => {
          setCopyRequest(null);
          router.refresh();
        }}
      />
    </div>
  );
}
