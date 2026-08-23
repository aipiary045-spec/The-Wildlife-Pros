"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CHECKOUT_WORK, visitActionForStatus } from "@/lib/job-visit";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import type { ScheduleTech } from "@/components/schedule/job-card";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const RETURN_PRESETS = [1, 3, 7, 14];

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
  /** True when this user has an open time entry on this job (even if status lagged). */
  checkedIn?: boolean;
}) {
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState(checkedIn && visitActionForStatus(status) !== "check-out" ? "ON_SITE" : status);
  const action = visitActionForStatus(localStatus);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openJobConflict, setOpenJobConflict] = useState<{
    id: string;
    number: string;
    title: string;
  } | null>(null);
  const [queuedNote, setQueuedNote] = useState("");
  const [notes, setNotes] = useState("");
  const [workDone, setWorkDone] = useState<string[]>([]);
  const [finishedHere, setFinishedHere] = useState<boolean | null>(null);
  const [returnInDays, setReturnInDays] = useState(3);
  const [trapOpen, setTrapOpen] = useState(false);
  const [trapPlaced, setTrapPlaced] = useState(false);
  const [trapNote, setTrapNote] = useState("");
  const [trapLat, setTrapLat] = useState("");
  const [trapLng, setTrapLng] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState("");

  const buttonClass = compact
    ? "mt-1 w-full rounded-lg bg-orange px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
    : "min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto";

  useEffect(() => {
    if (checkedIn && visitActionForStatus(status) !== "check-out") {
      setLocalStatus("ON_SITE");
      return;
    }
    setLocalStatus(status);
  }, [status, checkedIn]);

  useEffect(() => {
    if (!open || !trapOpen || !trapPlaced || trapLat || trapLng) return;
    fillMyLocation(true);
  }, [open, trapOpen, trapPlaced, trapLat, trapLng]);

  function resetForm() {
    setNotes("");
    setWorkDone([]);
    setFinishedHere(null);
    setReturnInDays(3);
    setTrapOpen(false);
    setTrapPlaced(false);
    setTrapNote("");
    setTrapLat("");
    setTrapLng("");
    setGeoHint("");
    setError("");
  }

  function closeCheckout() {
    setOpen(false);
    resetForm();
  }

  if (!action) {
    if (!queuedNote) return null;
    return <p className="mt-1 text-xs text-amber-800">{queuedNote}</p>;
  }

  function toggleWork(id: string) {
    setWorkDone((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function checkIn() {
    setSaving(true);
    setError("");
    setOpenJobConflict(null);
    setQueuedNote("");
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
    if (isQueuedResponse(data)) {
      setLocalStatus("ON_SITE");
      setQueuedNote("Check-in saved on this phone. It uploads when you have data.");
      return;
    }
    setLocalStatus("ON_SITE");
    router.refresh();
  }

  function fillMyLocation(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) setError("This phone is not sharing GPS.");
      else setGeoHint("GPS not available on this phone — enter coordinates manually if you have them.");
      return;
    }
    setGeoBusy(true);
    if (!silent) setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTrapLat(position.coords.latitude.toFixed(6));
        setTrapLng(position.coords.longitude.toFixed(6));
        setGeoBusy(false);
        setGeoHint("Filled from your phone. Edit the numbers if you need to.");
      },
      () => {
        setGeoBusy(false);
        if (!silent) setError("Could not read GPS. You can enter coordinates manually.");
        else setGeoHint("Could not read GPS — enter coordinates manually if you have them.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function sendCheckout() {
    if (finishedHere === null) return;
    setSaving(true);
    setError("");
    setQueuedNote("");
    const needsReturn = !finishedHere;
    const response = await fieldFetch(`/api/jobs/${jobId}/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome: needsReturn ? "follow_up" : "complete",
        notes: notes.trim() || undefined,
        workDone,
        siteLeft: needsReturn ? "needs_return" : "secure",
        returnInDays: needsReturn ? Number(returnInDays) : undefined,
        trapPlaced,
        trapLat: trapPlaced && trapLat ? Number(trapLat) : undefined,
        trapLng: trapPlaced && trapLng ? Number(trapLng) : undefined,
        trapNote: trapPlaced ? trapNote.trim() || undefined : undefined,
      }),
    });
    const data = (await response.json()) as { error?: string; queued?: boolean };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not check out");
      return;
    }
    closeCheckout();
    if (isQueuedResponse(data)) {
      setLocalStatus("COMPLETED");
      setQueuedNote("Check-out saved on this phone. It uploads when you have data.");
      return;
    }
    router.refresh();
  }

  const canSubmit = finishedHere !== null;

  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {action === "check-in" ? (
        <button id="check-in" type="button" disabled={saving} className={buttonClass} onClick={() => void checkIn()}>
          {saving ? "Checking in…" : "Check in"}
        </button>
      ) : (
        <button id="check-out" type="button" disabled={saving} className={buttonClass} onClick={() => setOpen(true)}>
          Check out
        </button>
      )}
      {error && !open ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
      {queuedNote && !open ? <p className="mt-1 text-xs text-amber-800">{queuedNote}</p> : null}

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
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {openJobConflict.number}
              </p>
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

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:justify-center sm:p-3">
          <button type="button" aria-label="Close check out" className="min-h-0 flex-1 sm:hidden" onClick={closeCheckout} />
          <form
            className="flex max-h-[min(92dvh,640px)] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-panel shadow-xl sm:mx-auto sm:max-w-lg sm:rounded-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void sendCheckout();
            }}
          >
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-orange">Check out</p>
              <h2 className="mt-1 font-display text-2xl">Done at this property?</h2>
              <p className="mt-1 text-sm text-stone-600">Pick one, add a quick note if you want, and check out.</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFinishedHere(true)}
                  className={`min-h-14 rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                    finishedHere === true ? "border-orange bg-orange/10 text-ink" : "border-line bg-white text-stone-700"
                  }`}
                >
                  Finished here
                  <span className="mt-0.5 block text-xs font-normal text-stone-500">No return trip needed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFinishedHere(false)}
                  className={`min-h-14 rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                    finishedHere === false ? "border-orange bg-orange/10 text-ink" : "border-line bg-white text-stone-700"
                  }`}
                >
                  Need another visit
                  <span className="mt-0.5 block text-xs font-normal text-stone-500">Goes to needs-scheduled</span>
                </button>
              </div>

              {finishedHere === false ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">About when to come back</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RETURN_PRESETS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setReturnInDays(days)}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                          returnInDays === days ? "bg-orange text-white" : "border border-line bg-white text-stone-700"
                        }`}
                      >
                        {days === 1 ? "Tomorrow" : `${days} days`}
                      </button>
                    ))}
                  </div>
                  <label className="mt-2 block text-sm">
                    Or enter days
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={returnInDays}
                      onChange={(event) => setReturnInDays(Number(event.target.value))}
                      className={inputClass}
                    />
                  </label>
                </div>
              ) : null}

              {finishedHere !== null ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">What did you do? (optional)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHECKOUT_WORK.map((option) => {
                      const selected = workDone.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleWork(option.id)}
                          className={`rounded-full px-3 py-1.5 text-sm ${
                            selected ? "bg-ink text-white" : "border border-line bg-white text-stone-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <label className="mt-4 block text-sm">
                Notes (optional)
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="Anything dispatch or the next tech should know"
                  className={inputClass}
                />
              </label>

              <div className="mt-4 rounded-xl border border-line bg-background/60">
                <button
                  type="button"
                  onClick={() => {
                    const next = !trapOpen;
                    setTrapOpen(next);
                    if (next) setTrapPlaced(true);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                >
                  Trap placed on site
                  <span className="text-xs font-normal text-stone-500">{trapOpen ? "Hide" : "Add"}</span>
                </button>
                {trapOpen ? (
                  <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={trapPlaced}
                        onChange={(event) => {
                          setTrapPlaced(event.target.checked);
                          if (event.target.checked && !trapLat && !trapLng) fillMyLocation(true);
                        }}
                      />
                      Log a trap on this visit
                    </label>
                    {trapPlaced ? (
                      <>
                        <label className="block text-sm">
                          Where (description)
                          <input
                            value={trapNote}
                            onChange={(event) => setTrapNote(event.target.value)}
                            className={inputClass}
                            placeholder="South eave, behind the HVAC"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-sm">
                            Latitude
                            <input
                              value={trapLat}
                              onChange={(event) => setTrapLat(event.target.value)}
                              className={inputClass}
                              placeholder="35.227086"
                              inputMode="decimal"
                            />
                          </label>
                          <label className="block text-sm">
                            Longitude
                            <input
                              value={trapLng}
                              onChange={(event) => setTrapLng(event.target.value)}
                              className={inputClass}
                              placeholder="-80.843127"
                              inputMode="decimal"
                            />
                          </label>
                        </div>
                        {geoHint ? <p className="text-xs text-stone-500">{geoHint}</p> : null}
                        <button type="button" onClick={() => fillMyLocation()} className="text-sm font-semibold text-orange">
                          {geoBusy ? "Reading GPS…" : "Refresh GPS"}
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-line bg-panel px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={closeCheckout} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
                Stay on site
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : finishedHere === false ? "Check out & schedule" : "Check out"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
