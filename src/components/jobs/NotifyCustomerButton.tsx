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
  emphasized = false,
  className,
}: {
  jobId: string;
  clientPhone?: string | null;
  smsHref?: string | null;
  autoSendSms?: boolean;
  compact?: boolean;
  emphasized?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const buttonClass = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 font-semibold shadow-sm transition disabled:opacity-50",
    emphasized
      ? "border-sky-500 bg-sky-100 text-sky-950 hover:bg-sky-200"
      : "border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100",
    compact ? "flex-1 px-2 text-xs sm:text-sm" : "px-4 text-sm",
    className,
  );
  const label = "Text customer";

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
          <MessageCircle size={compact ? 16 : 18} />
          {label}
        </a>
        {notice && !compact ? <p className="text-sm text-stone-600">{notice}</p> : null}
      </div>
    );
  }

  return (
    <div className={compact ? "contents" : "space-y-2"}>
      <button type="button" disabled={busy} onClick={() => void handleClick()} className={buttonClass}>
        <MessageCircle size={compact ? 16 : 18} />
        {busy ? "Sending…" : label}
      </button>
      {notice && !compact ? <p className="text-sm text-stone-600">{notice}</p> : null}
    </div>
  );
}
