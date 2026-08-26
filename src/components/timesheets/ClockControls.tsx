"use client";

import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ClockOutConflictModal } from "@/components/timesheets/ClockOutConflictModal";
import { useTimesheetClock } from "@/components/timesheets/useTimesheetClock";
import { currentPunchElapsedMs, formatDuration, formatElapsedClock, openPunch } from "@/lib/time";

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
  const {
    sheet,
    recent,
    busy,
    error,
    queuedNote,
    now,
    liveMin,
    openJobConflict,
    clearOpenJobConflict,
    clockedIn,
    clockIn,
    clockOut,
    todayLabel,
  } = useTimesheetClock(initialCurrent, initialRecent);

  const activePunch = sheet ? openPunch(sheet.punches) : null;
  const elapsedMs = sheet ? currentPunchElapsedMs(sheet.punches, new Date(now)) : 0;
  const onSiteHint = openJobConflict ?? (clockedIn ? openJob : null);

  const conflictModal = openJobConflict ? (
    <ClockOutConflictModal
      openJob={openJobConflict}
      busy={busy}
      onDismiss={clearOpenJobConflict}
      onForceClockOut={() => void clockOut(true)}
    />
  ) : null;

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div
          className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
            clockedIn ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-600"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${clockedIn ? "bg-emerald-500" : "bg-stone-400"}`} aria-hidden />
          <span className="tabular-nums">{clockedIn ? formatElapsedClock(elapsedMs) : "Off clock"}</span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void (clockedIn ? clockOut() : clockIn())}
          className="rounded-full bg-orange px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : clockedIn ? "Clock out" : "Clock in"}
        </button>
        {onSiteHint && clockedIn ? (
          <p className="max-w-[11rem] text-right text-[10px] text-amber-800">On site · {onSiteHint.number}</p>
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
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${clockedIn ? "bg-emerald-500" : "bg-stone-400"}`}
              aria-hidden
            />
            <p className={`text-xs font-bold uppercase tracking-widest ${clockedIn ? "text-emerald-900" : "text-stone-600"}`}>
              {clockedIn ? "Clocked in" : "Off clock"}
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl tabular-nums">
            {clockedIn ? formatElapsedClock(elapsedMs) : "—"}
          </h2>
          <p className="text-sm text-stone-600">
            {clockedIn && activePunch
              ? `On the clock since ${format(new Date(activePunch.clockInAt), "h:mm a")} · ${todayLabel} today`
              : "Clock in when you start your day."}
          </p>
        </div>
        {sheet ? <StatusBadge status={sheet.status} /> : null}
      </div>
      {onSiteHint && clockedIn ? (
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
          disabled={busy || clockedIn}
          onClick={() => void clockIn()}
          className="flex-1 rounded-lg bg-orange py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Clock in
        </button>
        <button
          type="button"
          disabled={busy || !clockedIn}
          onClick={() => void clockOut()}
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
