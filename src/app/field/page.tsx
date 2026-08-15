import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getMyTimesheet } from "@/lib/timesheets";
import { propertyAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FieldPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const myTime = await getMyTimesheet(session.id);
  const jobs = await prisma.job.findMany({
    where: {
      technicianId: session.role === "TECHNICIAN" ? session.id : undefined,
      status: { in: ["SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"] },
    },
    include: { client: true, property: true, deployments: { include: { equipment: true } } },
    orderBy: { scheduledStart: "asc" },
  });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <header className="sunset-panel px-5 pb-8 pt-10 text-ink">
        <p className="text-xs font-bold uppercase tracking-[0.25em]">The Wildlife Pros</p>
        <h1 className="mt-2 font-display text-3xl">Field app</h1>
        <p>
          {session.firstName}, {jobs.length} stop{jobs.length === 1 ? "" : "s"} on your board.
        </p>
      </header>
      <div className="-mt-4 space-y-3 px-4">
        <ClockControls initialCurrent={myTime.current} initialRecent={myTime.recent} />
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="block rounded-2xl border border-line bg-panel p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-orange">{job.number}</p>
                <h2 className="font-semibold">{job.title}</h2>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-2 text-sm text-stone-600">{propertyAddress(job.property)}</p>
            <p className="text-xs text-stone-500">
              {job.scheduledStart ? format(job.scheduledStart, "h:mm a") : "Flex"} ·{" "}
              {job.deployments.length} trap{job.deployments.length === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
        <Link href="/dashboard" className="block pt-4 text-center text-sm font-medium text-orange">
          Back to office
        </Link>
      </div>
    </div>
  );
}
