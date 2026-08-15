"use client";

import { addMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { tripStartOnDay } from "@/lib/dates";
import type { ScheduleJobCard } from "./job-card";

export type ScheduleMode = "move" | "copy";

export type CopyRequest = {
  job: ScheduleJobCard;
  technicianId: string;
  day: Date;
  startAt?: Date;
};

export function useScheduleBoard(
  jobs: ScheduleJobCard[],
  mode: ScheduleMode,
  onCopyRequest?: (request: CopyRequest) => void,
) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function placeJob(
    jobId: string,
    technicianId: string,
    day: Date,
    copy = mode === "copy",
    startAt?: Date,
  ) {
    const existing = jobs.find((job) => job.id === jobId);
    if (!existing) return;
    const nextStart = startAt ?? tripStartOnDay(existing.scheduledStart, day);
    if (copy) {
      onCopyRequest?.({ job: existing, technicianId, day, startAt: nextStart });
      return;
    }
    setSaving(true);
    await fetch("/api/schedule", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        technicianId,
        scheduledStart: nextStart.toISOString(),
        scheduledEnd: addMinutes(nextStart, existing.durationMin ?? 60).toISOString(),
      }),
    });
    setSaving(false);
    router.refresh();
  }

  function onDragStart(event: React.DragEvent, jobId: string) {
    event.dataTransfer.setData("text/job-id", jobId);
    event.dataTransfer.effectAllowed = "copyMove";
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = event.altKey || mode === "copy" ? "copy" : "move";
  }

  function onDrop(event: React.DragEvent, technicianId: string, day: Date, startAt?: Date) {
    event.preventDefault();
    const jobId = event.dataTransfer.getData("text/job-id");
    if (!jobId) return;
    void placeJob(jobId, technicianId, day, mode === "copy" || event.altKey, startAt);
  }

  return { saving, placeJob, onDragStart, onDragOver, onDrop };
}
