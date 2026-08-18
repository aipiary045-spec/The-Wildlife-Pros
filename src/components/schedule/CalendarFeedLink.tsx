"use client";

import { useEffect, useState } from "react";

export function CalendarFeedLink({ userId }: { userId: string }) {
  const [feedUrl, setFeedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/calendar/token?userId=${encodeURIComponent(userId)}`, {
          credentials: "include",
        });
        const data = (await response.json()) as { feedUrl?: string; error?: string };
        if (!response.ok) {
          if (!cancelled) setError(data.error ?? "Could not load calendar link.");
          return;
        }
        if (!cancelled && data.feedUrl) setFeedUrl(data.feedUrl);
      } catch {
        if (!cancelled) setError("Could not load calendar link.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (error) return <p className="text-sm text-rose-700">{error}</p>;
  if (!feedUrl) return <p className="text-sm text-stone-500">Loading calendar link…</p>;

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-sm font-semibold">Subscribe in Google Calendar or Outlook</p>
      <p className="mt-1 text-xs text-stone-500">
        Paste this private link as a calendar subscription. It shows your next 90 days of assigned jobs.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={feedUrl} className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs" />
        <button
          type="button"
          className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(feedUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              setError("Could not copy — select the link and copy manually.");
            }
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
