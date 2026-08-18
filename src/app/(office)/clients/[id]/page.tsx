import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientEditor } from "@/components/crm/ClientEditor";
import { ClientPortalLink } from "@/components/crm/ClientPortalLink";
import { ClientSpeciesCard } from "@/components/crm/ClientSpeciesCard";
import { PropertyEditor } from "@/components/crm/PropertyEditor";
import {
  ClientHubPanel,
  ClientPipeline,
  ClientQuickActions,
  ClientRecordRow,
  formatWhen,
} from "@/components/crm/ClientHub";
import { PinClientButton } from "@/components/crm/PinClientButton";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OPEN_REQUEST_STATUSES } from "@/lib/intake";
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

  const [captures, openCalls] = await Promise.all([
    listCaptureEvents({ clientId: id }),
    prisma.serviceRequest.count({
      where: { clientId: id, status: { in: [...OPEN_REQUEST_STATUSES] } },
    }),
  ]);
  const speciesSummary = summarizeCapturesBySpecies(captures);

  const openJobs = client.jobs.filter((job) => !["COMPLETED", "INVOICED", "CANCELLED"].includes(job.status));
  const openQuotes = client.quotes.filter((quote) => !["DECLINED", "CONVERTED", "VOID"].includes(quote.status));
  const openInvoices = client.invoices.filter(
    (invoice) => !["PAID", "VOID"].includes(invoice.status) && Number(invoice.balance) > 0,
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Clients", href: "/clients" },
          { label: clientName(client) },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">{clientName(client)}</h1>
          <p className="text-stone-600">
            {formatPhone(client.phone)} · {client.email}
          </p>
          <p className="text-sm text-stone-500">Billing is collected by staff in Square — clients do not log in to pay.</p>
        </div>
        <PinClientButton clientId={client.id} label={clientName(client)} />
      </div>

      <ClientPortalLink portalToken={client.portalToken} />

      <ClientQuickActions clientId={client.id} phone={client.phone} />
      <ClientPipeline
        openCalls={openCalls}
        quotes={client.quotes}
        jobs={client.jobs}
        invoices={client.invoices.map((invoice) => ({
          id: invoice.id,
          status: invoice.status,
          balance: Number(invoice.balance),
        }))}
      />

      <section id="open-work" className="grid gap-6 lg:grid-cols-2">
        <ClientHubPanel title="Open work" empty="No open quotes or work orders.">
          {openQuotes.map((quote) => (
            <ClientRecordRow
              key={quote.id}
              href={`/quotes/${quote.id}`}
              primary={`${quote.number} · ${quote.title}`}
              secondary={formatMoney(quote.total)}
              badge={<StatusBadge status={quote.status} />}
            />
          ))}
          {openJobs.map((job) => (
            <ClientRecordRow
              key={job.id}
              href={`/jobs/${job.id}`}
              primary={`${job.number} · ${job.title}`}
              secondary={formatWhen(job.scheduledStart)}
              badge={<StatusBadge status={job.status} />}
            />
          ))}
        </ClientHubPanel>

        <ClientHubPanel title="Money" empty="No open invoices.">
          {openInvoices.map((invoice) => (
            <ClientRecordRow
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              primary={invoice.number}
              secondary={`${formatMoney(invoice.balance)} due`}
              badge={<StatusBadge status={invoice.status} />}
            />
          ))}
        </ClientHubPanel>
      </section>

      <ClientEditor client={client} />
      <ClientSpeciesCard captures={captures} />
      {speciesSummary.length > 0 ? (
        <p className="text-sm text-stone-600">
          Species totals:{" "}
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
          <div key={property.id} className="space-y-3">
            <PropertyEditor property={property} />
            <NavigateLink
              destination={{
                address: propertyAddress(property),
                lat: property.lat,
                lng: property.lng,
              }}
            />
            <p className="px-1 text-sm text-stone-600">
              {property.entryPoints.length} entry points · {property.deployments.length} active/recent deployments
            </p>
            <Link href="/activity" className="inline-block px-1 text-sm font-semibold text-orange hover:underline">
              Office species log
            </Link>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <ClientHubPanel title="All work orders" empty="No work orders yet.">
          {client.jobs.map((job) => (
            <ClientRecordRow
              key={job.id}
              href={`/jobs/${job.id}`}
              primary={`${job.number} · ${job.title}`}
              badge={<StatusBadge status={job.status} />}
            />
          ))}
        </ClientHubPanel>
        <ClientHubPanel title="All quotes" empty="No quotes yet.">
          {client.quotes.map((quote) => (
            <ClientRecordRow
              key={quote.id}
              href={`/quotes/${quote.id}`}
              primary={`${quote.number} · ${formatMoney(quote.total)}`}
              badge={<StatusBadge status={quote.status} />}
            />
          ))}
        </ClientHubPanel>
        <ClientHubPanel title="All invoices" empty="No invoices yet.">
          {client.invoices.map((invoice) => (
            <ClientRecordRow
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              primary={`${invoice.number} · ${formatMoney(invoice.balance)} due`}
              badge={<StatusBadge status={invoice.status} />}
            />
          ))}
        </ClientHubPanel>
      </section>
    </div>
  );
}
