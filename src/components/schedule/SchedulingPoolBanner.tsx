import Link from "next/link";
import type { SchedulingPool } from "@/lib/scheduling-pool";

export function SchedulingPoolBanner({ counts }: { counts: SchedulingPool["counts"] }) {
  if (counts.total === 0 && counts.plans === 0) return null;

  return (
    <Link
      href="/schedule/pool"
      className="block rounded-2xl border border-orange/30 bg-orange/5 px-4 py-3 transition hover:bg-orange/10"
    >
      <p className="font-semibold text-orange">Scheduling pool</p>
      <p className="text-sm text-stone-700">
        {counts.total > 0
          ? `${counts.total} stop${counts.total === 1 ? "" : "s"} need a day`
          : "Visit plans waiting for the next trip"}
        {counts.late > 0 ? ` · ${counts.late} late` : ""}
        {counts.returns > 0 ? ` · ${counts.returns} return${counts.returns === 1 ? "" : "s"} due` : ""}
      </p>
      <p className="mt-1 text-xs text-stone-500">Open the pool → place on calendar → optimize on Routes</p>
    </Link>
  );
}
