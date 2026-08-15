import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewClientButton } from "@/components/crm/NewClientDialog";
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">Clients</h1>
          <p className="text-stone-600">CRM with multiple service addresses per customer.</p>
        </div>
        <NewClientButton />
      </div>
      <div className="space-y-2 md:hidden">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="block rounded-2xl border border-line bg-panel p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{clientName(client)}</p>
                <p className="text-sm text-stone-600">{formatPhone(client.phone)}</p>
                <p className="text-xs text-stone-500">
                  {client.properties.length} propert{client.properties.length === 1 ? "y" : "ies"} · {client._count.jobs}{" "}
                  job{client._count.jobs === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={client.status} />
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
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
