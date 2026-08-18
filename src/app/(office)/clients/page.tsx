import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewClientButton } from "@/components/crm/NewClientDialog";
import { ClientList } from "@/components/crm/ClientList";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { properties: true, _count: { select: { jobs: true, invoices: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">Clients</h1>
          <p className="text-stone-600">CRM with multiple service addresses per customer.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/calls"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold"
          >
            Call log
          </Link>
          <NewClientButton />
        </div>
      </div>
      <ClientList clients={clients} />
    </div>
  );
}
