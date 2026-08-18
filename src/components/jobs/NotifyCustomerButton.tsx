"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function NotifyCustomerButton({
  jobId,
  clientPhone,
}: {
  jobId: string;
  clientPhone?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [fallback, setFallback] = useState<{ sms: string | null; message: string } | null>(null);

  async function notify() {
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/jobs/${jobId}/notify`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json()) as {
      sent?: boolean;
      error?: string | null;
      fallback?: { sms: string | null; message: string };
    };
    setBusy(false);
    if (data.sent) {
      setNotice("Text sent — customer knows you're on the way.");
      setFallback(null);
      return;
    }
    setFallback(data.fallback ?? null);
    setNotice(data.error ?? "Open Messages to send from your phone.");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy || !clientPhone}
        onClick={() => void notify()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-50"
      >
        <MessageCircle size={16} />
        {busy ? "Sending…" : "Text: on the way"}
      </button>
      {!clientPhone ? <p className="text-xs text-stone-500">Add a phone number on the client to text them.</p> : null}
      {notice ? <p className="text-sm text-stone-600">{notice}</p> : null}
      {fallback?.sms ? (
        <a href={fallback.sms} className="inline-block text-sm font-semibold text-orange">
          Open in Messages
        </a>
      ) : null}
    </div>
  );
}
