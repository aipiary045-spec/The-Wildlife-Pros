"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CHECKOUT_WORK } from "@/lib/job-visit";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { useJobVisit } from "@/components/jobs/JobVisitGate";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const RETURN_PRESETS = [1, 3, 7, 14];

export function JobCheckoutPanel({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { canCheckOut } = useJobVisit();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [queuedNote, setQueuedNote] = useState("");
  const [notes, setNotes] = useState("");
  const [workDone, setWorkDone] = useState<string[]>([]);
  const [finishedHere, setFinishedHere] = useState<boolean | null>(null);
  const [returnInDays, setReturnInDays] = useState(3);

  if (!canCheckOut) return null;

  function toggleWork(id: string) {
    setWorkDone((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function sendCheckout(event: React.FormEvent) {
    event.preventDefault();
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
        trapPlaced: false,
      }),
    });
    const data = (await response.json()) as { error?: string; queued?: boolean };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not check out");
      return;
    }
    if (isQueuedResponse(data)) {
      setQueuedNote("Check-out saved on this phone. It uploads when you have data.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-orange/30 bg-orange/5 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-orange">Checked in</p>
      <h2 className="mt-1 font-display text-2xl">Finish this visit</h2>
      <p className="mt-1 text-sm text-stone-600">
        Log traps, captures, and photos above while you work. Check out when you leave.
      </p>

      <form className="mt-5 space-y-4" onSubmit={(event) => void sendCheckout(event)}>
        <div className="grid gap-2 sm:grid-cols-2">
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
          <div>
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
          <div>
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

        <label className="block text-sm">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Anything dispatch or the next tech should know"
            className={inputClass}
          />
        </label>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {queuedNote ? <p className="text-sm text-amber-800">{queuedNote}</p> : null}

        <button
          type="submit"
          disabled={saving || finishedHere === null}
          className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving…" : finishedHere === false ? "Check out & schedule" : "Check out"}
        </button>
      </form>
    </section>
  );
}
