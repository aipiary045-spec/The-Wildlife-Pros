"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotifyCustomerButton({
  jobId,
  clientPhone,
  smsHref,
  autoSendSms = false,
  compact = false,
  className,
}: {
  jobId: string;
  clientPhone?: string | null;
  smsHref?: string | null;
  autoSendSms?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const buttonClass = cn(
    compact
      ? "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-2 text-xs font-semibold transition hover:border-orange/35 hover:text-orange disabled:opacity-50 sm:text-sm"
      : "inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold transition hover:border-orange/35 hover:text-orange disabled:opacity-50",
    className,
  );
  const label = compact ? "Text" : "Text customer";

  async function sendFromApp() {
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/jobs/${jobId}/notify`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json()) as {
      sent?: boolean;
      error?: string | null;
    };
    setBusy(false);
    if (data.sent) {
      setNotice(compact ? "Sent" : "Text sent.");
      return true;
    }
    setNotice(data.error ?? "Could not send automatically.");
    return false;
  }

  async function handleClick() {
    if (!clientPhone) return;
    if (autoSendSms) {
      const sent = await sendFromApp();
      if (sent) return;
    }
    if (smsHref) {
      window.location.href = smsHref;
    }
  }

  if (!clientPhone) {
    if (compact) return null;
    return <p className="text-xs text-stone-500">Add a phone number on the client to text them.</p>;
  }

  if (!autoSendSms && smsHref) {
    return (
      <div className={compact ? "contents" : "space-y-2"}>
        <a href={smsHref} className={buttonClass}>
          <MessageCircle size={compact ? 14 : 16} />
          {label}
        </a>
        {notice && !compact ? <p className="text-sm text-stone-600">{notice}</p> : null}
      </div>
    );
  }

  return (
    <div className={compact ? "contents" : "space-y-2"}>
      <button type="button" disabled={busy} onClick={() => void handleClick()} className={buttonClass}>
        <MessageCircle size={compact ? 14 : 16} />
        {busy ? "Sending…" : label}
      </button>
      {notice && !compact ? <p className="text-sm text-stone-600">{notice}</p> : null}
    </div>
  );
}
