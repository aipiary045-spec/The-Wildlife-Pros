"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PINNED_STORAGE_KEY, RECENT_STORAGE_KEY, parsePinned, type PinnedClient, type RecentEntry } from "@/lib/recent";

export function RecentPanel({ title = "Recently viewed" }: { title?: string }) {
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [pinned, setPinned] = useState<PinnedClient[]>([]);

  useEffect(() => {
    function load() {
      try {
        const recentRaw = window.localStorage.getItem(RECENT_STORAGE_KEY);
        const pinnedRaw = window.localStorage.getItem(PINNED_STORAGE_KEY);
        setRecent(recentRaw ? (JSON.parse(recentRaw) as RecentEntry[]) : []);
        setPinned(parsePinned(pinnedRaw));
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
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pinned</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pinned.map((item) => (
              <Link
                key={item.id}
                href={`/clients/${item.id}`}
                className="rounded-full border border-orange/40 bg-orange/10 px-3 py-1.5 text-sm font-medium text-orange hover:bg-orange/15"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {recent.length > 0 ? (
        <div className={pinned.length > 0 ? "mt-4" : "mt-3"}>
          {pinned.length > 0 ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Recent</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
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
        </div>
      ) : null}
    </section>
  );
}
