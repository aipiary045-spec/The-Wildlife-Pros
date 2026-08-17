"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { formatDuration, workedMinutes } from "@/lib/time";

export type Sheet = {
  id: string;
  status: string;
  breakMin: number;
  workedMin: number;
  open: boolean;
  date: string;
  punches: Array<{ id: string; clockInAt: string; clockOutAt: string | null; note: string | null }>;
};

export function ClockControls({
  compact = false,
  initialCurrent = null,
  initialRecent = [],
}: {
  compact?: boolean;
  initialCurrent?: Sheet | null;
  initialRecent?: Sheet[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(initialCurrent);
  const [recent, setRecent] = useState<Sheet[]>(initialRecent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [queuedNote, setQueuedNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sheet?.open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sheet?.open]);

  const liveMin = sheet
    ? workedMinutes(
        sheet.punches.map((punch) => (punch.clockOutAt ? punch : { ...punch, clockOutAt: new Date(now).toISOString() })),
        sheet.breakMin,
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

  if (compact) {
    return (
      <div className="flex max-w-[12rem] flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-stone-600 min-[400px]:inline tabular-nums">
            {sheet?.open ? `On clock · ${formatDuration(liveMin)}` : "Off clock"}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void clock(sheet?.open ? "out" : "in")}
            className="rounded-full bg-orange px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            {sheet?.open ? "Clock out" : "Clock in"}
          </button>
        </div>
        {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
        {queuedNote ? <p className="text-[10px] text-amber-800">Saved on phone</p> : null}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange">Timesheet</p>
          <h2 className="font-display text-2xl tabular-nums">{formatDuration(liveMin)} today</h2>
          <p className="text-sm text-stone-600">
            {sheet?.open ? "You are clocked in." : "Clock in to start the day."}
          </p>
        </div>
        {sheet ? <StatusBadge status={sheet.status} /> : null}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy || Boolean(sheet?.open)}
          onClick={() => clock("in")}
          className="flex-1 rounded-lg bg-orange py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Clock in
        </button>
        <button
          type="button"
          disabled={busy || !sheet?.open}
          onClick={() => clock("out")}
          className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Clock out
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      {queuedNote ? <p className="mt-2 text-sm text-amber-800">{queuedNote}</p> : null}
      {sheet?.punches.length ? (
        <ol className="mt-4 space-y-1 text-sm">
          {sheet.punches.map((punch) => (
            <li key={punch.id} className="flex justify-between text-stone-600">
              <span>In {format(new Date(punch.clockInAt), "h:mm a")}</span>
              <span>{punch.clockOutAt ? `Out ${format(new Date(punch.clockOutAt), "h:mm a")}` : "Open"}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {recent.length > 1 ? (
        <p className="mt-3 text-xs text-stone-500">
          Last 2 weeks:{" "}
          {formatDuration(recent.reduce((sum, item) => sum + (item.id === sheet?.id ? liveMin : item.workedMin), 0))}
        </p>
      ) : null}
    </section>
  );
}
