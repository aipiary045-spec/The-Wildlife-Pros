"use client";

import { useJobVisit } from "@/components/jobs/JobVisitGate";

export function JobFieldWorkGate({ children }: { children: React.ReactNode }) {
  const { fieldWorkUnlocked } = useJobVisit();

  if (!fieldWorkUnlocked) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-panel/60 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Check in first</p>
        <h2 className="mt-2 font-display text-xl">Field work unlocks after check-in</h2>
        <p className="mt-2 text-sm text-stone-600">
          Tap Check in when you arrive to log traps, captures, entry points, and photos on this page.
        </p>
      </section>
    );
  }

  return <div id="job-field-work">{children}</div>;
}
