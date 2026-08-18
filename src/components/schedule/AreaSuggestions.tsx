"use client";

import { useEffect, useState } from "react";
import type { AreaSuggestion } from "@/lib/schedule-suggest";

export function AreaSuggestions({
  propertyId,
  excludeJobId,
  onPick,
}: {
  propertyId?: string;
  excludeJobId?: string;
  onPick: (pick: { technicianId: string; date: string; time: string }) => void;
}) {
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [missingPin, setMissingPin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) {
      setSuggestions([]);
      setMissingPin(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ propertyId });
    if (excludeJobId) params.set("excludeJobId", excludeJobId);
    void fetch(`/api/schedule/suggest?${params}`, { credentials: "include" })
      .then((response) => response.json())
      .then((data: { suggestions?: AreaSuggestion[]; missingPin?: boolean }) => {
        if (cancelled) return;
        setSuggestions(data.suggestions ?? []);
        setMissingPin(Boolean(data.missingPin));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, excludeJobId]);

  if (!propertyId) return null;

  return (
    <div className="rounded-xl border border-line bg-background p-3">
      <p className="text-sm font-semibold">Already in the area</p>
      {loading ? <p className="mt-1 text-sm text-stone-500">Looking through the whole schedule…</p> : null}
      {!loading && missingPin ? (
        <p className="mt-1 text-sm text-stone-500">Need a map pin on this street before we can suggest a ride-along day.</p>
      ) : null}
      {!loading && !missingPin && suggestions.length === 0 ? (
        <p className="mt-1 text-sm text-stone-500">Nobody is booked near this street yet.</p>
      ) : null}
      <div className="mt-2 space-y-2">
        {suggestions.map((item) => (
          <button
            key={`${item.technicianId}-${item.date}-${item.time}`}
            type="button"
            onClick={() => onPick({ technicianId: item.technicianId, date: item.date, time: item.time })}
            className="block w-full rounded-lg border border-line bg-white px-3 py-2 text-left"
          >
            <p className="text-sm font-semibold">
              {item.technicianName.split(" ")[0]} · {labelDay(item.date)} · {labelTime(item.time)}
            </p>
            <p className="text-xs text-stone-600">{item.reason}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function labelDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: year !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function labelTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return minutes ? `${display}:${String(minutes).padStart(2, "0")} ${period}` : `${display} ${period}`;
}
