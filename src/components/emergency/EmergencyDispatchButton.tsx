"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Siren, X } from "lucide-react";
import { hazardTagOptions, type EmergencyHazardTag } from "@/lib/emergency";
import { clientName } from "@/lib/utils";

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  properties: Array<{ id: string; address1: string; city: string }>;
};

export type EmergencyPrefill = {
  clientId?: string;
  propertyId?: string;
  situation?: string;
  phone?: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function EmergencyDispatchButton({
  clients,
  prefill,
}: {
  technicians?: Array<{ id: string; firstName: string; lastName: string }>;
  clients: ClientOption[];
  prefill?: EmergencyPrefill | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "quick">("existing");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [propertyId, setPropertyId] = useState(clients[0]?.properties[0]?.id ?? "");
  const [situation, setSituation] = useState("");
  const [message, setMessage] = useState("");
  const [hazardTags, setHazardTags] = useState<EmergencyHazardTag[]>([]);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [quickFirst, setQuickFirst] = useState("Emergency");
  const [quickLast, setQuickLast] = useState("Caller");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickAddress, setQuickAddress] = useState("");
  const [quickCity, setQuickCity] = useState("");
  const [quickState, setQuickState] = useState("NC");
  const [quickPostal, setQuickPostal] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!prefill) return;
    setOpen(true);
    if (prefill.clientId) {
      setMode("existing");
      setClientId(prefill.clientId);
      if (prefill.propertyId) setPropertyId(prefill.propertyId);
    }
    if (prefill.situation) setSituation(prefill.situation);
    if (prefill.phone) setQuickPhone(prefill.phone);
  }, [prefill]);

  useEffect(() => {
    if (!selectedClient) return;
    if (!selectedClient.properties.some((property) => property.id === propertyId)) {
      setPropertyId(selectedClient.properties[0]?.id ?? "");
    }
  }, [selectedClient, propertyId]);

  function toggleTag(tag: EmergencyHazardTag) {
    setHazardTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/emergency-dispatch", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: mode === "existing" ? clientId : undefined,
        propertyId: mode === "existing" ? propertyId : undefined,
        situation,
        message,
        hazardTags,
        notifyCustomer,
        quickClient:
          mode === "quick"
            ? {
                firstName: quickFirst,
                lastName: quickLast,
                phone: quickPhone,
                address1: quickAddress,
                city: quickCity,
                state: quickState,
                postalCode: quickPostal,
              }
            : undefined,
      }),
    });
    const data = (await response.json()) as { error?: string; job?: { id: string } };
    setSaving(false);
    if (!response.ok || !data.job?.id) {
      setError(data.error ?? "Could not dispatch this emergency.");
      return;
    }
    setOpen(false);
    router.refresh();
    router.push(`/jobs/${data.job.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-800"
      >
        <Siren size={16} />
        <span className="hidden sm:inline">Emergency</span>
      </button>
      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-3"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <form
                onSubmit={(event) => void submit(event)}
                onClick={(event) => event.stopPropagation()}
                className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem))] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-rose-200 bg-panel shadow-xl sm:max-h-[92dvh] sm:rounded-2xl"
              >
                <div className="shrink-0 border-b border-line px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-700">Emergency dispatch</p>
                      <h2 className="mt-1 font-display text-2xl">Alert the team</h2>
                    </div>
                    <button
                      type="button"
                      aria-label="Close emergency dispatch"
                      onClick={() => setOpen(false)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-stone-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Creates an unassigned emergency work order, texts every active tech, and pins it at the top of field routes until someone steals it.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <div className="flex gap-2">
                    <ModeChip active={mode === "existing"} label="Existing client" onClick={() => setMode("existing")} />
                    <ModeChip active={mode === "quick"} label="Quick address" onClick={() => setMode("quick")} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {mode === "existing" ? (
                      <>
                        <label className="block text-sm sm:col-span-2">
                          Client
                          <select value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {clientName(client)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm sm:col-span-2">
                          Property
                          <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={inputClass}>
                            {(selectedClient?.properties ?? []).map((property) => (
                              <option key={property.id} value={property.id}>
                                {property.address1}, {property.city}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="block text-sm">
                          First name
                          <input value={quickFirst} onChange={(event) => setQuickFirst(event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm">
                          Last name
                          <input value={quickLast} onChange={(event) => setQuickLast(event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm sm:col-span-2">
                          Phone
                          <input value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm sm:col-span-2">
                          Street address
                          <input
                            required
                            value={quickAddress}
                            onChange={(event) => setQuickAddress(event.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className="block text-sm">
                          City
                          <input value={quickCity} onChange={(event) => setQuickCity(event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm">
                          State
                          <input value={quickState} onChange={(event) => setQuickState(event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm">
                          ZIP
                          <input value={quickPostal} onChange={(event) => setQuickPostal(event.target.value)} className={inputClass} />
                        </label>
                      </>
                    )}

                    <label className="block text-sm sm:col-span-2">
                      What&apos;s happening
                      <input
                        required
                        value={situation}
                        onChange={(event) => setSituation(event.target.value)}
                        className={inputClass}
                        placeholder="Snake in the kitchen"
                      />
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      Note to techs
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className={inputClass}
                        rows={2}
                        placeholder="Drop non-urgent stops if needed. Customer says kids are home."
                      />
                    </label>
                  </div>

                  <fieldset className="mt-4">
                    <legend className="text-sm font-semibold">Hazards on site</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {hazardTagOptions().map((tag) => (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleTag(tag.value)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            hazardTags.includes(tag.value) ? "bg-rose-700 text-white" : "border border-line bg-white text-stone-600"
                          }`}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={notifyCustomer} onChange={(event) => setNotifyCustomer(event.target.checked)} />
                    Text customer that help is on the way
                  </label>

                  {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
                </div>

                <div className="shrink-0 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-lg bg-rose-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {saving ? "Dispatching…" : "Dispatch now"}
                    </button>
                  </div>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ModeChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-semibold ${active ? "bg-rose-700 text-white" : "border border-line text-stone-600"}`}
    >
      {label}
    </button>
  );
}
