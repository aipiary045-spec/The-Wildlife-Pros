"use client";

import { addDays } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LineItemsEditor, type LineDraft, type ServiceOption } from "@/components/billing/LineItemsEditor";
import { dateKey } from "@/lib/dates";
import { clientName } from "@/lib/utils";
import type { ScheduleClient } from "@/components/schedule/NewJobDialog";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function NewQuoteButton({
  clients,
  services,
}: {
  clients: ScheduleClient[];
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white">
        New quote
      </button>
      {open ? (
        <QuoteForm clients={clients} services={services} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function QuoteForm({
  clients,
  services,
  onClose,
}: {
  clients: ScheduleClient[];
  services: ServiceOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const selected = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId]);
  const [propertyId, setPropertyId] = useState(selected?.properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [validUntil, setValidUntil] = useState(dateKey(addDays(new Date(), 14)));
  const [items, setItems] = useState<LineDraft[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) return;
    if (!selected.properties.some((property) => property.id === propertyId)) {
      setPropertyId(selected.properties[0]?.id ?? "");
    }
  }, [selected, propertyId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || !propertyId) {
      setError("Pick a client with a service address.");
      return;
    }
    if (items.length === 0 || items.some((item) => !item.name.trim())) {
      setError("Add at least one named line item.");
      return;
    }
    setSaving(true);
    setError("");
    const response = await fetch("/api/quotes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        propertyId,
        title: title.trim() || "Service estimate",
        message: message.trim() || undefined,
        validUntil,
        lineItems: items,
      }),
    });
    const data = (await response.json()) as { quote?: { id: string }; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save this quote.");
      return;
    }
    onClose();
    router.refresh();
    if (data.quote?.id) router.push(`/quotes/${data.quote.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-orange">New quote</p>
        <h2 className="mt-1 font-display text-2xl">Estimate for the customer</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Client
            <select required value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {clientName(client)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Property
            <select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={inputClass}>
              {(selected?.properties ?? []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.address1}, {property.city}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Raccoon attic trapping + exclusion" />
          </label>
          <label className="block text-sm sm:col-span-2">
            Message to the customer
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} className={inputClass} />
          </label>
          <label className="block text-sm">
            Valid until
            <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className={inputClass} />
          </label>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Line items</p>
          <LineItemsEditor items={items} services={services} onChange={setItems} />
        </div>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
