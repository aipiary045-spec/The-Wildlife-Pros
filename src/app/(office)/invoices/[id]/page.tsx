import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CollectPayment } from "@/components/billing/CollectPayment";
import { InvoiceActions } from "@/components/billing/InvoiceActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/prisma";
import { squarePublicConfig } from "@/lib/square";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      job: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { receivedOn: "desc" } },
    },
  });
  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange">{invoice.number}</p>
          <h1 className="font-display text-3xl tracking-wide">{clientName(invoice.client)}</h1>
          <p className="text-stone-600">
            {invoice.job?.number ?? "Manual invoice"}
            {invoice.dueOn ? ` · due ${format(invoice.dueOn, "MMM d")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={invoice.status} />
          <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
        </div>
      </div>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Line items</h2>
          {invoice.lineItems.map((item) => (
            <p key={item.id} className="flex justify-between py-1 text-sm">
              <span>
                {item.name} × {Number(item.quantity)}
              </span>
              <span>{formatMoney(Number(item.quantity) * Number(item.unitPrice))}</span>
            </p>
          ))}
          <div className="mt-4 border-t border-line pt-3 text-sm">
            <p className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(invoice.subtotal)}</span>
            </p>
            <p className="flex justify-between">
              <span>Tax</span>
              <span>{formatMoney(invoice.taxAmount)}</span>
            </p>
            <p className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(invoice.total)}</span>
            </p>
            <p className="flex justify-between text-orange">
              <span>Balance</span>
              <span>{formatMoney(invoice.balance)}</span>
            </p>
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Collect payment</h2>
          <CollectPayment
            invoiceId={invoice.id}
            balance={Number(invoice.balance)}
            clientName={clientName(invoice.client)}
            squareConfig={squarePublicConfig()}
          />
        </article>
      </section>
      <article className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-semibold">Payment history</h2>
        {invoice.payments.length === 0 ? <p className="text-sm text-stone-500">No payments yet.</p> : null}
        {invoice.payments.map((payment) => (
          <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-3 first:border-0">
            <div>
              <p className="font-medium">
                {formatMoney(payment.amount)} · {payment.method}
              </p>
              <p className="text-xs text-stone-500">
                {format(payment.receivedOn, "PPP p")}
                {payment.reference ? ` · ${payment.reference}` : ""}
              </p>
            </div>
            {payment.squareReceiptUrl ? (
              <a href={payment.squareReceiptUrl} className="text-sm font-medium text-orange" target="_blank" rel="noreferrer">
                Square receipt
              </a>
            ) : null}
          </div>
        ))}
      </article>
      {invoice.job ? (
        <Link href={`/jobs/${invoice.job.id}`} className="text-sm font-medium text-orange">
          Open related job
        </Link>
      ) : null}
    </div>
  );
}
