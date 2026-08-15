"use client";

import { addMinutes, format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dateKey, sameDay } from "@/lib/dates";
import type { ScheduleJobCard, ScheduleTech } from "./job-card";

export function DayBoard({
  jobs,
  technicians,
  date,
}: {
  jobs: ScheduleJobCard[];
  technicians: ScheduleTech[];
  date: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const day = new Date(date.includes("T") ? date : `${date}T12:00:00`);

  async function moveJob(jobId: string, technicianId: string) {
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
        Each technician&apos;s stops for the day, in time order. Drag a job onto another tech to reassign.{" "}
        {saving ? "Saving…" : "Changes save immediately."}
      </p>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {technicians.map((tech) => {
          const techJobs = jobs
            .filter((job) => job.technicianId === tech.id && job.scheduledStart && sameDay(new Date(job.scheduledStart), day))
            .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
          return (
            <section
              key={tech.id}
              className="rounded-2xl border border-line bg-panel p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const jobId = event.dataTransfer.getData("text/job-id");
                if (jobId) void moveJob(jobId, tech.id);
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: tech.color }} />
                  <h2 className="font-semibold">
                    {tech.firstName} {tech.lastName}
                  </h2>
                </div>
                <p className="text-xs text-stone-500">
                  {techJobs.length} stop{techJobs.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="min-h-40 space-y-2 rounded-xl bg-background/70 p-1">
                {techJobs.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-stone-500">No stops</p>
                ) : (
                  techJobs.map((job, index) => (
                    <article
                      key={job.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/job-id", job.id)}
                      className="cursor-grab rounded-lg border border-line bg-white px-3 py-2 shadow-sm"
                    >
                      <p className="text-xs font-semibold text-orange">
                        Stop {index + 1} · {format(new Date(job.scheduledStart!), "h:mm a")}
                      </p>
                      <p className="font-medium leading-tight">{job.title}</p>
                      <p className="text-xs text-stone-500">
                        {job.client.lastName} · {job.property.address1}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={job.status} />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="sr-only">{dateKey(day)}</p>
    </div>
  );
}
