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

const DISPOSITION_SET = new Set([
  "RELOCATED",
  "RELEASED_ON_SITE",
  "EUTHANIZED",
  "TRANSFERRED",
  "ESCAPED",
  "FOUND_DEAD",
  "OTHER",
]);

export type CheckoutCaptureInput = {
  speciesId?: string;
  speciesName?: string;
  quantity: number;
  disposition: string;
  deploymentId?: string;
  locationNote?: string;
};

export type CheckoutExclusionInput = {
  material: string;
  quantity?: string;
  notes?: string;
  entryLabel?: string;
  entryArea?: string;
};

export type CheckoutInput = {
  outcome: CheckoutOutcome;
  notes?: string;
  workDone: string[];
  siteLeft?: string;
  trapPlaced: boolean;
  trapLat?: number;
  trapLng?: number;
  trapNote?: string;
  captures?: CheckoutCaptureInput[];
  exclusion?: CheckoutExclusionInput;
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

  const captures: CheckoutCaptureInput[] = [];
  if (Array.isArray(body.captures)) {
    for (const raw of body.captures) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const speciesId = typeof item.speciesId === "string" ? item.speciesId.trim() : "";
      const speciesName = typeof item.speciesName === "string" ? item.speciesName.trim() : "";
      if (!speciesId && !speciesName) continue;
      const disposition =
        typeof item.disposition === "string" && item.disposition in DISPOSITION_SET
          ? item.disposition
          : "RELOCATED";
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const deploymentId = typeof item.deploymentId === "string" ? item.deploymentId.trim() : "";
      const locationNote = typeof item.locationNote === "string" ? item.locationNote.trim() : "";
      captures.push({
        speciesId: speciesId || undefined,
        speciesName: speciesName || undefined,
        quantity,
        disposition,
        deploymentId: deploymentId || undefined,
        locationNote: locationNote || undefined,
      });
    }
  }

  let exclusion: CheckoutExclusionInput | undefined;
  if (body.exclusion && typeof body.exclusion === "object") {
    const raw = body.exclusion as Record<string, unknown>;
    const material = typeof raw.material === "string" ? raw.material.trim() : "";
    if (material) {
      exclusion = {
        material,
        quantity: typeof raw.quantity === "string" ? raw.quantity.trim() || undefined : undefined,
        notes: typeof raw.notes === "string" ? raw.notes.trim() || undefined : undefined,
        entryLabel: typeof raw.entryLabel === "string" ? raw.entryLabel.trim() || undefined : undefined,
        entryArea: typeof raw.entryArea === "string" ? raw.entryArea.trim() || undefined : undefined,
      };
    }
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
    captures: captures.length ? captures : undefined,
    exclusion,
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
    input.captures?.length
      ? `Captures: ${input.captures.map((item) => `${item.quantity}× ${item.speciesName || item.speciesId || "species"} (${item.disposition})`).join("; ")}`
      : "",
    input.exclusion ? `Exclusion: ${input.exclusion.material}${input.exclusion.entryLabel ? ` · ${input.exclusion.entryLabel}` : ""}` : "",
    input.notes ?? "",
  ];
  return parts.filter(Boolean).join("\n");
}
