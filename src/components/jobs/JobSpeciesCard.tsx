"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { JobCaptureForm } from "@/components/jobs/JobCaptureForm";
import { DISPOSITION_LABEL } from "@/lib/constants";

export function JobSpeciesCard({
  jobId,
  captures,
  species,
  deployments,
}: {
  jobId: string;
  captures: Array<{
    id: string;
    quantity: number;
    disposition: string;
    species: { commonName: string };
  }>;
  species: Array<{ id: string; commonName: string }>;
  deployments: Array<{ id: string; equipment: { serialNumber: string } }>;
}) {
  const [open, setOpen] = useState(captures.length > 0);

  return (
    <section className="rounded-2xl border border-line bg-panel">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-semibold">Species activity</h2>
          {open ? null : (
            <p className="text-sm text-stone-500">
              {captures.length
                ? `${captures.length} capture${captures.length === 1 ? "" : "s"} logged`
                : "Log captures and dispositions when you have activity. They show on the client record and office Species log."}
            </p>
          )}
        </div>
        <ChevronDown size={18} className={`shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="border-t border-line px-5 pb-5 pt-4">
          {captures.map((capture) => (
            <p key={capture.id} className="py-1 text-sm">
              {capture.quantity} {capture.species.commonName} · {DISPOSITION_LABEL[capture.disposition]}
            </p>
          ))}
          <div className={captures.length ? "mt-4 border-t border-line pt-4" : ""}>
            <JobCaptureForm jobId={jobId} species={species} deployments={deployments} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
