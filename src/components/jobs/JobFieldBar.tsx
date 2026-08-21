"use client";

import Link from "next/link";
import { MapPin, Squirrel } from "lucide-react";
import { NotifyCustomerButton } from "@/components/jobs/NotifyCustomerButton";

export function JobFieldBar({
  jobId,
  status,
  address,
  notify,
}: {
  jobId: string;
  status: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  notify?: {
    jobId: string;
    clientPhone: string | null;
    smsHref: string | null;
    autoSendSms: boolean;
  } | null;
}) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 border-t border-line bg-panel/95 px-3 py-2 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-2 text-xs font-semibold text-white sm:text-sm"
        >
          <MapPin size={16} />
          Navigate
        </a>
        {notify ? (
          <NotifyCustomerButton
            jobId={notify.jobId}
            clientPhone={notify.clientPhone}
            smsHref={notify.smsHref}
            autoSendSms={notify.autoSendSms}
            compact
          />
        ) : null}
        <Link
          href={`/jobs/${jobId}#species`}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-2 text-xs font-semibold sm:text-sm"
        >
          <Squirrel size={16} />
          Species
        </Link>
        {status === "ON_SITE" || status === "IN_PROGRESS" ? (
          <a
            href="#check-out"
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-2 text-xs font-semibold text-white sm:text-sm"
          >
            Check out
          </a>
        ) : (
          <a
            href="#check-in"
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-orange px-2 text-xs font-semibold text-white sm:text-sm"
          >
            Check in
          </a>
        )}
      </div>
    </div>
  );
}
