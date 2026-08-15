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
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
  ON_HOLD: "On hold",
};

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  APPROVED: "Approved",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  CONVERTED: "Converted",
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIAL: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
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
