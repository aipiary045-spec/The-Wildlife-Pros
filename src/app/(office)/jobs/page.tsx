import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSession } from "@/lib/auth";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { isTechnician } from "@/lib/paths";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const session = await getSession();
  const techView = Boolean(session && isTechnician(session.role));
  const jobs = await prisma.job.findMany({
    where: techView && session ? { technicianId: session.id } : undefined,
    include: { client: true, property: true, technician: true },
    orderBy: { scheduledStart: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">{techView ? "My jobs" : "Jobs"}</h1>
        <p className="text-stone-600">
          {techView
            ? "Your assigned jobs. Open one to check in, log traps, or record a capture."
            : "Work orders, visits, and field documentation."}
        </p>
      </div>
      <div className="space-y-2 md:hidden">
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-2xl border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-orange">{job.number}</p>
                <p className="font-semibold">{job.title}</p>
                <p className="text-sm text-stone-600">
                  {clientName(job.client)} · {job.property.address1}
                </p>
                <p className="text-xs text-stone-500">
                  {job.scheduledStart ? format(job.scheduledStart, "MMM d, h:mm a") : "Unscheduled"}
                  {techView
                    ? null
                    : ` · ${job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "Unassigned"} · ${formatMoney(job.total)}`}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Client / property</th>
              <th className="px-4 py-3">When</th>
              {techView ? null : <th className="px-4 py-3">Tech</th>}
              {techView ? null : <th className="px-4 py-3">Total</th>}
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
                {techView ? null : (
                  <td className="px-4 py-3">
                    {job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "—"}
                  </td>
                )}
                {techView ? null : <td className="px-4 py-3">{formatMoney(job.total)}</td>}
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
