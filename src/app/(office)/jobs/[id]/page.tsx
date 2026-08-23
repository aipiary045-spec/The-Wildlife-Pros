import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { JobTrapsCard } from "@/components/jobs/JobTrapsCard";
import { JobEntryPointsCard } from "@/components/jobs/JobEntryPointsCard";
import { JobPhotosCard } from "@/components/jobs/JobPhotosCard";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
import { JobQuoteBillingBanner } from "@/components/jobs/JobQuoteBillingBanner";
import { NotifyCustomerButton } from "@/components/jobs/NotifyCustomerButton";
import { JobSpeciesCard } from "@/components/jobs/JobSpeciesCard";
import { JobEditor } from "@/components/jobs/JobEditor";
import { CreateInvoiceButton } from "@/components/billing/InvoiceActions";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { canAccessJobInFieldView } from "@/lib/paths";
import { getAppContext } from "@/lib/app-context";
import { canBillJob } from "@/lib/billing-access";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { visitActionForStatus } from "@/lib/job-visit";
import { jobNotifyProps } from "@/lib/messaging";
import { quoteBillingAction } from "@/lib/quotes";
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
      exclusions: { include: { entryPoint: true } },
      photos: { include: { entryPoint: true } },
      invoices: true,
      sourceJob: true,
      quote: {
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          total: true,
          invoices: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      trips: { orderBy: { scheduledStart: "asc" } },
      emergencyDispatch: true,
    },
  });
  if (!job) notFound();
  const context = await getAppContext();
  const session = context?.session ?? null;
  const techView = Boolean(context?.fieldView);
  const canBill = session ? canBillJob(session, job) : false;
  const quoteInvoice = job.quote?.invoices[0] ?? null;
  const quoteBilling = job.quote
    ? quoteBillingAction(
        job.quote,
        quoteInvoice ? { balance: Number(quoteInvoice.balance) } : null,
      )
    : null;
  const showQuoteBanner = Boolean(techView && job.quote && quoteBilling);
  const notify = jobNotifyProps(job, session?.firstName);
  if (session && !canAccessJobInFieldView(session, job, techView)) notFound();

  const [stock, allGear, species, technicians, openCheckIn] = await Promise.all([
    prisma.equipment.findMany({
      where: { status: { in: ["IN_INVENTORY", "RETRIEVED"] } },
      orderBy: { serialNumber: "asc" },
    }),
    prisma.equipment.findMany({ select: { serialNumber: true } }),
    prisma.species.findMany({ orderBy: { commonName: "asc" }, select: { id: true, commonName: true } }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "ADMIN"] } },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, color: true },
    }),
    session
      ? prisma.timeEntry.findFirst({
          where: { userId: session.id, jobId: job.id, endedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const checkedInHere = Boolean(openCheckIn);
  let displayStatus = job.status;
  if (checkedInHere && visitActionForStatus(job.status) !== "check-out") {
    const repaired = await prisma.job.update({
      where: { id: job.id },
      data: { status: "ON_SITE", technicianId: job.technicianId ?? session!.id },
    });
    displayStatus = repaired.status;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: techView ? "My work orders" : "Work orders", href: "/jobs" },
          { label: clientName(job.client), href: techView ? undefined : `/clients/${job.clientId}` },
          { label: job.number },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange">{job.number}</p>
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
          <StatusBadge status={displayStatus} />
          <StatusBadge status={job.type} label={JOB_TYPE_LABEL[job.type]} />
          <JobVisitControls
            jobId={job.id}
            status={displayStatus}
            checkedIn={checkedInHere}
            technicianId={job.technicianId}
            technicians={technicians}
            species={species}
            deployments={job.deployments.map((item) => ({
              id: item.id,
              equipment: { serialNumber: item.equipment.serialNumber },
            }))}
          />
          {notify ? (
            <NotifyCustomerButton
              jobId={notify.jobId}
              clientPhone={notify.clientPhone}
              smsHref={notify.smsHref}
              autoSendSms={notify.autoSendSms}
              emphasized={job.type === "EMERGENCY"}
            />
          ) : null}
          {canBill ? (
            <CreateInvoiceButton jobId={job.id} disabled={job.status !== "COMPLETED" || job.invoices.length > 0} />
          ) : null}
          {techView || !job.quote || showQuoteBanner ? null : quoteInvoice ? (
            <Link
              href={`/invoices/${quoteInvoice.id}`}
              className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white inline-flex items-center"
            >
              {Number(quoteInvoice.balance) > 0 ? "Collect payment" : "View invoice"}
            </Link>
          ) : quoteBilling === "create" ? (
            <CreateInvoiceButton quoteId={job.quote.id} label="Create invoice" />
          ) : null}
        </div>
      </div>
      {showQuoteBanner && job.quote ? (
        <JobQuoteBillingBanner
          quote={{
            id: job.quote.id,
            number: job.quote.number,
            title: job.quote.title,
            total: Number(job.quote.total),
          }}
          invoice={quoteInvoice ? { id: quoteInvoice.id, balance: Number(quoteInvoice.balance) } : null}
          action={quoteBilling}
        />
      ) : null}
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
        {canBill || (job.quote && !techView) ? (
          <Card title="Value">
            <p className="font-display text-2xl">{formatMoney(job.total)}</p>
            <p className="text-sm text-stone-600">Tax {formatMoney(job.taxAmount)}</p>
            {techView || !job.quote ? null : (
              <Link href={`/quotes/${job.quote.id}`} className="mt-2 block text-sm font-medium text-orange">
                Quote {job.quote.number}
              </Link>
            )}
            {[...(quoteInvoice ? [quoteInvoice] : []), ...job.invoices.filter((item) => item.id !== quoteInvoice?.id)].map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="mt-2 block text-sm font-medium text-orange">
                {techView ? "Take payment" : "Collect"} · {invoice.number ?? "Invoice"} · {formatMoney(invoice.balance)} due
              </Link>
            ))}
          </Card>
        ) : null}
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
        {techView ? null : (
          <>
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
            <JobSpeciesCard
              jobId={job.id}
              captures={job.captures}
              species={species}
              deployments={job.deployments.map((item) => ({
                id: item.id,
                equipment: { serialNumber: item.equipment.serialNumber },
              }))}
            />
            <JobEntryPointsCard
              jobId={job.id}
              propertyId={job.propertyId}
              entryPoints={job.entryPoints}
              exclusions={job.exclusions}
            />
            <JobEditor job={job} technicians={technicians} />
          </>
        )}
        {techView && job.captures.length ? (
          <Card title="Captures this job">
            {job.captures.map((capture) => (
              <p key={capture.id} className="py-1 text-sm">
                {capture.quantity}× {capture.species.commonName} · {capture.disposition.replaceAll("_", " ").toLowerCase()}
              </p>
            ))}
          </Card>
        ) : null}
      </section>
      <JobPhotosCard
        jobId={job.id}
        propertyId={job.propertyId}
        photos={job.photos}
        entryPoints={job.entryPoints.map((item) => ({ id: item.id, label: item.label }))}
      />
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
