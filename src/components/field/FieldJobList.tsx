import Link from "next/link";
import { format } from "date-fns";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { NotifyCustomerButton } from "@/components/jobs/NotifyCustomerButton";
import { TripVisitBadge } from "@/components/jobs/TripVisitBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobVisitControls } from "@/components/jobs/JobVisitControls";
import { dateKey } from "@/lib/dates";
import { propertyAddress } from "@/lib/utils";
import type { TripVisitInfo } from "@/lib/job-trips";
import type { ScheduleTech } from "@/components/schedule/job-card";

type FieldJob = {
  id: string;
  number: string;
  title: string;
  type?: string;
  status: string;
  scheduledStart: Date | null;
  technicianId?: string | null;
  technician?: { firstName: string; lastName: string } | null;
  client: {
    firstName: string;
    phone: string | null;
    companyName?: string | null;
  };
  property: {
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    lat?: number | null;
    lng?: number | null;
  };
  deployments: Array<{ id: string; equipment: { serialNumber: string } }>;
  emergencyDispatch?: { acknowledgedAt: Date | null } | null;
};

function isEmergencyJob(job: FieldJob) {
  return job.type === "EMERGENCY" || Boolean(job.emergencyDispatch);
}

export type FieldJobNotify = {
  jobId: string;
  clientPhone: string | null;
  smsHref: string | null;
  autoSendSms: boolean;
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
  tripVisitByJobId = {},
  technicians = [],
  notifyByJobId = {},
  onSiteJobId,
  species = [],
}: {
  jobs: FieldJob[];
  days: Date[];
  showTech: boolean;
  routeByJobId?: Record<string, RouteHint>;
  tripVisitByJobId?: Record<string, TripVisitInfo>;
  technicians?: ScheduleTech[];
  notifyByJobId?: Record<string, FieldJobNotify>;
  onSiteJobId?: string | null;
  species?: Array<{ id: string; commonName: string }>;
}) {
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayJobs = jobs
          .filter((job) => job.scheduledStart && dateKey(job.scheduledStart) === dateKey(day))
          .sort((a, b) => {
            const emergencyA = isEmergencyJob(a) ? 0 : 1;
            const emergencyB = isEmergencyJob(b) ? 0 : 1;
            if (emergencyA !== emergencyB) return emergencyA - emergencyB;
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
            {isSingleDay && dayJobs.length > 0 ? (
              <NavigateLink
                label="Navigate this route"
                stops={dayJobs.map((job) => ({
                  address: propertyAddress(job.property),
                  lat: job.property.lat,
                  lng: job.property.lng,
                }))}
                className="px-1"
              />
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
                const emergency = isEmergencyJob(job);
                const onSite = onSiteJobId === job.id;
                const place = {
                  address: propertyAddress(job.property),
                  lat: job.property.lat,
                  lng: job.property.lng,
                };
                const tripVisit = tripVisitByJobId[job.id];
                return (
                  <article
                    key={job.id}
                    className={`rounded-2xl border bg-panel p-4 shadow-sm ${
                      onSite
                        ? "border-emerald-400 bg-emerald-50/80"
                        : emergency
                          ? "border-rose-400 bg-rose-50/80"
                          : "border-line"
                    }`}
                  >
                    <Link href={`/jobs/${job.id}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`text-xs font-semibold ${
                              onSite ? "text-emerald-800" : emergency ? "text-rose-700" : "text-orange"
                            }`}
                          >
                            {onSite ? "Checked in now" : emergency ? "Emergency" : `Stop ${stopNumber}`} ·{" "}
                            {eta ? format(eta, "h:mm a") : "Flex"}
                          </p>
                          <p className="text-xs text-stone-500">{job.number}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold">{job.title}</h2>
                            <TripVisitBadge info={tripVisit} compact />
                          </div>
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
                    <div className="mt-3 flex gap-2">
                      <NavigateLink destination={place} label="Navigate" className="flex-1 [&>a]:w-full [&>a]:justify-center" />
                      {notifyByJobId[job.id] ? (
                        <NotifyCustomerButton
                          {...notifyByJobId[job.id]}
                          compact
                          emphasized={emergency}
                          className="flex-1"
                        />
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <JobVisitControls
                        jobId={job.id}
                        status={job.status}
                        checkedIn={onSite}
                        technicianId={job.technicianId}
                        technicians={technicians}
                        species={species}
                        deployments={job.deployments.map((item) => ({
                          id: item.id,
                          equipment: { serialNumber: item.equipment.serialNumber },
                        }))}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
