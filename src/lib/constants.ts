export const BRAND = {
  name: "The Wildlife Pros",
  product: "CritterOps",
  tagline: "Field service for wildlife & pest professionals",
  orange: "#E85D04",
  amber: "#F48C06",
  gold: "#F9C74F",
  ink: "#111111",
};

export const JOB_STATUS_LABEL: Record<string, string> = {
  UNSCHEDULED: "Unscheduled",
  SCHEDULED: "Scheduled",
  EN_ROUTE: "En route",
  ON_SITE: "On site",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  INVOICED: "Closed",
  CANCELLED: "Cancelled",
  ON_HOLD: "On hold",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  NEW: "New call",
  ASSESSED: "Looked at",
  CONVERTED_QUOTE: "Converted",
  CONVERTED_JOB: "Trip started",
  CLOSED: "Closed",
  SPAM: "Spam",
};

export const INTAKE_SOURCE_LABEL: Record<string, string> = {
  phone: "Phone",
  web: "Web",
  "walk-in": "Walk-in",
  referral: "Referral",
};

export const USER_ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TECHNICIAN: "Technician",
};

export const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  DISABLED: "Disabled",
};

export const TRAP_STATUS_LABEL: Record<string, string> = {
  IN_INVENTORY: "In inventory",
  DEPLOYED: "Deployed",
  ACTIVE_CAPTURE: "Active capture",
  NEEDS_CHECK: "Needs check",
  RETRIEVED: "Retrieved",
  DAMAGED: "Damaged",
  LOST: "Lost",
  RETIRED: "Retired",
};

export const DISPOSITION_LABEL: Record<string, string> = {
  RELOCATED: "Relocated",
  RELEASED_ON_SITE: "Released on site",
  EUTHANIZED: "Euthanized",
  TRANSFERRED: "Transferred",
  ESCAPED: "Escaped",
  FOUND_DEAD: "Found dead",
  OTHER: "Other",
};

export const JOB_TYPE_LABEL: Record<string, string> = {
  INSPECTION: "Inspection",
  TRAPPING: "Trapping",
  EXCLUSION: "Exclusion",
  REMOVAL: "Removal",
  CLEANUP: "Cleanup / sanitation",
  PREVENTION: "Prevention",
  RECURRING: "Recurring service",
  EMERGENCY: "Emergency",
  FOLLOW_UP: "Follow-up",
  OTHER: "Other",
};

export const EQUIPMENT_TYPE_LABEL: Record<string, string> = {
  LIVE_CAGE: "Live cage",
  ONE_WAY_DOOR: "One-way door",
  SNAP_TRAP: "Snap trap",
  GLUE_BOARD: "Glue board",
  EXCLUSION_FUNNEL: "Exclusion funnel",
  BAIT_STATION: "Bait station",
  CAMERA: "Camera",
  REPELLENT: "Repellent",
  OTHER: "Other",
};

export const EQUIPMENT_SERIAL_PREFIX: Record<string, string> = {
  LIVE_CAGE: "T",
  ONE_WAY_DOOR: "OWD",
  SNAP_TRAP: "ST",
  GLUE_BOARD: "GB",
  EXCLUSION_FUNNEL: "EF",
  BAIT_STATION: "BS",
  CAMERA: "CAM",
  REPELLENT: "RP",
  OTHER: "EQ",
};

export const EQUIPMENT_TYPES = Object.keys(EQUIPMENT_TYPE_LABEL);

export const JOB_TYPE_BAR: Record<string, string> = {
  INSPECTION: "border-l-sky-500 bg-sky-50",
  TRAPPING: "border-l-orange bg-orange/10",
  EXCLUSION: "border-l-amber bg-amber/10",
  REMOVAL: "border-l-rose-500 bg-rose-50",
  CLEANUP: "border-l-stone-400 bg-stone-100",
  PREVENTION: "border-l-emerald-500 bg-emerald-50",
  RECURRING: "border-l-violet-500 bg-violet-50",
  EMERGENCY: "border-l-red-600 bg-red-50",
  FOLLOW_UP: "border-l-gold bg-gold/20",
  OTHER: "border-l-stone-400 bg-white",
};
