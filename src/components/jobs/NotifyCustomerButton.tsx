"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { JobNotifyKind } from "@/lib/messaging";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<JobNotifyKind, string> = {
  en_route: "On the way",
  on_site: "Arrived",
  complete: "Visit done",
};

const TEMPLATE_KINDS: JobNotifyKind[] = ["en_route", "on_site", "complete"];

export function NotifyCustomerButton({
  jobId,
  clientPhone,
  smsHref,
  autoSendSms = false,
  compact = false,
  emphasized = false,
  kind = "en_route",
  alreadyNotified = false,
  className,
}: {
  jobId: string;
  clientPhone?: string | null;
  smsHref?: string | null;
  autoSendSms?: boolean;
  compact?: boolean;
  emphasized?: boolean;
  kind?: JobNotifyKind;
  alreadyNotified?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [texted, setTexted] = useState(alreadyNotified);

  const buttonClass = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 font-semibold shadow-sm transition disabled:opacity-50",
    emphasized
      ? "border-sky-500 bg-sky-100 text-sky-950 hover:bg-sky-200"
      : "border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100",
    compact ? "px-2 text-xs sm:text-sm" : "px-4 text-sm",
    className,
  );
  const mutedClass = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-stone-200 bg-stone-100 font-semibold text-stone-500",
    compact ? "w-full px-2 text-xs sm:text-sm" : "px-4 text-sm",
  );
  const smallClass = cn(
    "inline-flex min-h-9 items-center justify-center rounded-lg border-2 px-3 text-xs font-semibold shadow-sm transition disabled:opacity-50",
    emphasized
      ? "border-sky-500 bg-sky-100 text-sky-950 hover:bg-sky-200"
      : "border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100",
  );

  async function sendFromApp(notifyKind: JobNotifyKind, force = false) {
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/jobs/${jobId}/notify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: notifyKind, force }),
    });
    const data = (await response.json()) as {
      sent?: boolean;
      alreadyNotified?: boolean;
      error?: string | null;
      fallback?: { sms?: string | null };
    };
    setBusy(false);
    if (data.alreadyNotified || (data.sent && notifyKind === "en_route")) setTexted(true);
    if (data.sent) {
      setNotice(compact ? "Sent" : "Text sent.");
      return { ok: true as const, fallbackSms: null };
    }
    return {
      ok: false as const,
      alreadyNotified: Boolean(data.alreadyNotified),
      error: data.error ?? "Could not send automatically.",
      fallbackSms: data.fallback?.sms ?? null,
    };
  }

  async function handleClick(notifyKind: JobNotifyKind, force = false) {
    if (!clientPhone) return;

    if (autoSendSms || !smsHref || notifyKind !== "en_route" || force) {
      const result = await sendFromApp(notifyKind, force);
      if (result.ok) return;
      if ("alreadyNotified" in result && result.alreadyNotified && !force) {
        setNotice(result.error);
        return;
      }
      if (result.fallbackSms && notifyKind === "en_route") {
        window.location.href = result.fallbackSms;
        return;
      }
      if (smsHref && notifyKind === "en_route") {
        window.location.href = smsHref;
        return;
      }
      setNotice(result.error);
      return;
    }

    window.location.href = smsHref;
  }

  if (!clientPhone) {
    if (compact) return null;
    return <p className="text-xs text-stone-500">Add a phone number on the client to text them.</p>;
  }

  if (compact) {
    if (texted) {
      return (
        <div className={cn("flex flex-1 flex-col items-stretch gap-1", className)}>
          <span className={mutedClass}>Texted</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleClick("en_route", true)}
            className="text-center text-[11px] font-medium text-sky-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send again"}
          </button>
        </div>
      );
    }

    if (!autoSendSms && smsHref) {
      return (
        <a href={smsHref} className={cn(buttonClass, "flex-1")}>
          <MessageCircle size={16} />
          Text customer
        </a>
      );
    }

    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleClick(kind)}
        className={cn(buttonClass, "flex-1")}
      >
        <MessageCircle size={16} />
        {busy ? "Sending…" : "Text customer"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {texted ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={mutedClass}>Texted</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleClick("en_route", true)}
            className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send again"}
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_KINDS.map((templateKind) => {
          if (templateKind === "en_route" && texted) return null;
          return (
            <button
              key={templateKind}
              type="button"
              disabled={busy}
              onClick={() => void handleClick(templateKind)}
              className={smallClass}
            >
              <MessageCircle size={14} className="mr-1.5" />
              {busy ? "…" : KIND_LABELS[templateKind]}
            </button>
          );
        })}
      </div>
      {notice ? <p className="text-sm text-stone-600">{notice}</p> : null}
    </div>
  );
}
