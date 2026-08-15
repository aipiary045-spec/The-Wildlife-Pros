import { EQUIPMENT_SERIAL_PREFIX } from "@/lib/constants";

export const STOCK_STATUSES = ["IN_INVENTORY", "RETRIEVED"] as const;

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
