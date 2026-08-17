import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { NewQuoteButton } from "@/components/quotes/QuoteForm";
import { QuotesSubnav } from "@/components/quotes/QuotesSubnav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const [quotes, clients, services] = await Promise.all([
    prisma.quote.findMany({
      include: { client: true, property: true },
      orderBy: { createdAt: "desc" },
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">Quotes</h1>
          <p className="text-stone-600">Send estimates clients can approve in the hub, then convert to a job.</p>
        </div>
        <NewQuoteButton
          clients={clients}
          services={services.map((item) => ({
            id: item.id,
            name: item.name,
            unitPrice: Number(item.unitPrice),
            taxable: item.taxable,
          }))}
        />
      </div>
      <QuotesSubnav current="quotes" />
      <div className="space-y-2 md:hidden">
        {quotes.map((quote) => (
          <Link key={quote.id} href={`/quotes/${quote.id}`} className="block rounded-2xl border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{quote.number}</p>
                <p className="text-sm text-stone-600">{clientName(quote.client)}</p>
                <p className="text-xs text-stone-500">
                  {formatMoney(quote.total)} · valid {quote.validUntil ? format(quote.validUntil, "MMM d") : "—"}
                </p>
              </div>
              <StatusBadge status={quote.status} />
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Quote</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Valid</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/quotes/${quote.id}`} className="font-medium hover:text-orange">
                    {quote.number}
                  </Link>
                  <p className="text-xs text-stone-500">{quote.title}</p>
                </td>
                <td className="px-4 py-3">
                  {clientName(quote.client)}
                  <p className="text-xs text-stone-500">{quote.property?.address1}</p>
                </td>
                <td className="px-4 py-3">{formatMoney(quote.total)}</td>
                <td className="px-4 py-3">{quote.validUntil ? format(quote.validUntil, "MMM d") : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={quote.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
