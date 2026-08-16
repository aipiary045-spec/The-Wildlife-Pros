"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function ClientEditor({
  client,
}: {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [companyName, setCompanyName] = useState(client.companyName ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [status, setStatus] = useState(client.status);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, companyName, email, phone, status, notes }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save this client.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove this client? If they have jobs we will mark them inactive instead.")) return;
    setSaving(true);
    const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE", credentials: "include" });
    const data = (await response.json()) as { error?: string; deactivated?: boolean };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not remove this client.");
      return;
    }
    router.push(data.deactivated ? `/clients/${client.id}` : "/clients");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          First name
          <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Last name
          <input required value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm sm:col-span-2">
          Company
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Phone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option value="ACTIVE">Active</option>
            <option value="LEAD">Lead</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DO_NOT_SERVICE">Do not service</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={inputClass} />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save client"}
        </button>
        <button type="button" disabled={saving} onClick={() => void remove()} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-rose-700">
          Remove client
        </button>
      </div>
    </form>
  );
}
