"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DayBoard } from "./DayBoard";
import { NewJobDialog, type NewJobRequest, type ScheduleClient } from "./NewJobDialog";
import { NewTripDialog } from "./NewTripDialog";
import { WeekBoard } from "./WeekBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import type { CopyRequest } from "./useScheduleBoard";

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
  activeCheckIns = [],
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
  activeCheckIns?: Array<{
    jobId: string;
    jobNumber: string;
    clientName: string;
    technicianId: string;
    minutesOnSite: number;
  }>;
}) {
  const router = useRouter();
  const [copyRequest, setCopyRequest] = useState<CopyRequest | null>(null);
  const [newJob, setNewJob] = useState<NewJobRequest | null>(null);

  return (
    <div className="space-y-3">
      {view === "day" ? (
        <DayBoard
          date={date}
          technicians={technicians}
          jobs={jobs}
          unscheduled={unscheduled}
          mode="move"
          compact={compact}
          availability={availability}
          activeCheckIns={activeCheckIns}
          onCopyRequest={setCopyRequest}
          onNewJob={(technicianId, day, time) => setNewJob({ technicianId, day, time })}
        />
      ) : (
        <WeekBoard
          weekOf={weekOf}
          technicians={technicians}
          jobs={jobs}
          unscheduled={unscheduled}
          mode="move"
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
