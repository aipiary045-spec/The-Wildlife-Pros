export function isTechnician(role: string) {
  return role === "TECHNICIAN";
}

export function homePath(role: string) {
  return isTechnician(role) ? "/field" : "/schedule";
}

export const OFFICE_ONLY_PREFIXES = [
  "/dashboard",
  "/schedule",
  "/clients",
  "/quotes",
  "/requests",
  "/invoices",
  "/reports",
  "/routes",
  "/team",
  "/exports",
];

export function isOfficeOnlyPath(pathname: string) {
  return OFFICE_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function safeNextPath(value: string | null | undefined, fallback = "/schedule") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/.")) return fallback;
  if (value.includes("\\") || value.toLowerCase().includes("well-known")) return fallback;
  return value;
}
