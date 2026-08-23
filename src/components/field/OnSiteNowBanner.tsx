import Link from "next/link";
import { formatOnSiteDuration, type ActiveCheckIn } from "@/lib/active-checkins";

export function OnSiteNowBanner({ checkIn }: { checkIn: ActiveCheckIn }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-900">Checked in now</p>
      <h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">{checkIn.jobTitle}</h2>
      <p className="mt-1 text-sm text-emerald-900">
        {checkIn.jobNumber} · {checkIn.clientName} · {formatOnSiteDuration(checkIn.minutesOnSite)}
      </p>
      <p className="mt-1 text-sm text-emerald-800">{checkIn.address}</p>
      <Link
        href={`/jobs/${checkIn.jobId}`}
        className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white"
      >
        Open job to check out
      </Link>
    </div>
  );
}
