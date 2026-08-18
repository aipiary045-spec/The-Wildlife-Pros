import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientEditor } from "@/components/crm/ClientEditor";
import { ClientSpeciesCard } from "@/components/crm/ClientSpeciesCard";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { BackLink } from "@/components/layout/BackLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listCaptureEvents, summarizeCapturesBySpecies } from "@/lib/species-log";
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

  const captures = await listCaptureEvents({ clientId: id });
  const speciesSummary = summarizeCapturesBySpecies(captures);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/clients" label="Clients" />
        <h1 className="mt-2 font-display text-2xl tracking-wide md:text-3xl">{clientName(client)}</h1>
        <p className="text-stone-600">
          {formatPhone(client.phone)} · {client.email}
        </p>
        <p className="text-sm text-stone-500">Billing is collected by staff in Square — clients do not log in to pay.</p>
      </div>
      <ClientEditor client={client} />
      <ClientSpeciesCard captures={captures} />
      {speciesSummary.length > 0 ? (
        <p className="text-sm text-stone-600">
          Totals for {clientName(client)}:{" "}
          {speciesSummary.map((item, index) => (
            <span key={item.name}>
              {index > 0 ? " · " : ""}
              {item.count} {item.name}
            </span>
          ))}
        </p>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2">
        {client.properties.map((property) => (
          <article key={property.id} className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-semibold">{property.label}</h2>
            <p className="text-sm text-stone-600">{propertyAddress(property)}</p>
            <NavigateLink
              className="mt-3"
              destination={{
                address: propertyAddress(property),
                lat: property.lat,
                lng: property.lng,
              }}
            />
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
        <Panel title="Work orders">
          {client.jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block py-2 text-sm hover:text-orange">
              {job.number} · {job.title} <StatusBadge status={job.status} />
            </Link>
          ))}
        </Panel>
        <Panel title="Quotes">
          {client.quotes.map((quote) => (
            <Link key={quote.id} href={`/quotes/${quote.id}`} className="block py-2 text-sm hover:text-orange">
              {quote.number} · {formatMoney(quote.total)} <StatusBadge status={quote.status} />
            </Link>
          ))}
        </Panel>
        <Panel title="Invoices">
          {client.invoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block py-2 text-sm hover:text-orange">
              {invoice.number} · {formatMoney(invoice.balance)} due <StatusBadge status={invoice.status} />
            </Link>
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
