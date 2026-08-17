"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CHECKOUT_WORK, SITE_LEFT_OPTIONS, visitActionForStatus } from "@/lib/job-visit";
import type { ScheduleTech } from "@/components/schedule/job-card";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function JobVisitControls({
  jobId,
  status,
  compact = false,
}: {
  jobId: string;
  status: string;
  technicianId?: string | null;
  technicians?: ScheduleTech[];
  compact?: boolean;
}) {
  const router = useRouter();
  const action = visitActionForStatus(status);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [workDone, setWorkDone] = useState<string[]>([]);
  const [siteLeft, setSiteLeft] = useState("secure");
  const [needsReturn, setNeedsReturn] = useState(false);
  const [returnInDays, setReturnInDays] = useState(3);
  const [trapPlaced, setTrapPlaced] = useState(false);
  const [trapNote, setTrapNote] = useState("");
  const [trapLat, setTrapLat] = useState("");
  const [trapLng, setTrapLng] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);

  const buttonClass = compact
    ? "mt-1 w-full rounded-lg bg-orange px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
    : "min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto";

  const summaryReady = useMemo(() => workDone.length > 0 || notes.trim().length > 0, [workDone, notes]);

  if (!action) return null;

  function toggleWork(id: string) {
    setWorkDone((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function checkIn() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/jobs/${jobId}/check-in`, { method: "POST", credentials: "include" });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not check in");
      return;
    }
    router.refresh();
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This phone is not sharing GPS.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTrapLat(position.coords.latitude.toFixed(6));
        setTrapLng(position.coords.longitude.toFixed(6));
        setGeoBusy(false);
      },
      () => {
        setGeoBusy(false);
        setError("Could not read GPS. You can leave coordinates blank.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function sendCheckout() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/jobs/${jobId}/check-out`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome: needsReturn ? "follow_up" : "complete",
        notes: notes.trim() || undefined,
        workDone,
        siteLeft,
        returnInDays: needsReturn ? Number(returnInDays) : undefined,
        trapPlaced,
        trapLat: trapPlaced && trapLat ? Number(trapLat) : undefined,
        trapLng: trapPlaced && trapLng ? Number(trapLng) : undefined,
        trapNote: trapPlaced ? trapNote.trim() || undefined : undefined,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not check out");
      return;
    }
    setOpen(false);
    setNotes("");
    setWorkDone([]);
    router.refresh();
  }

  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {action === "check-in" ? (
        <button type="button" disabled={saving} className={buttonClass} onClick={() => void checkIn()}>
          {saving ? "Checking in…" : "Check in"}
        </button>
      ) : (
        <button
          type="button"
          disabled={saving}
          className={buttonClass}
          onClick={() => setOpen(true)}
        >
          Check out
        </button>
      )}
      {error && !open ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <form
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              void sendCheckout();
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-orange">Check out</p>
            <h2 className="mt-1 font-display text-2xl">What happened on this visit?</h2>
            <p className="mt-2 text-sm text-stone-600">Tap what you did. Notes stay free-form.</p>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium">Work completed</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {CHECKOUT_WORK.map((option) => (
                  <label key={option.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={workDone.includes(option.id)}
                      onChange={() => toggleWork(option.id)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 block text-sm">
              How did you leave the site
              <select value={siteLeft} onChange={(event) => setSiteLeft(event.target.value)} className={inputClass}>
                {SITE_LEFT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="What should dispatch or the next tech know?"
                className={inputClass}
              />
            </label>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={needsReturn} onChange={(event) => setNeedsReturn(event.target.checked)} />
              This customer needs another visit
            </label>
            {needsReturn ? (
              <label className="mt-2 block text-sm">
                About how many days until they need us back
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={returnInDays}
                  onChange={(event) => setReturnInDays(Number(event.target.value))}
                  className={inputClass}
                />
                <span className="mt-1 block text-xs text-stone-500">
                  They go into the needs-scheduled pool for dispatch — not onto a calendar slot yet.
                </span>
              </label>
            ) : null}

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={trapPlaced} onChange={(event) => setTrapPlaced(event.target.checked)} />
              I placed one or more traps
            </label>
            {trapPlaced ? (
              <div className="mt-2 space-y-3 rounded-xl border border-dashed border-line bg-background p-3">
                <label className="block text-sm">
                  Where is it
                  <input
                    value={trapNote}
                    onChange={(event) => setTrapNote(event.target.value)}
                    className={inputClass}
                    placeholder="South eave, behind the HVAC"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-sm">
                    Latitude (optional)
                    <input value={trapLat} onChange={(event) => setTrapLat(event.target.value)} className={inputClass} placeholder="35.227" />
                  </label>
                  <label className="block text-sm">
                    Longitude (optional)
                    <input value={trapLng} onChange={(event) => setTrapLng(event.target.value)} className={inputClass} placeholder="-80.843" />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="text-sm font-semibold text-orange"
                >
                  {geoBusy ? "Reading GPS…" : "Use my current GPS"}
                </button>
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
                Stay on site
              </button>
              <button
                type="submit"
                disabled={saving || !summaryReady}
                className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : needsReturn ? "Check out & add to pool" : "Check out"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
