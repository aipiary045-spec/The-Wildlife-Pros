"use client";

import Link from "next/link";
import { format } from "date-fns";
import { adjacentMonth, dateKey, monthGrid, monthKey, sameDay } from "@/lib/dates";
import { groupTimeOffByDate, type DayOffRow } from "@/lib/day-off";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimeOffCalendar({
  month,
  selectedDate,
  requests,
  showNames,
  onSelectDate,
}: {
  month: Date;
  selectedDate: string;
  requests: DayOffRow[];
  showNames: boolean;
  onSelectDate: (date: string) => void;
}) {
  const grid = monthGrid(month);
  const byDate = groupTimeOffByDate(requests);
  const today = new Date();
  const prev = monthKey(adjacentMonth(month, -1));
  const next = monthKey(adjacentMonth(month, 1));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange">Coming up</p>
          <h2 className="font-display text-2xl">{grid.label}</h2>
        </div>
        <div className="flex gap-2">
          <Link href={`/time-off?month=${prev}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold">
            Prev
          </Link>
          <Link href={`/time-off?month=${monthKey(new Date())}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold">
            This month
          </Link>
          <Link href={`/time-off?month=${next}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold">
            Next
          </Link>
        </div>
      </div>
      <p className="text-sm text-stone-600">
        Orange is approved and blocked. Amber is still waiting. Tap a day to request it off.
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.days.map((day) => {
          const key = dateKey(day);
          const inMonth = day.getMonth() === grid.monthStart.getMonth();
          const selected = key === selectedDate;
          const isToday = sameDay(day, today);
          const items = byDate.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={`min-h-[4.5rem] rounded-xl border p-1.5 text-left md:min-h-[5.5rem] ${
                selected
                  ? "border-orange bg-orange/10"
                  : isToday
                    ? "border-orange/50 bg-white"
                    : "border-line bg-white"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span className={`text-xs font-semibold ${isToday ? "text-orange" : "text-ink"}`}>{format(day, "d")}</span>
              <ul className="mt-1 space-y-0.5">
                {items.slice(0, 3).map((item) => (
                  <li
                    key={item.id}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight ${
                      item.status === "APPROVED" ? "bg-orange text-white" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {showNames ? item.userName.split(" ")[0] : item.status === "APPROVED" ? "Approved" : "Waiting"}
                  </li>
                ))}
                {items.length > 3 ? (
                  <li className="px-1 text-[10px] font-semibold text-stone-500">+{items.length - 3} more</li>
                ) : null}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
