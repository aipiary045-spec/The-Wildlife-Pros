"use client";

import { addMinutes, format } from "date-fns";
import { useEffect, useState } from "react";
import { ReturnVisitFields, addReturnVisit } from "@/components/jobs/RecurringForm";
import { FREQUENCY_RETURN_DAYS } from "@/lib/schedule-needs";
import { AreaSuggestions } from "@/components/schedule/AreaSuggestions";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { dateKey, tripStartOnDay } from "@/lib/dates";
import { clientName } from "@/lib/utils";
import type { CopyRequest } from "./useScheduleBoard";
import type { ScheduleTech } from "./job-card";

export function NewTripDialog({
  request,
  technicians,
  onClose,
  onCreated,
}: {
  request: CopyRequest | null;
  technicians: ScheduleTech[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const job = request?.job;
  const defaultStart =
    job && request ? (request.startAt ?? tripStartOnDay(job.scheduledStart, request.day)) : new Date();
  const [date, setDate] = useState(dateKey(defaultStart));
  const [time, setTime] = useState(format(defaultStart, "HH:mm"));
  const [technicianId, setTechnicianId] = useState(request?.technicianId ?? "");
  const [durationMin, setDurationMin] = useState(job?.durationMin ?? 60);
  const [instructions, setInstructions] = useState("");
  const [frequency, setFrequency] = useState("");
  const [returnInDays, setReturnInDays] = useState(FREQUENCY_RETURN_DAYS.MONTHLY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;
    const start = request.startAt ?? tripStartOnDay(request.job.scheduledStart, request.day);
    setDate(dateKey(start));
    setTime(format(start, "HH:mm"));
    setTechnicianId(request.technicianId || request.job.technicianId || technicians[0]?.id || "");
    setDurationMin(request.job.durationMin);
    setInstructions("");
    setFrequency("");
    setReturnInDays(FREQUENCY_RETURN_DAYS.MONTHLY);
    setError("");
  }, [request, technicians]);

  if (!request) return null;
  const sourceJob = request.job;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const response = await fetch("/api/schedule", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: sourceJob.id,
        technicianId,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: addMinutes(scheduledStart, Number(durationMin) || 60).toISOString(),
        durationMin: Number(durationMin) || 60,
        instructions,
      }),
    });
    const data = (await response.json()) as { error?: string; job?: { id: string } };
    if (!response.ok || !data.job?.id) {
      setSaving(false);
      setError(data.error ?? "Could not create this trip");
      return;
    }
    if (frequency) {
      try {
        await addReturnVisit(data.job.id, frequency, returnInDays);
      } catch (caught) {
        window.alert(caught instanceof Error ? caught.message : "Trip was created, but the return visit was not.");
      }
    }
    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-orange">New trip</p>
        <h2 className="mt-1 font-display text-2xl">Same job, new visit</h2>
        <p className="mt-2 text-sm text-stone-600">
          Client and job details stay with the work. Fill in what is different about this trip.
        </p>

        <section className="mt-4 rounded-xl bg-background p-3 text-sm">
          <p className="text-xs uppercase tracking-wider text-stone-500">Client</p>
          <p className="font-semibold">{clientName(sourceJob.client)}</p>
          <p className="mt-2 text-xs uppercase tracking-wider text-stone-500">Job details</p>
          <p className="font-semibold">{sourceJob.title}</p>
          <p className="text-stone-600">
            {sourceJob.number}
            {sourceJob.type ? ` · ${JOB_TYPE_LABEL[sourceJob.type] ?? sourceJob.type}` : ""} · {sourceJob.property.address1}
          </p>
          {sourceJob.instructions ? (
            <p className="mt-2 text-xs text-stone-500">Earlier notes: {sourceJob.instructions}</p>
          ) : null}
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Date
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Time
            <input
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Technician
            <select
              required
              value={technicianId}
              onChange={(event) => setTechnicianId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
            >
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Minutes on site
            <input
              type="number"
              min={15}
              step={15}
              value={durationMin}
              onChange={(event) => setDurationMin(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <AreaSuggestions
              propertyId={sourceJob.propertyId}
              excludeJobId={sourceJob.id}
              onPick={(pick) => {
                setTechnicianId(pick.technicianId);
                setDate(pick.date);
                setTime(pick.time);
              }}
            />
          </div>
        </div>
        <div className="mt-3 space-y-2 rounded-xl border border-line bg-white/60 p-3">
          <p className="text-sm font-semibold">Return visits</p>
          <p className="text-sm text-stone-600">
            Optional. Puts this customer in needs-scheduled when the next trip is due.
          </p>
          <ReturnVisitFields
            frequency={frequency}
            returnInDays={returnInDays}
            onFrequency={setFrequency}
            onDays={setReturnInDays}
            allowNone
          />
        </div>
        <label className="mt-3 block text-sm">
          This visit
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={4}
            placeholder="What is this trip for? Check the cage, reset bait, pick up the trap, inspect the exclusion…"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          />
        </label>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
