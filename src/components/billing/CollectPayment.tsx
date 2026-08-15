"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SquareCardForm, type SquarePublicConfig } from "@/components/billing/SquareCardForm";
import { formatMoney } from "@/lib/utils";

export function CollectPayment({
  invoiceId,
  balance,
  clientName,
  squareConfig,
}: {
  invoiceId: string;
  balance: number;
  clientName: string;
  squareConfig: SquarePublicConfig;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState<"SQUARE" | "CASH" | "CHECK">("SQUARE");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function recordManual() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
        notes:
          method === "SQUARE"
            ? "Recorded from Square Terminal / POS"
            : `Collected on site (${method.toLowerCase()})`,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not record payment");
      return;
    }
    setNotice("Payment recorded.");
    router.refresh();
  }

  if (balance <= 0) {
    return <p className="text-sm text-emerald-800">This invoice is paid in full.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Clients pay through Square — Terminal on the truck, POS in the office, or a card keyed here by
        staff. They never log into CritterOps to pay.
      </p>
      <label className="block text-sm">
        Amount
        <input
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2 text-sm">
        {(["SQUARE", "CASH", "CHECK"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMethod(item)}
            className={`rounded-full px-3 py-1 ${
              method === item ? "bg-ink text-white" : "bg-background text-stone-700"
            }`}
          >
            {item === "SQUARE" ? "Square" : item === "CASH" ? "Cash" : "Check"}
          </button>
        ))}
      </div>
      {method === "SQUARE" ? (
        <div className="space-y-3">
          <SquareCardForm
            invoiceId={invoiceId}
            amount={Number(amount)}
            clientName={clientName}
            config={squareConfig}
            onPaid={() => {
              setNotice("Square payment captured.");
              router.refresh();
            }}
            onError={setError}
          />
          <p className="text-xs text-stone-500">
            Already took it on a Square Terminal? Record the receipt below — no card form needed.
          </p>
          <label className="block text-sm">
            Square receipt / payment ID
            <input
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. Square receipt #1042"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={recordManual}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Saving…" : `Record ${formatMoney(amount)} from Terminal`}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            Reference
            <input
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={method === "CHECK" ? "Check number" : "Optional note"}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={recordManual}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : `Record ${formatMoney(amount)}`}
          </button>
        </div>
      )}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
    </div>
  );
}
