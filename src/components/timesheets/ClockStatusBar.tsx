"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ClockOutConflictModal } from "@/components/timesheets/ClockOutConflictModal";
import { type OpenJobHint, type Sheet } from "@/components/timesheets/ClockControls";
import { useTimesheetClock } from "@/components/timesheets/useTimesheetClock";
import { currentPunchElapsedMs, formatElapsedClock, openPunch } from "@/lib/time";

export function ClockStatusBar({
  initialCurrent = null,
  initialRecent = [],
  openJob = null,
}: {
  initialCurrent?: Sheet | null;
  initialRecent?: Sheet[];
  openJob?: OpenJobHint | null;
}) {
  const {
    sheet,
    busy,
    error,
    queuedNote,
    now,
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

  return (
    <section
      className={
        clockedIn
          ? "border-b border-emerald-200 bg-emerald-50 px-4 py-3"
          : "border-b border-line bg-stone-50 px-4 py-3"
      }
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${clockedIn ? "bg-emerald-500" : "bg-stone-400"}`}
              aria-hidden
            />
            <p className={`text-xs font-bold uppercase tracking-widest ${clockedIn ? "text-emerald-900" : "text-stone-600"}`}>
              {clockedIn ? "Clocked in" : "Off clock"}
            </p>
          </div>
          <p className="mt-1 font-display text-2xl tabular-nums text-ink">
            {clockedIn ? formatElapsedClock(elapsedMs) : "Not on the clock"}
          </p>
          <p className="text-xs text-stone-600">
            {clockedIn && activePunch ? (
              <>
                Since {format(new Date(activePunch.clockInAt), "h:mm a")} · {todayLabel} today
              </>
            ) : (
              "Clock in when you start your day."
            )}
          </p>
          {onSiteHint && clockedIn ? (
            <p className="mt-1 text-xs text-amber-900">
              On site ·{" "}
              <Link href={`/jobs/${onSiteHint.id}`} className="font-semibold text-orange underline-offset-2 hover:underline">
                {onSiteHint.number}
              </Link>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void (clockedIn ? clockOut() : clockIn())}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
            clockedIn ? "bg-ink" : "bg-orange"
          }`}
        >
          {busy ? "Saving…" : clockedIn ? "Clock out" : "Clock in"}
        </button>
      </div>
      {error ? <p className="mx-auto mt-2 max-w-3xl text-xs text-rose-700">{error}</p> : null}
      {queuedNote ? <p className="mx-auto mt-2 max-w-3xl text-xs text-amber-800">{queuedNote}</p> : null}
      {openJobConflict ? (
        <ClockOutConflictModal
          openJob={openJobConflict}
          busy={busy}
          onDismiss={clearOpenJobConflict}
          onForceClockOut={() => void clockOut(true)}
        />
      ) : null}
    </section>
  );
}
