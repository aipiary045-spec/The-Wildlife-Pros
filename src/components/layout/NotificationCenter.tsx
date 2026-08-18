"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Phone } from "lucide-react";
import type { NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function NotificationCenter({ showIntake = false }: { showIntake?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [newCalls, setNewCalls] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications?: NotificationItem[]; newCalls?: number };
      setItems(data.notifications ?? []);
      setNewCalls(data.newCalls ?? 0);
    } catch {
      // Offline: keep the last list.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const onReturn = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = items.length;
  const onCallLog = pathname === "/calls" || pathname.startsWith("/calls/");

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {showIntake ? (
        <Link
          href="/calls"
          aria-label={newCalls ? `${newCalls} calls still need a next step` : "Call log"}
          title="Call log"
          className={cn(
            "relative flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-white px-2.5 sm:px-3",
            onCallLog ? "text-orange" : "text-ink",
          )}
        >
          <Phone size={18} />
          <span className="hidden text-sm font-semibold sm:inline">Call log</span>
          {newCalls > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-orange px-1 text-center text-[10px] font-bold leading-4 text-white">
              {newCalls > 9 ? "9+" : newCalls}
            </span>
          ) : null}
        </Link>
      ) : null}
      <button
        type="button"
        aria-label={count ? `${count} alerts` : "Alerts"}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink"
      >
        <Bell size={18} />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-orange px-1 text-center text-[10px] font-bold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange">Alerts</p>
              <p className="text-sm text-stone-600">{count ? `${count} need attention` : "You're caught up"}</p>
            </div>
            <button
              type="button"
              aria-label="Close alerts"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-stone-500 hover:bg-background hover:text-ink"
            >
              ×
            </button>
          </div>
          {count === 0 ? (
            <p className="px-4 py-6 text-sm text-stone-500">Nothing waiting right now. Late check-ins, return trips, and office follow-ups show up here.</p>
          ) : (
            <ul className="max-h-[min(24rem,70dvh)] overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-background"
                  >
                    <p className="text-sm font-semibold">
                      {item.urgency === "high" ? <span className="mr-1 text-orange">●</span> : null}
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-600">{item.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
