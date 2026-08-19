"use client";

import { useState } from "react";

export function CalendarFeedLink({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadFeed() {
    if (feedUrl || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/calendar/token?userId=${encodeURIComponent(userId)}`, {
        credentials: "include",
      });
      const data = (await response.json()) as { feedUrl?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not load calendar link.");
        return;
      }
      if (data.feedUrl) setFeedUrl(data.feedUrl);
    } catch {
      setError("Could not load calendar link.");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await loadFeed();
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => void toggle()}
        className="text-xs font-medium text-muted-soft hover:text-orange"
        aria-expanded={open}
      >
        {open ? "Hide calendar link" : "Subscribe in calendar"}
      </button>
      {open ? (
        <div className="mt-2 rounded-xl border border-line bg-panel p-3 text-left">
          <p className="text-sm font-semibold">Google Calendar or Outlook</p>
          <p className="mt-1 text-xs text-muted-soft">
            Paste this private link as a calendar subscription. It shows your next 90 days of assigned jobs.
          </p>
          {loading ? <p className="mt-3 text-sm text-muted-soft">Loading…</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          {feedUrl ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={feedUrl}
                className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                className="rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white"
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
