import { formatTripVisitLabel, type TripVisitInfo } from "@/lib/job-trips";
import { cn } from "@/lib/utils";

export function TripVisitBadge({
  info,
  className,
  compact = false,
}: {
  info: TripVisitInfo | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  if (!info) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        info.overIncluded ? "bg-amber-100 text-amber-900" : "bg-orange/15 text-orange",
        className,
      )}
    >
      {formatTripVisitLabel(info)}
      {info.overIncluded ? " · extra" : ""}
    </span>
  );
}
