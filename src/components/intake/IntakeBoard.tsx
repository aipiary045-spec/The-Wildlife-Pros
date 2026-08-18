"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { INTAKE_SOURCE_LABEL, REQUEST_STATUS_LABEL } from "@/lib/constants";
import { findMatchingClient, type IntakeMatchClient, telHref } from "@/lib/intake";
import { clientName, formatPhone } from "@/lib/utils";

export type IntakeRequest = {
  id: string;
  title: string;
  details: string | null;
  status: string;
  source: string;
  preferredAt: string | Date | null;
  createdAt: string | Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
  };
  property: { address1: string; city: string } | null;
};

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-3 text-base";

const empty = {
  phone: "",
  firstName: "",
  lastName: "",
  email: "",
  address1: "",
  city: "Charlotte",
  state: "NC",
  postalCode: "",
  title: "",
  details: "",
  preferredOn: "",
  source: "phone",
};

export function IntakeBoard({
  requests,
  clients,
  initialPhone = "",
}: {
  requests: IntakeRequest[];
  clients: IntakeMatchClient[];
  initialPhone?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState({ ...empty, phone: initialPhone });
  const [clientId, setClientId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const match = useMemo(
    () => findMatchingClient(clients, { phone: draft.phone, email: draft.email, clientId }),
    [clients, draft.phone, draft.email, clientId],
  );

  function useMatch() {
    if (!match) return;
    setClientId(match.id);
    setDraft((current) => ({
      ...current,
      firstName: match.firstName,
      lastName: match.lastName,
      email: match.email ?? current.email,
      phone: match.phone ?? current.phone,
      address1: match.properties[0]?.address1 ?? current.address1,
      city: match.properties[0]?.city ?? current.city,
    }));
  }

  function clearMatch() {
    setClientId(undefined);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        ...draft,
        postalCode: draft.postalCode || undefined,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save that call.");
      return;
    }
    setDraft({ ...empty });
    setClientId(undefined);
    router.refresh();
  }

  async function convert(id: string, to: "quote" | "job") {
    setBusyId(id);
    const response = await fetch(`/api/requests/${id}/convert`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const data = (await response.json()) as { error?: string; href?: string };
    setBusyId(null);
    if (!response.ok) {
      setError(data.error ?? "Could not convert that call.");
      return;
    }
    if (data.href) router.push(data.href);
    else router.refresh();
  }

  async function patch(id: string, status: "CLOSED" | "ASSESSED") {
    setBusyId(id);
    const response = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not update that call.");
      return;
    }
    router.refresh();
  }

  const open = requests.filter((item) => item.status === "NEW" || item.status === "ASSESSED");
  const done = requests.filter((item) => item.status !== "NEW" && item.status !== "ASSESSED");

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void save(event)} className="space-y-3 rounded-2xl border border-line bg-panel p-5">
        <div>
          <h2 className="font-semibold">Log a call</h2>
          <p className="text-sm text-stone-600">
            Answer in your VoIP app, then paste the caller ID here. If they are already a client, we fill the rest.
          </p>
        </div>
        <label className="block text-sm font-medium">
          Number on the line
          <input
            inputMode="tel"
            autoComplete="tel"
            value={draft.phone}
            onChange={(event) => {
              setClientId(undefined);
              setDraft((current) => ({ ...current, phone: event.target.value }));
            }}
            className={inputClass}
            placeholder="Paste or type the caller ID"
          />
        </label>
        {match && !clientId ? (
          <button
            type="button"
            onClick={useMatch}
            className="block w-full rounded-xl border border-orange/40 bg-orange/10 p-3 text-left"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-orange">Already in the book</p>
            <p className="font-semibold">{clientName(match)}</p>
            <p className="text-sm text-stone-600">
              {formatPhone(match.phone)}
              {match.properties[0] ? ` · ${match.properties[0].address1}` : ""}
            </p>
            <p className="mt-1 text-sm font-semibold text-orange">Use this client</p>
          </button>
        ) : null}
        {clientId && match ? (
          <p className="rounded-xl bg-background px-3 py-2 text-sm">
            Using {clientName(match)}.{" "}
            <button type="button" onClick={clearMatch} className="font-semibold text-orange">
              Not them
            </button>
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            First name
            <input
              required={!clientId}
              value={draft.firstName}
              onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            Last name
            <input
              required={!clientId}
              value={draft.lastName}
              onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Email (optional)
            <input
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Street
            <input
              required={!clientId}
              value={draft.address1}
              onChange={(event) => setDraft((current) => ({ ...current, address1: event.target.value }))}
              className={inputClass}
              placeholder="812 Willow Crest Ln"
            />
          </label>
          <label className="text-sm">
            City
            <input
              value={draft.city}
              onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              State
              <input
                value={draft.state}
                onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              ZIP
              <input
                value={draft.postalCode}
                onChange={(event) => setDraft((current) => ({ ...current, postalCode: event.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <label className="text-sm sm:col-span-2">
            What did they call about
            <input
              required
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className={inputClass}
              placeholder="Raccoon in the attic"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Notes from the call
            <textarea
              value={draft.details}
              onChange={(event) => setDraft((current) => ({ ...current, details: event.target.value }))}
              rows={3}
              className={inputClass}
              placeholder="Heard them last night. Can we come Thursday."
            />
          </label>
          <label className="text-sm">
            They want a day (optional)
            <input
              type="date"
              value={draft.preferredOn}
              onChange={(event) => setDraft((current) => ({ ...current, preferredOn: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            How they reached you
            <select
              value={draft.source}
              onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
              className={inputClass}
            >
              {Object.entries(INTAKE_SOURCE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button type="submit" disabled={saving} className="min-h-12 w-full rounded-lg bg-orange text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:px-6">
          {saving ? "Saving…" : "Save call"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold">Open calls</h2>
        {open.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-panel p-5 text-sm text-stone-600">
            No open calls. Paste the next caller ID when the phone rings.
          </p>
        ) : null}
        {open.map((item) => (
          <RequestCard
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onQuote={() => void convert(item.id, "quote")}
            onTrip={() => void convert(item.id, "job")}
            onClose={() => void patch(item.id, "CLOSED")}
          />
        ))}
      </section>

      {done.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Already handled</h2>
          {done.map((item) => (
            <div key={item.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-stone-600">{clientName(item.client)}</p>
                </div>
                <StatusBadge status={item.status} label={REQUEST_STATUS_LABEL[item.status]} />
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function RequestCard({
  item,
  busy,
  onQuote,
  onTrip,
  onClose,
}: {
  item: IntakeRequest;
  busy: boolean;
  onQuote: () => void;
  onTrip: () => void;
  onClose: () => void;
}) {
  const callHref = telHref(item.client.phone);
  const preferred = item.preferredAt ? format(new Date(item.preferredAt), "EEE, MMM d") : null;
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.title}</p>
          <p className="text-sm text-stone-600">{clientName(item.client)}</p>
          <p className="text-sm text-stone-500">
            {formatPhone(item.client.phone)}
            {item.property ? ` · ${item.property.address1}` : ""}
          </p>
          {item.details ? <p className="mt-2 text-sm text-stone-600">{item.details}</p> : null}
          <p className="mt-1 text-xs text-stone-500">
            {INTAKE_SOURCE_LABEL[item.source] ?? item.source}
            {preferred ? ` · wants ${preferred}` : ""}
          </p>
        </div>
        <StatusBadge status={item.status} label={REQUEST_STATUS_LABEL[item.status]} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onQuote}
          className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Start quote
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onTrip}
          className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60"
        >
          First trip
        </button>
        {callHref ? (
          <a href={callHref} className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold">
            Call back
          </a>
        ) : null}
        <button type="button" disabled={busy} onClick={onClose} className="min-h-11 px-3 text-sm font-semibold text-stone-600">
          Close
        </button>
      </div>
    </article>
  );
}
