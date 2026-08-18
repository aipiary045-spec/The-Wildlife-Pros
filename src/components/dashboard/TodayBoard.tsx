import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/utils";

type TodayOverview = Awaited<ReturnType<typeof import("@/lib/today").getTodayOverview>>;

export function TodayBoard({ data }: { data: TodayOverview }) {
  const { counts } = data;
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/schedule" label="On schedule today" value={counts.todayJobs} />
        <StatCard href="/jobs?view=needs_day" label="Need a day" value={counts.unscheduled} />
        <StatCard href="/calls" label="Calls to handle" value={counts.newCalls} />
        <StatCard href="/quotes" label="Quotes waiting" value={counts.quotesWaiting} />
        <StatCard href="/invoices" label="Past due" value={counts.pastDueInvoices} highlight={counts.pastDueInvoices > 0} />
        <StatCard href="/jobs?view=needs_invoice" label="Need invoice" value={counts.needsInvoice} />
        <StatCard href="/quotes" label="Approved, no job" value={counts.quotesApproved} />
        <StatCard href="/jobs" label="Late check-ins" value={counts.lateJobs} highlight={counts.lateJobs > 0} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Today's work orders" href="/schedule">
          {data.todayJobs.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing scheduled for today yet.</p>
          ) : (
            data.todayJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block py-2 text-sm hover:text-orange">
                <span className="font-medium">
                  {job.scheduledStart ? format(job.scheduledStart, "h:mm a") : "Flex"} · {job.number}
                </span>
                <span className="block text-stone-600">
                  {job.title} · {job.clientName}
                </span>
              </Link>
            ))
          )}
        </Panel>

        <Panel title="Needs attention" href="/more">
          {data.lateJobs.length === 0 && data.quotesWaiting.length === 0 && data.pastDueInvoices.length === 0 ? (
            <p className="text-sm text-stone-500">You're caught up on the urgent stuff.</p>
          ) : (
            <>
              {data.lateJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block py-2 text-sm text-rose-800 hover:underline">
                  Late {job.minutesLate}m · {job.number} · {job.clientName}
                </Link>
              ))}
              {data.quotesWaiting.map((quote) => (
                <Link key={quote.id} href={`/quotes/${quote.id}`} className="block py-2 text-sm hover:text-orange">
                  Quote waiting · {quote.number} · {quote.clientName}
                </Link>
              ))}
              {data.pastDueInvoices.map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block py-2 text-sm hover:text-orange">
                  Past due · {invoice.number} · {formatMoney(invoice.balance)}
                </Link>
              ))}
            </>
          )}
        </Panel>
      </div>

      <section className="flex flex-wrap gap-2">
        <QuickLink href="/calls" label="Call log" />
        <QuickLink href="/quotes" label="Quotes" />
        <QuickLink href="/invoices" label="Invoices" />
        <QuickLink href="/schedule" label="Schedule" />
        <QuickLink href="/clients" label="Clients" />
        <QuickLink href="/activity" label="Species log" />
        <QuickLink href="/exports" label="Exports" />
      </section>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  highlight = false,
}: {
  href: string;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 ${highlight ? "border-rose-200 bg-rose-50" : "border-line bg-panel"}`}
    >
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-stone-600">{label}</p>
    </Link>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-orange hover:underline">
          Open
        </Link>
      </div>
      {children}
    </section>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold hover:border-orange hover:text-orange">
      {label}
    </Link>
  );
}
