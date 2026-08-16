"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dateKey } from "@/lib/dates";
import { DAY_OFF_LABEL } from "@/lib/day-off";

export type DayOffRow = {
  id: string;
  userId: string;
  date: string;
  reason: string | null;
  status: "REQUESTED" | "APPROVED" | "DENIED";
  userName: string;
};

export function DayOffPanel({
  userId,
  canReview,
  requests,
}: {
  userId: string;
  canReview: boolean;
  requests: DayOffRow[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(dateKey(new Date()));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pending = useMemo(() => requests.filter((item) => item.status === "REQUESTED"), [requests]);
  const approved = useMemo(() => requests.filter((item) => item.status === "APPROVED"), [requests]);
  const mine = useMemo(() => requests.filter((item) => item.userId === userId), [requests, userId]);

  async function requestOff(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/availability", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, reason: reason.trim() || "Day off" }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not send that day-off request.");
      return;
    }
    setReason("");
    router.refresh();
  }

  async function review(id: string, status: "APPROVED" | "DENIED") {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/availability/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not update that request.");
      return;
    }
    router.refresh();
  }

  async function cancel(id: string) {
    setSaving(true);
    await fetch(`/api/availability?id=${id}`, { method: "DELETE", credentials: "include" });
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-panel p-5">
      <div>
        <h2 className="font-semibold">Days off</h2>
        <p className="text-sm text-stone-600">
          Ask for a day off here. The office approves it, then that day is blocked on the schedule.
        </p>
      </div>
      <form onSubmit={requestOff} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs font-medium text-stone-500">
          Day I need off
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="text-xs font-medium text-stone-500">
          Why
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            placeholder="PTO, doctor, truck down…"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 self-end rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Sending…" : "Request day off"}
        </button>
      </form>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {canReview ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Waiting on approval</h3>
          {pending.length === 0 ? <p className="text-sm text-stone-500">No open requests.</p> : null}
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {item.userName} · {format(new Date(`${item.date}T12:00:00`), "EEE MMM d")}
                  </p>
                  <p className="text-xs text-stone-500">{item.reason ?? "Day off"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void review(item.id, "DENIED")}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold"
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void review(item.id, "APPROVED")}
                    className="rounded-lg bg-orange px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Approve & block schedule
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Your requests</h3>
          {mine.length === 0 ? <p className="text-sm text-stone-500">You have not asked for a day off.</p> : null}
          <ul className="space-y-2">
            {mine.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{format(new Date(`${item.date}T12:00:00`), "EEE MMM d")}</p>
                  <p className="text-xs text-stone-500">{item.reason ?? "Day off"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} label={DAY_OFF_LABEL[item.status]} />
                  {item.status === "REQUESTED" ? (
                    <button type="button" disabled={saving} onClick={() => void cancel(item.id)} className="text-xs font-semibold text-rose-700">
                      Cancel
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canReview && approved.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Approved — blocked on the board</h3>
          <ul className="space-y-1 text-sm">
            {approved.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2">
                <span>
                  {item.userName} · {format(new Date(`${item.date}T12:00:00`), "EEE MMM d")}
                  {item.reason ? ` · ${item.reason}` : ""}
                </span>
                <button type="button" disabled={saving} onClick={() => void cancel(item.id)} className="text-xs font-semibold text-rose-700">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
