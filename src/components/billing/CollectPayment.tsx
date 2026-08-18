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
  const [squareMode, setSquareMode] = useState<"terminal" | "keyed">("terminal");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function recordPayment(notes: string) {
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
        notes,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not record payment");
      return;
    }
    setNotice("Payment recorded.");
    setReference("");
    router.refresh();
  }

  if (balance <= 0) {
    return <p className="text-sm text-emerald-800">This invoice is paid in full.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Clients pay through Square — Terminal on the truck, POS in the office, or a card keyed here by staff.
        They never log into CritterOps to pay.
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
        <div className="space-y-4 rounded-xl border border-orange/30 bg-orange/5 p-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => setSquareMode("terminal")}
              className={`rounded-full px-3 py-1.5 font-semibold ${
                squareMode === "terminal" ? "bg-orange text-white" : "border border-line bg-white text-stone-700"
              }`}
            >
              Terminal / POS
            </button>
            <button
              type="button"
              onClick={() => setSquareMode("keyed")}
              className={`rounded-full px-3 py-1.5 font-semibold ${
                squareMode === "keyed" ? "bg-orange text-white" : "border border-line bg-white text-stone-700"
              }`}
            >
              Key card here
            </button>
          </div>
          {squareMode === "terminal" ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-700">
                Run the charge on your Square Terminal or in-store POS, then paste the receipt number below.
              </p>
              <label className="block text-sm font-medium">
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
                disabled={busy || !reference.trim()}
                onClick={() => void recordPayment("Recorded from Square Terminal / POS")}
                className="min-h-11 w-full rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Saving…" : `Record ${formatMoney(amount)} from Terminal`}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stone-700">Office staff can key the card when the customer is on the phone.</p>
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
            </div>
          )}
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
            onClick={() => void recordPayment(`Collected on site (${method.toLowerCase()})`)}
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
