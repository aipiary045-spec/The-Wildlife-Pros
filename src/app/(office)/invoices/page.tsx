import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, job: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Invoices</h1>
        <p className="text-stone-600">Generate from completed jobs and track balances.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Total / balance</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{invoice.number}</p>
                  <p className="text-xs text-stone-500">{invoice.job?.number ?? "Manual"}</p>
                </td>
                <td className="px-4 py-3">{clientName(invoice.client)}</td>
                <td className="px-4 py-3">
                  {formatMoney(invoice.total)} / {formatMoney(invoice.balance)}
                </td>
                <td className="px-4 py-3">{invoice.dueOn ? format(invoice.dueOn, "MMM d") : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
