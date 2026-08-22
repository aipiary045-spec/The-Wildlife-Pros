"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { Siren } from "lucide-react";

export function EmergencyFieldBanner({
  jobId,
  title,
  address,
  message,
  lat,
  lng,
}: {
  jobId: string;
  title: string;
  address: string;
  message: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const router = useRouter();
  const [acking, setAcking] = useState(false);
  const [hidden, setHidden] = useState(false);

  async function acknowledge() {
    setAcking(true);
    try {
      const response = await fetch(`/api/emergency-dispatch/${jobId}/ack`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) return;
      setHidden(true);
      router.refresh();
    } finally {
      setAcking(false);
    }
  }

  if (hidden) return null;

  return (
    <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Siren className="mt-0.5 shrink-0 text-rose-700" size={22} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-800">Emergency — go now</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-rose-950">{title}</h2>
          <p className="mt-1 text-sm text-rose-900">{address}</p>
          {message ? <p className="mt-2 text-sm text-rose-800">{message}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <NavigateLink
              destination={{ address, lat, lng }}
              label="Navigate"
              className="[&>a]:rounded-lg [&>a]:bg-rose-700 [&>a]:px-4 [&>a]:py-2 [&>a]:text-sm [&>a]:font-semibold [&>a]:text-white"
            />
            <Link
              href={`/jobs/${jobId}`}
              className="inline-flex min-h-10 items-center rounded-lg border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-900"
            >
              Open job
            </Link>
            <button
              type="button"
              disabled={acking}
              onClick={() => void acknowledge()}
              className="inline-flex min-h-10 items-center rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {acking ? "Saving…" : "Got it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
