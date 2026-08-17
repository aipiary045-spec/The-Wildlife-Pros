import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { isTechnician } from "@/lib/paths";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DONE = new Set(["COMPLETED", "INVOICED"]);
const PARKED = new Set(["CANCELLED", "ON_HOLD"]);

type JobRow = {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  total: number | string | { toString(): string };
  scheduledStart: Date | null;
  client: { firstName: string; lastName: string; companyName: string | null };
  property: { address1: string };
  technician: { firstName: string; lastName: string } | null;
};

function bucketJobs(jobs: JobRow[]) {
  const needsDay: JobRow[] = [];
  const onCalendar: JobRow[] = [];
  const finished: JobRow[] = [];
  const parked: JobRow[] = [];
  for (const job of jobs) {
    if (PARKED.has(job.status)) parked.push(job);
    else if (DONE.has(job.status)) finished.push(job);
    else if (!job.scheduledStart || job.status === "UNSCHEDULED") needsDay.push(job);
    else onCalendar.push(job);
  }
  return [
    { key: "needs", title: "Needs a day on the board", items: needsDay },
    { key: "live", title: "On the calendar", items: onCalendar },
    { key: "done", title: "Finished", items: finished },
    { key: "parked", title: "On hold / cancelled", items: parked },
  ].filter((section) => section.items.length > 0);
}

export default async function JobsPage() {
  const session = await getSession();
  const techView = Boolean(session && isTechnician(session.role));
  const jobs = await prisma.job.findMany({
    where: techView && session ? { technicianId: session.id } : undefined,
    include: { client: true, property: true, technician: true },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
  });

  const sections = techView ? [{ key: "all", title: "", items: jobs }] : bucketJobs(jobs);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">{techView ? "My jobs" : "Work orders"}</h1>
        <p className="text-stone-600">
          {techView
            ? "Every stop assigned to you. Open one to check in, log traps, or record a capture."
            : "The file for every job — money, traps, notes. Put a stop on a tech and a time on the Board."}
        </p>
        {techView ? null : (
          <Link href="/schedule" className="mt-2 inline-block text-sm font-semibold text-orange">
            Open the board
          </Link>
        )}
      </div>
      {sections.map((section) => (
        <section key={section.key} className="space-y-2">
          {section.title ? <h2 className="font-semibold">{section.title}</h2> : null}
          <div className="space-y-2 md:hidden">
            {section.items.map((job) => (
              <JobCard key={job.id} job={job} showOfficeMeta={!techView} />
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
            <JobTable jobs={section.items} showOfficeMeta={!techView} />
          </div>
        </section>
      ))}
    </div>
  );
}

function JobCard({ job, showOfficeMeta }: { job: JobRow; showOfficeMeta: boolean }) {
  return (
    <Link href={`/jobs/${job.id}`} className="block rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-orange">{job.number}</p>
          <p className="font-semibold">{job.title}</p>
          <p className="text-sm text-stone-600">
            {clientName(job.client)} · {job.property.address1}
          </p>
          <p className="text-xs text-stone-500">
            {job.scheduledStart ? format(job.scheduledStart, "MMM d, h:mm a") : "Unscheduled"}
            {showOfficeMeta
              ? ` · ${job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "Unassigned"} · ${formatMoney(job.total)}`
              : null}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>
    </Link>
  );
}

function JobTable({ jobs, showOfficeMeta }: { jobs: JobRow[]; showOfficeMeta: boolean }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
        <tr>
          <th className="px-4 py-3">Job</th>
          <th className="px-4 py-3">Client / property</th>
          <th className="px-4 py-3">When</th>
          {showOfficeMeta ? <th className="px-4 py-3">Tech</th> : null}
          {showOfficeMeta ? <th className="px-4 py-3">Total</th> : null}
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id} className="border-t border-line">
            <td className="px-4 py-3">
              <Link href={`/jobs/${job.id}`} className="font-medium hover:text-orange">
                {job.number}
              </Link>
              <p className="text-xs text-stone-500">
                {JOB_TYPE_LABEL[job.type]} · {job.title}
              </p>
            </td>
            <td className="px-4 py-3">
              {clientName(job.client)}
              <p className="text-xs text-stone-500">{job.property.address1}</p>
            </td>
            <td className="px-4 py-3">
              {job.scheduledStart ? format(job.scheduledStart, "MMM d, h:mm a") : "Unscheduled"}
            </td>
            {showOfficeMeta ? (
              <td className="px-4 py-3">
                {job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "—"}
              </td>
            ) : null}
            {showOfficeMeta ? <td className="px-4 py-3">{formatMoney(job.total)}</td> : null}
            <td className="px-4 py-3">
              <StatusBadge status={job.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
