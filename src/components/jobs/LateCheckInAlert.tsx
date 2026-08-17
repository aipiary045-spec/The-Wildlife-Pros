"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { formatMinutesLate, undismissedJobs, type LateCheckInJob } from "@/lib/late-checkin";
import { isTechnician } from "@/lib/paths";

export function LateCheckInAlert({ role }: { role: string }) {
  const router = useRouter();
  const techView = isTechnician(role);
  const [jobs, setJobs] = useState<LateCheckInJob[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs/late-checkin", { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as { jobs?: LateCheckInJob[] };
      setJobs(data.jobs ?? []);
    } catch {
      // Stay quiet while offline; a cached list may still be in jobs state.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      setHiddenIds([]);
      void load();
    };
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [load]);

  const visible = useMemo(() => undismissedJobs(jobs, hiddenIds), [jobs, hiddenIds]);

  function close() {
    setHiddenIds((current) => [...new Set([...current, ...visible.map((job) => job.id)])]);
  }

  async function checkIn(jobId: string) {
    setCheckingId(jobId);
    setError("");
    const response = await fieldFetch(`/api/jobs/${jobId}/check-in`, { method: "POST" });
    const data = (await response.json()) as { error?: string; queued?: boolean };
    setCheckingId(null);
    if (!response.ok) {
      setError(data.error ?? "Could not check in");
      return;
    }
    setJobs((current) => current.filter((job) => job.id !== jobId));
    if (isQueuedResponse(data)) {
      setError("");
    }
    router.refresh();
  }

  if (visible.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 pt-12 shadow-xl">
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-stone-500 hover:bg-background hover:text-ink"
        >
          ×
        </button>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Late check-in</p>
        <h2 className="mt-1 font-display text-2xl">
          {visible.length === 1 ? "This stop is late for check-in" : `${visible.length} stops are late for check-in`}
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          {techView
            ? "The scheduled start has passed, and you have not checked in yet."
            : "The scheduled start has passed, and nobody has checked in yet."}
        </p>
        <ul className="mt-4 space-y-3">
          {visible.map((job) => (
            <li key={job.id} className="rounded-xl border border-line bg-background p-3">
              <p className="text-xs font-semibold text-orange">
                {job.number} · {formatMinutesLate(job.minutesLate)}
              </p>
              <p className="font-semibold">{job.title}</p>
              <p className="text-sm text-stone-600">{job.clientName}</p>
              <p className="text-sm text-stone-600">{job.address}</p>
              <p className="mt-1 text-xs text-stone-500">
                Scheduled {format(new Date(job.scheduledStart), "h:mm a")}
                {!techView && job.technicianName ? ` · ${job.technicianName}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {techView ? (
                  <button
                    type="button"
                    disabled={checkingId === job.id}
                    onClick={() => void checkIn(job.id)}
                    className="min-h-11 flex-1 rounded-lg bg-orange px-3 text-sm font-semibold text-white disabled:opacity-60 sm:flex-none"
                  >
                    {checkingId === job.id ? "Checking in…" : "Check in"}
                  </button>
                ) : null}
                <Link
                  href={`/jobs/${job.id}`}
                  onClick={close}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold"
                >
                  Open job
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}
