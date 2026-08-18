import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { QuoteActions } from "@/components/quotes/QuoteActions";
import { EditQuoteButton } from "@/components/quotes/QuoteForm";
import { QuotesSubnav } from "@/components/quotes/QuotesSubnav";
import { BackLink } from "@/components/layout/BackLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { clientName, formatMoney, propertyAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: PageProps<"/quotes/[id]">) {
  const { id } = await params;
  const [quote, technicians, clients, services] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        property: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
        jobs: { select: { id: true, number: true, status: true } },
        invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "OWNER", "ADMIN", "DISPATCHER"] } },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, color: true },
    }),
    prisma.client.findMany({
      include: { properties: { select: { id: true, address1: true, city: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitPrice: true, taxable: true },
    }),
  ]);
  if (!quote) notFound();
  const session = await getSession();
  const techView = Boolean(session && isTechnician(session.role));
  const invoice = quote.invoices[0] ?? null;

  return (
    <div className="space-y-6">
      {techView ? null : <QuotesSubnav current="quotes" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink href="/quotes" label="Quotes" />
          <p className="mt-2 text-xs uppercase tracking-widest text-orange">{quote.number}</p>
          <h1 className="font-display text-3xl tracking-wide">{quote.title}</h1>
          <p className="text-stone-600">
            {clientName(quote.client)}
            {quote.property ? ` · ${propertyAddress(quote.property)}` : ""}
          </p>
          <p className="text-sm text-stone-500">
            Valid {quote.validUntil ? format(quote.validUntil, "PPP") : "—"}
            {quote.sentAt ? ` · sent ${format(quote.sentAt, "MMM d")}` : ""}
          </p>
          {techView ? null : (
            <Link href="/quotes/pricing" className="mt-2 inline-block text-sm font-semibold text-orange">
              Edit price list
            </Link>
          )}
        </div>
        <div className="space-y-2">
          <StatusBadge status={quote.status} />
          {techView || quote.status === "CONVERTED" ? null : (
            <EditQuoteButton
              clients={clients}
              services={services.map((item) => ({
                id: item.id,
                name: item.name,
                unitPrice: Number(item.unitPrice),
                taxable: item.taxable,
              }))}
              quote={{
                id: quote.id,
                title: quote.title,
                message: quote.message,
                validUntil: quote.validUntil,
                clientId: quote.clientId,
                propertyId: quote.propertyId,
                lineItems: quote.lineItems.map((item) => ({
                  name: item.name,
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unitPrice),
                  taxable: item.taxable,
                  serviceId: item.serviceId ?? undefined,
                })),
              }}
            />
          )}
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            technicians={technicians}
            portalToken={quote.client.portalToken}
            propertyId={quote.propertyId}
            techView={techView}
            invoice={invoice ? { id: invoice.id, balance: Number(invoice.balance) } : null}
          />
        </div>
      </div>
      {quote.message ? (
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-2 font-semibold">Message</h2>
          <p className="text-sm text-stone-600">{quote.message}</p>
        </article>
      ) : null}
      <article className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-semibold">Line items</h2>
        {quote.lineItems.map((item) => (
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
            <span>{formatMoney(quote.subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>Tax</span>
            <span>{formatMoney(quote.taxAmount)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(quote.total)}</span>
          </p>
        </div>
      </article>
      {quote.jobs.length > 0 ? (
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Work orders from this quote</h2>
          {quote.jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block py-1 text-sm font-medium text-orange">
              {job.number} <StatusBadge status={job.status} />
            </Link>
          ))}
        </article>
      ) : null}
      <Link href="/quotes" className="text-sm font-medium text-orange">
        Back to quotes
      </Link>
    </div>
  );
}
