"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISPOSITION_LABEL } from "@/lib/constants";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function JobCaptureForm({
  jobId,
  species,
  deployments,
}: {
  jobId: string;
  species: Array<{ id: string; commonName: string }>;
  deployments: Array<{ id: string; equipment: { serialNumber: string } }>;
}) {
  const router = useRouter();
  const [speciesId, setSpeciesId] = useState(species[0]?.id ?? "__new");
  const [newSpecies, setNewSpecies] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [disposition, setDisposition] = useState("RELOCATED");
  const [deploymentId, setDeploymentId] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [error, setError] = useState("");
  const [queuedNote, setQueuedNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!speciesId || (speciesId === "__new" && !newSpecies.trim())) {
      setError("Pick a species or type a new one.");
      return;
    }
    setSaving(true);
    setError("");
    setQueuedNote("");
    const response = await fieldFetch("/api/species-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        speciesId: speciesId === "__new" ? undefined : speciesId,
        speciesName: speciesId === "__new" || !speciesId ? newSpecies.trim() : undefined,
        quantity,
        disposition,
        deploymentId: deploymentId || undefined,
        locationNote: locationNote.trim() || undefined,
      }),
    });
    const data = (await response.json()) as { error?: string; queued?: boolean };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not log this capture.");
      return;
    }
    setLocationNote("");
    setQuantity(1);
    setNewSpecies("");
    if (isQueuedResponse(data)) {
      setQueuedNote("Capture saved on this phone. It uploads when you have data.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Species
          <select required value={speciesId} onChange={(event) => setSpeciesId(event.target.value)} className={inputClass}>
            <option value="__new">Type a new species…</option>
            {species.map((item) => (
              <option key={item.id} value={item.id}>
                {item.commonName}
              </option>
            ))}
          </select>
        </label>
        {speciesId === "__new" || species.length === 0 ? (
          <label className="block text-sm">
            New species name
            <input
              value={newSpecies}
              onChange={(event) => setNewSpecies(event.target.value)}
              className={inputClass}
              placeholder="Gray squirrel"
            />
          </label>
        ) : null}
        <label className="block text-sm">
          Quantity
          <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className={inputClass} />
        </label>
        <label className="block text-sm">
          Disposition
          <select value={disposition} onChange={(event) => setDisposition(event.target.value)} className={inputClass}>
            {Object.entries(DISPOSITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Trap (optional)
          <select value={deploymentId} onChange={(event) => setDeploymentId(event.target.value)} className={inputClass}>
            <option value="">Not tied to a serial</option>
            {deployments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.equipment.serialNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          Location note
          <input value={locationNote} onChange={(event) => setLocationNote(event.target.value)} className={inputClass} placeholder="Attic chase, south rafter" />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {queuedNote ? <p className="text-sm text-amber-800">{queuedNote}</p> : null}
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? "Saving…" : "Log capture"}
      </button>
    </form>
  );
}
