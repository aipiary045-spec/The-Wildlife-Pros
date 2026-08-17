"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DayBoard } from "./DayBoard";
import { NewJobDialog, type NewJobRequest, type ScheduleClient } from "./NewJobDialog";
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
  unscheduled,
  clients,
  compact = false,
  availability = [],
}: {
  view: "day" | "week";
  date: string;
  weekOf: string;
  technicians: ScheduleTech[];
  jobs: ScheduleJobCard[];
  unscheduled: ScheduleJobCard[];
  clients: ScheduleClient[];
  compact?: boolean;
  availability?: Array<{ technicianId: string; date: string; reason: string | null }>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ScheduleMode>("move");
  const [copyRequest, setCopyRequest] = useState<CopyRequest | null>(null);
  const [newJob, setNewJob] = useState<NewJobRequest | null>(null);

  return (
    <div className="space-y-3">
      {compact ? null : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() =>
              setNewJob({
                day: new Date(date.includes("T") ? date : `${date}T12:00:00`),
                technicianId: technicians[0]?.id,
                time: "09:00",
              })
            }
            className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white sm:w-auto"
          >
            New job
          </button>
          <ScheduleModeToggle mode={mode} onChange={setMode} />
        </div>
      )}
      {view === "day" ? (
        <DayBoard
          date={date}
          technicians={technicians}
          jobs={jobs}
          unscheduled={unscheduled}
          mode={mode}
          compact={compact}
          availability={availability}
          onCopyRequest={setCopyRequest}
          onNewJob={(technicianId, day, time) => setNewJob({ technicianId, day, time })}
        />
      ) : (
        <WeekBoard
          weekOf={weekOf}
          technicians={technicians}
          jobs={jobs}
          unscheduled={unscheduled}
          mode={mode}
          availability={availability}
          onCopyRequest={setCopyRequest}
          onNewJob={(technicianId, day, time) => setNewJob({ technicianId, day, time })}
        />
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
      <NewJobDialog
        request={newJob}
        technicians={technicians}
        clients={clients}
        onClose={() => setNewJob(null)}
        onCreated={() => {
          setNewJob(null);
          router.refresh();
        }}
      />
    </div>
  );
}
