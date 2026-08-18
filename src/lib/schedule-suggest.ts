import { addDays, startOfDay } from "date-fns";
import { dateKey, slotTimeValue, snapMinutes } from "@/lib/dates";
import { driveMinutes, haversineMiles } from "@/lib/routing";

export const AREA_NEAR_MILES = 5;
export const AREA_WORTH_MILES = 12;
export const AREA_LOOKAHEAD_DAYS = 14;

export type AreaStop = {
  jobId: string;
  technicianId: string;
  technicianName: string;
  scheduledStart: Date;
  durationMin: number;
  lat: number;
  lng: number;
  title: string;
  address: string;
};

export type AreaSuggestion = {
  technicianId: string;
  technicianName: string;
  date: string;
  time: string;
  miles: number;
  nearbyTitle: string;
  nearbyAddress: string;
  stopCount: number;
  band: "near" | "on_the_way";
  reason: string;
};

export function offKey(technicianId: string, day: Date | string) {
  return `${technicianId}:${typeof day === "string" ? day : dateKey(day)}`;
}

export function snapClock(value: Date) {
  const next = new Date(value);
  const snapped = snapMinutes(next.getHours() * 60 + next.getMinutes(), 30);
  next.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
  return next;
}

export function suggestInsertTime(nearestStart: Date, nearestDurationMin: number, miles: number) {
  const gap = Math.max(15, driveMinutes(miles));
  const after = snapClock(new Date(nearestStart.getTime() + (nearestDurationMin + gap) * 60_000));
  if (after.getHours() < 18) return after;
  const before = snapClock(new Date(nearestStart.getTime() - (60 + gap) * 60_000));
  if (before.getHours() >= 7) return before;
  return after;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function suggestNearbySlots(
  target: { lat: number; lng: number },
  stops: AreaStop[],
  options?: {
    now?: Date;
    days?: number;
    offKeys?: Iterable<string>;
    excludeJobId?: string;
    maxSuggestions?: number;
  },
): AreaSuggestion[] {
  const now = options?.now ?? new Date();
  const horizon = addDays(startOfDay(now), options?.days ?? AREA_LOOKAHEAD_DAYS);
  const blocked = new Set(options?.offKeys ?? []);
  const max = options?.maxSuggestions ?? 4;

  const byDay = new Map<string, AreaStop[]>();
  for (const stop of stops) {
    if (options?.excludeJobId && stop.jobId === options.excludeJobId) continue;
    if (!stop.technicianId) continue;
    const start = new Date(stop.scheduledStart);
    if (start < startOfDay(now) || start > horizon) continue;
    const key = offKey(stop.technicianId, start);
    if (blocked.has(key)) continue;
    const bucket = byDay.get(key) ?? [];
    bucket.push(stop);
    byDay.set(key, bucket);
  }

  const suggestions: Array<AreaSuggestion & { score: number }> = [];
  for (const group of byDay.values()) {
    let nearest = group[0];
    let nearestMiles = haversineMiles(target, nearest);
    for (const stop of group) {
      const miles = haversineMiles(target, stop);
      if (miles < nearestMiles) {
        nearest = stop;
        nearestMiles = miles;
      }
    }
    if (nearestMiles > AREA_WORTH_MILES) continue;
    const insert = suggestInsertTime(new Date(nearest.scheduledStart), nearest.durationMin, nearestMiles);
    if (dateKey(insert) === dateKey(now) && insert.getTime() < now.getTime() + 30 * 60_000) continue;
    const band: AreaSuggestion["band"] = nearestMiles <= AREA_NEAR_MILES ? "near" : "on_the_way";
    const miles = Number(nearestMiles.toFixed(1));
    const when = insert.getHours() < 12 ? "morning" : "afternoon";
    const tech = firstName(nearest.technicianName);
    suggestions.push({
      technicianId: nearest.technicianId,
      technicianName: nearest.technicianName,
      date: dateKey(insert),
      time: slotTimeValue(insert.getHours(), insert.getMinutes()),
      miles,
      nearbyTitle: nearest.title,
      nearbyAddress: nearest.address,
      stopCount: group.length,
      band,
      reason:
        band === "near"
          ? `${tech} is already at ${nearest.address} that ${when}`
          : `${tech} is ${miles} mi away at ${nearest.address}`,
      score: nearestMiles + (insert.getTime() - startOfDay(now).getTime()) / 86_400_000 / 2,
    });
  }

  return suggestions
    .sort((left, right) => left.score - right.score)
    .slice(0, max)
    .map(({ score: _score, ...item }) => item);
}
