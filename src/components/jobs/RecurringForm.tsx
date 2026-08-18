"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FREQUENCY_RETURN_DAYS } from "@/lib/schedule-needs";

export const RETURN_FREQUENCIES = [
  { value: "WEEKLY", label: "About weekly", days: 7 },
  { value: "BIWEEKLY", label: "About every two weeks", days: 14 },
  { value: "MONTHLY", label: "About monthly", days: 30 },
  { value: "QUARTERLY", label: "About quarterly", days: 90 },
] as const;

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

export function ReturnVisitFields({
  frequency,
  returnInDays,
  onFrequency,
  onDays,
  allowNone = false,
}: {
  frequency: string;
  returnInDays: number;
  onFrequency: (value: string) => void;
  onDays: (value: number) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        Typical cadence
        <select
          value={frequency}
          onChange={(event) => {
            const next = event.target.value;
            onFrequency(next);
            if (next) onDays(FREQUENCY_RETURN_DAYS[next] ?? 30);
          }}
          className={inputClass}
        >
          {allowNone ? <option value="">No return visit</option> : null}
          {RETURN_FREQUENCIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {frequency ? (
        <label className="block text-sm">
          Days until next trip
          <input
            type="number"
            min={1}
            max={365}
            value={returnInDays}
            onChange={(event) => onDays(Number(event.target.value))}
            className={inputClass}
          />
        </label>
      ) : null}
    </div>
  );
}

export async function addReturnVisit(jobId: string, frequency: string, returnInDays: number) {
  const response = await fetch("/api/recurring", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, frequency, returnInDays }),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Could not add the return visit.");
}

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
    try {
      await addReturnVisit(jobId, frequency, returnInDays);
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof Error ? caught.message : "Could not add them to the pool.");
      return;
    }
    setSaving(false);
    router.refresh();
    router.push("/schedule");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">
        Does not fill the calendar. Puts this customer in the needs-scheduled pool when the next trip is due.
      </p>
      <ReturnVisitFields
        frequency={frequency}
        returnInDays={returnInDays}
        onFrequency={setFrequency}
        onDays={setReturnInDays}
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60">
        {saving ? "Adding…" : "Add to needs-scheduled pool"}
      </button>
    </form>
  );
}
