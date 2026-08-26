"use client";

import Link from "next/link";
import type { OpenJobHint } from "@/components/timesheets/ClockControls";

export function ClockOutConflictModal({
  openJob,
  busy,
  onDismiss,
  onForceClockOut,
}: {
  openJob: OpenJobHint;
  busy: boolean;
  onDismiss: () => void;
  onForceClockOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-3">
      <button
        type="button"
        aria-label="Dismiss"
        className="min-h-0 flex-1 sm:absolute sm:inset-0 sm:flex-none"
        onClick={onDismiss}
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
          Day clock and job visit are separate. You can finish the visit, or clock out of the day and leave the visit
          open.
        </p>
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{openJob.number}</p>
          <p className="mt-0.5 font-semibold text-emerald-950">{openJob.title}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/jobs/${openJob.id}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-4 text-sm font-semibold text-white"
            onClick={onDismiss}
          >
            Open that job
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={onForceClockOut}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Clocking out…" : "Clock out anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}
