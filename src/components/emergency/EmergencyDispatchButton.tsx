"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Siren } from "lucide-react";
import { hazardTagOptions, type EmergencyHazardTag } from "@/lib/emergency";
import { clientName } from "@/lib/utils";

type Technician = { id: string; firstName: string; lastName: string };
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
  serviceRequestId?: string;
  situation?: string;
  phone?: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function EmergencyDispatchButton({
  technicians,
  clients,
  prefill,
}: {
  technicians: Technician[];
  clients: ClientOption[];
  prefill?: EmergencyPrefill | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "quick">("existing");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [propertyId, setPropertyId] = useState(clients[0]?.properties[0]?.id ?? "");
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id ?? "");
  const [backupTechnicianId, setBackupTechnicianId] = useState("");
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
  const [serviceRequestId, setServiceRequestId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId]);

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
    if (prefill.serviceRequestId) setServiceRequestId(prefill.serviceRequestId);
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
        technicianId,
        backupTechnicianId: backupTechnicianId || undefined,
        situation,
        message,
        hazardTags,
        notifyCustomer,
        serviceRequestId,
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
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <form
            onSubmit={(event) => void submit(event)}
            className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-rose-200 bg-panel p-5 shadow-xl"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-rose-700">Emergency dispatch</p>
            <h2 className="mt-1 font-display text-2xl">Send a tech now</h2>
            <p className="mt-2 text-sm text-stone-600">
              Creates an emergency work order, texts the assigned tech, and pins the stop at the top of their field route.
            </p>

            <div className="mt-4 flex gap-2">
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
                    <input required value={quickAddress} onChange={(event) => setQuickAddress(event.target.value)} className={inputClass} />
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
                Note to tech
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className={inputClass}
                  rows={2}
                  placeholder="Drop your current stop and go. Customer says kids are home."
                />
              </label>
              <label className="block text-sm">
                Assign to
                <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className={inputClass}>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Backup tech
                <select value={backupTechnicianId} onChange={(event) => setBackupTechnicianId(event.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {technicians
                    .filter((tech) => tech.id !== technicianId)
                    .map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName}
                      </option>
                    ))}
                </select>
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
              Text customer that a technician is on the way
            </label>

            {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
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
          </form>
        </div>
      ) : null}
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
