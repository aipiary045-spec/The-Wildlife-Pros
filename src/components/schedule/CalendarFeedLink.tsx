"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

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
    <section className="border-t border-line pt-5">
      <button
        type="button"
        onClick={() => void toggle()}
        className="btn-secondary min-h-11 w-full gap-2"
        aria-expanded={open}
      >
        <Calendar size={18} />
        {open ? "Hide calendar link" : "Subscribe in calendar"}
      </button>
      {open ? (
        <div className="mt-3 rounded-xl border border-line bg-panel p-4">
          <p className="text-sm font-semibold">Google Calendar or Outlook</p>
          <p className="mt-1 text-sm text-muted">
            Paste this private link as a calendar subscription. It shows your next 90 days of assigned jobs.
          </p>
          {loading ? <p className="mt-3 text-sm text-muted-soft">Loading…</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          {feedUrl ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={feedUrl}
                className="input-field text-xs"
              />
              <button
                type="button"
                className="btn-primary shrink-0 px-4 py-2 text-sm"
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
    </section>
  );
}
