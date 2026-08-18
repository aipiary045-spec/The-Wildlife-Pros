export const RECENT_STORAGE_KEY = "critterops-recent-v1";
export const PINNED_STORAGE_KEY = "critterops-pinned-v1";

export type RecentEntry = {
  href: string;
  label: string;
  kind: "client" | "job" | "quote" | "invoice" | "page";
  at: number;
};

export function pushRecent(entries: RecentEntry[], next: Omit<RecentEntry, "at">, limit = 8) {
  const at = Date.now();
  const without = entries.filter((entry) => entry.href !== next.href);
  return [{ ...next, at }, ...without].slice(0, limit);
}

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
