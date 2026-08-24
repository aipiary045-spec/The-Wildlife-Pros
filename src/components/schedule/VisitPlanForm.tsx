"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { JOB_TYPE_LABEL } from "@/lib/constants";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  properties: Array<{ id: string; address1: string; city: string }>;
};

type TechOption = { id: string; firstName: string; lastName: string };

export function VisitPlanForm({
  clients,
  technicians,
  defaultClientId,
  defaultPropertyId,
}: {
  clients: ClientOption[];
  technicians: TechOption[];
  defaultClientId?: string;
  defaultPropertyId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [title, setTitle] = useState("");
  const [totalVisits, setTotalVisits] = useState("4");
  const [durationMin, setDurationMin] = useState("60");
  const [jobType, setJobType] = useState("INSPECTION");
  const [instructions, setInstructions] = useState("");
  const [preferredTechId, setPreferredTechId] = useState("");
  const [createFirstTrip, setCreateFirstTrip] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const client = useMemo(() => clients.find((item) => item.id === clientId), [clients, clientId]);
  const properties = client?.properties ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/visit-plans", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        propertyId,
        title,
        totalVisits: Number(totalVisits),
        durationMin: Number(durationMin),
        jobType,
        instructions: instructions || undefined,
        preferredTechId: preferredTechId || undefined,
        createFirstTrip,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not create visit plan.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold"
      >
        New visit plan
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">New visit plan</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-stone-500">
          Cancel
        </button>
      </div>
      <p className="text-sm text-stone-600">
        Sell a fixed number of trips. Each visit is added to the pool manually — nothing auto-schedules.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          Client
          <select
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              const next = clients.find((item) => item.id === event.target.value);
              setPropertyId(next?.properties[0]?.id ?? "");
            }}
            className={inputClass}
          >
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.companyName ? `${item.companyName} · ` : ""}
                {item.firstName} {item.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Service address
          <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} required className={inputClass}>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.address1}, {property.city}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Plan name
          <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Quarterly rodent monitoring" className={inputClass} />
        </label>
        <label className="text-sm">
          Visits included
          <input type="number" min={1} max={999} value={totalVisits} onChange={(event) => setTotalVisits(event.target.value)} required className={inputClass} />
        </label>
        <label className="text-sm">
          Minutes per visit
          <input type="number" min={15} max={480} value={durationMin} onChange={(event) => setDurationMin(event.target.value)} required className={inputClass} />
        </label>
        <label className="text-sm">
          Job type
          <select value={jobType} onChange={(event) => setJobType(event.target.value)} className={inputClass}>
            {Object.entries(JOB_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Preferred tech
          <select value={preferredTechId} onChange={(event) => setPreferredTechId(event.target.value)} className={inputClass}>
            <option value="">Any</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.firstName} {tech.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Instructions for every trip
          <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={2} className={inputClass} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={createFirstTrip} onChange={(event) => setCreateFirstTrip(event.target.checked)} />
        Put trip 1 in the pool right away
      </label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? "Creating…" : "Create visit plan"}
      </button>
    </form>
  );
}
