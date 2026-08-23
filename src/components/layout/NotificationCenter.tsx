"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { playEmergencyAlert, playRegularAlert } from "@/lib/alert-sounds";
import { notificationAlertTone, notificationIdSet } from "@/lib/notification-alerts";
import type { NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [stealingJobId, setStealingJobId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications?: NotificationItem[] };
      const next = data.notifications ?? [];
      const tone = notificationAlertTone(seenIdsRef.current, next, !bootstrappedRef.current);
      if (tone === "emergency") void playEmergencyAlert();
      else if (tone === "regular") void playRegularAlert();
      seenIdsRef.current = notificationIdSet(next);
      bootstrappedRef.current = true;
      setItems(next);
    } catch {
      // Offline: keep the last list.
    }
  }, []);

  const stealEmergencyJob = useCallback(
    async (jobId: string) => {
      setStealingJobId(jobId);
      try {
        const response = await fetch(`/api/emergency-dispatch/${jobId}/steal`, {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) return;
        setOpen(false);
        router.push(`/jobs/${jobId}`);
        router.refresh();
      } finally {
        setStealingJobId(null);
      }
    },
    [router],
  );

  useEffect(() => {
    void load();
    const hasOpenEmergency = items.some(
      (item) => item.kind === "emergency_dispatch" && !item.title.toLowerCase().includes("acknowledged"),
    );
    const intervalMs = hasOpenEmergency ? 15_000 : 60_000;
    const timer = window.setInterval(() => void load(), intervalMs);
    const onReturn = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [load, items]);

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

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
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
        <>
          <button
            type="button"
            aria-label="Close alerts"
            className="fixed inset-0 z-40 bg-black/25 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-xl",
              "fixed inset-x-4 top-[max(4.25rem,calc(env(safe-area-inset-top)+4rem))]",
              "max-h-[calc(100dvh-env(safe-area-inset-top)-4.25rem-4.5rem-env(safe-area-inset-bottom))]",
              "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[min(calc(100vw-2rem),22rem)]",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
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
              <p className="px-4 py-6 text-sm text-stone-500">
                Nothing waiting right now. Late check-ins, return trips, and office follow-ups show up here.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto sm:max-h-[min(24rem,70dvh)]">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-line last:border-b-0">
                    {item.stealJobId ? (
                      <button
                        type="button"
                        disabled={stealingJobId === item.stealJobId}
                        onClick={() => void stealEmergencyJob(item.stealJobId!)}
                        className="block w-full px-4 py-3 text-left hover:bg-background disabled:opacity-60"
                      >
                        <p className="text-sm font-semibold">
                          {item.urgency === "high" ? <span className="mr-1 text-orange">●</span> : null}
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-600">
                          {stealingJobId === item.stealJobId ? "Stealing job…" : item.body}
                        </p>
                      </button>
                    ) : (
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
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
