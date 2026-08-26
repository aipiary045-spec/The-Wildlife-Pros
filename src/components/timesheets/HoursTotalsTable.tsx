import { format } from "date-fns";
import { dateKey } from "@/lib/dates";
import { formatDuration } from "@/lib/time";
import type { HoursGrid } from "@/lib/hours";
import { cn } from "@/lib/utils";

function cellLabel(minutes: number, isOff: boolean) {
  if (isOff && minutes === 0) return "Off";
  return minutes > 0 ? formatDuration(minutes) : "—";
}

export function HoursTotalsTable({
  grid,
  showTech,
  highlightDate,
  offKeys = {},
}: {
  grid: HoursGrid;
  showTech: boolean;
  /** Day currently selected in the toolbar — highlighted in the week grid. */
  highlightDate?: Date;
  /** Approved day-off dates keyed by user id. */
  offKeys?: Record<string, string[]>;
}) {
  const highlightKey = highlightDate ? dateKey(highlightDate) : null;
  const empty = grid.rows.length === 0;
  const offSet = Object.fromEntries(
    Object.entries(offKeys).map(([userId, keys]) => [userId, new Set(keys)]),
  );

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-orange/30 bg-panel shadow-sm">
      <div className="border-b border-orange/20 bg-orange/5 px-4 py-3 sm:px-5">
        <p className="text-xs font-bold uppercase tracking-widest text-orange">This week</p>
        <h2 className="mt-0.5 font-display text-2xl">Daily & weekly totals</h2>
        <p className="mt-1 text-sm text-stone-600">
          {showTech
            ? "Hours by person, Monday–Sunday. Approved time off shows as Off."
            : "Your hours by day. Approved time off shows as Off. Week total is on the right."}
        </p>
      </div>

      {empty ? (
        <p className="px-4 py-8 text-center text-sm text-stone-500 sm:px-5">No clock entries or days off this week yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-background/80 text-xs uppercase tracking-wider text-stone-500">
                {showTech ? <th className="sticky left-0 z-10 bg-background/95 px-3 py-3 sm:px-4">Tech</th> : null}
                {grid.days.map((day) => {
                  const key = dateKey(day);
                  const active = highlightKey === key;
                  return (
                    <th
                      key={key}
                      className={cn(
                        "min-w-[4.5rem] px-2 py-3 text-center font-semibold sm:px-3",
                        active && "bg-orange/10 text-orange",
                      )}
                    >
                      <span className="block">{format(day, "EEE")}</span>
                      <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-stone-500">
                        {format(day, "M/d")}
                      </span>
                    </th>
                  );
                })}
                <th className="min-w-[5rem] bg-ink/5 px-3 py-3 text-right font-semibold text-ink sm:px-4">Week</th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row) => (
                <tr key={row.user.id} className="border-b border-line last:border-b-0">
                  {showTech ? (
                    <td className="sticky left-0 z-10 bg-panel px-3 py-3 font-medium sm:px-4">
                      <span className="inline-flex items-center gap-2">
                        {row.user.color ? (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: row.user.color }}
                            aria-hidden
                          />
                        ) : null}
                        <span>
                          {row.user.firstName} {row.user.lastName}
                          {row.open ? (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              On clock
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </td>
                  ) : null}
                  {grid.days.map((day) => {
                    const key = dateKey(day);
                    const minutes = row.byDay[key] ?? 0;
                    const isOff = offSet[row.user.id]?.has(key) ?? false;
                    const active = highlightKey === key;
                    return (
                      <td
                        key={key}
                        className={cn(
                          "px-2 py-3 text-center tabular-nums sm:px-3",
                          active && "bg-orange/5 font-semibold text-ink",
                          isOff && minutes === 0 && "font-semibold text-amber-800",
                          !active && !isOff && minutes === 0 && "text-stone-400",
                        )}
                      >
                        {cellLabel(minutes, isOff)}
                      </td>
                    );
                  })}
                  <td className="bg-ink/5 px-3 py-3 text-right font-semibold tabular-nums sm:px-4">
                    {formatDuration(row.weekMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
            {showTech && grid.rows.length > 1 ? (
              <tfoot>
                <tr className="border-t border-line bg-background/80 text-sm font-semibold">
                  <td className="sticky left-0 z-10 bg-background/95 px-3 py-3 sm:px-4">Team</td>
                  {grid.dayTotals.map((minutes, index) => {
                    const day = grid.days[index]!;
                    const key = dateKey(day);
                    const active = highlightKey === key;
                    return (
                      <td
                        key={key}
                        className={cn(
                          "px-2 py-3 text-center tabular-nums sm:px-3",
                          active && "bg-orange/10 text-orange",
                        )}
                      >
                        {cellLabel(minutes, false)}
                      </td>
                    );
                  })}
                  <td className="bg-ink/10 px-3 py-3 text-right tabular-nums sm:px-4">
                    {formatDuration(grid.weekTotal)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}

      {!empty && !showTech ? (
        <div className="flex items-center justify-between border-t border-line bg-ink/5 px-4 py-3 text-sm sm:px-5">
          <span className="font-medium text-stone-600">Week total</span>
          <span className="font-display text-xl tabular-nums">{formatDuration(grid.weekTotal)}</span>
        </div>
      ) : null}
    </section>
  );
}
