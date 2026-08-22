"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrapQrHint } from "@/components/inventory/TrapQrHint";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EQUIPMENT_TYPE_LABEL, TRAP_STATUS_LABEL } from "@/lib/constants";
import {
  canDeleteEquipment,
  equipmentTypeOptions,
  isDeployedStatus,
  shopStatusOptions,
} from "@/lib/equipment";

type Gear = {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  status: string;
  manufacturer: string | null;
  notes: string | null;
  locationId: string | null;
  location: { id: string; name: string } | null;
  deploymentCount: number;
  deployments: Array<{
    locationNote: string;
    targetSpecies: string | null;
    property: { address1: string };
  }>;
};

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function EquipmentCard({
  item,
  locations,
}: {
  item: Gear;
  locations: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const live = item.deployments[0];
  const inField = isDeployedStatus(item.status);
  const deleteGate = canDeleteEquipment({ deploymentCount: item.deploymentCount, status: item.status });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    serialNumber: item.serialNumber,
    name: item.name,
    type: item.type,
    manufacturer: item.manufacturer ?? "",
    notes: item.notes ?? "",
    locationId: item.locationId ?? "",
    status: item.status,
  });

  function resetDraft() {
    setDraft({
      serialNumber: item.serialNumber,
      name: item.name,
      type: item.type,
      manufacturer: item.manufacturer ?? "",
      notes: item.notes ?? "",
      locationId: item.locationId ?? "",
      status: item.status,
    });
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/traps/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serialNumber: draft.serialNumber.trim(),
        name: draft.name.trim(),
        type: draft.type,
        manufacturer: draft.manufacturer.trim() || null,
        notes: draft.notes.trim() || null,
        locationId: draft.locationId || null,
        status: draft.status,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save this trap.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    const message = deleteGate.ok
      ? `Remove ${item.serialNumber} from inventory? This cannot be undone.`
      : `Retire ${item.serialNumber} instead? It will stay in history but leave active inventory.`;
    if (!confirm(message)) return;
    setRemoving(true);
    setError("");
    if (deleteGate.ok) {
      const response = await fetch(`/api/traps/${item.id}`, { method: "DELETE", credentials: "include" });
      const data = (await response.json()) as { error?: string };
      setRemoving(false);
      if (!response.ok) {
        setError(data.error ?? "Could not remove this trap.");
        return;
      }
      router.refresh();
      return;
    }
    const response = await fetch(`/api/traps/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serialNumber: item.serialNumber,
        name: item.name,
        type: item.type,
        manufacturer: item.manufacturer,
        notes: item.notes,
        locationId: item.locationId,
        status: "RETIRED",
      }),
    });
    const data = (await response.json()) as { error?: string };
    setRemoving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not retire this trap.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange">{item.serialNumber}</p>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-stone-500">{EQUIPMENT_TYPE_LABEL[item.type] ?? item.type}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      {live ? (
        <p className="mt-3 text-sm">
          {live.locationNote} · {live.property.address1}
          {live.targetSpecies ? ` · ${live.targetSpecies}` : ""}
        </p>
      ) : (
        <p className="mt-3 text-sm text-stone-500">{item.location?.name ?? "No location assigned"}</p>
      )}
      {item.manufacturer ? <p className="mt-1 text-xs text-stone-500">{item.manufacturer}</p> : null}
      {item.notes ? <p className="mt-1 text-sm text-stone-600">{item.notes}</p> : null}
      <TrapQrHint serial={item.serialNumber} />

      {editing ? (
        <form onSubmit={(event) => void save(event)} className="mt-4 space-y-3 border-t border-line pt-4">
          {inField ? (
            <p className="text-sm text-amber-900">
              In the field — only name, manufacturer, and notes can be changed here. Retrieve it on the job to move
              location or status.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Serial
              <input
                required
                disabled={inField}
                value={draft.serialNumber}
                onChange={(event) => setDraft((current) => ({ ...current, serialNumber: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              Type
              <select
                disabled={inField}
                value={draft.type}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                className={inputClass}
              >
                {equipmentTypeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              Name
              <input
                required
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              Manufacturer
              <input
                value={draft.manufacturer}
                onChange={(event) => setDraft((current) => ({ ...current, manufacturer: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              Status
              <select
                disabled={inField}
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                className={inputClass}
              >
                {shopStatusOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {inField ? (
                  <option value={item.status}>{TRAP_STATUS_LABEL[item.status] ?? item.status}</option>
                ) : null}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              Inventory location
              <select
                disabled={inField}
                value={draft.locationId}
                onChange={(event) => setDraft((current) => ({ ...current, locationId: event.target.value }))}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              Notes
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                className={inputClass}
                rows={2}
              />
            </label>
          </div>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-10 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetDraft();
                setEditing(false);
              }}
              className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={removing || inField}
              className="min-h-10 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60"
            >
              {removing ? "Working…" : deleteGate.ok ? "Remove" : "Retire"}
            </button>
          </div>
          {!deleteGate.ok && !inField ? <p className="text-xs text-stone-500">{deleteGate.reason}</p> : null}
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              resetDraft();
              setEditing(true);
            }}
            className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={removing || inField}
            className="min-h-10 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60"
          >
            {removing ? "Working…" : deleteGate.ok ? "Remove" : "Retire"}
          </button>
        </div>
      )}
      {error && !editing ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </article>
  );
}
