"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AreaSuggestions } from "@/components/schedule/AreaSuggestions";
import { dateKey } from "@/lib/dates";
import { JOB_STATUS_LABEL, JOB_TYPE_LABEL } from "@/lib/constants";
import type { ScheduleTech } from "@/components/schedule/job-card";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function JobEditor({
  job,
  technicians,
}: {
  job: {
    id: string;
    title: string;
    type: string;
    status: string;
    instructions: string | null;
    technicianId: string | null;
    scheduledStart: Date | string | null;
    durationMin: number;
    propertyId: string;
  };
  technicians: ScheduleTech[];
}) {
  const router = useRouter();
  const start = job.scheduledStart ? new Date(job.scheduledStart) : null;
  const [title, setTitle] = useState(job.title);
  const [type, setType] = useState(job.type);
  const [status, setStatus] = useState(job.status);
  const [instructions, setInstructions] = useState(job.instructions ?? "");
  const [technicianId, setTechnicianId] = useState(job.technicianId ?? "");
  const [date, setDate] = useState(start ? dateKey(start) : "");
  const [time, setTime] = useState(start ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}` : "09:00");
  const [durationMin, setDurationMin] = useState(job.durationMin);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    let scheduledStart: string | null = null;
    if (date) {
      const [year, month, day] = date.split("-").map(Number);
      const [hours, minutes] = time.split(":").map(Number);
      scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
    }
    const response = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        status,
        instructions,
        technicianId: technicianId || null,
        scheduledStart,
        durationMin,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save this job.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove this job from the book?")) return;
    setSaving(true);
    const response = await fetch(`/api/jobs/${job.id}`, { method: "DELETE", credentials: "include" });
    const data = (await response.json()) as { error?: string; cancelled?: boolean };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not remove this job.");
      return;
    }
    router.push(data.cancelled ? `/jobs/${job.id}` : "/jobs");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
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
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            {Object.entries(JOB_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Technician
          <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.firstName} {tech.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Minutes on site
          <input type="number" min={15} step={15} value={durationMin} onChange={(event) => setDurationMin(Number(event.target.value))} className={inputClass} />
        </label>
        <div className="sm:col-span-2">
          <AreaSuggestions
            propertyId={job.propertyId}
            excludeJobId={job.id}
            onPick={(pick) => {
              setTechnicianId(pick.technicianId);
              setDate(pick.date);
              setTime(pick.time);
            }}
          />
        </div>
        <label className="block text-sm">
          Date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Time
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm sm:col-span-2">
          Instructions
          <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={3} className={inputClass} />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save job"}
        </button>
        <button type="button" disabled={saving} onClick={() => void remove()} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-rose-700">
          Remove job
        </button>
      </div>
    </form>
  );
}
