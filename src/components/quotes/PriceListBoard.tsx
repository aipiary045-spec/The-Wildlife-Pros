"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";

export type PriceListItem = {
  id: string;
  name: string;
  description: string | null;
  jobType: string;
  unitPrice: number;
  taxable: boolean;
  active: boolean;
};

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

const empty = {
  name: "",
  description: "",
  jobType: "INSPECTION",
  unitPrice: "0",
  taxable: true,
  active: true,
};

export function PriceListBoard({ items }: { items: PriceListItem[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(item: PriceListItem) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      description: item.description ?? "",
      jobType: item.jobType,
      unitPrice: String(item.unitPrice),
      taxable: item.taxable,
      active: item.active,
    });
    setError("");
  }

  function reset() {
    setEditingId(null);
    setDraft(empty);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(editingId ? `/api/services/${editingId}` : "/api/services", {
      method: editingId ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        description: draft.description,
        jobType: draft.jobType,
        unitPrice: Number(draft.unitPrice),
        taxable: draft.taxable,
        active: draft.active,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save that line.");
      return;
    }
    reset();
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => void save(event)} className="space-y-3 rounded-2xl border border-line bg-panel p-5">
        <div>
          <h2 className="font-semibold">{editingId ? "Edit line item" : "Add a line item"}</h2>
          <p className="text-sm text-stone-600">
            These show up as “Add from price list” when someone writes a quote. Change the price here and new quotes pick it up.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Name
            <input
              required
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
              placeholder="Live trap check"
            />
          </label>
          <label className="text-sm">
            Job type
            <select
              value={draft.jobType}
              onChange={(event) => setDraft((current) => ({ ...current, jobType: event.target.value }))}
              className={inputClass}
            >
              {Object.entries(JOB_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Price each
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={draft.unitPrice}
              onChange={(event) => setDraft((current) => ({ ...current, unitPrice: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            Notes (optional)
            <input
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className={inputClass}
              placeholder="What this covers"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.taxable}
              onChange={(event) => setDraft((current) => ({ ...current, taxable: event.target.checked }))}
            />
            Taxable
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
            />
            Show on new quotes
          </label>
        </div>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : editingId ? "Save line" : "Add to price list"}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold">
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-panel p-5 text-sm text-stone-600">
          No catalog lines yet. Add one above, then pick it with “Add from price list” on a new quote.
        </p>
      ) : null}
      <div className="space-y-2 md:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => startEdit(item)}
            className="block w-full rounded-2xl border border-line bg-panel p-4 text-left"
          >
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-stone-600">
              {formatMoney(item.unitPrice)} · {JOB_TYPE_LABEL[item.jobType] ?? item.jobType}
              {item.taxable ? "" : " · no tax"}
              {item.active ? "" : " · hidden"}
            </p>
            {item.description ? <p className="mt-1 text-xs text-stone-500">{item.description}</p> : null}
          </button>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Tax</th>
              <th className="px-4 py-3">On quotes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.name}</p>
                  {item.description ? <p className="text-xs text-stone-500">{item.description}</p> : null}
                </td>
                <td className="px-4 py-3">{JOB_TYPE_LABEL[item.jobType] ?? item.jobType}</td>
                <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
                <td className="px-4 py-3">{item.taxable ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{item.active ? "Yes" : "Hidden"}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => startEdit(item)} className="text-sm font-semibold text-orange">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
