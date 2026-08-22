import { addMinutes } from "date-fns";
import { googleMapsDirUrl } from "@/lib/maps";
import { appBaseUrl, buildEnRouteMessage, sendSms } from "@/lib/messaging";
import { propertyAddress } from "@/lib/utils";

export const EMERGENCY_ESCALATION_MINUTES = 5;

export const EMERGENCY_HAZARD_TAGS = {
  SNAKE: { label: "Snake", gear: "Snake hook, bucket, thick gloves" },
  BAT: { label: "Bat", gear: "Net, rabies PPE, exclusion supplies" },
  RACCOON_INSIDE: { label: "Raccoon in living space", gear: "Live cage, rabies-aware PPE" },
  CHILD_PRESENT: { label: "Child present", gear: "Keep family clear of the work area" },
  PET_PRESENT: { label: "Pet on site", gear: "Secure pets before entry" },
  AFTER_HOURS: { label: "After hours", gear: "Headlamp and door signage" },
} as const;

export type EmergencyHazardTag = keyof typeof EMERGENCY_HAZARD_TAGS;

export function parseHazardTags(value: unknown): EmergencyHazardTag[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is EmergencyHazardTag => typeof tag === "string" && tag in EMERGENCY_HAZARD_TAGS);
}

export function hazardTagOptions() {
  return Object.entries(EMERGENCY_HAZARD_TAGS).map(([value, meta]) => ({
    value: value as EmergencyHazardTag,
    label: meta.label,
    gear: meta.gear,
  }));
}

export function gearHintsForTags(tags: EmergencyHazardTag[]) {
  const hints = tags.map((tag) => EMERGENCY_HAZARD_TAGS[tag]?.gear).filter(Boolean);
  return [...new Set(hints)];
}

export function buildEmergencyInstructions(input: {
  message: string;
  hazardTags: EmergencyHazardTag[];
}) {
  const lines = [
    "Emergency dispatch — drop non-urgent stops if needed and go now.",
    input.message.trim(),
  ];
  const gear = gearHintsForTags(input.hazardTags);
  if (gear.length) {
    lines.push("", "Gear:", ...gear.map((hint) => `• ${hint}`));
  }
  return lines.filter(Boolean).join("\n");
}

export function buildEmergencyTechSms(input: {
  situation: string;
  address: string;
  jobId: string;
  mapUrl?: string | null;
}) {
  const lines = [
    "EMERGENCY dispatch — The Wildlife Pros",
    input.situation,
    input.address,
  ];
  if (input.mapUrl) lines.push(`Navigate: ${input.mapUrl}`);
  lines.push(`Job: ${appBaseUrl()}/jobs/${input.jobId}`);
  return lines.join("\n");
}

export function buildEmergencyBackupSms(input: {
  techName: string;
  situation: string;
  address: string;
}) {
  return [
    "EMERGENCY backup — The Wildlife Pros",
    `${input.techName} was dispatched but has not acknowledged yet.`,
    input.situation,
    input.address,
  ].join("\n");
}

export function isEmergencyJob(job: { type: string; emergencyDispatch?: { acknowledgedAt: Date | null } | null }) {
  return job.type === "EMERGENCY" || Boolean(job.emergencyDispatch);
}

export function emergencyNeedsAck(dispatch: { acknowledgedAt: Date | null } | null | undefined) {
  return Boolean(dispatch && !dispatch.acknowledgedAt);
}

export function emergencyIsOverdue(dispatch: { createdAt: Date; acknowledgedAt: Date | null }, now = new Date()) {
  if (dispatch.acknowledgedAt) return false;
  return now.getTime() - dispatch.createdAt.getTime() >= EMERGENCY_ESCALATION_MINUTES * 60_000;
}

export function sortJobsEmergencyFirst<T extends { type: string; emergencyDispatch?: { acknowledgedAt: Date | null } | null }>(
  jobs: T[],
) {
  return [...jobs].sort((left, right) => {
    const leftEmergency = isEmergencyJob(left) ? 1 : 0;
    const rightEmergency = isEmergencyJob(right) ? 1 : 0;
    return rightEmergency - leftEmergency;
  });
}

export function emergencyJobWindow(now = new Date()) {
  const scheduledStart = now;
  const durationMin = 90;
  return {
    scheduledStart,
    scheduledEnd: addMinutes(scheduledStart, durationMin),
    durationMin,
  };
}

export async function notifyEmergencyTech(input: {
  phone: string | null | undefined;
  situation: string;
  address: string;
  jobId: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const mapUrl = googleMapsDirUrl({ address: input.address, lat: input.lat, lng: input.lng });
  const body = buildEmergencyTechSms({
    situation: input.situation,
    address: input.address,
    jobId: input.jobId,
    mapUrl,
  });
  if (!input.phone) return { ok: false as const, reason: "no_phone" as const };
  return sendSms({ to: input.phone, body });
}

export async function notifyEmergencyCustomer(input: {
  phone: string | null | undefined;
  clientFirstName: string;
  jobTitle: string;
  techName?: string;
}) {
  if (!input.phone) return { ok: false as const, reason: "no_phone" as const };
  const body = buildEnRouteMessage({
    clientFirstName: input.clientFirstName,
    techName: input.techName,
    jobTitle: input.jobTitle,
  });
  return sendSms({ to: input.phone, body });
}

export function formatDispatchAddress(property: {
  address1: string;
  city: string;
  state: string;
  postalCode: string;
}) {
  return propertyAddress(property);
}
