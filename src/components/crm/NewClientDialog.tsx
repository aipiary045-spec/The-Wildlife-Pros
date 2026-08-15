"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function NewClientDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("Charlotte");
  const [state, setState] = useState("NC");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/clients", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        property: address1.trim()
          ? {
              address1: address1.trim(),
              city: city.trim() || "Charlotte",
              state: state.trim() || "NC",
              postalCode: postalCode.trim() || "28200",
            }
          : undefined,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save this client.");
      return;
    }
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setAddress1("");
    setPostalCode("");
    onCreated?.();
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-orange">New client</p>
        <h2 className="mt-1 font-display text-2xl">Add to the book</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            First name
            <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Last name
            <input required value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm sm:col-span-2">
            Service address
            <input
              value={address1}
              onChange={(event) => setAddress1(event.target.value)}
              className={inputClass}
              placeholder="812 Willow Crest Ln"
            />
          </label>
          <label className="block text-sm">
            City
            <input value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              State
              <input value={state} onChange={(event) => setState(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              ZIP
              <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={inputClass} />
            </label>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save client"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function NewClientButton({ label = "New client" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white"
      >
        {label}
      </button>
      <NewClientDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
