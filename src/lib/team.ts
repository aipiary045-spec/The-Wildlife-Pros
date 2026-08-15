export const TEAM_MANAGER_ROLES = ["OWNER", "ADMIN", "DISPATCHER"] as const;
export const ALL_ROLES = ["OWNER", "ADMIN", "DISPATCHER", "TECHNICIAN", "ACCOUNTING"] as const;

export type TeamActor = { id: string; role: string };
export type TeamTarget = { id: string; role: string; status: string };

export function canManageTeam(role: string) {
  return (TEAM_MANAGER_ROLES as readonly string[]).includes(role);
}

export function rolesActorCanAssign(actorRole: string): string[] {
  if (actorRole === "OWNER") return [...ALL_ROLES];
  if (actorRole === "ADMIN") return ["ADMIN", "DISPATCHER", "TECHNICIAN", "ACCOUNTING"];
  if (actorRole === "DISPATCHER") return ["TECHNICIAN"];
  return [];
}

export function canAssignRole(actorRole: string, role: string) {
  return rolesActorCanAssign(actorRole).includes(role);
}

export function canChangeUser(
  actor: TeamActor,
  target: TeamTarget,
  action: "disable" | "enable" | "edit",
  activeOwnerCount: number,
) {
  if (!canManageTeam(actor.role)) return false;
  if (actor.role === "DISPATCHER" && target.role !== "TECHNICIAN") return false;
  if (actor.role === "ADMIN" && target.role === "OWNER") return false;
  if (action === "disable") {
    if (actor.id === target.id) return false;
    if (target.role === "OWNER" && target.status === "ACTIVE" && activeOwnerCount <= 1) return false;
  }
  return true;
}

export function parseCreateUserBody(body: Record<string, unknown>) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "TECHNICIAN";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const color = typeof body.color === "string" && body.color.trim() ? body.color.trim() : "#E85D04";
  const homeAddress = typeof body.homeAddress === "string" ? body.homeAddress.trim() : "";
  if (!email || !firstName || !lastName) {
    throw new Error("First name, last name, and email are required.");
  }
  if (!email.includes("@")) throw new Error("Enter a valid email.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!(ALL_ROLES as readonly string[]).includes(role)) throw new Error("Unknown role.");
  return { email, firstName, lastName, password, role, phone, color, homeAddress };
}
