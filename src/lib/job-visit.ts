import { addDays, startOfDay } from "date-fns";
import { parseReturnInDays } from "@/lib/schedule-needs";

export type OpenJobConflict = {
  id: string;
  number: string;
  title: string;
};

export class JobVisitError extends Error {
  status: number;
  openJob?: OpenJobConflict;
  constructor(message: string, status = 400, openJob?: OpenJobConflict) {
    super(message);
    this.name = "JobVisitError";
    this.status = status;
    this.openJob = openJob;
  }
}

export type VisitAction = "check-in" | "check-out" | null;
export type CheckoutOutcome = "complete" | "follow_up";

export const CHECKOUT_WORK = [
  { id: "trap_check", label: "Checked existing traps" },
  { id: "trap_set", label: "Set or reset traps" },
  { id: "capture", label: "Had a capture" },
  { id: "exclusion", label: "Exclusion / sealing" },
  { id: "cleanup", label: "Cleanup / sanitation" },
  { id: "inspection", label: "Inspection only" },
  { id: "customer_contact", label: "Spoke with the customer" },
  { id: "no_activity", label: "No animal activity" },
] as const;

export const SITE_LEFT_OPTIONS = [
  { id: "secure", label: "Site left secure" },
  { id: "needs_return", label: "Needs another trip" },
  { id: "customer_will_call", label: "Customer will call us" },
] as const;

export type CheckoutInput = {
  outcome: CheckoutOutcome;
  notes?: string;
  workDone: string[];
  siteLeft?: string;
  trapPlaced: boolean;
  trapLat?: number;
  trapLng?: number;
  trapNote?: string;
  followUp?: {
    returnInDays: number;
    dueOn: Date;
    notes?: string;
  };
};

const CLOSED = ["COMPLETED", "INVOICED", "CANCELLED", "ON_HOLD"];
const ON_SITE = ["ON_SITE", "IN_PROGRESS"];

export function visitActionForStatus(status: string): VisitAction {
  if (CLOSED.includes(status)) return null;
  if (ON_SITE.includes(status)) return "check-out";
  return "check-in";
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

export function parseCheckoutBody(body: Record<string, unknown>): CheckoutInput {
  const outcome = body.outcome;
  if (outcome !== "complete" && outcome !== "follow_up") {
    throw new JobVisitError("Choose whether this job is complete or needs a follow-up visit.");
  }
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const workDone = Array.isArray(body.workDone)
    ? body.workDone.filter((item): item is string => typeof item === "string" && CHECKOUT_WORK.some((option) => option.id === item))
    : [];
  const siteLeft =
    typeof body.siteLeft === "string" && SITE_LEFT_OPTIONS.some((option) => option.id === body.siteLeft)
      ? body.siteLeft
      : undefined;
  const trapPlaced = Boolean(body.trapPlaced);
  const trapLat = optionalNumber(body.trapLat);
  const trapLng = optionalNumber(body.trapLng);
  const trapNote = typeof body.trapNote === "string" ? body.trapNote.trim() : "";

  if (trapPlaced && trapLat !== undefined && (trapLat < -90 || trapLat > 90)) {
    throw new JobVisitError("Trap latitude must be between -90 and 90.");
  }
  if (trapPlaced && trapLng !== undefined && (trapLng < -180 || trapLng > 180)) {
    throw new JobVisitError("Trap longitude must be between -180 and 180.");
  }

  const base: CheckoutInput = {
    outcome,
    notes: notes || undefined,
    workDone,
    siteLeft,
    trapPlaced,
    trapLat: trapPlaced ? trapLat : undefined,
    trapLng: trapPlaced ? trapLng : undefined,
    trapNote: trapPlaced && trapNote ? trapNote : undefined,
  };

  if (outcome === "complete") return base;

  try {
    const returnInDays = parseReturnInDays(body.returnInDays ?? (body.followUp as { returnInDays?: unknown } | undefined)?.returnInDays);
    return {
      ...base,
      followUp: {
        returnInDays,
        dueOn: startOfDay(addDays(new Date(), returnInDays)),
        notes: notes || undefined,
      },
    };
  } catch (error) {
    throw new JobVisitError(error instanceof Error ? error.message : "Enter about how many days until they need a return trip.");
  }
}

export function checkoutSummary(input: CheckoutInput) {
  const work = CHECKOUT_WORK.filter((option) => input.workDone.includes(option.id)).map((option) => option.label);
  const site = SITE_LEFT_OPTIONS.find((option) => option.id === input.siteLeft)?.label;
  const parts = [
    input.outcome === "complete" ? "Job complete" : `Needs return in about ${input.followUp?.returnInDays} day(s)`,
    work.length ? `Work: ${work.join(", ")}` : "",
    site ? `Left as: ${site}` : "",
    input.trapPlaced
      ? `Trap placed${input.trapLat != null && input.trapLng != null ? ` at ${input.trapLat.toFixed(5)}, ${input.trapLng.toFixed(5)}` : ""}${input.trapNote ? ` · ${input.trapNote}` : ""}`
      : "",
    input.notes ?? "",
  ];
  return parts.filter(Boolean).join("\n");
}
