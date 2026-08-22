"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  EmergencyDispatchButton,
  type EmergencyPrefill,
} from "@/components/emergency/EmergencyDispatchButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { INTAKE_SOURCE_LABEL, REQUEST_STATUS_LABEL } from "@/lib/constants";
import {
  callLogDayHeading,
  canAutoFillClient,
  findMatchingClient,
  formatCallLoggedAt,
  groupCallsByDay,
  partitionCallLog,
  searchClients,
  type IntakeMatchClient,
  telHref,
} from "@/lib/intake";
import { dateKeyInZone } from "@/lib/timezone";
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
  property: { id: string; address1: string; city: string } | null;
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
  technicians = [],
  initialPhone = "",
}: {
  requests: IntakeRequest[];
  clients: IntakeMatchClient[];
  technicians?: Array<{ id: string; firstName: string; lastName: string }>;
  initialPhone?: string;
}) {
  const router = useRouter();
  const [composing, setComposing] = useState(Boolean(initialPhone));
  const [draft, setDraft] = useState({ ...empty, phone: initialPhone });
  const [clientId, setClientId] = useState<string | undefined>();
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emergencyPrefill, setEmergencyPrefill] = useState<EmergencyPrefill | null>(null);

  const hits = useMemo(
    () =>
      searchClients(
        clients,
        { phone: draft.phone, firstName: draft.firstName, lastName: draft.lastName, email: draft.email, clientId },
        { ignoreIds: ignoredIds },
      ),
    [clients, draft.phone, draft.firstName, draft.lastName, draft.email, clientId, ignoredIds],
  );
  const selected = clientId ? (findMatchingClient(clients, { clientId }) ?? hits[0]) : null;
  const { open, handled } = useMemo(() => partitionCallLog(requests), [requests]);
  const openByDay = useMemo(() => groupCallsByDay(open), [open]);
  const handledByDay = useMemo(() => groupCallsByDay(handled), [handled]);
  const todayKey = dateKeyInZone(new Date());

  function applyClient(client: IntakeMatchClient) {
    const property = client.properties[0];
    setClientId(client.id);
    setIgnoredIds([]);
    setDraft((current) => ({
      ...current,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email ?? current.email,
      phone: client.phone ?? current.phone,
      address1: property?.address1 ?? current.address1,
      city: property?.city ?? current.city,
      state: property?.state ?? current.state,
      postalCode: property?.postalCode ?? current.postalCode,
    }));
  }

  useEffect(() => {
    if (clientId) return;
    const suggestions = searchClients(
      clients,
      { phone: draft.phone, firstName: draft.firstName, lastName: draft.lastName, email: draft.email },
      { ignoreIds: ignoredIds },
    );
    if (canAutoFillClient(suggestions, draft)) applyClient(suggestions[0]);
  }, [clients, draft.phone, draft.firstName, draft.lastName, draft.email, clientId, ignoredIds]);

  function clearMatch() {
    if (clientId) setIgnoredIds((current) => [...current, clientId]);
    setClientId(undefined);
  }

  function resetComposer() {
    setDraft({ ...empty });
    setClientId(undefined);
    setIgnoredIds([]);
    setError("");
  }

  function startNewCall() {
    resetComposer();
    setComposing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finish(item: IntakeRequest) {
    const unknown = item.client.firstName === "Unknown";
    setClientId(item.client.id);
    setIgnoredIds([]);
    setDraft({
      ...empty,
      phone: item.client.phone ?? "",
      firstName: unknown ? "" : item.client.firstName,
      lastName: unknown ? "" : item.client.lastName,
      email: item.client.email ?? "",
      address1: item.property?.address1 ?? "",
      city: item.property?.city ?? "Charlotte",
      title: item.title,
      details: item.details ?? "",
      source: item.source,
    });
    setComposing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    resetComposer();
    setComposing(false);
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

  return (
    <div className="space-y-6">
      {technicians.length > 0 ? (
        <EmergencyDispatchButton
          technicians={technicians}
          clients={clients.map((client) => ({
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            companyName: client.companyName,
            properties: client.properties.map((property) => ({
              id: property.id,
              address1: property.address1,
              city: property.city,
            })),
          }))}
          prefill={emergencyPrefill}
        />
      ) : null}
      {composing ? (
        <form onSubmit={(event) => void save(event)} className="space-y-3 rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Log a call</h2>
              <p className="text-sm text-stone-600">
                Start typing a number or a name. If they are already in the book, pick the right person — even when two
                people share a name.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetComposer();
                setComposing(false);
              }}
              className="shrink-0 text-sm font-semibold text-stone-600"
            >
              Cancel
            </button>
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
          {!clientId && hits.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-orange/40 bg-orange/10 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-orange">
                {hits.length === 1 ? "Already in the book" : `${hits.length} people match`}
              </p>
              {hits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => applyClient(hit)}
                  className="block w-full rounded-lg bg-white px-3 py-2 text-left"
                >
                  <p className="font-semibold">{clientName(hit)}</p>
                  <p className="text-sm text-stone-600">
                    {formatPhone(hit.phone)}
                    {hit.properties[0] ? ` · ${hit.properties[0].address1}, ${hit.properties[0].city}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-orange">Use this client</p>
                </button>
              ))}
            </div>
          ) : null}
          {clientId && selected ? (
            <p className="rounded-xl bg-background px-3 py-2 text-sm">
              Using {clientName(selected)}
              {selected.properties[0] ? ` · ${selected.properties[0].address1}` : ""}.{" "}
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
                onChange={(event) => {
                  setClientId(undefined);
                  setDraft((current) => ({ ...current, firstName: event.target.value }));
                }}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              Last name
              <input
                required={!clientId}
                value={draft.lastName}
                onChange={(event) => {
                  setClientId(undefined);
                  setDraft((current) => ({ ...current, lastName: event.target.value }));
                }}
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
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 w-full rounded-lg bg-orange text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {saving ? "Saving…" : "Save call"}
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600">
            {open.length
              ? `${open.length === 1 ? "1 call still needs" : `${open.length} calls still need`} a quote or trip`
              : "Nothing waiting — handled calls stay in the log below"}
          </p>
          <button
            type="button"
            onClick={startNewCall}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange px-4 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Log a call
          </button>
        </div>
      )}

      {error && !composing ? <p className="text-sm text-rose-700">{error}</p> : null}

      {open.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-semibold">Needs a next step</h2>
          {openByDay.map((group) => (
            <div key={group.dateKey} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500">
                {callLogDayHeading(group.dateKey, todayKey)}
              </h3>
              {group.items.map((item) => (
                <RequestCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onFinish={() => finish(item)}
                  onQuote={() => void convert(item.id, "quote")}
                  onTrip={() => void convert(item.id, "job")}
                  onEmergency={() =>
                    setEmergencyPrefill({
                      clientId: item.client.id,
                      propertyId: item.property?.id,
                      serviceRequestId: item.id,
                      situation: item.title,
                      phone: item.client.phone ?? undefined,
                    })
                  }
                  showEmergency={technicians.length > 0}
                  onClose={() => void patch(item.id, "CLOSED")}
                />
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {handled.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Already handled</h2>
            <p className="text-sm text-stone-500">{handled.length}</p>
          </div>
          {handledByDay.map((group) => (
            <div key={group.dateKey} className="overflow-hidden rounded-2xl border border-line bg-panel">
              <div className="border-b border-line bg-background px-4 py-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  {callLogDayHeading(group.dateKey, todayKey)}
                </h3>
              </div>
              <ul>
                {group.items.map((item) => (
                  <HandledCallRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {requests.length === 0 && !composing ? (
        <p className="rounded-2xl border border-dashed border-line bg-panel p-5 text-sm text-stone-600">
          No calls logged yet. Tap Log a call when the phone rings.
        </p>
      ) : null}
    </div>
  );
}

function callMeta(item: IntakeRequest) {
  const bits = [
    item.client.phone ? formatPhone(item.client.phone) : null,
    item.property ? `${item.property.address1}, ${item.property.city}` : null,
    INTAKE_SOURCE_LABEL[item.source] ?? "Phone",
  ].filter(Boolean);
  return bits.join(" · ");
}

function RequestCard({
  item,
  busy,
  onFinish,
  onQuote,
  onTrip,
  onEmergency,
  showEmergency,
  onClose,
}: {
  item: IntakeRequest;
  busy: boolean;
  onFinish: () => void;
  onQuote: () => void;
  onTrip: () => void;
  onEmergency: () => void;
  showEmergency: boolean;
  onClose: () => void;
}) {
  const callHref = telHref(item.client.phone);
  const preferred = item.preferredAt
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
        new Date(item.preferredAt),
      )
    : null;
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {formatCallLoggedAt(item.createdAt)}
          </p>
          <p className="font-semibold">{item.title}</p>
          <p className="text-sm text-stone-600">{clientName(item.client)}</p>
          <p className="text-sm text-stone-500">{callMeta(item)}</p>
          {item.details ? <p className="mt-2 text-sm text-stone-600">{item.details}</p> : null}
          {preferred ? <p className="mt-1 text-xs text-stone-500">Wants {preferred}</p> : null}
        </div>
        <StatusBadge status={item.status} label={REQUEST_STATUS_LABEL[item.status]} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onFinish} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold">
          Finish details
        </button>
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
        {showEmergency ? (
          <button
            type="button"
            disabled={busy}
            onClick={onEmergency}
            className="min-h-11 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 disabled:opacity-60"
          >
            Emergency dispatch
          </button>
        ) : null}
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

function HandledCallRow({ item }: { item: IntakeRequest }) {
  const callHref = telHref(item.client.phone);
  return (
    <li className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <p className="w-[4.75rem] shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-stone-500">
        {formatCallLoggedAt(item.createdAt)}
      </p>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-stone-600">{clientName(item.client)}</p>
            <p className="text-sm text-stone-500">{callMeta(item)}</p>
          </div>
          <StatusBadge status={item.status} label={REQUEST_STATUS_LABEL[item.status]} />
        </div>
        {callHref ? (
          <a href={callHref} className="mt-1 inline-block text-sm font-semibold text-orange">
            Call back
          </a>
        ) : null}
      </div>
    </li>
  );
}
