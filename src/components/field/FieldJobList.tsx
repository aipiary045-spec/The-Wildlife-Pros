import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dateKey } from "@/lib/dates";
import { propertyAddress } from "@/lib/utils";

type FieldJob = {
  id: string;
  number: string;
  title: string;
  status: string;
  scheduledStart: Date | null;
  technician?: { firstName: string; lastName: string } | null;
  property: { address1: string; city: string; state: string; postalCode: string };
  deployments: unknown[];
};

export type RouteHint = {
  sequence: number;
  milesFromPrev: number;
  driveMinFromPrev: number;
  eta: Date | null;
};

export function FieldJobList({
  jobs,
  days,
  showTech,
  routeByJobId = {},
}: {
  jobs: FieldJob[];
  days: Date[];
  showTech: boolean;
  routeByJobId?: Record<string, RouteHint>;
}) {
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayJobs = jobs
          .filter((job) => job.scheduledStart && dateKey(job.scheduledStart) === dateKey(day))
          .sort((a, b) => {
            const hintA = routeByJobId[a.id];
            const hintB = routeByJobId[b.id];
            if (hintA && hintB) return hintA.sequence - hintB.sequence;
            if (hintA) return -1;
            if (hintB) return 1;
            return (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0);
          });
        const isSingleDay = days.length === 1;
        const routed = dayJobs.some((job) => routeByJobId[job.id]);
        return (
          <section key={dateKey(day)} className="space-y-2">
            {days.length > 1 ? (
              <h2 className="px-1 text-sm font-semibold">
                {format(day, "EEEE, MMM d")}
                <span className="ml-2 text-xs font-normal text-stone-500">
                  {dayJobs.length} stop{dayJobs.length === 1 ? "" : "s"}
                  {routed ? " · optimized" : ""}
                </span>
              </h2>
            ) : null}
            {dayJobs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-panel px-4 py-6 text-center text-sm text-stone-500">
                {isSingleDay ? "No stops on this day." : "Off / no stops"}
              </p>
            ) : (
              dayJobs.map((job, index) => {
                const hint = routeByJobId[job.id];
                const stopNumber = hint?.sequence ?? index + 1;
                const eta = hint?.eta ?? job.scheduledStart;
                return (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block rounded-2xl border border-line bg-panel p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-orange">
                          Stop {stopNumber} · {eta ? format(eta, "h:mm a") : "Flex"}
                        </p>
                        <p className="text-xs text-stone-500">{job.number}</p>
                        <h2 className="font-semibold">{job.title}</h2>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{propertyAddress(job.property)}</p>
                    {hint ? (
                      <p className="mt-1 text-xs text-stone-500">
                        {hint.sequence === 1
                          ? `First stop · ${hint.milesFromPrev} mi from home · ${hint.driveMinFromPrev} min`
                          : `Drive ${hint.driveMinFromPrev} min · ${hint.milesFromPrev} mi from last stop`}
                      </p>
                    ) : null}
                    <p className="text-xs text-stone-500">
                      {showTech && job.technician
                        ? `${job.technician.firstName} ${job.technician.lastName} · `
                        : ""}
                      {job.deployments.length} trap{job.deployments.length === 1 ? "" : "s"}
                    </p>
                  </Link>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
