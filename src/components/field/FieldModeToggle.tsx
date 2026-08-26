import Link from "next/link";
import { dateKey } from "@/lib/dates";

export function FieldModeToggle({
  view,
  date,
  trapCheckMode,
}: {
  view: string;
  date: Date;
  trapCheckMode: boolean;
}) {
  const dateParam = dateKey(date);
  return (
    <div className="flex gap-2">
      <Link
        href={`/field?view=${view}&date=${dateParam}`}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
          !trapCheckMode ? "bg-orange text-white" : "border border-line bg-panel text-stone-700"
        }`}
      >
        All stops
      </Link>
      <Link
        href={`/field?view=${view}&date=${dateParam}&mode=traps`}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
          trapCheckMode ? "bg-orange text-white" : "border border-line bg-panel text-stone-700"
        }`}
      >
        Trap checks
      </Link>
    </div>
  );
}
