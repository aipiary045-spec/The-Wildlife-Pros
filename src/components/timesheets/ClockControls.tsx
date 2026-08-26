"use client";

import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

export function ClockControls({
  compact = false,
  initialCurrent = null,
  initialRecent = [],
}: {
  compact?: boolean;
  initialCurrent?: Sheet | null;
  initialRecent?: Sheet[];
}) {
  const {
    sheet,
    recent,
    busy,
    error,
    queuedNote,
    now,
    liveMin,
    clockedIn,
    clockIn,
    clockOut,
    todayLabel,
  } = useTimesheetClock(initialCurrent, initialRecent);

  const activePunch = sheet ? openPunch(sheet.punches) : null;
  const elapsedMs = sheet ? currentPunchElapsedMs(sheet.punches, new Date(now)) : 0;

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
        {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
        {queuedNote ? <p className="text-[10px] text-amber-800">Saved on phone</p> : null}
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
    </section>
  );
}
