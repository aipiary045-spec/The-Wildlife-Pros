"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FREQUENCY_RETURN_DAYS } from "@/lib/schedule-needs";

const FREQUENCIES = [
  { value: "WEEKLY", label: "About weekly", days: 7 },
  { value: "BIWEEKLY", label: "About every two weeks", days: 14 },
  { value: "MONTHLY", label: "About monthly", days: 30 },
  { value: "QUARTERLY", label: "About quarterly", days: 90 },
];

export function RecurringForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [frequency, setFrequency] = useState("MONTHLY");
  const [returnInDays, setReturnInDays] = useState(FREQUENCY_RETURN_DAYS.MONTHLY);
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
      body: JSON.stringify({ jobId, frequency, returnInDays }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not add them to the pool.");
      return;
    }
    router.refresh();
    router.push("/schedule");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">
        Does not fill the calendar. Puts this customer in the needs-scheduled pool when the next trip is due.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Typical cadence
          <select
            value={frequency}
            onChange={(event) => {
              setFrequency(event.target.value);
              setReturnInDays(FREQUENCY_RETURN_DAYS[event.target.value] ?? 30);
            }}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          >
            {FREQUENCIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Days until next trip
          <input
            type="number"
            min={1}
            max={365}
            value={returnInDays}
            onChange={(event) => setReturnInDays(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60">
        {saving ? "Adding…" : "Add to needs-scheduled pool"}
      </button>
    </form>
  );
}
