"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISPOSITION_LABEL } from "@/lib/constants";

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
  const [speciesId, setSpeciesId] = useState(species[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [disposition, setDisposition] = useState("RELOCATED");
  const [deploymentId, setDeploymentId] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!speciesId) {
      setError("Pick a species.");
      return;
    }
    setSaving(true);
    setError("");
    const response = await fetch("/api/species-logs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        speciesId,
        quantity,
        disposition,
        deploymentId: deploymentId || undefined,
        locationNote: locationNote.trim() || undefined,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not log this capture.");
      return;
    }
    setLocationNote("");
    setQuantity(1);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Species
          <select required value={speciesId} onChange={(event) => setSpeciesId(event.target.value)} className={inputClass}>
            {species.map((item) => (
              <option key={item.id} value={item.id}>
                {item.commonName}
              </option>
            ))}
          </select>
        </label>
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
      <button type="submit" disabled={saving || !speciesId} className="min-h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? "Saving…" : "Log capture"}
      </button>
    </form>
  );
}
