"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { JobFieldStats } from "@/components/jobs/JobFieldStats";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { telHref } from "@/lib/intake";
import {
  groupWorkOrders,
  jobIsLateOnToday,
  matchesWorkOrderSearch,
  workOrderCounts,
  type WorkOrderView,
} from "@/lib/work-orders";
import { clientName, formatPhone, propertyAddress } from "@/lib/utils";

export type WorkOrderRow = {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  scheduledStart: string | null;
  durationMin: number;
  instructions: string | null;
  client: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    phone: string | null;
  };
  property: {
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    accessNotes: string | null;
    gateCode: string | null;
    petsOnSite: boolean;
  };
  technician: { firstName: string; lastName: string } | null;
  counts: {
    deployments: number;
    captures: number;
    entryPoints: number;
    photos: number;
  };
};

type PreparedJob = {
  id: string;
  number: string;
  title: string;
  type: string;
  typeLabel: string;
  status: string;
  scheduledStart: Date | null;
  durationMin: number;
  clientName: string;
  clientPhone: string | null;
  address: string;
  fullAddress: string;
  technicianName: string | null;
  instructions: string | null;
  accessNotes: string | null;
  gateCode: string | null;
  petsOnSite: boolean;
  counts: WorkOrderRow["counts"];
};

export function WorkOrderBoard({
  jobs,
  views,
  activeKey,
  showOfficeMeta,
  techView,
}: {
  jobs: WorkOrderRow[];
  views: WorkOrderView[];
  activeKey: WorkOrderView["key"];
  showOfficeMeta: boolean;
  techView: boolean;
}) {
  const [query, setQuery] = useState("");
  const now = useMemo(() => new Date(), []);
  const active = views.find((view) => view.key === activeKey) ?? views[0]!;
  const counts = useMemo(() => workOrderCounts(jobs, views, now), [jobs, views, now]);

  const prepared = useMemo<PreparedJob[]>(
    () =>
      jobs.map((job) => ({
        id: job.id,
        number: job.number,
        title: job.title,
        type: job.type,
        typeLabel: JOB_TYPE_LABEL[job.type] ?? job.type,
        status: job.status,
        scheduledStart: job.scheduledStart ? new Date(job.scheduledStart) : null,
        durationMin: job.durationMin,
        clientName: clientName(job.client),
        clientPhone: job.client.phone,
        address: job.property.address1,
        fullAddress: propertyAddress(job.property),
        technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : null,
        instructions: job.instructions,
        accessNotes: job.property.accessNotes,
        gateCode: job.property.gateCode,
        petsOnSite: job.property.petsOnSite,
        counts: job.counts,
      })),
    [jobs],
  );

  const visible = useMemo(
    () => prepared.filter((job) => matchesWorkOrderSearch(job, query)),
    [prepared, query],
  );

  const sections = useMemo(() => groupWorkOrders(visible, active, now), [visible, active, now]);

  return (
    <div className="space-y-4">
      <div className="-mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
        <div className="flex w-max gap-2 pb-1">
          {views.map((view) => {
            const selected = view.key === active.key;
            return (
              <Link
                key={view.key}
                href={`/jobs?view=${view.key}`}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
                  selected ? "bg-orange text-white" : "border border-line bg-white text-stone-700"
                }`}
              >
                {view.label}
                <span className={`ml-1 tabular-nums ${selected ? "text-white/80" : "text-stone-400"}`}>
                  {counts[view.key] ?? 0}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <label className="block text-sm">
        <span className="sr-only">Search work orders</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={techView ? "Search your jobs" : "Search number, client, street, or tech"}
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5"
        />
      </label>
      <p className="text-sm text-stone-600">{active.hint}</p>

      {sections.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-stone-500">
          {query.trim() ? "No work orders match that search." : "Nothing in this pile."}
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="space-y-2">
            {sections.length > 1 || active.key === "all" || active.key === "action" ? (
              <h2 className="font-semibold">
                {section.title}
                <span className="ml-2 text-sm font-normal text-stone-500">{section.items.length}</span>
              </h2>
            ) : null}
            <div className="space-y-2 md:hidden">
              {section.items.map((job) => (
                <JobCard key={job.id} job={job} showOfficeMeta={showOfficeMeta} now={now} />
              ))}
            </div>
            <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
              <JobTable jobs={section.items} showOfficeMeta={showOfficeMeta} now={now} />
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function JobCard({ job, showOfficeMeta, now }: { job: PreparedJob; showOfficeMeta: boolean; now: Date }) {
  const lateToday = jobIsLateOnToday(job, now);
  const callHref = telHref(job.clientPhone);
  const accessHint = [
    job.gateCode ? `Gate ${job.gateCode}` : null,
    job.petsOnSite ? "Pets" : null,
    job.accessNotes,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/jobs/${job.id}`} className="block rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-orange">{job.number}</p>
            <span className="text-xs text-stone-500">{job.typeLabel}</span>
          </div>
          <p className="font-semibold">{job.title}</p>
          <p className="text-sm text-stone-600">{job.clientName}</p>
          <p className="text-sm text-stone-600">{job.fullAddress}</p>
          <p className="mt-1 text-xs text-stone-500">
            {job.scheduledStart ? format(job.scheduledStart, "EEE, MMM d · h:mm a") : "No day yet"}
            {` · ${job.durationMin} min`}
            {showOfficeMeta ? ` · ${job.technicianName ?? "Unassigned"}` : null}
          </p>
          {callHref ? (
            <p className="mt-1 text-xs">
              <a
                href={callHref}
                className="font-medium text-orange hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {formatPhone(job.clientPhone)}
              </a>
            </p>
          ) : null}
          {job.instructions ? (
            <p className="mt-2 line-clamp-2 text-sm text-stone-700">{job.instructions}</p>
          ) : null}
          {accessHint ? <p className="mt-1 line-clamp-1 text-xs text-stone-500">{accessHint}</p> : null}
          <div className="mt-2">
            <JobFieldStats counts={job.counts} compact />
          </div>
          {lateToday ? <p className="mt-2 text-xs font-semibold text-orange">Late for check-in</p> : null}
        </div>
        <StatusBadge status={job.status} />
      </div>
    </Link>
  );
}

function JobTable({ jobs, showOfficeMeta, now }: { jobs: PreparedJob[]; showOfficeMeta: boolean; now: Date }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
        <tr>
          <th className="px-4 py-3">Job</th>
          <th className="px-4 py-3">Client / property</th>
          <th className="px-4 py-3">When</th>
          {showOfficeMeta ? <th className="px-4 py-3">Tech</th> : null}
          <th className="px-4 py-3">Field</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => {
          const lateToday = jobIsLateOnToday(job, now);
          const callHref = telHref(job.clientPhone);
          return (
            <tr key={job.id} className="border-t border-line align-top">
              <td className="px-4 py-3">
                <Link href={`/jobs/${job.id}`} className="font-medium hover:text-orange">
                  {job.number}
                </Link>
                <p className="text-xs text-stone-500">
                  {job.typeLabel} · {job.title}
                </p>
                {job.instructions ? (
                  <p className="mt-1 line-clamp-2 text-xs text-stone-600">{job.instructions}</p>
                ) : null}
                {lateToday ? <p className="mt-1 text-xs font-semibold text-orange">Late for check-in</p> : null}
              </td>
              <td className="px-4 py-3">
                {job.clientName}
                {callHref ? (
                  <p className="text-xs">
                    <a href={callHref} className="font-medium text-orange hover:underline">
                      {formatPhone(job.clientPhone)}
                    </a>
                  </p>
                ) : null}
                <p className="text-xs text-stone-500">{job.fullAddress}</p>
                {job.gateCode || job.petsOnSite || job.accessNotes ? (
                  <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                    {[job.gateCode ? `Gate ${job.gateCode}` : null, job.petsOnSite ? "Pets" : null, job.accessNotes]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {job.scheduledStart ? format(job.scheduledStart, "EEE, MMM d · h:mm a") : "No day yet"}
                <p className="text-xs text-stone-500">{job.durationMin} min</p>
              </td>
              {showOfficeMeta ? <td className="px-4 py-3">{job.technicianName ?? "—"}</td> : null}
              <td className="px-4 py-3">
                <JobFieldStats counts={job.counts} compact />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
