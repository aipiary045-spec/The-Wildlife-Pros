"use client";

import Link from "next/link";
import { CreateInvoiceButton } from "@/components/billing/InvoiceActions";
import type { QuoteBillingAction } from "@/lib/quotes";
import { formatMoney } from "@/lib/utils";

export function JobQuoteBillingBanner({
  quote,
  invoice,
  action,
}: {
  quote: { id: string; number: string; title: string; total: number };
  invoice?: { id: string; balance: number } | null;
  action: QuoteBillingAction;
}) {
  if (!action) return null;

  return (
    <section className="rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/10 to-panel p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-orange">Collect on site</p>
          <h2 className="mt-1 font-display text-xl tracking-wide md:text-2xl">
            {action === "pay" || action === "paid" ? "Invoice ready" : "Bill from quote"}
          </h2>
          <p className="mt-1 text-sm text-stone-700">
            <span className="font-semibold">{quote.number}</span> · {quote.title}
          </p>
          <p className="mt-1 font-display text-2xl text-ink">
            {action === "pay" || action === "paid"
              ? formatMoney(invoice?.balance ?? 0)
              : formatMoney(quote.total)}
            {action === "pay" ? <span className="ml-2 text-sm font-sans text-stone-600">due now</span> : null}
            {action === "paid" ? <span className="ml-2 text-sm font-sans text-emerald-800">paid in full</span> : null}
          </p>
          {action === "create" ? (
            <p className="mt-2 text-sm text-stone-600">
              Customer approved the quote. Turn it into an invoice, then take payment with Square on the truck.
            </p>
          ) : null}
          {action === "waiting" ? (
            <p className="mt-2 text-sm text-stone-600">Office still needs to send this quote to the customer before you can bill.</p>
          ) : null}
          {action === "pay" ? (
            <p className="mt-2 text-sm text-stone-600">Square card, Terminal receipt, cash, or check — collected by you, not the client hub.</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {action === "create" ? (
          <CreateInvoiceButton quoteId={quote.id} label="Turn quote into invoice" />
        ) : null}
        {action === "pay" && invoice ? (
          <Link
            href={`/invoices/${invoice.id}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-4 text-sm font-semibold text-white sm:flex-none"
          >
            Take payment
          </Link>
        ) : null}
        {action === "paid" && invoice ? (
          <Link
            href={`/invoices/${invoice.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold"
          >
            View receipt
          </Link>
        ) : null}
        <Link
          href={`/quotes/${quote.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-stone-700"
        >
          View quote
        </Link>
      </div>
    </section>
  );
}
