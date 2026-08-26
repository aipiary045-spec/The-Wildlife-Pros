import Link from "next/link";
import { formatOnSiteDuration, type ActiveCheckIn } from "@/lib/active-checkins";

/** Stays pinned under the app header while scrolling the field route. */
export function OnSiteNowBanner({ checkIn }: { checkIn: ActiveCheckIn }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-emerald-300 bg-emerald-50/95 px-4 py-3 shadow-sm backdrop-blur md:-mx-8 md:px-8">
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-900">On site now</p>
          <p className="mt-0.5 truncate font-semibold text-emerald-950">
            {checkIn.jobNumber} · {checkIn.jobTitle}
          </p>
          <p className="text-xs text-emerald-800">{formatOnSiteDuration(checkIn.minutesOnSite)}</p>
        </div>
        <Link
          href={`/jobs/${checkIn.jobId}#check-in`}
          className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white"
        >
          Check out
        </Link>
      </div>
    </div>
  );
}
