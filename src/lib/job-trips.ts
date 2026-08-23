export type TripChainMember = {
  id: string;
  sourceJobId?: string | null;
  createdAt: Date | string;
  scheduledStart?: Date | string | null;
  includedTrips?: number | null;
};

export function tripRootId(job: { id: string; sourceJobId?: string | null }) {
  return job.sourceJobId ?? job.id;
}

export function parseIncludedTrips(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  if (!Number.isFinite(next)) return null;
  const rounded = Math.floor(next);
  if (rounded < 2 || rounded > 99) return null;
  return rounded;
}

export function sortTripChain(jobs: TripChainMember[]) {
  return [...jobs].sort((left, right) => {
    const leftStart = left.scheduledStart ? new Date(left.scheduledStart).getTime() : Number.POSITIVE_INFINITY;
    const rightStart = right.scheduledStart ? new Date(right.scheduledStart).getTime() : Number.POSITIVE_INFINITY;
    if (leftStart !== rightStart) return leftStart - rightStart;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

export function tripVisitIndex(chain: TripChainMember[], jobId: string) {
  const sorted = sortTripChain(chain);
  const index = sorted.findIndex((job) => job.id === jobId);
  return index >= 0 ? index + 1 : null;
}

export type TripVisitInfo = {
  visitNumber: number;
  includedTrips: number;
  overIncluded: boolean;
};

export function tripVisitInfo(visitNumber: number, includedTrips: number | null | undefined): TripVisitInfo | null {
  if (!includedTrips || includedTrips < 2 || visitNumber < 1) return null;
  return {
    visitNumber,
    includedTrips,
    overIncluded: visitNumber > includedTrips,
  };
}

export function formatTripVisitLabel(info: TripVisitInfo) {
  return `Visit ${info.visitNumber} of ${info.includedTrips}`;
}

export function buildTripVisitMap(members: TripChainMember[]) {
  const byRoot = new Map<string, TripChainMember[]>();
  for (const job of members) {
    const root = tripRootId(job);
    const list = byRoot.get(root) ?? [];
    list.push(job);
    byRoot.set(root, list);
  }

  const result = new Map<string, TripVisitInfo>();
  for (const chain of byRoot.values()) {
    const includedTrips = chain.find((job) => job.includedTrips)?.includedTrips ?? null;
    if (!includedTrips || includedTrips < 2) continue;
    const sorted = sortTripChain(chain);
    sorted.forEach((job, index) => {
      const info = tripVisitInfo(index + 1, includedTrips);
      if (info) result.set(job.id, info);
    });
  }
  return result;
}

export function tripVisitForJob(job: TripChainMember, chain: TripChainMember[]) {
  const includedTrips = chain.find((item) => item.includedTrips)?.includedTrips ?? job.includedTrips ?? null;
  const visitNumber = tripVisitIndex(chain, job.id);
  if (!visitNumber) return null;
  return tripVisitInfo(visitNumber, includedTrips);
}
