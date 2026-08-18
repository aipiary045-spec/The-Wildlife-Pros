"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageLabel } from "@/lib/nav";
import { pushRecent, recentFromPath, RECENT_STORAGE_KEY, type RecentEntry } from "@/lib/recent";

export function RecentTracker({ role }: { role: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const entry = recentFromPath(pathname, pageLabel(pathname, role));
    if (!entry) return;
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const current = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
      const next = pushRecent(current, entry);
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("critterops-recent"));
    } catch {
      // Private mode or blocked storage.
    }
  }, [pathname, role]);

  return null;
}
