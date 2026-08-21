export const ALL_ROLES = ["ADMIN", "TECHNICIAN"] as const;

export function isOfficeRole(role: string) {
  return role === "ADMIN";
}

export function isTechnicianRole(role: string) {
  return role === "TECHNICIAN";
}
