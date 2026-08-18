"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";

export type PriceListService = {
  id: string;
  name: string;
  unitPrice: number;
  taxable: boolean;
};

export function PriceListPicker({
  open,
  services,
  onClose,
  onAdd,
}: {
  open: boolean;
  services: PriceListService[];
  onClose: () => void;
  onAdd: (serviceIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return services;
    return services.filter((service) => service.name.toLowerCase().includes(needle));
  }, [query, services]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((service) => service.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function confirm() {
    onAdd([...selected]);
    onClose();
  }

  const inputClass = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-list-picker-title"
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl border border-line bg-panel shadow-xl"
      >
        <div className="border-b border-line px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-orange">Price list</p>
          <h2 id="price-list-picker-title" className="mt-1 font-display text-xl">
            Add line items
          </h2>
          <p className="mt-1 text-sm text-stone-600">Pick everything you need, then add them all at once.</p>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the price list"
            className={`${inputClass} mt-3`}
            autoFocus
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {services.length === 0 ? (
            <p className="text-sm text-stone-500">
              No catalog lines yet.{" "}
              <a href="/quotes/pricing" className="font-semibold text-orange">
                Add some on the price list
              </a>
              .
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing matches that search.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((service) => {
                const checked = selected.has(service.id);
                return (
                  <li key={service.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                        checked ? "border-orange bg-orange/5" : "border-line bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(service.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{service.name}</span>
                        <span className="mt-0.5 block text-sm text-stone-600">
                          {formatMoney(service.unitPrice)}
                          {service.taxable ? " · taxable" : " · no tax"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-line px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={filtered.length === 0}
              className="rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selected.size === 0}
              className="rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={selected.size === 0}
              className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Add {selected.size === 1 ? "1 item" : `${selected.size} items`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
