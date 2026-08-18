"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy } from "lucide-react";

export function SendQuoteDialog({
  quoteId,
  quoteNumber,
  clientEmail,
  clientPhone,
  onClose,
}: {
  quoteId: string;
  quoteNumber: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<"email" | "sms" | "both">(clientPhone ? "sms" : "email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fallback, setFallback] = useState<{
    hubUrl: string;
    mailto: string | null;
    sms: string | null;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function deliver() {
    setBusy(true);
    setError("");
    setNotice("");
    const response = await fetch(`/api/quotes/${quoteId}/deliver`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const data = (await response.json()) as {
      error?: string;
      sentAutomatically?: boolean;
      delivered?: { email?: boolean; sms?: boolean };
      fallback?: { hubUrl: string; mailto: string | null; sms: string | null; message: string };
      errors?: string[];
    };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not send this quote.");
      return;
    }
    setFallback(data.fallback ?? null);
    if (data.sentAutomatically) {
      const parts = [];
      if (data.delivered?.email) parts.push("email");
      if (data.delivered?.sms) parts.push("text");
      setNotice(`Sent via ${parts.join(" and ")} and marked as sent.`);
      router.refresh();
      return;
    }
    setNotice("Marked as sent. Use the links below if automatic delivery is not configured.");
    router.refresh();
  }

  async function copyHub() {
    const url = fallback?.hubUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Send quote</p>
        <h2 className="mt-1 font-display text-2xl">{quoteNumber}</h2>
        <p className="mt-2 text-sm text-stone-600">
          Delivers the customer hub link so they can review line items and approve or decline.
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="channel"
              checked={channel === "sms"}
              onChange={() => setChannel("sms")}
              disabled={!clientPhone}
            />
            Text {clientPhone ? `(${clientPhone})` : "(no phone on file)"}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="channel"
              checked={channel === "email"}
              onChange={() => setChannel("email")}
              disabled={!clientEmail}
            />
            Email {clientEmail ? `(${clientEmail})` : "(no email on file)"}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="channel"
              checked={channel === "both"}
              onChange={() => setChannel("both")}
              disabled={!clientEmail || !clientPhone}
            />
            Both text and email
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-emerald-800">{notice}</p> : null}

        {fallback ? (
          <div className="mt-4 space-y-2 rounded-xl bg-background p-3 text-sm">
            <p className="break-all font-mono text-xs text-stone-600">{fallback.hubUrl}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyHub()}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold"
              >
                <Copy size={14} />
                {copied ? "Copied" : "Copy link"}
              </button>
              {fallback.sms ? (
                <a href={fallback.sms} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold">
                  Open in Messages
                </a>
              ) : null}
              {fallback.mailto ? (
                <a href={fallback.mailto} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold">
                  Open in email
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold">
            {fallback ? "Done" : "Cancel"}
          </button>
          {fallback ? null : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void deliver()}
              className="flex-1 rounded-lg bg-orange px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send to customer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
