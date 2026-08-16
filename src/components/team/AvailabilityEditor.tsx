"use client";

import { addDays, format, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { dateKey } from "@/lib/dates";

export type DayOff = { id: string; date: string; reason: string | null };

export function AvailabilityEditor({
  userId,
  blocks,
  canEdit = true,
}: {
  userId: string;
  blocks: DayOff[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(dateKey(addDays(new Date(), 1)));
  const [reason, setReason] = useState("Off");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const upcoming = useMemo(
    () =>
      [...blocks]
        .filter((block) => startOfDay(new Date(block.date)).getTime() >= startOfDay(new Date()).getTime())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [blocks],
  );

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/availability", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date, reason }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save that day off.");
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    setSaving(true);
    await fetch(`/api/availability?id=${id}`, { method: "DELETE", credentials: "include" });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {upcoming.length === 0 ? <p className="text-sm text-stone-500">No days off on the calendar.</p> : null}
      <ul className="space-y-1 text-sm">
        {upcoming.map((block) => (
          <li key={block.id} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2">
            <span>
              {format(new Date(block.date), "EEE MMM d")}
              {block.reason ? ` · ${block.reason}` : ""}
            </span>
            {canEdit ? (
              <button type="button" disabled={saving} onClick={() => void remove(block.id)} className="text-xs font-semibold text-rose-700">
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm" />
          <input value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm" placeholder="PTO, doctor, truck down…" />
          <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-orange px-3 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Block day"}
          </button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
