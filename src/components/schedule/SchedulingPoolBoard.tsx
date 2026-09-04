"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AreaSuggestions } from "@/components/schedule/AreaSuggestions";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import type { SchedulingPool } from "@/lib/scheduling-pool";
import type { ScheduleTech } from "@/components/schedule/job-card";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

export function SchedulingPoolBoard({
  pool,
  technicians,
}: {
  pool: SchedulingPool;
  technicians: ScheduleTech[];
}) {
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return pool;
    const match = (parts: Array<string | null | undefined>) =>
      parts.filter(Boolean).join(" ").toLowerCase().includes(needle);

    return {
      ...pool,
      late: pool.late.filter((item) => match([item.clientName, item.address, item.title, item.number])),
      unscheduled: pool.unscheduled.filter((item) =>
        match([item.clientName, item.address, item.title, item.number, item.visitLabel]),
      ),
      returns: pool.returns.filter((item) => match([item.clientName, item.address, item.title])),
      plans: pool.plans.filter((item) => match([item.clientName, item.address, item.title])),
    };
  }, [needle, pool]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-600">
            {pool.counts.total === 0
              ? "Nothing waiting for a day on the calendar."
              : `${pool.counts.total} stop${pool.counts.total === 1 ? "" : "s"} need scheduling attention`}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {pool.counts.late} late · {pool.counts.unscheduled} never scheduled · {pool.counts.returns} return
            {pool.counts.returns === 1 ? "" : "s"} due · {pool.counts.plans} active plan
            {pool.counts.plans === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/schedule" className="text-sm font-semibold text-orange hover:underline">
          Open calendar
        </Link>
      </div>

      <label className="block text-sm">
        <span className="sr-only">Search pool</span>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search client, street, job number, or plan"
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5"
        />
      </label>

      <PoolSection title="Late for check-in" count={filtered.late.length} accent="rose">
        {filtered.late.map((item) => (
          <JobPoolRow key={item.id} item={item} badge={`Late ${item.minutesLate}m`} />
        ))}
      </PoolSection>

      <PoolSection title="Never on the calendar" count={filtered.unscheduled.length} accent="orange">
        {filtered.unscheduled.map((item) => (
          <JobPoolRow key={item.id} item={item} />
        ))}
      </PoolSection>

      <PoolSection title="Return trips due" count={filtered.returns.length} accent="amber">
        {filtered.returns.map((item) => (
          <NeedPoolRow key={item.id} item={item} technicians={technicians} />
        ))}
      </PoolSection>

      <PoolSection title="Visit plans" count={filtered.plans.length} accent="stone">
        {filtered.plans.map((item) => (
          <PlanPoolRow key={item.id} item={item} />
        ))}
      </PoolSection>
    </div>
  );
}

function PoolSection({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: "rose" | "orange" | "amber" | "stone";
  children: React.ReactNode;
}) {
  const border =
    accent === "rose"
      ? "border-rose-200"
      : accent === "orange"
        ? "border-orange/30"
        : accent === "amber"
          ? "border-amber-200"
          : "border-line";

  return (
    <section className={`rounded-2xl border bg-panel ${border}`}>
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">
          {title}
          <span className="ml-2 text-sm font-normal text-stone-500">{count}</span>
        </h2>
      </div>
      {count === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500">Nothing here right now.</p>
      ) : (
        <div className="divide-y divide-line">{children}</div>
      )}
    </section>
  );
}

function JobPoolRow({ item, badge }: { item: SchedulingPool["unscheduled"][number]; badge?: string }) {
  return (
    <article className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-orange">{item.number}</p>
        <p className="font-semibold">{item.clientName}</p>
        <p className="text-sm text-stone-600">
          {item.address}, {item.city}
        </p>
        <p className="text-sm text-stone-700">{item.title}</p>
        <p className="mt-1 text-xs text-stone-500">
          {JOB_TYPE_LABEL[item.type] ?? item.type} · {item.durationMin} min
          {item.visitLabel ? ` · ${item.visitLabel}` : ""}
          {item.technicianName ? ` · ${item.technicianName}` : ""}
        </p>
        {item.instructions ? <p className="mt-1 line-clamp-2 text-sm text-stone-600">{item.instructions}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {badge ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">{badge}</span>
        ) : null}
        <Link href={`/jobs/${item.id}`} className="rounded-lg bg-orange px-3 py-2 text-sm font-semibold text-white">
          Open job
        </Link>
        <Link href="/schedule" className="text-xs font-semibold text-orange hover:underline">
          Put on calendar
        </Link>
      </div>
    </article>
  );
}

function NeedPoolRow({
  item,
  technicians,
}: {
  item: SchedulingPool["returns"][number];
  technicians: ScheduleTech[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(item.dueOn.slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [technicianId, setTechnicianId] = useState(item.preferredTechId ?? technicians[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function schedule(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const response = await fetch(`/api/schedule-needs/${item.id}`, {
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
    router.refresh();
  }

  const priorityLabel =
    item.priority === "overdue" ? "Overdue" : item.priority === "due" ? "Due today" : "Upcoming";

  return (
    <article className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.clientName}</p>
          <p className="text-sm text-stone-600">
            {item.address}, {item.city}
          </p>
          <p className="text-sm text-stone-700">{item.title}</p>
          <p className="mt-1 text-xs text-stone-500">
            Due {format(new Date(item.dueOn), "MMM d")} · ~{item.returnInDays} day return
            {item.preferredTechName ? ` · ${item.preferredTechName}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            item.priority === "overdue"
              ? "bg-rose-100 text-rose-800"
              : item.priority === "due"
                ? "bg-orange/15 text-orange"
                : "bg-stone-200 text-stone-700"
          }`}
        >
          {priorityLabel}
        </span>
      </div>
      {item.notes ? <p className="mt-2 text-sm text-stone-600">{item.notes}</p> : null}
      {open ? (
        <form onSubmit={schedule} className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="text-xs">
            Day
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </label>
          <label className="text-xs">
            Time
            <input type="time" required value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} />
          </label>
          <label className="text-xs">
            Tech
            <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className={inputClass}>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-3">
            <AreaSuggestions
              propertyId={item.propertyId}
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
        <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 w-full rounded-lg bg-orange px-3 text-sm font-semibold text-white sm:w-auto">
          Schedule this stop
        </button>
      )}
    </article>
  );
}

function PlanPoolRow({ item }: { item: SchedulingPool["plans"][number] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addTrip() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/visit-plans/${item.id}/trips`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not add the next trip.");
      return;
    }
    router.refresh();
  }

  return (
    <article className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div>
        <p className="font-semibold">{item.title}</p>
        <p className="text-sm text-stone-600">
          {item.clientName} · {item.address}, {item.city}
        </p>
        <p className="mt-1 text-sm text-stone-700">
          {item.completed} done · {item.scheduled} on calendar · {item.unscheduled} in pool · {item.remaining} left to
          create
        </p>
        <p className="text-xs text-stone-500">
          {item.totalVisits} visits included
          {item.preferredTechName ? ` · prefers ${item.preferredTechName}` : ""}
        </p>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </div>
      {item.canAddTrip ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void addTrip()}
          className="rounded-lg bg-orange px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Adding…" : `Add trip ${item.nextVisitNumber} to pool`}
        </button>
      ) : item.remaining === 0 ? (
        <span className="text-sm text-stone-500">All trips created</span>
      ) : (
        <span className="text-sm text-stone-500">Finish the open trip first</span>
      )}
    </article>
  );
}
