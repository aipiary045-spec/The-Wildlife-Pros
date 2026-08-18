export const RECENT_STORAGE_KEY = "critterops-recent-v1";
export const PINNED_STORAGE_KEY = "critterops-pinned-v1";

export type RecentEntry = {
  href: string;
  label: string;
  kind: "client" | "job" | "quote" | "invoice" | "page";
  at: number;
};

export type PinnedClient = {
  id: string;
  label: string;
};

export function pushRecent(entries: RecentEntry[], next: Omit<RecentEntry, "at">, limit = 8) {
  const at = Date.now();
  const without = entries.filter((entry) => entry.href !== next.href);
  return [{ ...next, at }, ...without].slice(0, limit);
}

export function parsePinned(raw: string | null): PinnedClient[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    if (parsed.length === 0) return [];
    if (typeof parsed[0] === "string") {
      return parsed.map((id) => ({ id: String(id), label: "Client" }));
    }
    return parsed
      .filter((item): item is PinnedClient => Boolean(item && typeof item === "object" && "id" in item))
      .map((item) => ({
        id: String((item as PinnedClient).id),
        label: String((item as PinnedClient).label || "Client"),
      }));
  } catch {
    return [];
  }
}

export function togglePinnedClients(list: PinnedClient[], clientId: string, label: string) {
  const existing = list.find((item) => item.id === clientId);
  if (existing) return list.filter((item) => item.id !== clientId);
  return [...list, { id: clientId, label }];
}

/** @deprecated use togglePinnedClients */
export function togglePinned(ids: string[], clientId: string) {
  return ids.includes(clientId) ? ids.filter((id) => id !== clientId) : [...ids, clientId];
}

export function recentPathname(pathname: string) {
  if (pathname === "/more" || pathname === "/login" || pathname === "/dashboard") return null;
  return pathname;
}

export function recentFromPath(pathname: string, label: string): Omit<RecentEntry, "at"> | null {
  const client = pathname.match(/^\/clients\/([^/]+)$/);
  if (client) return { href: pathname, label, kind: "client" };
  const job = pathname.match(/^\/jobs\/([^/]+)$/);
  if (job) return { href: pathname, label, kind: "job" };
  const quote = pathname.match(/^\/quotes\/([^/]+)$/);
  if (quote) return { href: pathname, label, kind: "quote" };
  const invoice = pathname.match(/^\/invoices\/([^/]+)$/);
  if (invoice) return { href: pathname, label, kind: "invoice" };
  return null;
}
