"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function DayNotifyButton({
  jobIds,
  className,
}: {
  jobIds: string[];
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const disabled = busy || jobIds.length === 0;

  async function handleClick() {
    if (disabled) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/jobs/notify-day", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });
      const data = (await response.json()) as {
        sent?: number;
        skipped?: number;
        failed?: number;
        error?: string;
      };
      if (!response.ok) {
        setNotice(data.error ?? "Could not text customers.");
        return;
      }
      const parts = [
        `${data.sent ?? 0} sent`,
        (data.skipped ?? 0) > 0 ? `${data.skipped} already texted` : null,
        (data.failed ?? 0) > 0 ? `${data.failed} failed` : null,
      ].filter(Boolean);
      setNotice(parts.join(" · "));
    } catch {
      setNotice("Could not text customers.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleClick()}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-100 disabled:opacity-50"
      >
        <MessageCircle size={18} />
        {busy ? "Texting…" : "Text customers on this route"}
      </button>
      {notice ? <p className="mt-2 text-sm text-stone-600">{notice}</p> : null}
    </div>
  );
}
