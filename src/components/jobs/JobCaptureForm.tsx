"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { DISPOSITION_LABEL } from "@/lib/constants";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { matchSpeciesInput } from "@/lib/species";

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
  const listId = useId();
  const speciesInputRef = useRef<HTMLInputElement>(null);
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [disposition, setDisposition] = useState("RELOCATED");
  const [deploymentId, setDeploymentId] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [error, setError] = useState("");
  const [queuedNote, setQueuedNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const matched = matchSpeciesInput(speciesQuery, species);
    if (!matched.speciesId && !matched.speciesName) {
      setError("Type or pick a species.");
      speciesInputRef.current?.focus();
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
        speciesId: matched.speciesId,
        speciesName: matched.speciesName,
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
    setSpeciesQuery("");
    if (isQueuedResponse(data)) {
      setQueuedNote("Capture saved on this phone. It uploads when you have data.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          Species
          <input
            ref={speciesInputRef}
            list={listId}
            value={speciesQuery}
            onChange={(event) => setSpeciesQuery(event.target.value)}
            className={inputClass}
            placeholder="Type a name or pick from the list"
            autoComplete="off"
            enterKeyHint="done"
            required
          />
          <datalist id={listId}>
            {species.map((item) => (
              <option key={item.id} value={item.commonName} />
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-stone-500">
            Pick a known animal or type a new common name to add it.
          </span>
        </label>
        <label className="block text-sm">
          Quantity
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className={inputClass}
          />
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
          <input
            value={locationNote}
            onChange={(event) => setLocationNote(event.target.value)}
            className={inputClass}
            placeholder="Attic chase, south rafter"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {queuedNote ? <p className="text-sm text-amber-800">{queuedNote}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Log capture"}
      </button>
    </form>
  );
}
