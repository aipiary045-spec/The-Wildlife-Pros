"use client";

import { addDays, addMinutes, format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { dateKey } from "@/lib/dates";
import { visitActionForStatus } from "@/lib/job-visit";
import type { ScheduleTech } from "@/components/schedule/job-card";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function JobVisitControls({
  jobId,
  status,
  technicianId,
  technicians = [],
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
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const [date, setDate] = useState(dateKey(tomorrow));
  const [time, setTime] = useState("09:00");
  const [techId, setTechId] = useState(technicianId ?? technicians[0]?.id ?? "");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");
  const [choice, setChoice] = useState<"complete" | "follow_up" | null>(null);

  if (!action) return null;

  async function checkIn() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/jobs/${jobId}/check-in`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not check in");
      return;
    }
    router.refresh();
  }

  async function sendCheckout(outcome: "complete" | "follow_up") {
    setSaving(true);
    setError("");
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const response = await fetch(`/api/jobs/${jobId}/check-out`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome,
        notes: notes.trim() || undefined,
        followUp:
          outcome === "follow_up"
            ? {
                scheduledStart: scheduledStart.toISOString(),
                scheduledEnd: addMinutes(scheduledStart, Number(durationMin) || 60).toISOString(),
                technicianId: techId || undefined,
                durationMin: Number(durationMin) || 60,
                instructions: notes.trim() || undefined,
              }
            : undefined,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not check out");
      return;
    }
    setOpen(false);
    setChoice(null);
    setNotes("");
    router.refresh();
  }

  const buttonClass = compact
    ? "mt-1 w-full rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
    : "min-h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60";

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
          className={compact ? buttonClass : "min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"}
          onClick={() => {
            setChoice(null);
            setOpen(true);
          }}
        >
          Check out
        </button>
      )}
      {error && !open ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl">
            {choice !== "follow_up" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-orange">Check out</p>
                <h2 className="mt-1 font-display text-2xl">How did this visit end?</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Does the customer need a follow-up visit, or is this job complete?
                </p>
                <label className="mt-4 block text-sm">
                  Notes from this visit
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Trap still set, raccoon in the cage, exclusion finished…"
                    className={inputClass}
                  />
                </label>
                {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void sendCheckout("complete")}
                    className="min-h-12 rounded-lg bg-orange px-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Job complete"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setChoice("follow_up")}
                    className="min-h-12 rounded-lg border border-line px-3 text-sm font-semibold"
                  >
                    Needs follow-up
                  </button>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full text-sm font-medium text-stone-500">
                  Stay on site
                </button>
              </>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendCheckout("follow_up");
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-orange">Follow-up visit</p>
                <h2 className="mt-1 font-display text-2xl">Schedule the next trip</h2>
                <p className="mt-2 text-sm text-stone-600">
                  This visit closes. A new job is created for the same customer and address.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    Date
                    <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
                  </label>
                  <label className="block text-sm">
                    Time
                    <input type="time" required value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} />
                  </label>
                  {technicians.length > 0 ? (
                    <label className="block text-sm">
                      Technician
                      <select value={techId} onChange={(event) => setTechId(event.target.value)} className={inputClass}>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.firstName} {tech.lastName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="block text-sm">
                    Minutes on site
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={durationMin}
                      onChange={(event) => setDurationMin(Number(event.target.value))}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    What is the follow-up for
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      placeholder="Check the cage, reset bait, pick up the trap…"
                      className={inputClass}
                    />
                  </label>
                </div>
                {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
                <p className="mt-3 text-xs text-stone-500">Next visit {format(tomorrow, "EEE MMM d")} unless you change the date.</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setChoice(null)} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Check out & schedule"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
