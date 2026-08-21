import { isOfficeRole, isTechnicianRole } from "@/lib/roles";

export const VIEW_MODE_COOKIE = "critterops_view_mode";

export type ViewMode = "office" | "field";

function normalizedRole(role: string) {
  if (role === "OWNER" || role === "DISPATCHER" || role === "ACCOUNTING") return "ADMIN";
  return role;
}

export function canSwitchViewMode(role: string) {
  return normalizedRole(role) === "ADMIN";
}

export function readViewMode(value: string | undefined): ViewMode {
  return value === "field" ? "field" : "office";
}

export function isFieldView(role: string, viewMode: ViewMode = "office") {
  if (isTechnicianRole(role)) return true;
  return isOfficeRole(role) && viewMode === "field";
}

export function navRole(role: string, viewMode: ViewMode = "office") {
  return isFieldView(role, viewMode) ? "TECHNICIAN" : role;
}

export function homePathFor(role: string, viewMode: ViewMode = "office") {
  return isFieldView(role, viewMode) ? "/field" : "/dashboard";
}

export function viewModeCookieOptions(source?: Request | Headers) {
  const headerList = source instanceof Request ? source.headers : source;
  const forwarded = headerList?.get("x-forwarded-proto") ?? "";
  const host = headerList?.get("host") ?? "";
  const cfVisitor = headerList?.get("cf-visitor") ?? "";
  const viaCloudflare = Boolean(headerList?.get("cf-ray") || headerList?.get("cf-connecting-ip"));
  const urlSecure = source instanceof Request ? new URL(source.url).protocol === "https:" : false;
  const localHost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const httpsHint =
    urlSecure ||
    viaCloudflare ||
    forwarded.split(",")[0]?.trim() === "https" ||
    cfVisitor.includes("https") ||
    (!localHost && host.length > 0);
  const secure = process.env.NODE_ENV === "production" || httpsHint;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
