import { getAreaDensity } from "@/lib/area-density";

export async function AreaDensityReport() {
  const rows = await getAreaDensity();
  if (rows.length === 0) {
    return <p className="text-sm text-stone-500">No job locations recorded yet.</p>;
  }

  const maxJobs = rows[0]?.jobCount ?? 1;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={`${row.city}-${row.postalCode}`} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">
              {row.city} · {row.postalCode}
            </span>
            <span className="text-stone-600">
              {row.jobCount} job{row.jobCount === 1 ? "" : "s"}
              {row.activeCount > 0 ? ` · ${row.activeCount} active` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-orange"
              style={{ width: `${Math.max(8, Math.round((row.jobCount / maxJobs) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
