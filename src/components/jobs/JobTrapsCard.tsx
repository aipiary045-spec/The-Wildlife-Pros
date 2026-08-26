"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EQUIPMENT_TYPE_LABEL, EQUIPMENT_TYPES } from "@/lib/constants";
import { suggestSerial } from "@/lib/equipment";
import { fieldFetch, isQueuedResponse } from "@/lib/field-fetch";
import { CollapsibleJobSection } from "@/components/jobs/CollapsibleJobSection";
import { TrapQrScanner } from "@/components/jobs/TrapQrScanner";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

type StockItem = {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  status: string;
};

type JobDeployment = {
  id: string;
  status: string;
  locationNote: string;
  targetSpecies: string | null;
  baitUsed: string | null;
  retrievedAt: Date | string | null;
  equipment: { serialNumber: string; name: string; type: string };
};

export function JobTrapsCard({
  jobId,
  stock,
  deployments,
  serials,
  species,
}: {
  jobId: string;
  stock: StockItem[];
  deployments: JobDeployment[];
  serials: string[];
  species: string[];
}) {
  const router = useRouter();
  const live = deployments.filter((item) => !item.retrievedAt);
  const past = deployments.filter((item) => item.retrievedAt);
  const [equipmentId, setEquipmentId] = useState(stock[0]?.id ?? "new");
  const addingNew = equipmentId === "new" || stock.length === 0;
  const [type, setType] = useState("LIVE_CAGE");
  const suggested = useMemo(() => suggestSerial(type, serials), [type, serials]);
  const [serialNumber, setSerialNumber] = useState(suggested);
  const [name, setName] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [targetSpecies, setTargetSpecies] = useState(species[0] ?? "");
  const [baitUsed, setBaitUsed] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [retrieving, setRetrieving] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (equipmentId === "new") return;
    if (stock.some((item) => item.id === equipmentId)) return;
    setEquipmentId(stock[0]?.id ?? "new");
  }, [stock, equipmentId]);

  async function deploy(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (addingNew && typeof navigator !== "undefined" && !navigator.onLine) {
      setSaving(false);
      setError("Need a signal to add a brand-new trap to inventory. Pick one already on the truck.");
      return;
    }
    let nextEquipmentId = equipmentId;
    if (addingNew) {
      const created = await fieldFetch("/api/traps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: serialNumber.trim(),
          name: name.trim() || `${EQUIPMENT_TYPE_LABEL[type] ?? type} ${serialNumber.trim()}`,
          type,
        }),
      });
      const createdData = (await created.json()) as { equipment?: { id: string }; error?: string };
      if (!created.ok || !createdData.equipment) {
        setSaving(false);
        setError(createdData.error ?? "Could not add that trap to inventory.");
        return;
      }
      nextEquipmentId = createdData.equipment.id;
    }
    const response = await fieldFetch("/api/deployments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipmentId: nextEquipmentId,
        jobId,
        locationNote: locationNote.trim(),
        targetSpecies: targetSpecies.trim() || undefined,
        baitUsed: baitUsed.trim() || undefined,
      }),
    });
    const data = (await response.json()) as { error?: string; queued?: boolean };
    setSaving(false);
    if (!response.ok && !isQueuedResponse(data)) {
      setError(data.error ?? "Could not deploy this trap.");
      return;
    }
    setLocationNote("");
    setBaitUsed("");
    setName("");
    router.refresh();
  }

  async function retrieve(id: string) {
    setRetrieving(id);
    setError("");
    const response = await fieldFetch("/api/deployments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "RETRIEVED" }),
    });
    setRetrieving(null);
    const data = (await response.json()) as { error?: string; queued?: boolean };
    if (!response.ok && !isQueuedResponse(data)) {
      setError(data.error ?? "Could not retrieve this trap.");
      return;
    }
    router.refresh();
  }

  function pickSerial(serial: string) {
    const match = stock.find((item) => item.serialNumber.toUpperCase() === serial);
    if (match) {
      setEquipmentId(match.id);
      return;
    }
    setEquipmentId("new");
    setSerialNumber(serial);
    setName("");
  }

  return (
    <CollapsibleJobSection
      title="Traps on this job"
      collapsedHint={live.length ? `${live.length} active` : undefined}
      defaultOpen={live.length > 0}
    >
      {live.length === 0 ? <p className="text-sm text-stone-500">None in the field yet.</p> : null}
      <ul className="space-y-2">
        {live.map((item) => (
          <li key={item.id} className="rounded-xl bg-background px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {item.equipment.serialNumber} · {item.equipment.name}
                </p>
                <p className="text-stone-600">{item.locationNote}</p>
                <p className="text-xs text-stone-500">
                  {item.targetSpecies ?? "No target noted"}
                  {item.baitUsed ? ` · bait ${item.baitUsed}` : ""}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <button
              type="button"
              onClick={() => retrieve(item.id)}
              disabled={retrieving === item.id}
              className="mt-2 min-h-11 rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-60"
            >
              {retrieving === item.id ? "Retrieving…" : "Retrieve to truck"}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={deploy} className="mt-4 space-y-3 border-t border-line pt-4">
        <p className="text-sm font-medium">Deploy on this job</p>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="min-h-11 w-full rounded-lg border border-dashed border-orange px-4 text-sm font-semibold text-orange"
        >
          Scan trap QR
        </button>
        <TrapQrScanner
          open={scanOpen}
          serials={serials}
          onClose={() => setScanOpen(false)}
          onScan={pickSerial}
        />
        <label className="block text-sm">
          Gear
          <select
            value={addingNew ? "new" : equipmentId}
            onChange={(event) => setEquipmentId(event.target.value)}
            className={inputClass}
          >
            {stock.map((item) => (
              <option key={item.id} value={item.id}>
                {item.serialNumber} · {item.name}
              </option>
            ))}
            <option value="new">Add new trap to inventory…</option>
          </select>
        </label>
        {addingNew ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Type
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setSerialNumber(suggestSerial(event.target.value, serials));
                }}
                className={inputClass}
              >
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
                onChange={(event) => setSerialNumber(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
            </label>
          </div>
        ) : null}
        <label className="block text-sm">
          Where on this property
          <input
            required
            value={locationNote}
            onChange={(event) => setLocationNote(event.target.value)}
            className={inputClass}
            placeholder="Attic — chimney chase, south rafter"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Target
            <input
              list="job-species"
              value={targetSpecies}
              onChange={(event) => setTargetSpecies(event.target.value)}
              className={inputClass}
              placeholder="Raccoon"
            />
            <datalist id="job-species">
              {species.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            Bait
            <input value={baitUsed} onChange={(event) => setBaitUsed(event.target.value)} className={inputClass} />
          </label>
        </div>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Deploying…" : addingNew ? "Add and deploy" : "Deploy on this job"}
        </button>
      </form>

      {past.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs uppercase tracking-wider text-stone-500">Retrieved</p>
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            {past.map((item) => (
              <li key={item.id}>
                {item.equipment.serialNumber} · {item.locationNote}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </CollapsibleJobSection>
  );
}
