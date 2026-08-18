import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { JobTrapsCard } from "@/components/jobs/JobTrapsCard";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
import { JobCaptureForm } from "@/components/jobs/JobCaptureForm";
import { JobEditor } from "@/components/jobs/JobEditor";
import { RecurringForm } from "@/components/jobs/RecurringForm";
import { CreateInvoiceButton } from "@/components/billing/InvoiceActions";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { BackLink } from "@/components/layout/BackLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { DISPOSITION_LABEL, JOB_TYPE_LABEL } from "@/lib/constants";
import { isTechnician } from "@/lib/paths";
import { clientName, formatMoney, propertyAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      technician: true,
      lineItems: true,
      deployments: { include: { equipment: true, checks: true } },
      captures: { include: { species: true } },
      entryPoints: true,
      exclusions: true,
      photos: { include: { entryPoint: true } },
      invoices: true,
      sourceJob: true,
      trips: { orderBy: { scheduledStart: "asc" } },
    },
  });
  if (!job) notFound();
  const session = await getSession();
  const techView = Boolean(session && isTechnician(session.role));
  if (techView && job.technicianId && job.technicianId !== session?.id) notFound();

  const [stock, allGear, species, technicians] = await Promise.all([
    prisma.equipment.findMany({
      where: { status: { in: ["IN_INVENTORY", "RETRIEVED"] } },
      orderBy: { serialNumber: "asc" },
    }),
    prisma.equipment.findMany({ select: { serialNumber: true } }),
    prisma.species.findMany({ orderBy: { commonName: "asc" }, select: { id: true, commonName: true } }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "OWNER", "ADMIN", "DISPATCHER"] } },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, color: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink href="/jobs" label={techView ? "My jobs" : "Work orders"} />
          <p className="mt-2 text-xs uppercase tracking-widest text-orange">{job.number}</p>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">{job.title}</h1>
          <p className="text-stone-600">
            {clientName(job.client)} · {propertyAddress(job.property)}
          </p>
          <NavigateLink
            className="mt-3"
            destination={{
              address: propertyAddress(job.property),
              lat: job.property.lat,
              lng: job.property.lng,
            }}
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <StatusBadge status={job.status} />
          <StatusBadge status={job.type} label={JOB_TYPE_LABEL[job.type]} />
          <JobVisitControls
            jobId={job.id}
            status={job.status}
            technicianId={job.technicianId}
            technicians={technicians}
          />
          {techView ? null : (
            <CreateInvoiceButton jobId={job.id} disabled={job.status !== "COMPLETED" || job.invoices.length > 0} />
          )}
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Visit">
          <p>{job.scheduledStart ? format(job.scheduledStart, "PPP p") : "Unscheduled"}</p>
          <p className="text-sm text-stone-600">
            {job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "Unassigned"} ·{" "}
            {job.durationMin} min
          </p>
          {job.sourceJob ? (
            <Link href={`/jobs/${job.sourceJob.id}`} className="mt-2 block text-sm font-medium text-orange">
              First trip {job.sourceJob.number}
            </Link>
          ) : null}
          {job.trips.length ? (
            <div className="mt-2 space-y-1 text-sm">
              {job.trips.map((trip) => (
                <Link key={trip.id} href={`/jobs/${trip.id}`} className="block font-medium text-orange">
                  Later trip {trip.number}
                  {trip.scheduledStart ? ` · ${format(trip.scheduledStart, "MMM d")}` : ""}
                </Link>
              ))}
            </div>
          ) : null}
        </Card>
        {techView ? null : (
          <Card title="Value">
            <p className="font-display text-2xl">{formatMoney(job.total)}</p>
            <p className="text-sm text-stone-600">Tax {formatMoney(job.taxAmount)}</p>
            {job.invoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="mt-2 block text-sm font-medium text-orange">
                Collect {invoice.number} via Square · {formatMoney(invoice.balance)} due
              </Link>
            ))}
          </Card>
        )}
        <Card title="Instructions">
          <p className="text-sm">{job.instructions ?? "No special instructions."}</p>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        {techView ? null : (
          <Card title="Line items">
            {job.lineItems.map((item) => (
              <p key={item.id} className="flex justify-between py-1 text-sm">
                <span>
                  {item.name} × {Number(item.quantity)}
                </span>
                <span>{formatMoney(Number(item.quantity) * Number(item.unitPrice))}</span>
              </p>
            ))}
          </Card>
        )}
        <JobTrapsCard
          jobId={job.id}
          stock={stock.map((item) => ({
            id: item.id,
            serialNumber: item.serialNumber,
            name: item.name,
            type: item.type,
            status: item.status,
          }))}
          deployments={job.deployments}
          serials={allGear.map((item) => item.serialNumber)}
          species={species.map((item) => item.commonName)}
        />
        <Card title="Species activity">
          {job.captures.map((capture) => (
            <p key={capture.id} className="py-1 text-sm">
              {capture.quantity} {capture.species.commonName} · {DISPOSITION_LABEL[capture.disposition]}
            </p>
          ))}
          <div className="mt-4 border-t border-line pt-4">
            <JobCaptureForm
              jobId={job.id}
              species={species}
              deployments={job.deployments.map((item) => ({
                id: item.id,
                equipment: { serialNumber: item.equipment.serialNumber },
              }))}
            />
          </div>
        </Card>
        {techView ? null : (
          <>
            <JobEditor job={job} technicians={technicians} />
            <Card title="Recurring / return visits">
              <RecurringForm jobId={job.id} />
            </Card>
          </>
        )}
        {job.exclusions.length > 0 ? (
          <Card title="Exclusion">
            {job.exclusions.map((work) => (
              <p key={work.id} className="py-1 text-sm">
                {work.material} {work.quantity ? `· ${work.quantity}` : ""}
              </p>
            ))}
          </Card>
        ) : null}
      </section>
      <Card title="Photo documentation">
        <div className="grid gap-3 sm:grid-cols-3">
          {job.photos.map((photo) => (
            <figure key={photo.id} className="overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption ?? photo.kind} className="h-36 w-full object-cover" />
              <figcaption className="px-3 py-2 text-xs">
                {photo.kind} {photo.entryPoint ? `· ${photo.entryPoint.label}` : ""} · {photo.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
