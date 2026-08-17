import { JOB_TYPE_LABEL } from "@/lib/constants";
import { isTechnician } from "@/lib/paths";

export function canManagePriceList(role: string) {
  return !isTechnician(role);
}

export type ServiceInput = {
  name: string;
  description?: string;
  jobType: string;
  unitPrice: number;
  taxable: boolean;
  active: boolean;
};

export function parseServiceBody(body: Record<string, unknown>): ServiceInput {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) throw new Error("Name the line item.");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const jobType = typeof body.jobType === "string" && body.jobType in JOB_TYPE_LABEL ? body.jobType : "";
  if (!jobType) throw new Error("Pick a job type for this line.");
  const unitPrice = Number(body.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Enter a price of zero or more.");
  }
  return {
    name,
    description: description || undefined,
    jobType,
    unitPrice: Number(unitPrice.toFixed(2)),
    taxable: body.taxable !== false,
    active: body.active !== false,
  };
}
