"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CHECKOUT_WORK, type CheckoutInput } from "@/lib/job-visit";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { useJobVisit } from "@/components/jobs/JobVisitGate";
import { CollapsibleJobSection } from "@/components/jobs/CollapsibleJobSection";
import { visitSummarySmsHref, type VisitSummaryContext } from "@/lib/visit-summary-sms";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const RETURN_PRESETS = [1, 3, 7, 14];

export function JobCheckoutPanel({
  jobId,
  clientPhone = null,
  visitSummary = null,
}: {
  jobId: string;
  clientPhone?: string | null;
  visitSummary?: VisitSummaryContext | null;
}) {
  const router = useRouter();
  const { canCheckOut } = useJobVisit();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [queuedNote, setQueuedNote] = useState("");
  const [notes, setNotes] = useState("");
  const [workDone, setWorkDone] = useState<string[]>([]);
  const [finishedHere, setFinishedHere] = useState<boolean | null>(null);
  const [returnInDays, setReturnInDays] = useState(3);
  const [openMessages, setOpenMessages] = useState(Boolean(clientPhone && visitSummary));
  const [checkoutDone, setCheckoutDone] = useState<{
    title: string;
    lines: string[];
    tone: "success" | "warn";
    smsHref?: string | null;
  } | null>(null);

  useEffect(() => {
    setOpenMessages(Boolean(clientPhone && visitSummary));
  }, [clientPhone, visitSummary]);

  if (!canCheckOut && !checkoutDone) return null;

  function toggleWork(id: string) {
    setWorkDone((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function buildCheckoutInput(needsReturn: boolean): CheckoutInput {
    return {
      outcome: needsReturn ? "follow_up" : "complete",
      notes: notes.trim() || undefined,
      workDone,
      trapPlaced: false,
      followUp: needsReturn
        ? { returnInDays: Number(returnInDays), dueOn: new Date(), notes: notes.trim() || undefined }
        : undefined,
    };
  }

  function dismissCheckoutDone() {
    setCheckoutDone(null);
    router.refresh();
  }

  async function sendCheckout(event: React.FormEvent) {
    event.preventDefault();
    if (finishedHere === null) return;
    setSaving(true);
    setError("");
    setQueuedNote("");
    setCheckoutDone(null);
    const needsReturn = !finishedHere;
    const wantedSms = openMessages && Boolean(clientPhone && visitSummary);
    const checkoutInput = buildCheckoutInput(needsReturn);
    const summaryHref =
      wantedSms && visitSummary ? visitSummarySmsHref(clientPhone, visitSummary, checkoutInput) : null;
    const response = await fieldFetch(`/api/jobs/${jobId}/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome: checkoutInput.outcome,
        notes: checkoutInput.notes,
        workDone: checkoutInput.workDone,
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
    const queued = isQueuedResponse(data);
    if (summaryHref) window.location.href = summaryHref;

    const smsLines = !wantedSms
      ? []
      : !summaryHref
        ? ["Could not open Messages — check the customer's phone number."]
        : queued
          ? [
              "Messages opened with your visit summary draft.",
              "Edit and send when you're ready. Check-out uploads when this phone has data.",
            ]
          : ["Messages opened with your visit summary — edit and send when you're ready."];

    setCheckoutDone({
      title: queued ? "Checked out (saved on phone)" : "Checked out",
      lines: queued
        ? ["Check-out saved on this phone. It uploads when you have data.", ...smsLines]
        : ["You're checked out.", ...smsLines],
      tone: queued ? "warn" : "success",
      smsHref: summaryHref,
    });
  }

  if (checkoutDone) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-3">
        <button
          type="button"
          aria-label="Dismiss"
          className="min-h-0 flex-1 sm:absolute sm:inset-0 sm:flex-none"
          onClick={dismissCheckoutDone}
        />
        <div
          role="dialog"
          aria-labelledby="checkout-done-title"
          className={`relative z-10 w-full rounded-t-2xl border bg-panel p-5 shadow-xl sm:max-w-md sm:rounded-2xl ${
            checkoutDone.tone === "success" ? "border-emerald-200" : "border-amber-200"
          }`}
        >
          <p
            className={`text-xs font-bold uppercase tracking-widest ${
              checkoutDone.tone === "success" ? "text-emerald-700" : "text-amber-800"
            }`}
          >
            {checkoutDone.tone === "success" ? "Done" : "Saved on phone"}
          </p>
          <h2 id="checkout-done-title" className="mt-1 font-display text-2xl">
            {checkoutDone.title}
          </h2>
          <div className="mt-3 space-y-2 text-sm text-stone-700">
            {checkoutDone.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {checkoutDone.smsHref ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = checkoutDone.smsHref!;
                }}
                className="min-h-11 w-full rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white"
              >
                Open Messages again
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismissCheckoutDone}
              className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CollapsibleJobSection title="Finish this visit" defaultOpen emphasized>
      <p className="text-sm text-stone-600">
        Log traps, captures, and photos above while you work. Check out when you leave.
      </p>

      <form className="space-y-4" onSubmit={(event) => void sendCheckout(event)}>
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
            <span className="mt-0.5 block text-xs font-normal text-stone-500">Notes + customer text only</span>
          </button>
        </div>

        {finishedHere === false ? (
          <div>
            <p className="text-sm font-medium">About when to come back (optional)</p>
            <p className="mt-1 text-xs text-stone-500">
              For the visit-summary text only — office schedules the return trip.
            </p>
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

        {finishedHere !== null && clientPhone && visitSummary ? (
          <label className="flex items-start gap-2 rounded-xl border border-line bg-orange/5 px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={openMessages}
              onChange={(event) => setOpenMessages(event.target.checked)}
            />
            <span>
              Open Messages with visit summary
              <span className="mt-0.5 block text-xs font-normal text-stone-500">
                Prefills a text from what you logged — you edit and send it yourself.
              </span>
            </span>
          </label>
        ) : null}

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {queuedNote ? <p className="text-sm text-amber-800">{queuedNote}</p> : null}

        <button
          type="submit"
          disabled={saving || finishedHere === null}
          className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving…" : "Check out"}
        </button>
      </form>
    </CollapsibleJobSection>
  );
}
