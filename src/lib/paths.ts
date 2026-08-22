import type { ViewMode } from "@/lib/view-mode";
import { homePathFor, isFieldView } from "@/lib/view-mode";
import { isTechnicianRole } from "@/lib/roles";

export function isTechnician(role: string) {
  return isTechnicianRole(role);
}

export function homePath(role: string, viewMode: ViewMode = "office") {
  return homePathFor(role, viewMode);
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

export function shouldBlockOfficePath(role: string, pathname: string, viewMode: ViewMode = "office") {
  return isFieldView(role, viewMode) && isOfficeOnlyPath(pathname);
}

/** Technicians in field view may only open jobs assigned to them; admins in field view may open any job. */
export function canAccessJobInFieldView(
  session: { id: string; role: string },
  job: { technicianId: string | null },
  fieldView: boolean,
) {
  if (!fieldView) return true;
  if (!isTechnician(session.role)) return true;
  if (!job.technicianId) return true;
  return job.technicianId === session.id;
}

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/.")) return fallback;
  if (value.includes("\\") || value.toLowerCase().includes("well-known")) return fallback;
  return value;
}
