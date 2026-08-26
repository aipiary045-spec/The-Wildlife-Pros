import { prisma } from "@/lib/prisma";
import { buildTripVisitMap, tripRootId } from "@/lib/job-trips";

export async function loadTripVisitMapForJobs(
  jobs: Array<{ id: string; sourceJobId?: string | null; includedTrips?: number | null }>,
) {
  const rootIds = [
    ...new Set(
      jobs
        .filter((job) => job.includedTrips || job.sourceJobId)
        .map((job) => tripRootId(job)),
    ),
  ];
  if (!rootIds.length) return new Map<string, ReturnType<typeof buildTripVisitMap> extends Map<string, infer V> ? V : never>();

  const members = await prisma.job.findMany({
    where: { OR: [{ id: { in: rootIds } }, { sourceJobId: { in: rootIds } }] },
    select: {
      id: true,
      sourceJobId: true,
      createdAt: true,
      scheduledStart: true,
      includedTrips: true,
    },
  });
  return buildTripVisitMap(members);
}
