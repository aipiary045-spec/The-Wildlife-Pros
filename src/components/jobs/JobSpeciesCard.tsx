"use client";

import { CollapsibleJobSection } from "@/components/jobs/CollapsibleJobSection";
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
  return (
    <CollapsibleJobSection
      id="species"
      title="Animals captured"
      collapsedHint={captures.length ? `${captures.length} logged` : undefined}
      defaultOpen={captures.length > 0}
    >
      {captures.map((capture) => (
        <p key={capture.id} className="py-1 text-sm">
          {capture.quantity} {capture.species.commonName} · {DISPOSITION_LABEL[capture.disposition]}
        </p>
      ))}
      <div className={captures.length ? "border-t border-line pt-4" : ""}>
        <JobCaptureForm jobId={jobId} species={species} deployments={deployments} />
      </div>
    </CollapsibleJobSection>
  );
}
