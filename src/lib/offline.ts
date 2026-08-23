export const MAX_OCCURRED_PAST_MS = 36 * 60 * 60 * 1000;
export const MAX_OCCURRED_FUTURE_MS = 2 * 60 * 1000;

export const CACHEABLE_FIELD_PREFIXES = [
  "/field",
  "/jobs",
  "/quotes",
  "/timesheets",
  "/more",
  "/time-off",
  "/inventory",
  "/activity",
];

export function parseOccurredAt(value: unknown, now = new Date()): Date {
  if (typeof value !== "string" || !value.trim()) return now;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return now;
  const delta = parsed.getTime() - now.getTime();
  if (delta > MAX_OCCURRED_FUTURE_MS) return now;
  if (delta < -MAX_OCCURRED_PAST_MS) return new Date(now.getTime() - MAX_OCCURRED_PAST_MS);
  return parsed;
}

export function requestPath(url: string) {
  const path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
  return path;
}

export function isQueueableFieldRequest(method: string, url: string) {
  const upper = method.toUpperCase();
  const path = requestPath(url);
  if (upper === "POST") {
    if (path === "/api/timesheets/clock") return true;
    if (path === "/api/species-logs") return true;
    if (path === "/api/deployments") return true;
    return /^\/api\/jobs\/[^/]+\/check-(?:in|out)$/.test(path);
  }
  if (upper === "PATCH" && path === "/api/deployments") return true;
  return false;
}

export function mutationLabel(url: string) {
  const path = requestPath(url);
  if (path === "/api/timesheets/clock") return "Clock";
  if (path === "/api/species-logs") return "Capture";
  if (path === "/api/deployments") return "Trap";
  if (path.endsWith("/check-in")) return "Check-in";
  if (path.endsWith("/check-out")) return "Check-out";
  return "Saved work";
}

export function isCacheableFieldPath(pathname: string) {
  return CACHEABLE_FIELD_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isCacheableApiGet(pathname: string) {
  if (pathname === "/api/timesheets/me") return true;
  if (pathname === "/api/jobs/late-checkin") return true;
  if (pathname === "/api/jobs") return true;
  if (/^\/api\/quotes\/[^/]+$/.test(pathname)) return true;
  return /^\/api\/jobs\/[^/]+$/.test(pathname);
}

export function withOccurredAt(method: string, init: RequestInit | undefined, nowIso: string): RequestInit {
  const upper = method.toUpperCase();
  if (upper === "GET" || upper === "HEAD") return { ...init };
  const raw = init?.body;
  if (raw instanceof FormData || raw instanceof Blob || raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
    return { ...init };
  }
  let payload: Record<string, unknown> = {};
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...init };
      payload = parsed as Record<string, unknown>;
    } catch {
      return { ...init };
    }
  } else if (raw != null) {
    return { ...init };
  }
  if (payload.occurredAt == null) payload.occurredAt = nowIso;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return { ...init, headers, body: JSON.stringify(payload) };
}

export function queuedPayload() {
  return { queued: true, offline: true as const };
}
