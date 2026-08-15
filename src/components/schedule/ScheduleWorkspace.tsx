"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { JOB_TYPE_BAR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { DayBoard } from "./DayBoard";
import { NewJobDialog, type NewJobRequest, type ScheduleClient } from "./NewJobDialog";
import { NewTripDialog } from "./NewTripDialog";
import { ScheduleModeToggle } from "./ScheduleModeToggle";
import { WeekBoard } from "./WeekBoard";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";
import type { CopyRequest, ScheduleMode } from "./useScheduleBoard";
import { useScheduleBoard } from "./useScheduleBoard";

export function ScheduleWorkspace({
  view,
  date,
  weekOf,
  technicians,
  jobs,
  unscheduled,
  clients,
}: {
  view: "day" | "week";
  date: string;
  weekOf: string;
  technicians: ScheduleTech[];
  jobs: ScheduleJobCard[];
  unscheduled: ScheduleJobCard[];
  clients: ScheduleClient[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ScheduleMode>("move");
  const [copyRequest, setCopyRequest] = useState<CopyRequest | null>(null);
  const [newJob, setNewJob] = useState<NewJobRequest | null>(null);
  const allJobs = [...jobs, ...unscheduled];
  const { onDragStart } = useScheduleBoard(allJobs, mode, setCopyRequest);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setNewJob({
              day: new Date(date.includes("T") ? date : `${date}T12:00:00`),
              technicianId: technicians[0]?.id,
              time: "09:00",
            })
          }
          className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white"
        >
          New job
        </button>
        <ScheduleModeToggle mode={mode} onChange={setMode} />
      </div>
      {unscheduled.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-panel p-3">
          <h2 className="mb-2 text-sm font-semibold">Unscheduled — drag onto a tech</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unscheduled.map((job) => (
              <article
                key={job.id}
                draggable
                onDragStart={(event) => onDragStart(event, job.id)}
                className={cn(
                  "min-w-48 cursor-grab rounded-lg border border-line border-l-4 bg-white px-3 py-2 shadow-sm",
                  JOB_TYPE_BAR[job.type ?? ""] ?? "border-l-orange",
                )}
              >
                <p className="font-medium leading-tight">{job.title}</p>
                <p className="text-xs text-stone-500">
                  {job.client.lastName} · {job.property.address1}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-orange">Drag onto a tech</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {view === "day" ? (
        <DayBoard
          date={date}
          technicians={technicians}
          jobs={jobs}
          unscheduled={unscheduled}
          mode={mode}
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
