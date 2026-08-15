"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EQUIPMENT_TYPE_LABEL, EQUIPMENT_TYPES } from "@/lib/constants";
import { suggestSerial } from "@/lib/equipment";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function AddEquipmentForm({ serials }: { serials: string[] }) {
  const router = useRouter();
  const [type, setType] = useState("LIVE_CAGE");
  const suggested = useMemo(() => suggestSerial(type, serials), [type, serials]);
  const [serialNumber, setSerialNumber] = useState(suggested);
  const [touchedSerial, setTouchedSerial] = useState(false);
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function changeType(next: string) {
    setType(next);
    if (!touchedSerial) setSerialNumber(suggestSerial(next, serials));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/traps", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serialNumber: serialNumber.trim(),
        name: name.trim() || `${EQUIPMENT_TYPE_LABEL[type] ?? type} ${serialNumber.trim()}`,
        type,
        manufacturer: manufacturer.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not add this trap.");
      return;
    }
    setName("");
    setManufacturer("");
    setNotes("");
    setTouchedSerial(false);
    const nextSerials = [...serials, serialNumber.trim()];
    setSerialNumber(suggestSerial(type, nextSerials));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-4 md:p-5">
      <h2 className="font-semibold">Add to inventory</h2>
      <p className="mt-1 text-sm text-stone-600">
        Give it a serial so the same cage can be tracked from the shop to a job and back.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Type
          <select value={type} onChange={(event) => changeType(event.target.value)} className={inputClass}>
            {EQUIPMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {EQUIPMENT_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Serial
          <input
            required
            value={serialNumber}
            onChange={(event) => {
              setTouchedSerial(true);
              setSerialNumber(event.target.value);
            }}
            className={inputClass}
            placeholder={suggested}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder="Tomahawk live cage #22"
          />
        </label>
        <label className="block text-sm">
          Manufacturer
          <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Notes
          <input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} />
        </label>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Adding…" : "Add trap"}
      </button>
    </form>
  );
}
