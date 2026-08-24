"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { formatDuration, workedMinutes } from "@/lib/time";
import type { Sheet } from "@/components/timesheets/ClockControls";

export function useTimesheetClock(initialCurrent: Sheet | null = null, initialRecent: Sheet[] = []) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(initialCurrent);
  const [recent, setRecent] = useState<Sheet[]>(initialRecent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [queuedNote, setQueuedNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setSheet(initialCurrent);
  }, [initialCurrent]);

  useEffect(() => {
    setRecent(initialRecent);
  }, [initialRecent]);

  useEffect(() => {
    if (!sheet?.open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sheet?.open]);

  const liveMin = sheet
    ? workedMinutes(
        sheet.punches.map((punch) => (punch.clockOutAt ? punch : { ...punch, clockOutAt: new Date(now).toISOString() })),
        sheet.breakMin,
        new Date(now),
      )
    : 0;

  function applyQueuedClock(action: "in" | "out") {
    const stamp = new Date().toISOString();
    setSheet((current) => {
      const punches = current?.punches ?? [];
      const nextPunches =
        action === "in"
          ? [...punches, { id: `pending-${stamp}`, clockInAt: stamp, clockOutAt: null, note: null }]
          : punches.map((punch, index) =>
              index === punches.length - 1 && !punch.clockOutAt ? { ...punch, clockOutAt: stamp } : punch,
            );
      return {
        id: current?.id ?? "pending",
        status: action === "in" ? "CLOCKED_IN" : "CLOCKED_OUT",
        breakMin: current?.breakMin ?? 0,
        workedMin: current?.workedMin ?? 0,
        open: action === "in",
        date: current?.date ?? stamp,
        punches: nextPunches,
      };
    });
  }

  async function clock(action: "in" | "out") {
    setBusy(true);
    setError("");
    setQueuedNote("");
    const response = await fieldFetch("/api/timesheets/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await response.json()) as { error?: string; timesheet?: Sheet; queued?: boolean };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not update clock");
      return;
    }
    if (isQueuedResponse(data)) {
      applyQueuedClock(action);
      setQueuedNote("Saved on this phone. It uploads when you have data.");
      return;
    }
    setSheet(data.timesheet ?? null);
    try {
      const refreshed = await fetch("/api/timesheets/me", { credentials: "include" });
      if (refreshed.ok) {
        const payload = (await refreshed.json()) as { current: Sheet | null; recent: Sheet[] };
        setSheet(payload.current);
        setRecent(payload.recent);
      }
    } catch {
      // Offline after a successful clock — keep the response we already have.
    }
    router.refresh();
  }

  return {
    sheet,
    recent,
    busy,
    error,
    queuedNote,
    now,
    liveMin,
    clockedIn: Boolean(sheet?.open),
    clockIn: () => clock("in"),
    clockOut: () => clock("out"),
    toggleClock: () => clock(sheet?.open ? "out" : "in"),
    todayLabel: formatDuration(liveMin),
  };
}
