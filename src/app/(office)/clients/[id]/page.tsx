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
import { NavigateLink } from "@/components/maps/NavigateLink";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listCaptureEvents, summarizeCapturesBySpecies } from "@/lib/species-log";
import { clientName, formatPhone, propertyAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      properties: { include: { entryPoints: true, deployments: { include: { equipment: true } } } },
      jobs: { include: { technician: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  const captures = await listCaptureEvents({ clientId: id });
  const speciesSummary = summarizeCapturesBySpecies(captures);

  const openJobs = client.jobs.filter((job) => !["COMPLETED", "INVOICED", "CANCELLED"].includes(job.status));

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
        </div>
      </div>

      <ClientPortalLink portalToken={client.portalToken} />

      <ClientQuickActions clientId={client.id} />
      <ClientPipeline jobs={client.jobs} />

      <section id="open-work">
        <ClientHubPanel title="Open work" empty="No open work orders.">
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

      <section>
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
      </section>
    </div>
  );
}
