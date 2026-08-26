import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { JobTrapsCard } from "@/components/jobs/JobTrapsCard";
import { JobEntryPointsCard } from "@/components/jobs/JobEntryPointsCard";
import { JobPhotosCard } from "@/components/jobs/JobPhotosCard";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
import { JobCheckoutPanel } from "@/components/jobs/JobCheckoutPanel";
import { JobFieldWorkGate } from "@/components/jobs/JobFieldWorkGate";
import { JobVisitProvider } from "@/components/jobs/JobVisitGate";
import { NotifyCustomerButton } from "@/components/jobs/NotifyCustomerButton";
import { JobSpeciesCard } from "@/components/jobs/JobSpeciesCard";
import { JobEditor } from "@/components/jobs/JobEditor";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { canAccessJobInFieldView } from "@/lib/paths";
import { getAppContext } from "@/lib/app-context";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { visitActionForStatus } from "@/lib/job-visit";
import { jobNotifyProps, portalHubUrl } from "@/lib/messaging";
import { TripVisitBadge } from "@/components/jobs/TripVisitBadge";
import { tripRootId, tripVisitForJob } from "@/lib/job-trips";
import { nextFieldStop } from "@/lib/field-next-stop";
import { scheduleRange } from "@/lib/dates";
import { clientName, propertyAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      technician: true,
      deployments: { include: { equipment: true, checks: true } },
      captures: { include: { species: true } },
      entryPoints: true,
      exclusions: { include: { entryPoint: true } },
      photos: { include: { entryPoint: true } },
      sourceJob: true,
      trips: { orderBy: { scheduledStart: "asc" } },
      emergencyDispatch: true,
    },
  });
  if (!job) notFound();
  const context = await getAppContext();
  const session = context?.session ?? null;
  const techView = Boolean(context?.fieldView);
  const notify = jobNotifyProps(job, session?.firstName);
  if (session && !canAccessJobInFieldView(session, job, techView)) notFound();

  const [stock, allGear, species, technicians, openCheckIn, tripChain, dayRouteJobs] = await Promise.all([
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
    job.includedTrips || job.sourceJobId || job.trips.length
      ? prisma.job.findMany({
          where: {
            OR: [{ id: tripRootId(job) }, { sourceJobId: tripRootId(job) }],
          },
          select: {
            id: true,
            number: true,
            sourceJobId: true,
            createdAt: true,
            scheduledStart: true,
            includedTrips: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    job.scheduledStart
      ? (() => {
          const { from, to } = scheduleRange("day", job.scheduledStart);
          const techId = job.technicianId ?? session?.id;
          return prisma.job.findMany({
            where: {
              status: { notIn: ["CANCELLED"] },
              scheduledStart: { gte: from, lte: to },
              ...(techId ? { technicianId: techId } : {}),
            },
            include: { property: true },
            orderBy: { scheduledStart: "asc" },
          });
        })()
      : Promise.resolve([]),
  ]);
  const tripVisit = tripChain.length ? tripVisitForJob(job, tripChain) : null;
  const nextStopJob = nextFieldStop(dayRouteJobs, job.id);
  const nextStop = nextStopJob
    ? {
        id: nextStopJob.id,
        number: nextStopJob.number,
        title: nextStopJob.title,
        address: propertyAddress(nextStopJob.property),
        lat: nextStopJob.property.lat,
        lng: nextStopJob.property.lng,
      }
    : null;

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
    <JobVisitProvider status={displayStatus} checkedIn={checkedInHere}>
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
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl tracking-wide md:text-3xl">{job.title}</h1>
            <TripVisitBadge info={tripVisit} />
          </div>
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
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Visit">
          {tripVisit ? (
            <p className="mb-2 text-sm font-semibold text-orange">
              {tripVisit.visitNumber} of {tripVisit.includedTrips} included visits
            </p>
          ) : null}
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
              {job.trips.map((trip) => {
                const visit = tripVisitForJob(trip, tripChain);
                return (
                  <Link key={trip.id} href={`/jobs/${trip.id}`} className="block font-medium text-orange">
                    {visit ? `Visit ${visit.visitNumber} of ${visit.includedTrips}` : "Later trip"} {trip.number}
                    {trip.scheduledStart ? ` · ${format(trip.scheduledStart, "MMM d")}` : ""}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </Card>
        <Card title="Instructions">
          <p className="text-sm">{job.instructions ?? "No special instructions."}</p>
        </Card>
      </section>
      {techView ? null : <JobEditor job={job} technicians={technicians} />}
      <JobFieldWorkGate>
        <div className="space-y-3">
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
          <JobPhotosCard
            jobId={job.id}
            propertyId={job.propertyId}
            photos={job.photos}
            entryPoints={job.entryPoints.map((item) => ({ id: item.id, label: item.label }))}
          />
          <JobCheckoutPanel
            jobId={job.id}
            clientPhone={job.client.phone}
            nextStop={nextStop}
            visitSummary={{
              clientFirstName: job.client.firstName,
              jobTitle: job.title,
              techName: job.technician
                ? `${job.technician.firstName} ${job.technician.lastName}`
                : session?.firstName,
              companyName: job.client.companyName,
              portalUrl: job.client.portalToken ? portalHubUrl(job.client.portalToken) : null,
            }}
          />
        </div>
      </JobFieldWorkGate>
      </div>
    </JobVisitProvider>
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
