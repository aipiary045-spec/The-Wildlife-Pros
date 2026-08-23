"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  assignedTechName?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  const router = useRouter();
  const [stealing, setStealing] = useState(false);
  const [hidden, setHidden] = useState(false);

  async function stealJob() {
    setStealing(true);
    try {
      const response = await fetch(`/api/emergency-dispatch/${jobId}/steal`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) return;
      setHidden(true);
      router.push(`/jobs/${jobId}`);
      router.refresh();
    } finally {
      setStealing(false);
    }
  }

  if (hidden) return null;

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Siren className="mt-0.5 shrink-0 text-amber-800" size={22} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-900">Team emergency</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-amber-950">{title}</h2>
          <p className="mt-1 text-sm text-amber-900">{address}</p>
          <p className="mt-2 text-sm text-amber-900">
            {assignedTechName
              ? `${assignedTechName} is assigned. Steal the job if you can get there sooner — it moves to your route.`
              : "Unassigned emergency. Steal the job if you can get there sooner — it moves to your route."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <NavigateLink
              destination={{ address, lat, lng }}
              label="Navigate"
              className="[&>a]:rounded-lg [&>a]:bg-amber-800 [&>a]:px-4 [&>a]:py-2 [&>a]:text-sm [&>a]:font-semibold [&>a]:text-white"
            />
            <button
              type="button"
              disabled={stealing}
              onClick={() => void stealJob()}
              className="inline-flex min-h-10 items-center rounded-lg bg-amber-800 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {stealing ? "Stealing…" : "Steal job"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
