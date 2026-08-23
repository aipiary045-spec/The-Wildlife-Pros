"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateInvoiceButton } from "@/components/billing/InvoiceActions";
import { SendQuoteDialog } from "@/components/quotes/SendQuoteDialog";
import { ReturnVisitFields, addReturnVisit } from "@/components/jobs/RecurringForm";
import { FREQUENCY_RETURN_DAYS } from "@/lib/schedule-needs";
import { AreaSuggestions } from "@/components/schedule/AreaSuggestions";
import { dateKey } from "@/lib/dates";
import { quoteCanConvert, quoteCanInvoice } from "@/lib/quotes";
import type { ScheduleTech } from "@/components/schedule/job-card";

export function QuoteActions({
  quoteId,
  quoteNumber,
  status,
  technicians,
  portalToken,
  propertyId,
  clientEmail,
  clientPhone,
  techView = false,
  invoice,
}: {
  quoteId: string;
  quoteNumber: string;
  status: string;
  technicians: ScheduleTech[];
  portalToken?: string | null;
  propertyId?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  techView?: boolean;
  invoice?: { id: string; balance: number } | null;
}) {
  const router = useRouter();
  const [convertOpen, setConvertOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const canInvoice = !techView && quoteCanInvoice(status) && !invoice;

  if (techView && status !== "DRAFT" && status !== "DECLINED") return null;
  if (status === "CONVERTED" && !invoice) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" || status === "DECLINED" ? (
        <button
          type="button"
          disabled={false}
          onClick={() => setSendOpen(true)}
          className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Send to customer
        </button>
      ) : null}
      {techView ? null : quoteCanConvert(status) ? (
        <button
          type="button"
          onClick={() => setConvertOpen(true)}
          className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold"
        >
          Convert to job
        </button>
      ) : null}
      {canInvoice ? <CreateInvoiceButton quoteId={quoteId} label="Create invoice" /> : null}
      {techView || !invoice ? null : (
        <Link
          href={`/invoices/${invoice.id}`}
          className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white inline-flex items-center"
        >
          {Number(invoice.balance) > 0 ? "Collect payment" : "View invoice"}
        </Link>
      )}
      {techView || !portalToken || (status !== "SENT" && status !== "VIEWED") ? null : (
        <p className="text-xs text-stone-500">Customer hub: /portal/{portalToken}</p>
      )}
      {convertOpen ? (
        <ConvertDialog
          quoteId={quoteId}
          propertyId={propertyId}
          technicians={technicians}
          onClose={() => setConvertOpen(false)}
        />
      ) : null}
      {sendOpen ? (
        <SendQuoteDialog
          quoteId={quoteId}
          quoteNumber={quoteNumber}
          clientEmail={clientEmail}
          clientPhone={clientPhone}
          onClose={() => {
            setSendOpen(false);
            router.refresh();
          }}
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
