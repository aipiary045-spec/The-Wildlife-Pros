"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function NotifyCustomerButton({
  jobId,
  clientPhone,
  smsHref,
  autoSendSms = false,
}: {
  jobId: string;
  clientPhone?: string | null;
  smsHref?: string | null;
  autoSendSms?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const buttonClass =
    "inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold transition hover:border-orange/35 hover:text-orange disabled:opacity-50";

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
      setNotice("Text sent.");
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
    return <p className="text-xs text-stone-500">Add a phone number on the client to text them.</p>;
  }

  if (!autoSendSms && smsHref) {
    return (
      <div className="space-y-2">
        <a href={smsHref} className={buttonClass}>
          <MessageCircle size={16} />
          Text customer
        </a>
        {notice ? <p className="text-sm text-stone-600">{notice}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" disabled={busy} onClick={() => void handleClick()} className={buttonClass}>
        <MessageCircle size={16} />
        {busy ? "Sending…" : "Text customer"}
      </button>
      {notice ? <p className="text-sm text-stone-600">{notice}</p> : null}
    </div>
  );
}
