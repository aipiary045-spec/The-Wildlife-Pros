import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { clientName, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    include: { client: true, property: true, technician: true },
    orderBy: { scheduledStart: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Jobs</h1>
        <p className="text-stone-600">Work orders, visits, and field documentation.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Client / property</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Tech</th>
              <th className="px-4 py-3">Total</th>
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
                <td className="px-4 py-3">
                  {job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "—"}
                </td>
                <td className="px-4 py-3">{formatMoney(job.total)}</td>
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
