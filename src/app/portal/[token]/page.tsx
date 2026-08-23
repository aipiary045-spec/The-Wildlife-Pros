"use client";

import { use, useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { StatusBadge } from "@/components/ui/StatusBadge";

type PortalData = {
  client: {
    firstName: string;
    lastName: string;
    jobs: Array<{
      id: string;
      title: string;
      status: string;
      scheduledStart: string | null;
      property: { address1: string };
      technician: { firstName: string; lastName: string } | null;
    }>;
  };
};

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PortalData["client"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/portal/${token}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setData(payload.client ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!data) {
    return <p className="p-8 text-stone-500">Loading…</p>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sunset-panel relative overflow-hidden px-6 py-12 text-ink">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.2),transparent_45%)]" />
        <div className="relative mx-auto flex max-w-3xl items-center gap-5">
          <div className="rounded-2xl bg-black/10 p-2 ring-1 ring-black/10">
            <Logo size={72} />
          </div>
          <div>
            <p className="page-eyebrow text-ink/80">The Wildlife Pros</p>
            <h1 className="font-display text-3xl tracking-wide">Hello, {data.firstName}</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink/75">
              Upcoming visits and service updates from your wildlife team.
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <section className="card p-5 md:p-6">
          <h2 className="text-base font-semibold">Upcoming visits</h2>
          {data.jobs.length === 0 ? <p className="mt-2 text-sm text-muted-soft">No upcoming appointments.</p> : null}
          {data.jobs.map((job) => (
            <div key={job.id} className="border-t border-line py-4 first:mt-3 first:border-0 first:pt-0">
              <div className="flex justify-between gap-3">
                <p className="font-semibold">{job.title}</p>
                <StatusBadge status={job.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {job.property.address1}
                {job.technician ? ` · ${job.technician.firstName}` : ""}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
