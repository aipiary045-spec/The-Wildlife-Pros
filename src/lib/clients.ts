import { phoneDigits } from "@/lib/intake";

export type ClientSearchRecord = {
  firstName: string;
  lastName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  properties: Array<{ address1: string; city: string }>;
};

export function matchesClientSearch(client: ClientSearchRecord, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    client.firstName,
    client.lastName,
    `${client.firstName} ${client.lastName}`,
    client.companyName ?? "",
    client.email ?? "",
    ...client.properties.flatMap((property) => [property.address1, property.city]),
  ]
    .join(" ")
    .toLowerCase();
  if (hay.includes(needle)) return true;
  const digits = needle.replace(/\D/g, "");
  if (digits.length >= 3) {
    return phoneDigits(client.phone).includes(digits) || phoneDigits(client.altPhone).includes(digits);
  }
  return false;
}
