"use client";

import { useState } from "react";
import { lineTotals } from "@/lib/money";
import { formatMoney } from "@/lib/utils";
import { PriceListPicker } from "@/components/billing/PriceListPicker";

export type ServiceOption = {
  id: string;
  name: string;
  unitPrice: number;
  taxable: boolean;
};

export type LineDraft = {
  name: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  serviceId?: string;
};

const inputClass = "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm";

export function serviceToLineDraft(service: ServiceOption): LineDraft {
  return {
    name: service.name,
    quantity: 1,
    unitPrice: Number(service.unitPrice),
    taxable: service.taxable,
    serviceId: service.id,
  };
}

export function LineItemsEditor({
  items,
  services,
  onChange,
}: {
  items: LineDraft[];
  services: ServiceOption[];
  onChange: (items: LineDraft[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const totals = lineTotals(items);

  function addServices(serviceIds: string[]) {
    const next = serviceIds
      .map((serviceId) => services.find((service) => service.id === serviceId))
      .filter((service): service is ServiceOption => Boolean(service))
      .map(serviceToLineDraft);
    if (next.length === 0) return;
    onChange([...items, ...next]);
  }

  function update(index: number, patch: Partial<LineDraft>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <div className="hidden gap-2 px-1 text-[11px] font-medium text-stone-500 sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_6rem_4.5rem]">
          <span>What you are charging for</span>
          <span>Qty</span>
          <span>Price each</span>
          <span className="sr-only">Remove</span>
        </div>
      ) : null}

      {items.map((item, index) => (
        <div
          key={`${item.serviceId ?? item.name}-${index}`}
          className="rounded-xl border border-line bg-white p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_6rem_4.5rem] sm:items-end sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
        >
          <label className="block text-[11px] font-medium text-stone-500 sm:min-w-0">
            <span className="sm:sr-only">What you are charging for</span>
            <input
              className={`mt-1 ${inputClass} sm:mt-0`}
              value={item.name}
              placeholder="Live trap check"
              onChange={(event) => update(index, { name: event.target.value })}
            />
          </label>

          <div className="mt-2 grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-end gap-2 sm:contents">
            <label className="text-[11px] font-medium text-stone-500">
              Qty
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className={`mt-1 ${inputClass}`}
                value={item.quantity}
                onChange={(event) => update(index, { quantity: Number(event.target.value) })}
              />
            </label>
            <label className="text-[11px] font-medium text-stone-500">
              Price each
              <input
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                className={`mt-1 ${inputClass}`}
                value={item.unitPrice}
                onChange={(event) => update(index, { unitPrice: Number(event.target.value) })}
              />
            </label>
            <button
              type="button"
              className="min-h-9 rounded-lg border border-line px-2 text-xs font-semibold sm:min-h-0 sm:py-1.5"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={`${inputClass} text-left font-semibold`}
        >
          Add from price list…
        </button>
        <button
          type="button"
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold"
          onClick={() => onChange([...items, { name: "", quantity: 1, unitPrice: 0, taxable: true }])}
        >
          Blank line
        </button>
        <a href="/quotes/pricing" className="self-center text-sm font-semibold text-orange">
          Edit price list
        </a>
      </div>

      <PriceListPicker
        open={pickerOpen}
        services={services}
        onClose={() => setPickerOpen(false)}
        onAdd={addServices}
      />

      <p className="text-xs text-stone-500">
        Blank line is a custom charge: name what you did, how many, and the price for one. Tax is added automatically.
      </p>
      <p className="text-sm text-stone-600">
        {formatMoney(totals.subtotal)} + tax {formatMoney(totals.taxAmount)} ={" "}
        <span className="font-semibold text-ink">{formatMoney(totals.total)}</span>
      </p>
    </div>
  );
}
