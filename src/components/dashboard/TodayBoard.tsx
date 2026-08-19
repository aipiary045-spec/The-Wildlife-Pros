import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/utils";

type TodayOverview = Awaited<ReturnType<typeof import("@/lib/today").getTodayOverview>>;

export function TodayBoard({ data }: { data: TodayOverview }) {
  const { counts } = data;
  const urgentCount = counts.lateJobs + counts.pastDueInvoices;
  const followUpCount =
    counts.quotesApproved +
    counts.needsInvoice +
    counts.quotesWaiting +
    counts.staleTraps;
  const inboxCount = counts.newCalls + counts.unscheduled;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="card p-5 md:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">On the board</p>
            <h2 className="font-display text-2xl">
              {counts.todayJobs} stop{counts.todayJobs === 1 ? "" : "s"} today
            </h2>
          </div>
          <Link href="/schedule" className="text-sm font-semibold text-orange hover:underline">
            Open schedule
          </Link>
        </div>

        {data.todayJobs.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing on the calendar for today yet.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {data.todayJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-3 py-3 transition hover:text-orange"
                >
                  <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-stone-600">
                    {job.scheduledStart ? format(job.scheduledStart, "h:mm a") : "Flex"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{job.clientName}</span>
                    <span className="block truncate text-sm text-muted">
                      {job.title}
                      {job.technicianName !== "Unassigned" ? ` · ${job.technicianName}` : ""}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {urgentCount > 0 ? (
        <section className="card border-rose-100 bg-rose-50/40 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-rose-900">
            Needs a look ({urgentCount})
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.lateJobs.slice(0, 3).map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="font-medium text-rose-900 hover:underline">
                  Late {job.minutesLate}m · {job.clientName}
                </Link>
              </li>
            ))}
            {data.pastDueInvoices.slice(0, 3).map((invoice) => (
              <li key={invoice.id}>
                <Link href={`/invoices/${invoice.id}`} className="font-medium text-rose-900 hover:underline">
                  Past due · {invoice.clientName} · {formatMoney(invoice.balance)}
                </Link>
              </li>
            ))}
          </ul>
          {urgentCount > 3 ? (
            <p className="mt-3 text-sm text-rose-800/80">
              <Link href="/jobs?view=late" className="font-semibold hover:underline">
                View all urgent items
              </Link>
            </p>
          ) : null}
        </section>
      ) : (
        <p className="text-center text-sm text-stone-500">No late check-ins or past-due invoices.</p>
      )}

      {(followUpCount > 0 || inboxCount > 0) && (
        <details className="group card p-5 md:p-6">
          <summary className="cursor-pointer list-none text-sm font-semibold text-stone-700 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              <span>When you have a minute</span>
              <span className="text-xs font-medium text-muted group-open:hidden">
                {followUpCount + inboxCount} item{followUpCount + inboxCount === 1 ? "" : "s"}
              </span>
            </span>
          </summary>

          <div className="mt-4 space-y-5 text-sm">
            {inboxCount > 0 ? (
              <QuietLinks
                items={[
                  counts.newCalls > 0
                    ? { href: "/calls", label: `${counts.newCalls} call${counts.newCalls === 1 ? "" : "s"} to handle` }
                    : null,
                  counts.unscheduled > 0
                    ? {
                        href: "/jobs?view=needs_day",
                        label: `${counts.unscheduled} job${counts.unscheduled === 1 ? "" : "s"} need a day`,
                      }
                    : null,
                  counts.quotesWaiting > 0
                    ? {
                        href: "/quotes",
                        label: `${counts.quotesWaiting} quote${counts.quotesWaiting === 1 ? "" : "s"} waiting`,
                      }
                    : null,
                ]}
              />
            ) : null}

            {followUpCount > 0 ? (
              <div className="space-y-2">
                {data.quotesApproved.slice(0, 2).map((quote) => (
                  <QuietRow
                    key={quote.id}
                    href={`/quotes/${quote.id}`}
                    label={`Approved · ${quote.clientName}`}
                    detail={quote.title}
                  />
                ))}
                {data.needsInvoiceJobs.slice(0, 2).map((job) => (
                  <QuietRow
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    label={`Needs invoice · ${job.clientName}`}
                    detail={job.title}
                  />
                ))}
                {data.staleTraps.slice(0, 2).map((trap) => (
                  <QuietRow
                    key={trap.id}
                    href={`/jobs/${trap.jobId}`}
                    label={`Trap out · ${trap.clientName}`}
                    detail={`${trap.serial} since ${format(trap.deployedAt, "MMM d")}`}
                  />
                ))}
                {followUpCount > 6 ? (
                  <Link href="/invoices" className="inline-block pt-1 font-semibold text-orange hover:underline">
                    Open billing
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
      )}
    </div>
  );
}

function QuietLinks({ items }: { items: Array<{ href: string; label: string } | null> }) {
  const links = items.filter(Boolean) as Array<{ href: string; label: string }>;
  if (links.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {links.map((item) => (
        <li key={item.href + item.label}>
          <Link href={item.href} className="font-medium text-stone-700 hover:text-orange hover:underline">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function QuietRow({ href, label, detail }: { href: string; label: string; detail?: string }) {
  return (
    <Link href={href} className="block rounded-lg px-1 py-1 transition hover:bg-background/80">
      <span className="font-medium text-stone-800">{label}</span>
      {detail ? <span className="mt-0.5 block truncate text-muted">{detail}</span> : null}
    </Link>
  );
}
