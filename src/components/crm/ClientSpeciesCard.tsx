"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { CaptureLog, type CaptureLogRow } from "@/components/species/CaptureLog";

export function ClientSpeciesCard({ captures }: { captures: CaptureLogRow[] }) {
  const [open, setOpen] = useState(captures.length > 0);

  return (
    <section className="rounded-2xl border border-line bg-panel">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-semibold">Species log</h2>
          {open ? null : (
            <p className="text-sm text-stone-500">
              {captures.length
                ? `${captures.length} capture${captures.length === 1 ? "" : "s"} across their jobs`
                : "Captures logged on this client's jobs show up here and in the office Species log."}
            </p>
          )}
        </div>
        <ChevronDown size={18} className={`shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-line px-5 pb-5 pt-4">
          <p className="text-sm text-stone-600">
            Field staff log captures on each job. Those entries roll up here for this client and into the{" "}
            <Link href="/activity" className="font-medium text-orange hover:underline">
              office Species log
            </Link>
            .
          </p>
          <CaptureLog
            captures={captures}
            showJob
            emptyMessage="No captures yet. Log species on a work order when there is activity on site."
          />
        </div>
      ) : null}
    </section>
  );
}
