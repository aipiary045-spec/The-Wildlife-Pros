import { EQUIPMENT_SERIAL_PREFIX, EQUIPMENT_TYPE_LABEL, EQUIPMENT_TYPES, TRAP_STATUS_LABEL } from "@/lib/constants";

export const STOCK_STATUSES = ["IN_INVENTORY", "RETRIEVED"] as const;
export const DEPLOYED_STATUSES = ["DEPLOYED", "ACTIVE_CAPTURE", "NEEDS_CHECK"] as const;
export const SHOP_STATUSES = ["IN_INVENTORY", "RETRIEVED", "DAMAGED", "LOST", "RETIRED"] as const;

export function suggestSerial(type: string, existing: string[]) {
  const prefix = EQUIPMENT_SERIAL_PREFIX[type] ?? "EQ";
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let max = 0;
  for (const serial of existing) {
    const match = serial.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function isStockStatus(status: string) {
  return (STOCK_STATUSES as readonly string[]).includes(status);
}

export function isDeployedStatus(status: string) {
  return (DEPLOYED_STATUSES as readonly string[]).includes(status);
}

export type EquipmentInput = {
  serialNumber: string;
  name: string;
  type: string;
  manufacturer: string | null;
  notes: string | null;
  locationId: string | null;
  status: string;
};

export function parseEquipmentBody(body: Record<string, unknown>): EquipmentInput {
  const type = typeof body.type === "string" && body.type in EQUIPMENT_TYPE_LABEL ? body.type : "LIVE_CAGE";
  const serialNumber = typeof body.serialNumber === "string" ? body.serialNumber.trim() : "";
  if (!serialNumber) throw new Error("Serial is required.");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) throw new Error("Name is required.");
  const status =
    typeof body.status === "string" && body.status in TRAP_STATUS_LABEL ? body.status : "IN_INVENTORY";
  if (isDeployedStatus(status)) {
    throw new Error("Status must be set from the job screen while a trap is in the field.");
  }
  return {
    serialNumber,
    name,
    type,
    manufacturer: typeof body.manufacturer === "string" ? body.manufacturer.trim() || null : null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    locationId:
      body.locationId === null || body.locationId === ""
        ? null
        : typeof body.locationId === "string"
          ? body.locationId
          : null,
    status,
  };
}

export function canDeleteEquipment(input: { deploymentCount: number; status: string }) {
  if (isDeployedStatus(input.status)) {
    return { ok: false as const, reason: "Retrieve this trap from the field before removing it." };
  }
  if (input.deploymentCount > 0) {
    return {
      ok: false as const,
      reason: "This trap has field history. Retire it instead of deleting the record.",
    };
  }
  return { ok: true as const, reason: "" };
}

export function shopStatusOptions() {
  return SHOP_STATUSES.map((value) => ({ value, label: TRAP_STATUS_LABEL[value] ?? value }));
}

export function equipmentTypeOptions() {
  return EQUIPMENT_TYPES.map((value) => ({ value, label: EQUIPMENT_TYPE_LABEL[value] ?? value }));
}
