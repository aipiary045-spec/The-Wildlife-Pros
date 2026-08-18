import { prisma } from "@/lib/prisma";

const captureInclude = {
  species: true,
  technician: true,
  job: { include: { client: true, property: true } },
  deployment: { include: { equipment: true } },
} as const;

export async function listCaptureEvents(options?: { clientId?: string }) {
  return prisma.captureEvent.findMany({
    where: options?.clientId ? { job: { clientId: options.clientId } } : undefined,
    include: captureInclude,
    orderBy: { capturedAt: "desc" },
  });
}

export function summarizeCapturesBySpecies(
  captures: Array<{ quantity: number; species: { commonName: string } }>,
) {
  const totals = new Map<string, number>();
  for (const capture of captures) {
    totals.set(capture.species.commonName, (totals.get(capture.species.commonName) ?? 0) + capture.quantity);
  }
  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => ({ name, count }));
}
