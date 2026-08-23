"use client";

import Link from "next/link";
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

export type OpenJobHint = {
  id: string;
  number: string;
  title: string;
};

export function ClockControls({
  compact = false,
  initialCurrent = null,
  initialRecent = [],
  openJob = null,
}: {
  compact?: boolean;
  initialCurrent?: Sheet | null;
  initialRecent?: Sheet[];
  /** Soft hint when already on site — clock-out still confirms via API. */
  openJob?: OpenJobHint | null;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(initialCurrent);
  const [recent, setRecent] = useState<Sheet[]>(initialRecent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [queuedNote, setQueuedNote] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [openJobConflict, setOpenJobConflict] = useState<OpenJobHint | null>(null);

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

  const onSiteHint = openJobConflict ?? (sheet?.open ? openJob : null);

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

  async function clock(action: "in" | "out", force = false) {
    setBusy(true);
    setError("");
    setQueuedNote("");
    if (action === "out" && !force) setOpenJobConflict(null);
    const response = await fieldFetch("/api/timesheets/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, force: force || undefined }),
    });
    const data = (await response.json()) as {
      error?: string;
      timesheet?: Sheet;
      queued?: boolean;
      openJob?: OpenJobHint | null;
    };
    setBusy(false);
    if (!response.ok) {
      if (action === "out" && response.status === 409 && data.openJob?.id) {
        setOpenJobConflict(data.openJob);
        return;
      }
      setError(data.error ?? "Could not update clock");
      return;
    }
    setOpenJobConflict(null);
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

  const conflictModal = openJobConflict ? (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-3">
      <button
        type="button"
        aria-label="Dismiss"
        className="min-h-0 flex-1 sm:absolute sm:inset-0 sm:flex-none"
        onClick={() => setOpenJobConflict(null)}
      />
      <div
        role="dialog"
        aria-labelledby="clock-out-open-job-title"
        className="relative z-10 w-full rounded-t-2xl border border-line bg-panel p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Still on a job</p>
        <h2 id="clock-out-open-job-title" className="mt-1 font-display text-2xl">
          Check out of the stop first?
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Day clock and job visit are separate. You can finish the visit, or clock out of the day and leave the visit open.
        </p>
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{openJobConflict.number}</p>
          <p className="mt-0.5 font-semibold text-emerald-950">{openJobConflict.title}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/jobs/${openJobConflict.id}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-4 text-sm font-semibold text-white"
            onClick={() => setOpenJobConflict(null)}
          >
            Open that job
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void clock("out", true)}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Clocking out…" : "Clock out anyway"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

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
        {onSiteHint && sheet?.open ? (
          <p className="max-w-[11rem] text-right text-[10px] text-amber-800">
            On site · {onSiteHint.number}
          </p>
        ) : null}
        {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
        {queuedNote ? <p className="text-[10px] text-amber-800">Saved on phone</p> : null}
        {conflictModal}
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
      {onSiteHint && sheet?.open ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Still checked in on{" "}
          <Link href={`/jobs/${onSiteHint.id}`} className="font-semibold text-orange underline-offset-2 hover:underline">
            {onSiteHint.number}
          </Link>
          {" — "}
          {onSiteHint.title}. Check out there when you leave the stop.
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy || Boolean(sheet?.open)}
          onClick={() => void clock("in")}
          className="flex-1 rounded-lg bg-orange py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Clock in
        </button>
        <button
          type="button"
          disabled={busy || !sheet?.open}
          onClick={() => void clock("out")}
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
      {conflictModal}
    </section>
  );
}
