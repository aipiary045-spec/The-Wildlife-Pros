import { prisma } from "@/lib/prisma";
import { WorkOrderBoard } from "@/components/jobs/WorkOrderBoard";
import { JobsPageActions } from "@/components/jobs/JobsPageActions";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSession } from "@/lib/auth";
import { isTechnician } from "@/lib/paths";
import { parseWorkOrderView, workOrderViews } from "@/lib/work-orders";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getSession();
  const techView = Boolean(session && isTechnician(session.role));
  const params = await searchParams;
  const views = workOrderViews(techView);
  const activeKey = parseWorkOrderView(params.view, techView);
  const [jobs, technicians, clients] = await Promise.all([
    prisma.job.findMany({
      where: techView && session ? { technicianId: session.id } : undefined,
      include: { client: true, property: true, technician: true },
      orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    }),
    techView
      ? []
      : prisma.user.findMany({
          where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "ADMIN"] } },
          orderBy: { firstName: "asc" },
          select: { id: true, firstName: true, lastName: true, color: true },
        }),
    techView
      ? []
      : prisma.client.findMany({
          include: { properties: { select: { id: true, address1: true, city: true } } },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={techView ? "My jobs" : "Work orders"}
        description={
          techView
            ? "Assigned stops, grouped by today, leftover late jobs, and what's coming."
            : "The file for every job. Action needed is late leftovers, today, and anything without a day yet. The schedule is still where you place the time."
        }
        related={techView ? undefined : [{ href: "/schedule", label: "Schedule" }, { href: "/calls", label: "Call log" }]}
        actions={
          techView ? undefined : (
            <JobsPageActions
              technicians={technicians}
              clients={clients.map((client) => ({
                id: client.id,
                firstName: client.firstName,
                lastName: client.lastName,
                companyName: client.companyName,
                properties: client.properties,
              }))}
            />
          )
        }
      />
      <WorkOrderBoard
        jobs={jobs.map((job) => ({
          id: job.id,
          number: job.number,
          title: job.title,
          type: job.type,
          status: job.status,
          total: Number(job.total),
          scheduledStart: job.scheduledStart?.toISOString() ?? null,
          client: job.client,
          property: { address1: job.property.address1 },
          technician: job.technician,
        }))}
        views={views}
        activeKey={activeKey}
        showOfficeMeta={!techView}
        techView={techView}
      />
    </div>
  );
}
