import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { WorkOrderBoard } from "@/components/jobs/WorkOrderBoard";
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
  const jobs = await prisma.job.findMany({
    where: techView && session ? { technicianId: session.id } : undefined,
    include: { client: true, property: true, technician: true },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">{techView ? "My jobs" : "Work orders"}</h1>
        <p className="text-stone-600">
          {techView
            ? "Assigned stops, grouped by today, leftover late jobs, and what's coming."
            : "The file for every job. Action needed is late leftovers, today, and anything without a day yet. The schedule is still where you place the time."}
        </p>
        {techView ? null : (
          <Link href="/schedule" className="mt-2 inline-block text-sm font-semibold text-orange">
            Open the schedule
          </Link>
        )}
      </div>
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
