import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { clientName, formatPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { properties: true, _count: { select: { jobs: true, invoices: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Clients</h1>
          <p className="text-stone-600">CRM with multiple service addresses per customer.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Properties</th>
              <th className="px-4 py-3">Jobs</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium hover:text-orange">
                    {clientName(client)}
                  </Link>
                  <p className="text-xs text-stone-500">{client.email}</p>
                </td>
                <td className="px-4 py-3">{formatPhone(client.phone)}</td>
                <td className="px-4 py-3">{client.properties.length}</td>
                <td className="px-4 py-3">{client._count.jobs}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={client.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
