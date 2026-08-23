import Link from "next/link";
import { format } from "date-fns";
import { JobFieldStats } from "@/components/jobs/JobFieldStats";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { telHref } from "@/lib/intake";
import { clientName, formatPhone, propertyAddress } from "@/lib/utils";

type TripLink = { id: string; number: string; scheduledStart: Date | null };

export type JobSummaryData = {
  number: string;
  title: string;
  type: string;
  instructions: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  durationMin: number;
  completedAt: Date | null;
  client: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    phone: string | null;
    altPhone: string | null;
    email: string | null;
  };
  property: {
    label: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    postalCode: string;
    accessNotes: string | null;
    gateCode: string | null;
    petsOnSite: boolean;
  };
  technician: { firstName: string; lastName: string } | null;
  sourceJob: TripLink | null;
  trips: TripLink[];
  emergencyDispatch?: { message: string; acknowledgedAt: Date | null } | null;
  counts: {
    deployments: number;
    captures: number;
    entryPoints: number;
    photos: number;
  };
};

export function JobSummaryCard({ job }: { job: JobSummaryData }) {
  const techName = job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "Unassigned";
  const phones = [job.client.phone, job.client.altPhone].filter(Boolean) as string[];
  const propertyLine = propertyAddress(job.property);
  const accessBits = [
    job.property.gateCode ? `Gate ${job.property.gateCode}` : null,
    job.property.petsOnSite ? "Pets on site" : null,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Job overview</h2>
          <p className="text-sm text-stone-600">
            {JOB_TYPE_LABEL[job.type] ?? job.type} · {job.durationMin} min
          </p>
        </div>
        <JobFieldStats counts={job.counts} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SummaryBlock title="Visit">
          <p className="font-medium">
            {job.scheduledStart ? format(job.scheduledStart, "EEEE, MMM d · h:mm a") : "Unscheduled"}
          </p>
          {job.scheduledEnd ? (
            <p className="text-sm text-stone-600">Until {format(job.scheduledEnd, "h:mm a")}</p>
          ) : null}
          <p className="text-sm text-stone-600">{techName}</p>
          {job.completedAt ? (
            <p className="text-sm text-stone-600">Completed {format(job.completedAt, "MMM d, h:mm a")}</p>
          ) : null}
        </SummaryBlock>

        <SummaryBlock title="Contact">
          <p className="font-medium">{clientName(job.client)}</p>
          {phones.length ? (
            <p className="text-sm">
              {phones.map((phone, index) => (
                <span key={phone}>
                  {index > 0 ? " · " : null}
                  <a href={telHref(phone) ?? undefined} className="font-medium text-orange hover:underline">
                    {formatPhone(phone)}
                  </a>
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm text-stone-500">No phone on file</p>
          )}
          {job.client.email ? (
            <p className="text-sm">
              <a href={`mailto:${job.client.email}`} className="text-orange hover:underline">
                {job.client.email}
              </a>
            </p>
          ) : null}
        </SummaryBlock>

        <SummaryBlock title="Property">
          <p className="font-medium">{propertyLine}</p>
          {job.property.address2 ? <p className="text-sm text-stone-600">{job.property.address2}</p> : null}
          {job.property.label !== "Primary" ? (
            <p className="text-sm text-stone-600">{job.property.label}</p>
          ) : null}
          {accessBits.length ? <p className="text-sm text-stone-600">{accessBits.join(" · ")}</p> : null}
          {job.property.accessNotes ? (
            <p className="mt-1 text-sm text-stone-600">{job.property.accessNotes}</p>
          ) : accessBits.length === 0 ? (
            <p className="text-sm text-stone-500">No access notes</p>
          ) : null}
        </SummaryBlock>

        <SummaryBlock title="Instructions">
          <p className="text-sm whitespace-pre-wrap">{job.instructions?.trim() || "No special instructions."}</p>
        </SummaryBlock>
      </div>

      {job.emergencyDispatch ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">
            Emergency dispatch
            {job.emergencyDispatch.acknowledgedAt
              ? ` · acknowledged ${format(job.emergencyDispatch.acknowledgedAt, "MMM d, h:mm a")}`
              : " · awaiting acknowledgment"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{job.emergencyDispatch.message}</p>
        </div>
      ) : null}

      {job.sourceJob || job.trips.length ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Related trips</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {job.sourceJob ? (
              <Link href={`/jobs/${job.sourceJob.id}`} className="font-medium text-orange hover:underline">
                First trip {job.sourceJob.number}
                {job.sourceJob.scheduledStart ? ` · ${format(job.sourceJob.scheduledStart, "MMM d")}` : ""}
              </Link>
            ) : null}
            {job.trips.map((trip) => (
              <Link key={trip.id} href={`/jobs/${trip.id}`} className="font-medium text-orange hover:underline">
                Later trip {trip.number}
                {trip.scheduledStart ? ` · ${format(trip.scheduledStart, "MMM d")}` : ""}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</h3>
      {children}
    </div>
  );
}
