import Link from "next/link";
import { format } from "date-fns";
import { getDashboardData } from "@/lib/data";
import { clientName, formatMoney, propertyAddress } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Today&apos;s board</h1>
        <p className="text-stone-600">Dispatch, trap checks, and money in one sunrise view.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-5">
        <Stat label="Jobs today" value={String(data.jobsToday.length)} href="/schedule" />
        <Stat label="This week" value={String(data.weekJobs)} href="/jobs" />
        <Stat label="Open quotes" value={String(data.openQuotes)} href="/quotes" />
        <Stat label="Traps in the field" value={String(data.activeTraps)} href="/inventory" />
        <Stat label="On the clock" value={String(data.clockedIn)} href="/timesheets" />
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Scheduled today</h2>
            <Link href="/schedule" className="text-sm font-medium text-orange">
              Open calendar
            </Link>
          </div>
          <div className="space-y-3">
            {data.jobsToday.length === 0 ? (
              <p className="text-sm text-stone-500">No visits on the board yet.</p>
            ) : (
              data.jobsToday.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block rounded-xl border border-line px-4 py-3 hover:border-orange"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-stone-600">
                        {clientName(job.client)} · {propertyAddress(job.property)}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {job.scheduledStart ? format(job.scheduledStart, "h:mm a") : "Unscheduled"} ·{" "}
                    {job.technician
                      ? `${job.technician.firstName} ${job.technician.lastName}`
                      : "Unassigned"}{" "}
                    · {formatMoney(job.total)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-4 font-semibold">Recent captures</h2>
          <div className="space-y-3">
            {data.recentCaptures.map((capture) => (
              <div key={capture.id} className="rounded-xl bg-background px-3 py-2 text-sm">
                <p className="font-medium">{capture.species.commonName}</p>
                <p className="text-stone-600">
                  {capture.quantity} · {capture.disposition.replaceAll("_", " ").toLowerCase()}
                </p>
                <p className="text-xs text-stone-500">{capture.job.property.address1}</p>
              </div>
            ))}
          </div>
          <Link href="/activity" className="mt-4 inline-block text-sm font-medium text-orange">
            Species log
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-panel p-4 hover:border-orange">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </Link>
  );
}
