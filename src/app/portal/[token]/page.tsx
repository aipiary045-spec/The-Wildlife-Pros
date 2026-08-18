"use client";

import { use, useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/utils";

type PortalLineItem = {
  name: string;
  quantity: number | { toString(): string };
  unitPrice: number | { toString(): string };
};

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
    quotes: Array<{
      id: string;
      number: string;
      title: string;
      status: string;
      total: string;
      subtotal: string;
      taxAmount: string;
      message: string | null;
      lineItems: PortalLineItem[];
    }>;
  };
};

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PortalData["client"] | null>(null);
  const [message, setMessage] = useState("");

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

  async function act(type: "approve_quote" | "decline_quote", id: string) {
    const response = await fetch(`/api/portal/${token}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    if (response.ok) {
      setMessage("Saved. Thank you.");
      const refreshed = await fetch(`/api/portal/${token}`).then((item) => item.json());
      setData(refreshed.client);
    }
  }

  if (!data) {
    return <p className="p-8 text-stone-500">Loading…</p>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sunset-panel px-6 py-10 text-ink">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <Logo size={72} />
          <div>
            <p className="font-display tracking-[0.2em]">THE WILDLIFE PROS</p>
            <h1 className="text-3xl font-semibold">Hello, {data.firstName}</h1>
            <p>Upcoming visits and quote approvals. Payments are taken by our crew through Square.</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Upcoming visits</h2>
          {data.jobs.length === 0 ? <p className="text-sm text-stone-500">No upcoming appointments.</p> : null}
          {data.jobs.map((job) => (
            <div key={job.id} className="border-t border-line py-3 first:border-0">
              <div className="flex justify-between gap-3">
                <p className="font-medium">{job.title}</p>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-sm text-stone-600">
                {job.property.address1}
                {job.technician ? ` · ${job.technician.firstName}` : ""}
              </p>
            </div>
          ))}
        </section>
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Quotes</h2>
          {data.quotes.map((quote) => (
            <article key={quote.id} className="border-t border-line py-3 first:border-0">
              <div className="flex justify-between">
                <p className="font-medium">
                  {quote.number} · {quote.title}
                </p>
                <StatusBadge status={quote.status} />
              </div>
              {quote.message ? <p className="mt-1 text-sm text-stone-600">{quote.message}</p> : null}
              {quote.lineItems.length > 0 ? (
                <ul className="mt-3 space-y-1 rounded-xl bg-background px-3 py-2 text-sm">
                  {quote.lineItems.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
                      <span>
                        {item.name} × {Number(item.quantity)}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(Number(item.quantity) * Number(item.unitPrice))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-sm text-stone-600">
                {formatMoney(quote.subtotal)} + tax {formatMoney(quote.taxAmount)} ={" "}
                <span className="font-semibold text-ink">{formatMoney(quote.total)}</span>
              </p>
              {quote.status === "SENT" || quote.status === "VIEWED" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => act("approve_quote", quote.id)}
                    className="rounded-lg bg-orange px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => act("decline_quote", quote.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  >
                    Decline
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
