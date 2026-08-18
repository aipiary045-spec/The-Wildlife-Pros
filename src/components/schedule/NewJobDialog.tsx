"use client";

import { addMinutes } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { dateKey } from "@/lib/dates";
import { clientName } from "@/lib/utils";
import { ReturnVisitFields, addReturnVisit } from "@/components/jobs/RecurringForm";
import { FREQUENCY_RETURN_DAYS } from "@/lib/schedule-needs";
import { AreaSuggestions } from "./AreaSuggestions";
import type { ScheduleTech } from "./job-card";

export type ScheduleClient = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  properties: Array<{ id: string; address1: string; city: string }>;
};

export type NewJobRequest = {
  technicianId?: string;
  day: Date;
  time?: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function NewJobDialog({
  request,
  technicians,
  clients,
  onClose,
  onCreated,
}: {
  request: NewJobRequest | null;
  technicians: ScheduleTech[];
  clients: ScheduleClient[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const defaultStart = request?.day ?? new Date();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const selected = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId]);
  const [propertyId, setPropertyId] = useState(selected?.properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("INSPECTION");
  const [date, setDate] = useState(dateKey(defaultStart));
  const [time, setTime] = useState("09:00");
  const [technicianId, setTechnicianId] = useState(request?.technicianId ?? technicians[0]?.id ?? "");
  const [durationMin, setDurationMin] = useState(60);
  const [frequency, setFrequency] = useState("");
  const [returnInDays, setReturnInDays] = useState(FREQUENCY_RETURN_DAYS.MONTHLY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;
    setDate(dateKey(request.day));
    setTime(request.time ?? "09:00");
    setTechnicianId(request.technicianId || technicians[0]?.id || "");
    setTitle("");
    setFrequency("");
    setReturnInDays(FREQUENCY_RETURN_DAYS.MONTHLY);
    setError("");
  }, [request, technicians]);

  useEffect(() => {
    if (!selected) return;
    if (!selected.properties.some((property) => property.id === propertyId)) {
      setPropertyId(selected.properties[0]?.id ?? "");
    }
  }, [selected, propertyId]);

  if (!request) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || !propertyId) {
      setError("Pick a client with a service address.");
      return;
    }
    setSaving(true);
    setError("");
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const response = await fetch("/api/jobs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        propertyId,
        title: title.trim() || JOB_TYPE_LABEL[type] || "Service visit",
        type,
        technicianId: technicianId || undefined,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: addMinutes(scheduledStart, Number(durationMin) || 60).toISOString(),
        durationMin: Number(durationMin) || 60,
      }),
    });
    const data = (await response.json()) as { error?: string; job?: { id: string } };
    if (!response.ok || !data.job?.id) {
      setSaving(false);
      setError(data.error ?? "Could not create this job");
      return;
    }
    if (frequency) {
      try {
        await addReturnVisit(data.job.id, frequency, returnInDays);
      } catch (caught) {
        window.alert(caught instanceof Error ? caught.message : "Job was added, but the return visit was not.");
      }
    }
    setSaving(false);
    setTitle("");
    setFrequency("");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-orange">New job</p>
        <h2 className="mt-1 font-display text-2xl">Put it on the calendar</h2>
        <p className="mt-2 text-sm text-stone-600">Pick the client, drop it on a tech and a time. Drag it later if the day changes.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Client
            <select required value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}>
              {clients.length === 0 ? <option value="">Add a client first</option> : null}
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {clientName(client)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Property
            <select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={inputClass}>
              {(selected?.properties ?? []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.address1}, {property.city}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            What are we doing
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="Raccoon trap check — attic"
            />
          </label>
          <label className="block text-sm">
            Type
            <select value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>
              {Object.entries(JOB_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Technician
            <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className={inputClass}>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Date
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Time
            <input type="time" required value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} />
          </label>
          <div className="sm:col-span-2">
            <AreaSuggestions
              propertyId={propertyId || undefined}
              onPick={(pick) => {
                setTechnicianId(pick.technicianId);
                setDate(pick.date);
                setTime(pick.time);
              }}
            />
          </div>
          <label className="block text-sm">
            Minutes on site
            <input
              type="number"
              min={15}
              step={15}
              value={durationMin}
              onChange={(event) => setDurationMin(Number(event.target.value))}
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-2 space-y-2 rounded-xl border border-line bg-white/60 p-3">
            <p className="text-sm font-semibold">Return visits</p>
            <p className="text-sm text-stone-600">
              Optional. Does not fill the calendar — it puts this customer in the needs-scheduled pool when the next trip is due.
            </p>
            <ReturnVisitFields
              frequency={frequency}
              returnInDays={returnInDays}
              onFrequency={setFrequency}
              onDays={setReturnInDays}
              allowNone
            />
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || clients.length === 0}
            className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add to calendar"}
          </button>
        </div>
      </form>
    </div>
  );
}
