"use client";

import Link from "next/link";
import { Squirrel, MapPin } from "lucide-react";

export function JobFieldBar({
  jobId,
  status,
  address,
  lat,
  lng,
}: {
  jobId: string;
  status: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-panel/95 px-3 py-2 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white"
        >
          <MapPin size={16} />
          Navigate
        </a>
        <Link
          href={`/jobs/${jobId}#species`}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold"
        >
          <Squirrel size={16} />
          Species
        </Link>
        {status === "ON_SITE" || status === "IN_PROGRESS" ? (
          <a
            href="#check-out"
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-3 text-sm font-semibold text-white"
          >
            Check out
          </a>
        ) : (
          <a
            href="#check-in"
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-3 text-sm font-semibold text-white"
          >
            Check in
          </a>
        )}
      </div>
    </div>
  );
}
