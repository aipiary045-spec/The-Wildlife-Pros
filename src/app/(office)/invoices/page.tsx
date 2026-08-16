import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { groupInvoicesByAge } from "@/lib/invoice-aging";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, job: true },
    orderBy: { dueOn: "asc" },
  });
  const grouped = groupInvoicesByAge(
    invoices.map((invoice) => ({ ...invoice, balance: Number(invoice.balance) })),
  );
  const sections = [
    { key: "pastDue", title: "Past due", items: grouped.pastDue },
    { key: "due", title: "Due", items: grouped.due },
    { key: "notYetDue", title: "Not yet due", items: grouped.notYetDue },
    { key: "draft", title: "Drafts", items: grouped.draft },
    { key: "paid", title: "Paid", items: grouped.paid },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Invoices</h1>
        <p className="text-stone-600">
          Staff collect through Square. Sorted by whether money is not yet due, due today, or past due.
        </p>
      </div>
      {sections.map((section) =>
        section.items.length === 0 ? null : (
          <section key={section.key} className="space-y-2">
            <h2 className="font-semibold">{section.title}</h2>
            <div className="space-y-2 md:hidden">
              {section.items.map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block rounded-2xl border border-line bg-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{invoice.number}</p>
                      <p className="text-sm text-stone-600">{clientName(invoice.client)}</p>
                      <p className="text-xs text-stone-500">
                        {formatMoney(invoice.total)} · {formatMoney(invoice.balance)} due{" "}
                        {invoice.dueOn ? format(invoice.dueOn, "MMM d") : "—"}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                </Link>
              ))}
            </div>
            <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
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
                  {section.items.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${invoice.id}`} className="font-medium hover:text-orange">
                          {invoice.number}
                        </Link>
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
          </section>
        ),
      )}
    </div>
  );
}
