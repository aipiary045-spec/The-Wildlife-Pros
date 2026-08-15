"use client";

import { addMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseDateParam, dateKey, tripStartOnDay } from "@/lib/dates";
import { jobNeedsMove } from "@/lib/schedule-move";
import type { ScheduleJobCard } from "./job-card";

export type ScheduleMode = "move" | "copy";

export type CopyRequest = {
  job: ScheduleJobCard;
  technicianId: string;
  day: Date;
  startAt?: Date;
};

export type BoardDrag = {
  jobId: string;
  x: number;
  y: number;
  overTechId: string | null;
};

type PendingPointer = {
  jobId: string;
  x: number;
  y: number;
  pointerId: number;
  timer: number | null;
};

export function dropTargetFromPoint(x: number, y: number) {
  const node = document.elementsFromPoint(x, y).find((el) => el instanceof Element && el.closest("[data-drop-tech]"));
  const host = node instanceof Element ? node.closest("[data-drop-tech]") : null;
  if (!host) return null;
  const technicianId = host.getAttribute("data-drop-tech");
  const day = host.getAttribute("data-drop-day");
  if (!technicianId || technicianId === "unassigned") return null;
  return { technicianId, day: day || null };
}

export function useScheduleBoard(
  jobs: ScheduleJobCard[],
  mode: ScheduleMode,
  onCopyRequest?: (request: CopyRequest) => void,
) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<BoardDrag | null>(null);
  const [tracking, setTracking] = useState(false);
  const dragRef = useRef<BoardDrag | null>(null);
  const pendingRef = useRef<PendingPointer | null>(null);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  dragRef.current = drag;

  const placeJob = useCallback(
    async (jobId: string, technicianId: string, day: Date, copy = mode === "copy", startAt?: Date) => {
      const existing = jobsRef.current.find((job) => job.id === jobId);
      if (!existing || !technicianId) return;
      const nextStart = startAt ?? tripStartOnDay(existing.scheduledStart, day);
      if (copy) {
        onCopyRequest?.({ job: existing, technicianId, day, startAt: nextStart });
        return;
      }
      if (!jobNeedsMove(existing, technicianId, dateKey(day))) return;
      setSaving(true);
      setError("");
      const response = await fetch("/api/schedule", {
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
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not move that job.");
        return;
      }
      router.refresh();
    },
    [mode, onCopyRequest, router],
  );

  const clearPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending?.timer) window.clearTimeout(pending.timer);
    pendingRef.current = null;
    setTracking(false);
  }, []);

  const updateOver = useCallback((x: number, y: number) => {
    const over = dropTargetFromPoint(x, y);
    setDrag((current) =>
      current ? { ...current, x, y, overTechId: over?.technicianId ?? null } : current,
    );
  }, []);

  const finishDrag = useCallback(
    (x: number, y: number) => {
      const current = dragRef.current;
      clearPending();
      setDrag(null);
      if (!current) return;
      const over = dropTargetFromPoint(x, y);
      if (!over) return;
      const day = over.day ? parseDateParam(over.day) : new Date();
      void placeJob(current.jobId, over.technicianId, day);
    },
    [clearPending, placeJob],
  );

  const startDrag = useCallback((jobId: string, x: number, y: number) => {
    const pending = pendingRef.current;
    if (pending?.timer) window.clearTimeout(pending.timer);
    pendingRef.current = null;
    const over = dropTargetFromPoint(x, y);
    const next = { jobId, x, y, overTechId: over?.technicianId ?? null };
    dragRef.current = next;
    setDrag(next);
    setTracking(true);
  }, []);

  useEffect(() => {
    if (!tracking && !drag) return;
    function move(event: PointerEvent) {
      const current = dragRef.current;
      if (current) {
        event.preventDefault();
        updateOver(event.clientX, event.clientY);
        return;
      }
      const pending = pendingRef.current;
      if (!pending) return;
      const dist = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
      if (event.pointerType === "touch" && dist > 12) {
        clearPending();
        return;
      }
      if (dist > 6) {
        event.preventDefault();
        startDrag(pending.jobId, event.clientX, event.clientY);
      }
    }
    function up(event: PointerEvent) {
      if (dragRef.current) finishDrag(event.clientX, event.clientY);
      else clearPending();
    }
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    if (drag) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    }
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [drag, tracking, clearPending, finishDrag, startDrag, updateOver]);

  function onChipPointerDown(event: React.PointerEvent, jobId: string, immediate = false) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (!immediate && target.closest("a, button, select, input, textarea, label")) return;
    event.stopPropagation();
    pendingRef.current = {
      jobId,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      timer: null,
    };
    setTracking(true);
    if (immediate) {
      startDrag(jobId, event.clientX, event.clientY);
      return;
    }
    if (event.pointerType === "touch") {
      pendingRef.current.timer = window.setTimeout(() => {
        const pending = pendingRef.current;
        if (!pending || pending.jobId !== jobId) return;
        startDrag(jobId, pending.x, pending.y);
      }, 180);
    }
  }

  return {
    saving,
    error,
    drag,
    placeJob,
    onChipPointerDown,
  };
}
