"use client";

import { addDays, addMinutes, format, startOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dateKey } from "@/lib/dates";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";

export function WeekBoard({
  jobs,
  technicians,
  weekOf,
}: {
  jobs: ScheduleJobCard[];
  technicians: ScheduleTech[];
  weekOf: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const start = startOfWeek(new Date(weekOf.includes("T") ? weekOf : `${weekOf}T12:00:00`), { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);

  async function moveJob(jobId: string, technicianId: string, day: Date) {
    const existing = jobs.find((job) => job.id === jobId);
    const current = existing?.scheduledStart ? new Date(existing.scheduledStart) : addMinutes(day, 9 * 60);
    const nextStart = new Date(day);
    nextStart.setHours(current.getHours(), current.getMinutes(), 0, 0);
    setSaving(true);
    await fetch("/api/schedule", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        technicianId,
        scheduledStart: nextStart.toISOString(),
        scheduledEnd: addMinutes(nextStart, existing?.durationMin ?? 60).toISOString(),
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Full week including Saturday and Sunday. Drag a job onto another technician or day to reschedule.{" "}
        {saving ? "Saving…" : "Changes save immediately."}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="min-w-[1100px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-background">
              <th className="w-40 px-3 py-3 text-left">Technician</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="px-3 py-3 text-left">
                  {format(day, "EEE MMM d")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {technicians.map((tech) => (
              <tr key={tech.id} className="border-t border-line align-top">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: tech.color }} />
                    {tech.firstName} {tech.lastName}
                  </div>
                </td>
                {days.map((day) => {
                  const cellJobs = jobs
                    .filter((job) => {
                      if (job.technicianId !== tech.id || !job.scheduledStart) return false;
                      return dateKey(new Date(job.scheduledStart)) === dateKey(day);
                    })
                    .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
                  return (
                    <td
                      key={`${tech.id}-${day.toISOString()}`}
                      className="h-36 px-2 py-2"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        const jobId = event.dataTransfer.getData("text/job-id");
                        if (jobId) void moveJob(jobId, tech.id, day);
                      }}
                    >
                      <div className="min-h-28 space-y-2 rounded-xl bg-background/70 p-1">
                        {cellJobs.map((job) => (
                          <article
                            key={job.id}
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData("text/job-id", job.id)}
                            className="cursor-grab rounded-lg border border-line bg-white px-2 py-2 shadow-sm"
                          >
                            <p className="text-xs font-semibold text-orange">
                              {format(new Date(job.scheduledStart!), "h:mm a")}
                            </p>
                            <p className="font-medium leading-tight">{job.title}</p>
                            <p className="text-xs text-stone-500">
                              {job.client.lastName} · {job.property.address1}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={job.status} />
                            </div>
                          </article>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
