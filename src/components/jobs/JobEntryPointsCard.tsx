"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

type EntryPointRow = {
  id: string;
  label: string;
  area: string | null;
  description: string | null;
  sealed: boolean;
};

type ExclusionRow = {
  id: string;
  material: string;
  quantity: string | null;
  notes: string | null;
  entryPoint: { label: string } | null;
};

export function JobEntryPointsCard({
  jobId,
  propertyId,
  entryPoints,
  exclusions,
}: {
  jobId: string;
  propertyId: string;
  entryPoints: EntryPointRow[];
  exclusions: ExclusionRow[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryPointId, setEntryPointId] = useState(entryPoints[0]?.id ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"entry" | "exclusion" | null>(null);

  async function addEntry(event: React.FormEvent) {
    event.preventDefault();
    setSaving("entry");
    setError("");
    const response = await fetch("/api/entry-points", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, jobId, label, area, description }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(null);
    if (!response.ok) {
      setError(data.error ?? "Could not add entry point.");
      return;
    }
    setLabel("");
    setArea("");
    setDescription("");
    router.refresh();
  }

  async function addExclusion(event: React.FormEvent) {
    event.preventDefault();
    setSaving("exclusion");
    setError("");
    const response = await fetch("/api/exclusions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        entryPointId: entryPointId || undefined,
        material,
        quantity,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(null);
    if (!response.ok) {
      setError(data.error ?? "Could not log exclusion.");
      return;
    }
    setMaterial("");
    setQuantity("");
    router.refresh();
  }

  async function toggleSealed(id: string, sealed: boolean) {
    setError("");
    const response = await fetch("/api/entry-points", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sealed: !sealed }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not update entry point.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="mb-3 font-semibold">Entry points & exclusion</h2>

      {entryPoints.length === 0 ? (
        <p className="text-sm text-stone-500">No entry points mapped yet.</p>
      ) : (
        <ul className="space-y-2">
          {entryPoints.map((item) => (
            <li key={item.id} className="rounded-xl bg-background px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.area ? <p className="text-stone-600">{item.area}</p> : null}
                  {item.description ? <p className="text-xs text-stone-500">{item.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleSealed(item.id, item.sealed)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.sealed ? "bg-emerald-100 text-emerald-900" : "border border-line text-stone-600"
                  }`}
                >
                  {item.sealed ? "Sealed" : "Open"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addEntry} className="mt-4 space-y-3 border-t border-line pt-4">
        <p className="text-sm font-medium">Add entry point</p>
        <label className="block text-sm">
          Label
          <input required value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} placeholder="Soffit vent — north gable" />
        </label>
        <label className="block text-sm">
          Area
          <input value={area} onChange={(event) => setArea(event.target.value)} className={inputClass} placeholder="Attic / roofline" />
        </label>
        <label className="block text-sm">
          Notes
          <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={saving === "entry"}
          className="min-h-11 w-full rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60"
        >
          {saving === "entry" ? "Saving…" : "Add entry point"}
        </button>
      </form>

      {exclusions.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs uppercase tracking-wider text-stone-500">Exclusion work</p>
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            {exclusions.map((item) => (
              <li key={item.id}>
                {item.material}
                {item.quantity ? ` · ${item.quantity}` : ""}
                {item.entryPoint ? ` · ${item.entryPoint.label}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={addExclusion} className="mt-4 space-y-3 border-t border-line pt-4">
        <p className="text-sm font-medium">Log exclusion material</p>
        {entryPoints.length > 0 ? (
          <label className="block text-sm">
            Entry point
            <select value={entryPointId} onChange={(event) => setEntryPointId(event.target.value)} className={inputClass}>
              <option value="">General / not tied to one spot</option>
              {entryPoints.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm">
          Material
          <input required value={material} onChange={(event) => setMaterial(event.target.value)} className={inputClass} placeholder='1/4" galvanized mesh' />
        </label>
        <label className="block text-sm">
          Quantity
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputClass} placeholder="12 ft" />
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={saving === "exclusion"}
          className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving === "exclusion" ? "Saving…" : "Log exclusion"}
        </button>
      </form>
    </section>
  );
}
