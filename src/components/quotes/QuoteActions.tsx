"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReturnVisitFields, addReturnVisit } from "@/components/jobs/RecurringForm";
import { FREQUENCY_RETURN_DAYS } from "@/lib/schedule-needs";
import { AreaSuggestions } from "@/components/schedule/AreaSuggestions";
import { dateKey } from "@/lib/dates";
import { quoteCanConvert } from "@/lib/quotes";
import type { ScheduleTech } from "@/components/schedule/job-card";

export function QuoteActions({
  quoteId,
  status,
  technicians,
  portalToken,
  propertyId,
}: {
  quoteId: string;
  status: string;
  technicians: ScheduleTech[];
  portalToken?: string | null;
  propertyId?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);

  async function send() {
    setSaving("send");
    setError("");
    const response = await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving("");
    if (!response.ok) {
      setError(data.error ?? "Could not send this quote.");
      return;
    }
    router.refresh();
  }

  if (status === "CONVERTED") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" || status === "DECLINED" ? (
        <button
          type="button"
          disabled={Boolean(saving)}
          onClick={() => void send()}
          className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving === "send" ? "Sending…" : "Send to customer"}
        </button>
      ) : null}
      {quoteCanConvert(status) ? (
        <button
          type="button"
          onClick={() => setConvertOpen(true)}
          className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold"
        >
          Convert to job
        </button>
      ) : null}
      {portalToken && (status === "SENT" || status === "VIEWED") ? (
        <p className="text-xs text-stone-500">Customer hub: /portal/{portalToken}</p>
      ) : null}
      {error ? <p className="w-full text-sm text-rose-700">{error}</p> : null}
      {convertOpen ? (
        <ConvertDialog
          quoteId={quoteId}
          propertyId={propertyId}
          technicians={technicians}
          onClose={() => setConvertOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ConvertDialog({
  quoteId,
  propertyId,
  technicians,
  onClose,
}: {
  quoteId: string;
  propertyId?: string | null;
  technicians: ScheduleTech[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id ?? "");
  const [durationMin, setDurationMin] = useState(60);
  const [frequency, setFrequency] = useState("");
  const [returnInDays, setReturnInDays] = useState(FREQUENCY_RETURN_DAYS.MONTHLY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    let scheduledStart: string | undefined;
    if (date) {
      const [year, month, day] = date.split("-").map(Number);
      const [hours, minutes] = time.split(":").map(Number);
      scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
    }
    const response = await fetch(`/api/quotes/${quoteId}/convert`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technicianId: technicianId || undefined,
        scheduledStart,
        durationMin: Number(durationMin) || 60,
      }),
    });
    const data = (await response.json()) as { job?: { id: string }; error?: string };
    if (!response.ok || !data.job?.id) {
      setSaving(false);
      setError(data.error ?? "Could not convert this quote.");
      return;
    }
    if (frequency) {
      try {
        await addReturnVisit(data.job.id, frequency, returnInDays);
      } catch (caught) {
        window.alert(caught instanceof Error ? caught.message : "Work order was created, but the return visit was not.");
      }
    }
    setSaving(false);
    onClose();
    router.refresh();
    router.push(`/jobs/${data.job.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Convert quote</p>
        <h2 className="mt-1 font-display text-2xl">Turn this into a work order</h2>
        <p className="mt-2 text-sm text-stone-600">Leave the date blank to drop it on the unscheduled rail.</p>
        <label className="mt-4 block text-sm">
          Technician
          <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2">
            <option value="">Unassigned</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.firstName} {tech.lastName}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2" />
          </label>
          <label className="block text-sm">
            Time
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2" />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          Minutes on site
          <input
            type="number"
            min={15}
            step={15}
            value={durationMin}
            onChange={(event) => setDurationMin(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          />
        </label>
        <div className="mt-3">
          <AreaSuggestions
            propertyId={propertyId ?? undefined}
            onPick={(pick) => {
              setTechnicianId(pick.technicianId);
              setDate(pick.date);
              setTime(pick.time);
            }}
          />
        </div>
        <div className="mt-3 space-y-2 rounded-xl border border-line bg-white/60 p-3">
          <p className="text-sm font-semibold">Return visits</p>
          <p className="text-sm text-stone-600">
            Optional. Puts this customer in needs-scheduled when the next trip is due.
          </p>
          <ReturnVisitFields
            frequency={frequency}
            returnInDays={returnInDays}
            onFrequency={setFrequency}
            onDays={setReturnInDays}
            allowNone
          />
        </div>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Convert to job"}
          </button>
        </div>
        <p className="sr-only">{dateKey(new Date())}</p>
      </form>
    </div>
  );
}
