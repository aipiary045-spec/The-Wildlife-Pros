import { prisma } from "@/lib/prisma";

export type AreaDensityRow = {
  city: string;
  postalCode: string;
  jobCount: number;
  activeCount: number;
};

const ACTIVE_STATUSES = ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "ON_HOLD"] as const;

export async function getAreaDensity(limit = 12): Promise<AreaDensityRow[]> {
  const jobs = await prisma.job.findMany({
    where: { status: { not: "CANCELLED" } },
    select: {
      status: true,
      property: { select: { city: true, postalCode: true } },
    },
  });

  const buckets = new Map<string, AreaDensityRow>();
  for (const job of jobs) {
    const city = job.property.city.trim() || "Unknown";
    const postalCode = job.property.postalCode.trim() || "—";
    const key = `${city}|${postalCode}`;
    const row = buckets.get(key) ?? { city, postalCode, jobCount: 0, activeCount: 0 };
    row.jobCount += 1;
    if (ACTIVE_STATUSES.includes(job.status as (typeof ACTIVE_STATUSES)[number])) {
      row.activeCount += 1;
    }
    buckets.set(key, row);
  }

  return [...buckets.values()]
    .sort((a, b) => b.jobCount - a.jobCount || a.city.localeCompare(b.city))
    .slice(0, limit);
}
