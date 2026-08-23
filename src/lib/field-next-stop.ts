/** Pick the next unfinished stop after the job the tech just left. */
export function nextFieldStop<T extends { id: string; status: string }>(
  orderedStops: T[],
  currentJobId: string,
) {
  const closed = new Set(["COMPLETED", "CANCELLED", "INVOICED"]);
  const index = orderedStops.findIndex((job) => job.id === currentJobId);
  if (index < 0) return null;
  for (let i = index + 1; i < orderedStops.length; i += 1) {
    const job = orderedStops[i];
    if (job && !closed.has(job.status)) return job;
  }
  return null;
}
