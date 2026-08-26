"use client";

import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AreaSuggestions } from "@/components/schedule/AreaSuggestions";
import { dateKey } from "@/lib/dates";
import { groupNeedsByPriority, needPriority } from "@/lib/schedule-needs";
import { clientName } from "@/lib/utils";
import type { ScheduleTech } from "@/components/schedule/job-card";

export type PoolNeed = {
  id: string;
  title: string;
  notes: string | null;
  returnInDays: number;
  dueOn: string;
  preferredTechId: string | null;
  client: { firstName: string; lastName: string; companyName?: string | null };
  property: { id: string; address1: string; city: string };
  preferredTech?: { firstName: string; lastName: string } | null;
};

export function NeedsPool({
  needs,
  technicians,
}: {
  needs: PoolNeed[];
  technicians: ScheduleTech[];
}) {
  const router = useRouter();
  const grouped = useMemo(() => groupNeedsByPriority(needs.map((need) => ({ ...need, dueOn: new Date(need.dueOn) }))), [needs]);
  const waiting = grouped.overdue.length + grouped.due.length;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "overdue" | "due">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDate, setBulkDate] = useState(dateKey(new Date()));
  const [bulkTime, setBulkTime] = useState("09:00");
  const [bulkTechnicianId, setBulkTechnicianId] = useState(technicians[0]?.id ?? "");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const sections = [
    { key: "overdue" as const, title: "Overdue for a trip", items: grouped.overdue },
    { key: "due" as const, title: "Due for a trip", items: grouped.due },
    { key: "upcoming" as const, title: "Coming up", items: grouped.upcoming },
  ].filter((section) => filter === "all" || section.key === filter);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function scheduleSelected() {
    if (selectedIds.length < 2) return;
    setBulkSaving(true);
    setBulkError("");
    const [year, month, day] = bulkDate.split("-").map(Number);
    const [hours, minutes] = bulkTime.split(":").map(Number);
    const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const response = await fetch("/api/schedule-needs/bulk", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        needIds: selectedIds,
        technicianId: bulkTechnicianId || undefined,
        scheduledStart: scheduledStart.toISOString(),
        staggerMin: 60,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBulkSaving(false);
    if (!response.ok) {
      setBulkError(data.error ?? "Could not schedule the selected stops.");
      return;
    }
    setSelectedIds([]);
    setBulkError("");
    router.refresh();
  }

  if (needs.length === 0) return null;

  const summary =
    waiting > 0
      ? `${waiting === 1 ? "1 stop needs a day" : `${waiting} stops need a day`}`
      : `${needs.length === 1 ? "1 upcoming return" : `${needs.length} upcoming returns`}`;

  return (
    <section className="rounded-2xl border border-line bg-panel">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-semibold">Needs scheduled</h2>
          <p className={`text-sm ${waiting > 0 ? "font-medium text-orange" : "text-stone-500"}`}>{summary}</p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="relative space-y-3 border-t border-line px-4 pb-4 pt-3">
          <p className="text-sm text-stone-500">Pick a customer, put them on a tech and a time. Nothing is pre-loaded on the calendar.</p>
          <div className="flex w-full rounded-full border border-line p-1 text-xs font-semibold sm:w-auto">
            {(
              [
                ["all", "All"],
                ["overdue", "Overdue"],
                ["due", "Due today"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`flex-1 rounded-full px-3 py-1.5 sm:flex-none ${filter === value ? "bg-orange text-white" : "text-stone-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.key}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">{section.title}</p>
                <div className="space-y-2">
                  {section.items.map((need) => (
                    <NeedRow
                      key={need.id}
                      need={need}
                      technicians={technicians}
                      selected={selectedSet.has(need.id)}
                      onToggleSelected={() => toggleSelected(need.id)}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
          {selectedIds.length >= 2 ? (
            <div className="sticky bottom-3 z-10 rounded-xl border border-line bg-panel/95 p-3 shadow-lg backdrop-blur">
              <p className="mb-2 text-sm font-semibold">{selectedIds.length} selected</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs">
                  Day
                  <input
                    type="date"
                    required
                    value={bulkDate}
                    onChange={(event) => setBulkDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  Time
                  <input
                    type="time"
                    required
                    value={bulkTime}
                    onChange={(event) => setBulkTime(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  Tech
                  <select
                    value={bulkTechnicianId}
                    onChange={(event) => setBulkTechnicianId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  >
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {bulkError ? <p className="mt-2 text-sm text-rose-700">{bulkError}</p> : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds([]);
                    setBulkError("");
                  }}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={bulkSaving || !bulkTechnicianId}
                  onClick={() => void scheduleSelected()}
                  className="flex-1 rounded-lg bg-orange py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {bulkSaving ? "Scheduling…" : "Schedule selected (stagger 1h)"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function NeedRow({
  need,
  technicians,
  selected,
  onToggleSelected,
}: {
  need: Omit<PoolNeed, "dueOn"> & { dueOn: Date };
  technicians: ScheduleTech[];
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dateKey(new Date(need.dueOn)));
  const [time, setTime] = useState("09:00");
  const [technicianId, setTechnicianId] = useState(need.preferredTechId ?? technicians[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const priority = needPriority(need.dueOn);

  async function schedule(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const response = await fetch(`/api/schedule-needs/${need.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianId, scheduledStart: scheduledStart.toISOString() }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not put this on the calendar.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <article className="rounded-xl border border-line bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            aria-label={`Select ${clientName(need.client)}`}
            className="mt-1 size-4 shrink-0 accent-orange"
          />
          <div className="min-w-0">
            <p className="font-semibold">{clientName(need.client)}</p>
            <p className="text-sm text-stone-600">
              {need.property.address1}, {need.property.city}
            </p>
            <p className="text-xs text-stone-500">
              {need.title} · due {format(need.dueOn, "MMM d")} · asked for ~{need.returnInDays} days
              {need.preferredTech ? ` · ${need.preferredTech.firstName}` : ""}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priority === "overdue" ? "bg-rose-100 text-rose-800" : priority === "due" ? "bg-orange/15 text-orange" : "bg-stone-200 text-stone-700"}`}>
          {priority === "overdue" ? "Overdue" : priority === "due" ? "Due today" : "Upcoming"}
        </span>
      </div>
      {need.notes ? <p className="mt-2 text-sm text-stone-600">{need.notes}</p> : null}
      {open ? (
        <form onSubmit={schedule} className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="text-xs">
            Day
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm" />
          </label>
          <label className="text-xs">
            Time
            <input type="time" required value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm" />
          </label>
          <label className="text-xs">
            Tech
            <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm">
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-3">
            <AreaSuggestions
              propertyId={need.property.id}
              onPick={(pick) => {
                setTechnicianId(pick.technicianId);
                setDate(pick.date);
                setTime(pick.time);
              }}
            />
          </div>
          {error ? <p className="text-sm text-rose-700 sm:col-span-3">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-3">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-line py-2 text-sm font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-orange py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saving…" : "Put on calendar"}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 w-full rounded-lg bg-orange px-3 text-sm font-semibold text-white">
          Schedule this stop
        </button>
      )}
    </article>
  );
}
