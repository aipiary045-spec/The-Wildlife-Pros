import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({
    include: { client: true, property: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Quotes</h1>
        <p className="text-stone-600">Send estimates clients can approve in the hub.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
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
                  <p className="font-medium">{quote.number}</p>
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
