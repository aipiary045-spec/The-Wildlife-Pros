import { isOfficeRole } from "@/lib/roles";
import { APP_TIMEZONE, dateKeyInZone } from "@/lib/timezone";

export const INTAKE_SOURCES = ["phone", "web", "walk-in", "referral"] as const;
export type IntakeSource = (typeof INTAKE_SOURCES)[number];

export const OPEN_REQUEST_STATUSES = ["NEW", "ASSESSED"] as const;

export function canManageIntake(role: string) {
  return isOfficeRole(role);
}

export function requestIsOpen(status: string) {
  return status === "NEW" || status === "ASSESSED";
}

export function partitionCallLog<T extends { status: string }>(items: T[]) {
  const open: T[] = [];
  const handled: T[] = [];
  for (const item of items) {
    if (requestIsOpen(item.status)) open.push(item);
    else handled.push(item);
  }
  return { open, handled };
}

export type CallLogDayGroup<T> = { dateKey: string; items: T[] };

export function groupCallsByDay<T extends { createdAt: string | Date }>(
  items: T[],
  timeZone = APP_TIMEZONE,
): CallLogDayGroup<T>[] {
  const groups: CallLogDayGroup<T>[] = [];
  const index = new Map<string, T[]>();
  for (const item of items) {
    const key = dateKeyInZone(new Date(item.createdAt), timeZone);
    let bucket = index.get(key);
    if (!bucket) {
      bucket = [];
      index.set(key, bucket);
      groups.push({ dateKey: key, items: bucket });
    }
    bucket.push(item);
  }
  return groups;
}

export function callLogDayHeading(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return "Today";
  const [year, month, day] = dateKey.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const diffDays = Math.round(
    (Date.UTC(todayYear, todayMonth - 1, todayDay) - Date.UTC(year, month - 1, day)) / 86_400_000,
  );
  if (diffDays === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatCallLoggedAt(value: string | Date, timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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
  properties: Array<{ id: string; address1: string; city: string; state?: string; postalCode?: string }>;
};

function normalizeName(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function phoneLooksLike(stored?: string | null, typed?: string | null) {
  const needle = phoneDigits(typed);
  const hay = phoneDigits(stored);
  if (needle.length < 3 || hay.length < 3) return false;
  return hay.endsWith(needle) || hay.includes(needle);
}

export function nameLooksLike(client: IntakeMatchClient, firstName?: string, lastName?: string) {
  const firstQuery = normalizeName(firstName);
  const lastQuery = normalizeName(lastName);
  if (firstQuery.length < 2 && lastQuery.length < 2) return false;
  const first = normalizeName(client.firstName);
  const last = normalizeName(client.lastName);
  const company = normalizeName(client.companyName);
  const full = `${first} ${last}`.trim();
  if (firstQuery && lastQuery) {
    return (
      (first.startsWith(firstQuery) && last.startsWith(lastQuery)) ||
      full.startsWith(`${firstQuery} ${lastQuery}`)
    );
  }
  if (firstQuery) {
    if (firstQuery.includes(" ")) return full.startsWith(firstQuery) || company.includes(firstQuery);
    return first.startsWith(firstQuery) || last.startsWith(firstQuery) || company.includes(firstQuery) || full.startsWith(firstQuery);
  }
  return last.startsWith(lastQuery) || last.includes(lastQuery);
}

export function searchClients(
  clients: IntakeMatchClient[],
  input: { phone?: string; firstName?: string; lastName?: string; email?: string; clientId?: string },
  options?: { limit?: number; ignoreIds?: Iterable<string> },
) {
  if (input.clientId) {
    const selected = clients.find((client) => client.id === input.clientId);
    return selected ? [selected] : [];
  }
  const ignored = new Set(options?.ignoreIds ?? []);
  const hits: Array<{ client: IntakeMatchClient; score: number }> = [];
  for (const client of clients) {
    if (ignored.has(client.id)) continue;
    const phoneHit = phoneLooksLike(client.phone, input.phone) || phoneLooksLike(client.altPhone, input.phone);
    const nameHit = nameLooksLike(client, input.firstName, input.lastName);
    const emailHit = Boolean(input.email && emailsMatch(client.email, input.email));
    if (!phoneHit && !nameHit && !emailHit) continue;
    const exactPhone = phonesMatch(client.phone, input.phone) || phonesMatch(client.altPhone, input.phone);
    hits.push({
      client,
      score: (exactPhone ? 0 : phoneHit ? 1 : 3) + (nameHit ? 0 : 1) + (emailHit ? 0 : 1),
    });
  }
  hits.sort((left, right) => left.score - right.score || left.client.lastName.localeCompare(right.client.lastName));
  return hits.slice(0, options?.limit ?? 8).map((hit) => hit.client);
}

export function canAutoFillClient(hits: IntakeMatchClient[], input: { phone?: string; firstName?: string; lastName?: string }) {
  if (hits.length !== 1) return false;
  if (phoneDigits(input.phone).length >= 7 && (phoneLooksLike(hits[0].phone, input.phone) || phoneLooksLike(hits[0].altPhone, input.phone))) {
    return true;
  }
  return normalizeName(input.firstName).length >= 2 && normalizeName(input.lastName).length >= 2;
}

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
    throw new Error("Need a street so we can send a tech.");
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
  if (body.to === "job") return body.to;
  throw new Error("Turn this into a first trip.");
}
