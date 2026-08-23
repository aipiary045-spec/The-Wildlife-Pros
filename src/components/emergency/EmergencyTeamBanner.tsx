import Link from "next/link";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { Siren } from "lucide-react";

export function EmergencyTeamBanner({
  jobId,
  title,
  address,
  assignedTechName,
  lat,
  lng,
}: {
  jobId: string;
  title: string;
  address: string;
  assignedTechName: string;
  lat?: number | null;
  lng?: number | null;
}) {
  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Siren className="mt-0.5 shrink-0 text-amber-800" size={22} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-900">Team emergency</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-amber-950">{title}</h2>
          <p className="mt-1 text-sm text-amber-900">{address}</p>
          <p className="mt-2 text-sm text-amber-900">
            {assignedTechName} is assigned. Jump in from field route or open the job if you can get there sooner.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <NavigateLink
              destination={{ address, lat, lng }}
              label="Navigate"
              className="[&>a]:rounded-lg [&>a]:bg-amber-800 [&>a]:px-4 [&>a]:py-2 [&>a]:text-sm [&>a]:font-semibold [&>a]:text-white"
            />
            <Link
              href={`/jobs/${jobId}`}
              className="inline-flex min-h-10 items-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-950"
            >
              Open job
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
