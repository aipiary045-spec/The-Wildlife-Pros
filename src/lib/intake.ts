import { isTechnician } from "@/lib/paths";

export const INTAKE_SOURCES = ["phone", "web", "walk-in", "referral"] as const;
export type IntakeSource = (typeof INTAKE_SOURCES)[number];

export const OPEN_REQUEST_STATUSES = ["NEW", "ASSESSED"] as const;

export function canManageIntake(role: string) {
  return !isTechnician(role);
}

export function requestIsOpen(status: string) {
  return status === "NEW" || status === "ASSESSED";
}

export function canConvertRequest(status: string) {
  return requestIsOpen(status);
}

export function phoneDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function telHref(phone?: string | null) {
  const digits = phoneDigits(phone);
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length >= 7) return `tel:${digits}`;
  return null;
}

export function phonesMatch(left?: string | null, right?: string | null) {
  const a = phoneDigits(left);
  const b = phoneDigits(right);
  if (a.length < 7 || b.length < 7) return false;
  return a.slice(-10) === b.slice(-10);
}

export function emailsMatch(left?: string | null, right?: string | null) {
  const a = (left ?? "").trim().toLowerCase();
  const b = (right ?? "").trim().toLowerCase();
  return Boolean(a && a === b);
}

export function streetsMatch(left?: string | null, right?: string | null) {
  const a = normalizeStreet(left);
  const b = normalizeStreet(right);
  return Boolean(a && a === b);
}

function normalizeStreet(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ");
}

export type IntakeMatchClient = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  properties: Array<{ id: string; address1: string; city: string }>;
};

export function findMatchingClient(
  clients: IntakeMatchClient[],
  input: { phone?: string; email?: string; clientId?: string },
) {
  if (input.clientId) return clients.find((client) => client.id === input.clientId) ?? null;
  if (input.phone) {
    const byPhone = clients.find(
      (client) => phonesMatch(client.phone, input.phone) || phonesMatch(client.altPhone, input.phone),
    );
    if (byPhone) return byPhone;
  }
  if (input.email) {
    return clients.find((client) => emailsMatch(client.email, input.email)) ?? null;
  }
  return null;
}

export function findMatchingProperty(client: IntakeMatchClient, address1?: string) {
  if (!address1?.trim()) return client.properties[0] ?? null;
  return client.properties.find((property) => streetsMatch(property.address1, address1)) ?? null;
}

export type IntakeInput = {
  clientId?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  title: string;
  details?: string;
  source: IntakeSource;
  preferredOn?: string;
};

export function parseIntakeBody(body: Record<string, unknown>): IntakeInput {
  const clientId = typeof body.clientId === "string" && body.clientId.trim() ? body.clientId.trim() : undefined;
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  if (!clientId && (!firstName || !lastName)) {
    throw new Error("Name the person on the line.");
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) throw new Error("What did they call about?");
  const address1 = typeof body.address1 === "string" ? body.address1.trim() : "";
  if (!clientId && !address1) {
    throw new Error("Need a street so we can quote or send a tech.");
  }
  const source =
    typeof body.source === "string" && (INTAKE_SOURCES as readonly string[]).includes(body.source)
      ? (body.source as IntakeSource)
      : "phone";
  const preferredOn =
    typeof body.preferredOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.preferredOn)
      ? body.preferredOn
      : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Charlotte";
  const state = typeof body.state === "string" && body.state.trim() ? body.state.trim() : "NC";
  const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : "";
  return {
    clientId,
    firstName,
    lastName,
    phone: phone || undefined,
    email: email || undefined,
    address1,
    city,
    state,
    postalCode: postalCode || "28200",
    title,
    details: details || undefined,
    source,
    preferredOn,
  };
}

export function parseRequestPatch(body: Record<string, unknown>) {
  const status = body.status;
  if (status === "ASSESSED" || status === "CLOSED" || status === "SPAM") return status;
  throw new Error("Mark it looked at, close it, or mark spam.");
}

export function parseConvertTarget(body: Record<string, unknown>) {
  if (body.to === "quote" || body.to === "job") return body.to;
  throw new Error("Turn this into a quote or a first trip.");
}
