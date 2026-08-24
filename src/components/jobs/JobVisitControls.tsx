"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { visitActionForStatus } from "@/lib/job-visit";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { useOptionalJobVisit } from "@/components/jobs/JobVisitGate";
import type { ScheduleTech } from "@/components/schedule/job-card";

export function JobVisitControls({
  jobId,
  status,
  compact = false,
  checkedIn = false,
}: {
  jobId: string;
  status: string;
  technicianId?: string | null;
  technicians?: ScheduleTech[];
  compact?: boolean;
  checkedIn?: boolean;
  species?: Array<{ id: string; commonName: string }>;
  deployments?: Array<{ id: string; equipment: { serialNumber: string } }>;
}) {
  const router = useRouter();
  const visit = useOptionalJobVisit();
  const [localStatus, setLocalStatus] = useState(
    checkedIn && visitActionForStatus(status) !== "check-out" ? "ON_SITE" : status,
  );
  const action = visitActionForStatus(localStatus);
  const onSite = visit?.onSite ?? action === "check-out";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openJobConflict, setOpenJobConflict] = useState<{
    id: string;
    number: string;
    title: string;
  } | null>(null);
  const [queuedNote, setQueuedNote] = useState("");

  const buttonClass = compact
    ? "mt-1 w-full rounded-lg bg-orange px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
    : "min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto";

  const checkedInClass = compact
    ? "mt-1 flex w-full items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900"
    : "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 sm:w-auto";

  useEffect(() => {
    if (checkedIn && visitActionForStatus(status) !== "check-out") {
      setLocalStatus("ON_SITE");
      return;
    }
    setLocalStatus(status);
  }, [status, checkedIn]);

  if (!action && !queuedNote) {
    return null;
  }

  if (!action) {
    return <p className="mt-1 text-xs text-amber-800">{queuedNote}</p>;
  }

  async function checkIn() {
    if (onSite) {
      if (compact) {
        router.push(`/jobs/${jobId}`);
        return;
      }
      document.getElementById("job-field-work")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setError("");
    setOpenJobConflict(null);
    setQueuedNote("");
    setSaving(true);
    const response = await fieldFetch(`/api/jobs/${jobId}/check-in`, { method: "POST" });
    const data = (await response.json()) as {
      error?: string;
      queued?: boolean;
      already?: boolean;
      repaired?: boolean;
      openJob?: { id: string; number: string; title: string } | null;
    };
    setSaving(false);
    if (!response.ok) {
      if (data.openJob?.id) {
        setOpenJobConflict(data.openJob);
        return;
      }
      setError(data.error ?? "Could not check in");
      return;
    }
    setLocalStatus("ON_SITE");
    visit?.markOnSite();
    if (isQueuedResponse(data)) {
      setQueuedNote("Check-in saved on this phone. It uploads when you have data.");
    }
    router.refresh();
    if (!compact) {
      requestAnimationFrame(() => {
        document.getElementById("job-field-work")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {onSite ? (
        compact ? (
          <Link href={`/jobs/${jobId}`} className={checkedInClass}>
            Checked in
          </Link>
        ) : (
          <button type="button" className={checkedInClass} onClick={() => void checkIn()}>
            Checked in
          </button>
        )
      ) : (
        <button id="check-in" type="button" disabled={saving} className={buttonClass} onClick={() => void checkIn()}>
          {saving ? "Checking in…" : "Check in"}
        </button>
      )}
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
      {queuedNote ? <p className="mt-1 text-xs text-amber-800">{queuedNote}</p> : null}

      {openJobConflict ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-3">
          <button
            type="button"
            aria-label="Dismiss"
            className="min-h-0 flex-1 sm:absolute sm:inset-0 sm:flex-none"
            onClick={() => setOpenJobConflict(null)}
          />
          <div
            role="dialog"
            aria-labelledby="open-job-conflict-title"
            className="relative z-10 w-full rounded-t-2xl border border-line bg-panel p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-orange">Still checked in</p>
            <h2 id="open-job-conflict-title" className="mt-1 font-display text-2xl">
              Finish the job you&apos;re on first
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              You&apos;re already checked in at another stop. Check out there before starting this one.
            </p>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{openJobConflict.number}</p>
              <p className="mt-0.5 font-semibold text-emerald-950">{openJobConflict.title}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/jobs/${openJobConflict.id}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-4 text-sm font-semibold text-white"
              >
                Open that job
              </Link>
              <button
                type="button"
                onClick={() => setOpenJobConflict(null)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
