import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { clientName, formatMoney, formatPhone, propertyAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      properties: { include: { entryPoints: true, deployments: { include: { equipment: true } } } },
      jobs: { include: { technician: true }, orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-orange">Client</p>
        <h1 className="font-display text-3xl tracking-wide">{clientName(client)}</h1>
        <p className="text-stone-600">
          {formatPhone(client.phone)} · {client.email} · portal token {client.portalToken}
        </p>
        <Link href={`/portal/${client.portalToken}`} className="text-sm font-medium text-orange">
          Open client hub
        </Link>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        {client.properties.map((property) => (
          <article key={property.id} className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-semibold">{property.label}</h2>
            <p className="text-sm text-stone-600">{propertyAddress(property)}</p>
            <p className="mt-2 text-xs text-stone-500">
              {property.accessNotes ?? "No access notes"} · {property.petsOnSite ? "Pets on site" : "No pets noted"}
            </p>
            <p className="mt-3 text-sm">
              {property.entryPoints.length} entry points · {property.deployments.length} active/recent deployments
            </p>
          </article>
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <Panel title="Jobs">
          {client.jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block py-2 text-sm hover:text-orange">
              {job.number} · {job.title} <StatusBadge status={job.status} />
            </Link>
          ))}
        </Panel>
        <Panel title="Quotes">
          {client.quotes.map((quote) => (
            <p key={quote.id} className="py-2 text-sm">
              {quote.number} · {formatMoney(quote.total)} <StatusBadge status={quote.status} />
            </p>
          ))}
        </Panel>
        <Panel title="Invoices">
          {client.invoices.map((invoice) => (
            <p key={invoice.id} className="py-2 text-sm">
              {invoice.number} · {formatMoney(invoice.balance)} due <StatusBadge status={invoice.status} />
            </p>
          ))}
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </div>
  );
}
