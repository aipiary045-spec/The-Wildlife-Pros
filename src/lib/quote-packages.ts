import type { LineDraft, ServiceOption } from "@/components/billing/LineItemsEditor";
import { serviceToLineDraft } from "@/components/billing/LineItemsEditor";

export type QuotePackage = {
  id: string;
  label: string;
  description: string;
  serviceNames: string[];
};

export const QUOTE_PACKAGES: QuotePackage[] = [
  {
    id: "inspection-trap",
    label: "Inspection + trapping",
    description: "Wildlife inspection plus a raccoon trapping program.",
    serviceNames: ["Wildlife inspection", "Raccoon trapping program"],
  },
  {
    id: "exclusion-cleanup",
    label: "Exclusion + cleanup",
    description: "Squirrel exclusion with attic sanitation.",
    serviceNames: ["Squirrel exclusion", "Attic sanitation"],
  },
  {
    id: "one-way-followup",
    label: "One-way door",
    description: "One-way door install for active entry.",
    serviceNames: ["One-way door install"],
  },
  {
    id: "emergency-inspection",
    label: "Emergency + inspection",
    description: "Same-day emergency fee plus wildlife inspection.",
    serviceNames: ["Emergency same-day", "Wildlife inspection"],
  },
  {
    id: "rodent-program",
    label: "Rodent baiting",
    description: "Recurring rodent baiting visit.",
    serviceNames: ["Rodent baiting visit"],
  },
];

function findServiceByName(services: ServiceOption[], name: string) {
  const target = name.trim().toLowerCase();
  return services.find((service) => service.name.trim().toLowerCase() === target);
}

export function resolvePackageLines(pkg: QuotePackage, services: ServiceOption[]): LineDraft[] {
  return pkg.serviceNames
    .map((name) => findServiceByName(services, name))
    .filter((service): service is ServiceOption => Boolean(service))
    .map(serviceToLineDraft);
}

export function packageAvailability(pkg: QuotePackage, services: ServiceOption[]) {
  const missing = pkg.serviceNames.filter((name) => !findServiceByName(services, name));
  return { available: missing.length === 0, missing };
}
