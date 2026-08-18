"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateInvoiceButton({
  jobId,
  quoteId,
  disabled,
  label = "Create invoice",
}: {
  jobId?: string;
  quoteId?: string;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (disabled) return null;

  async function create() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/invoices", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quoteId ? { quoteId } : { jobId }),
    });
    const data = (await response.json()) as { invoice?: { id: string }; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not create the invoice.");
      return;
    }
    router.refresh();
    if (data.invoice?.id) router.push(`/invoices/${data.invoice.id}`);
  }

  return (
    <div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void create()}
        className="min-h-11 w-full rounded-lg bg-orange px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
      >
        {saving ? "Creating…" : label}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (status !== "DRAFT") return null;

  async function send() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not mark this invoice sent.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void send()}
        className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60"
      >
        {saving ? "Saving…" : "Mark sent"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
