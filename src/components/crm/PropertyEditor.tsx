"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { propertyAddress } from "@/lib/utils";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

export function PropertyEditor({
  property,
}: {
  property: {
    id: string;
    label: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    postalCode: string;
    accessNotes: string | null;
    gateCode: string | null;
    petsOnSite: boolean;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(property.label);
  const [address1, setAddress1] = useState(property.address1);
  const [address2, setAddress2] = useState(property.address2 ?? "");
  const [city, setCity] = useState(property.city);
  const [state, setState] = useState(property.state);
  const [postalCode, setPostalCode] = useState(property.postalCode);
  const [accessNotes, setAccessNotes] = useState(property.accessNotes ?? "");
  const [gateCode, setGateCode] = useState(property.gateCode ?? "");
  const [petsOnSite, setPetsOnSite] = useState(property.petsOnSite);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/properties/${property.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim() || "Primary",
        address1: address1.trim(),
        address2: address2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        accessNotes: accessNotes.trim() || undefined,
        gateCode: gateCode.trim() || undefined,
        petsOnSite,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save this address.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{property.label}</h2>
          <p className="text-sm text-stone-600">{propertyAddress(property)}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 text-sm font-semibold text-orange"
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {property.accessNotes ?? "No access notes"} · {property.petsOnSite ? "Pets on site" : "No pets noted"}
        {property.gateCode ? ` · Gate ${property.gateCode}` : ""}
      </p>
      {open ? (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="block text-sm">
            Label
            <input value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Street
            <input required value={address1} onChange={(event) => setAddress1(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Unit / suite
            <input value={address2} onChange={(event) => setAddress2(event.target.value)} className={inputClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm sm:col-span-2">
              City
              <input required value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              State
              <input required value={state} onChange={(event) => setState(event.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block text-sm">
            ZIP
            <input required value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Access notes
            <textarea
              value={accessNotes}
              onChange={(event) => setAccessNotes(event.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Gate code in lockbox, dog in backyard…"
            />
          </label>
          <label className="block text-sm">
            Gate code
            <input value={gateCode} onChange={(event) => setGateCode(event.target.value)} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={petsOnSite} onChange={(event) => setPetsOnSite(event.target.checked)} />
            Pets on site
          </label>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save address"}
          </button>
        </form>
      ) : null}
    </article>
  );
}
