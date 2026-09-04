const DONE = new Set(["COMPLETED", "INVOICED", "CANCELLED"]);

export type PlanJob = {
  id: string;
  visitNumber: number | null;
  status: string;
  scheduledStart: Date | null;
};

export type VisitPlanStats = {
  totalVisits: number;
  created: number;
  completed: number;
  scheduled: number;
  unscheduled: number;
  remaining: number;
  nextVisitNumber: number | null;
  canAddTrip: boolean;
};

export function visitPlanStats(
  plan: { totalVisits: number; status: string },
  jobs: PlanJob[],
): VisitPlanStats {
  const sorted = [...jobs].sort((left, right) => (left.visitNumber ?? 0) - (right.visitNumber ?? 0));
  const created = sorted.length;
  const completed = sorted.filter((job) => job.status === "COMPLETED" || job.status === "INVOICED").length;
  const scheduled = sorted.filter(
    (job) => job.scheduledStart && !DONE.has(job.status),
  ).length;
  const unscheduled = sorted.filter(
    (job) => (job.status === "UNSCHEDULED" || !job.scheduledStart) && job.status !== "CANCELLED",
  ).length;
  const remaining = Math.max(0, plan.totalVisits - created);
  const lastJob = sorted[sorted.length - 1];
  const lastTripDone = !lastJob || lastJob.status === "COMPLETED" || lastJob.status === "INVOICED";
  const canAddTrip = plan.status === "ACTIVE" && remaining > 0 && (created === 0 || lastTripDone);

  return {
    totalVisits: plan.totalVisits,
    created,
    completed,
    scheduled,
    unscheduled,
    remaining,
    nextVisitNumber: canAddTrip ? created + 1 : null,
    canAddTrip,
  };
}

export function parseVisitPlanBody(body: Record<string, unknown>) {
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const totalVisits = Number(body.totalVisits);
  if (!clientId || !propertyId) throw new Error("Pick a client and service address.");
  if (!title) throw new Error("Name this visit plan.");
  if (!Number.isFinite(totalVisits) || totalVisits < 1 || totalVisits > 999) {
    throw new Error("How many visits are included? (1–999)");
  }
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";
  const durationMin = Number(body.durationMin);
  const jobType = typeof body.jobType === "string" ? body.jobType : "INSPECTION";
  const preferredTechId =
    typeof body.preferredTechId === "string" && body.preferredTechId.trim()
      ? body.preferredTechId.trim()
      : undefined;
  const createFirstTrip = body.createFirstTrip !== false;

  return {
    clientId,
    propertyId,
    title,
    instructions: instructions || undefined,
    totalVisits: Math.round(totalVisits),
    durationMin: Number.isFinite(durationMin) && durationMin > 0 ? Math.round(durationMin) : 60,
    jobType,
    preferredTechId,
    createFirstTrip,
  };
}

export function planProgressLabel(stats: VisitPlanStats) {
  return `Trip ${stats.completed} done · ${stats.scheduled} on calendar · ${stats.unscheduled} in pool · ${stats.remaining} left to create`;
}
