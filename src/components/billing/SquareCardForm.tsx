"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";

export type SquarePublicConfig = {
  applicationId: string;
  locationId: string;
  sandbox: boolean;
  configured: boolean;
};

type SquarePayments = {
  card: () => Promise<{
    attach: (selector: string) => Promise<void>;
    tokenize: (details: Record<string, unknown>) => Promise<{
      status: string;
      token?: string;
    }>;
  }>;
};

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

export function SquareCardForm({
  invoiceId,
  amount,
  clientName,
  config,
  onPaid,
  onError,
}: {
  invoiceId: string;
  amount: number;
  clientName: string;
  config: SquarePublicConfig;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<Awaited<ReturnType<SquarePayments["card"]>> | null>(null);

  useEffect(() => {
    if (!config.configured) return;
    const src = config.sandbox
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js";
    let cancelled = false;

    async function attach() {
      if (!window.Square) return;
      const payments = await window.Square.payments(config.applicationId, config.locationId);
      const card = await payments.card();
      await card.attach("#square-card");
      if (cancelled) return;
      cardRef.current = card;
      setReady(true);
    }

    function start() {
      void attach();
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (window.Square) {
      start();
    } else if (existing) {
      existing.addEventListener("load", start);
    } else {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", start);
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [config]);

  async function charge() {
    if (!cardRef.current) return;
    setBusy(true);
    onError("");
    try {
      const names = clientName.split(" ");
      const tokenResult = await cardRef.current.tokenize({
        amount: amount.toFixed(2),
        currencyCode: "USD",
        intent: "CHARGE",
        customerInitiated: false,
        sellerKeyedIn: true,
        billingContact: {
          givenName: names[0] ?? "Customer",
          familyName: names.slice(1).join(" ") || "Account",
        },
      });
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        throw new Error("Card was not tokenized. Check the card details.");
      }
      const response = await fetch("/api/payments/square", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          sourceId: tokenResult.token,
          amount,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Square charge failed");
      onPaid();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Square charge failed");
    } finally {
      setBusy(false);
    }
  }

  if (!config.configured) {
    return (
      <div className="rounded-xl bg-background px-3 py-3 text-sm text-stone-600">
        Square card entry is off until the office adds{" "}
        <code className="text-xs">SQUARE_ACCESS_TOKEN</code>,{" "}
        <code className="text-xs">SQUARE_LOCATION_ID</code>, and{" "}
        <code className="text-xs">NEXT_PUBLIC_SQUARE_APPLICATION_ID</code>. You can still record a
        Terminal or POS payment by receipt number.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div id="square-card" className="rounded-xl border border-line bg-white p-3" />
      <button
        type="button"
        disabled={!ready || busy || !Number.isFinite(amount) || amount <= 0}
        onClick={charge}
        className="w-full rounded-lg bg-orange py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Charging Square…" : `Charge ${formatMoney(amount)} with Square`}
      </button>
    </div>
  );
}
