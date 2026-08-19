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
    <section className="card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {pinned.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-soft">Pinned</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pinned.map((item) => (
              <Link key={item.id} href={`/clients/${item.id}`} className="chip chip-accent">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {recent.length > 0 ? (
        <div className={pinned.length > 0 ? "mt-4" : "mt-3"}>
          {pinned.length > 0 ? (
            <p className="text-xs font-medium text-muted-soft">Recent</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.slice(0, 6).map((item) => (
              <Link key={item.href} href={item.href} className="chip">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
