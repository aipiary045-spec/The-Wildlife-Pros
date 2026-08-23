import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobSummaryCard } from "@/components/jobs/JobSummaryCard";
import { JobTrapsCard } from "@/components/jobs/JobTrapsCard";
import { JobEntryPointsCard } from "@/components/jobs/JobEntryPointsCard";
import { JobPhotosCard } from "@/components/jobs/JobPhotosCard";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
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
import { jobNotifyProps } from "@/lib/messaging";
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
        </div>
      </div>
      <JobSummaryCard
        job={{
          number: job.number,
          title: job.title,
          type: job.type,
          instructions: job.instructions,
          scheduledStart: job.scheduledStart,
          scheduledEnd: job.scheduledEnd,
          durationMin: job.durationMin,
          completedAt: job.completedAt,
          client: job.client,
          property: job.property,
          technician: job.technician,
          sourceJob: job.sourceJob
            ? { id: job.sourceJob.id, number: job.sourceJob.number, scheduledStart: job.sourceJob.scheduledStart }
            : null,
          trips: job.trips.map((trip) => ({
            id: trip.id,
            number: trip.number,
            scheduledStart: trip.scheduledStart,
          })),
          emergencyDispatch: job.emergencyDispatch
            ? { message: job.emergencyDispatch.message, acknowledgedAt: job.emergencyDispatch.acknowledgedAt }
            : null,
          counts: {
            deployments: job.deployments.length,
            captures: job.captures.length,
            entryPoints: job.entryPoints.length,
            photos: job.photos.length,
          },
        }}
      />
      <section className="grid gap-6 lg:grid-cols-2">
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
        {techView ? null : <JobEditor job={job} technicians={technicians} />}
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
