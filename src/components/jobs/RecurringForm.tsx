"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every two weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
];

export function RecurringForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [frequency, setFrequency] = useState("MONTHLY");
  const [count, setCount] = useState(4);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/recurring", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, frequency, count }),
    });
    const data = (await response.json()) as { error?: string; jobs?: unknown[] };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not generate visits.");
      return;
    }
    router.refresh();
    router.push("/schedule");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">Creates upcoming jobs for the same customer and address.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Repeat
          <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2">
            {FREQUENCIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Upcoming visits
          <input
            type="number"
            min={1}
            max={24}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60">
        {saving ? "Creating…" : "Generate visits"}
      </button>
    </form>
  );
}
