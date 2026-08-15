import { addMinutes } from "date-fns";

export class JobVisitError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "JobVisitError";
    this.status = status;
  }
}

export type VisitAction = "check-in" | "check-out" | null;
export type CheckoutOutcome = "complete" | "follow_up";

export type CheckoutInput = {
  outcome: CheckoutOutcome;
  notes?: string;
  followUp?: {
    scheduledStart: Date;
    scheduledEnd?: Date;
    technicianId?: string;
    durationMin?: number;
    instructions?: string;
  };
};

const CLOSED = ["COMPLETED", "INVOICED", "CANCELLED", "ON_HOLD"];
const ON_SITE = ["ON_SITE", "IN_PROGRESS"];

export function visitActionForStatus(status: string): VisitAction {
  if (CLOSED.includes(status)) return null;
  if (ON_SITE.includes(status)) return "check-out";
  return "check-in";
}

export function parseCheckoutBody(body: Record<string, unknown>): CheckoutInput {
  const outcome = body.outcome;
  if (outcome !== "complete" && outcome !== "follow_up") {
    throw new JobVisitError("Choose whether this job is complete or needs a follow-up visit.");
  }
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (outcome === "complete") {
    return { outcome, notes: notes || undefined };
  }

  const followUp = (body.followUp ?? body) as Record<string, unknown>;
  const scheduledStartRaw = followUp.scheduledStart;
  const scheduledStart = scheduledStartRaw ? new Date(String(scheduledStartRaw)) : null;
  if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) {
    throw new JobVisitError("Pick a date and time for the follow-up visit.");
  }
  const durationMin = Number(followUp.durationMin ?? 60) || 60;
  const scheduledEndRaw = followUp.scheduledEnd;
  const scheduledEnd =
    scheduledEndRaw && !Number.isNaN(new Date(String(scheduledEndRaw)).getTime())
      ? new Date(String(scheduledEndRaw))
      : addMinutes(scheduledStart, durationMin);
  const technicianId = typeof followUp.technicianId === "string" && followUp.technicianId ? followUp.technicianId : undefined;
  const instructions = typeof followUp.instructions === "string" ? followUp.instructions.trim() : notes;

  return {
    outcome,
    notes: notes || undefined,
    followUp: {
      scheduledStart,
      scheduledEnd,
      technicianId,
      durationMin,
      instructions: instructions || undefined,
    },
  };
}
