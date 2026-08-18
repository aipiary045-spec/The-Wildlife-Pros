export function isTechnician(role: string) {
  return role === "TECHNICIAN";
}

export function homePath(role: string) {
  return isTechnician(role) ? "/field" : "/dashboard";
}

export const OFFICE_ONLY_PREFIXES = [
  "/dashboard",
  "/schedule",
  "/clients",
  "/quotes",
  "/calls",
  "/requests",
  "/invoices",
  "/reports",
  "/routes",
  "/team",
  "/exports",
];

export function isOfficeOnlyPath(pathname: string) {
  // Technicians can open invoice and quote detail for field billing (guarded on the page).
  if (pathname.startsWith("/invoices/") && pathname !== "/invoices") {
    return false;
  }
  if (pathname === "/quotes" || (pathname.startsWith("/quotes/") && !pathname.startsWith("/quotes/pricing"))) {
    return false;
  }
  return OFFICE_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/.")) return fallback;
  if (value.includes("\\") || value.toLowerCase().includes("well-known")) return fallback;
  return value;
}
