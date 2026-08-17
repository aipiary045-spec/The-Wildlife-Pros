"use client";

import { lineTotals } from "@/lib/money";
import { formatMoney } from "@/lib/utils";

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

export function LineItemsEditor({
  items,
  services,
  onChange,
}: {
  items: LineDraft[];
  services: ServiceOption[];
  onChange: (items: LineDraft[]) => void;
}) {
  const totals = lineTotals(items);

  function addService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    if (!service) return;
    onChange([
      ...items,
      {
        name: service.name,
        quantity: 1,
        unitPrice: Number(service.unitPrice),
        taxable: service.taxable,
        serviceId: service.id,
      },
    ]);
  }

  function update(index: number, patch: Partial<LineDraft>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.serviceId ?? item.name}-${index}`} className="grid grid-cols-12 gap-2">
          <label className="col-span-5 text-[11px] font-medium text-stone-500">
            What you are charging for
            <input
              className={`mt-1 ${inputClass}`}
              value={item.name}
              placeholder="Live trap check"
              onChange={(event) => update(index, { name: event.target.value })}
            />
          </label>
          <label className="col-span-2 text-[11px] font-medium text-stone-500">
            Qty
            <input
              type="number"
              min={0}
              step={1}
              className={`mt-1 ${inputClass}`}
              value={item.quantity}
              onChange={(event) => update(index, { quantity: Number(event.target.value) })}
            />
          </label>
          <label className="col-span-3 text-[11px] font-medium text-stone-500">
            Price each
            <input
              type="number"
              min={0}
              step={0.01}
              className={`mt-1 ${inputClass}`}
              value={item.unitPrice}
              onChange={(event) => update(index, { unitPrice: Number(event.target.value) })}
            />
          </label>
          <button
            type="button"
            className="col-span-2 self-end rounded-lg border border-line py-1.5 text-xs font-semibold"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <select
          className={inputClass}
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) addService(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Add from price list…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} · {formatMoney(service.unitPrice)}
            </option>
          ))}
        </select>
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
