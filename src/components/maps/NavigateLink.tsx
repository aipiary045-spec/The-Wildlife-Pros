"use client";

import { Navigation } from "lucide-react";
import { appleMapsDirUrl, googleMapsDirUrl, googleMapsRouteUrl, type MapPlace } from "@/lib/maps";
import { cn } from "@/lib/utils";

export function NavigateLink({
  destination,
  stops,
  label = "Navigate",
  className,
}: {
  destination?: MapPlace;
  stops?: MapPlace[];
  label?: string;
  className?: string;
}) {
  const google = stops?.length ? googleMapsRouteUrl(stops) : destination ? googleMapsDirUrl(destination) : null;
  const apple = destination && !stops?.length ? appleMapsDirUrl(destination) : null;
  if (!google) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <a
        href={google}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-orange px-3 text-sm font-semibold text-white"
      >
        <Navigation size={14} />
        {label}
      </a>
      {apple ? (
        <a href={apple} target="_blank" rel="noreferrer" className="text-xs font-medium text-orange">
          Apple Maps
        </a>
      ) : null}
    </span>
  );
}
