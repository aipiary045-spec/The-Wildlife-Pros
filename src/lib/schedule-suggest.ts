import { snapMinutes } from "@/lib/dates";
import { driveMinutes, haversineMiles } from "@/lib/routing";
import {
  addZonedDays,
  dateKeyInZone,
  fromZonedDateTime,
  startOfZonedDay,
  timeValueInZone,
  zonedParts,
} from "@/lib/timezone";

export const AREA_NEAR_MILES = 12;
export const AREA_WORTH_MILES = 30;

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
  return `${technicianId}:${typeof day === "string" ? day : dateKeyInZone(day)}`;
}

export function snapClock(value: Date) {
  const parts = zonedParts(value);
  const snapped = snapMinutes(parts.hour * 60 + parts.minute, 30);
  const hour = Math.floor(snapped / 60);
  const minute = snapped % 60;
  if (hour >= 24) {
    const next = addZonedDays(value, 1);
    const nextParts = zonedParts(next);
    return fromZonedDateTime(nextParts.year, nextParts.month, nextParts.day, 0, 0);
  }
  return fromZonedDateTime(parts.year, parts.month, parts.day, hour, minute);
}

export function suggestInsertTime(nearestStart: Date, nearestDurationMin: number, miles: number) {
  const gap = Math.max(15, driveMinutes(miles));
  const after = snapClock(new Date(nearestStart.getTime() + (nearestDurationMin + gap) * 60_000));
  if (zonedParts(after).hour < 18) return after;
  const before = snapClock(new Date(nearestStart.getTime() - (60 + gap) * 60_000));
  if (zonedParts(before).hour >= 7) return before;
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
  const today = startOfZonedDay(now);
  const horizon = options?.days != null ? addZonedDays(today, options.days) : null;
  const blocked = new Set(options?.offKeys ?? []);
  const max = options?.maxSuggestions ?? 6;

  const byDay = new Map<string, AreaStop[]>();
  for (const stop of stops) {
    if (options?.excludeJobId && stop.jobId === options.excludeJobId) continue;
    if (!stop.technicianId) continue;
    const start = new Date(stop.scheduledStart);
    if (start < today) continue;
    if (horizon && start > horizon) continue;
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
    if (insert.getTime() < now.getTime()) continue;
    const band: AreaSuggestion["band"] = nearestMiles <= AREA_NEAR_MILES ? "near" : "on_the_way";
    const miles = Number(nearestMiles.toFixed(1));
    const when = zonedParts(insert).hour < 12 ? "morning" : "afternoon";
    const tech = firstName(nearest.technicianName);
    suggestions.push({
      technicianId: nearest.technicianId,
      technicianName: nearest.technicianName,
      date: dateKeyInZone(insert),
      time: timeValueInZone(insert),
      miles,
      nearbyTitle: nearest.title,
      nearbyAddress: nearest.address,
      stopCount: group.length,
      band,
      reason:
        band === "near"
          ? `${tech} is already at ${nearest.address} that ${when}`
          : `${tech} is ${miles} mi away at ${nearest.address}`,
      score: nearestMiles + (insert.getTime() - today.getTime()) / 86_400_000 / 2,
    });
  }

  return suggestions
    .sort((left, right) => left.score - right.score)
    .slice(0, max)
    .map(({ score: _score, ...item }) => item);
}
