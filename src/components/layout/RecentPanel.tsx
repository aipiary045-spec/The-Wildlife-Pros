"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PINNED_STORAGE_KEY, RECENT_STORAGE_KEY, type RecentEntry } from "@/lib/recent";

export function RecentPanel({ title = "Recently viewed" }: { title?: string }) {
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    function load() {
      try {
        const recentRaw = window.localStorage.getItem(RECENT_STORAGE_KEY);
        const pinnedRaw = window.localStorage.getItem(PINNED_STORAGE_KEY);
        setRecent(recentRaw ? (JSON.parse(recentRaw) as RecentEntry[]) : []);
        setPinned(pinnedRaw ? (JSON.parse(pinnedRaw) as string[]) : []);
      } catch {
        setRecent([]);
        setPinned([]);
      }
    }
    load();
    window.addEventListener("critterops-recent", load);
    window.addEventListener("critterops-pinned", load);
    return () => {
      window.removeEventListener("critterops-recent", load);
      window.removeEventListener("critterops-pinned", load);
    };
  }, []);

  if (recent.length === 0 && pinned.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="font-semibold">{title}</h2>
      {pinned.length > 0 ? (
        <p className="mt-2 text-xs text-stone-500">
          Pinned: {pinned.length} client{pinned.length === 1 ? "" : "s"} — open a client and tap Pin.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {recent.slice(0, 6).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-line bg-background px-3 py-1.5 text-sm font-medium hover:border-orange hover:text-orange"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
