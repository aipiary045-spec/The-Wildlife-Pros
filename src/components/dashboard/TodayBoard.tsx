import Link from "next/link";
import { format } from "date-fns";
import { Phone, Navigation } from "lucide-react";
import { telHref } from "@/lib/intake";
import { googleMapsDirUrl } from "@/lib/maps";
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
        <StatCard href="/inventory" label="Traps out 7+ days" value={counts.staleTraps} highlight={counts.staleTraps > 0} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Today's work orders" href="/schedule">
          {data.todayJobs.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing scheduled for today yet.</p>
          ) : (
            data.todayJobs.map((job) => (
              <TodayRow
                key={job.id}
                href={`/jobs/${job.id}`}
                primary={`${job.scheduledStart ? format(job.scheduledStart, "h:mm a") : "Flex"} · ${job.number}`}
                secondary={`${job.title} · ${job.clientName}`}
                phone={job.clientPhone}
                address={job.address}
              />
            ))
          )}
        </Panel>

        <Panel title="Billing follow-up" href="/invoices">
          {data.quotesApproved.length === 0 && data.needsInvoiceJobs.length === 0 ? (
            <p className="text-sm text-stone-500">No approved quotes or finished jobs waiting on billing.</p>
          ) : (
            <>
              {data.quotesApproved.map((quote) => (
                <TodayRow
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  primary={`Approved · ${quote.number} · ${quote.clientName}`}
                  secondary={quote.title}
                  phone={quote.clientPhone}
                />
              ))}
              {data.needsInvoiceJobs.map((job) => (
                <TodayRow
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  primary={`Needs invoice · ${job.number} · ${job.clientName}`}
                  secondary={
                    job.completedAt
                      ? `${job.title} · finished ${format(job.completedAt, "MMM d")}`
                      : job.title
                  }
                  phone={job.clientPhone}
                  address={job.address}
                />
              ))}
            </>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Needs attention" href="/more">
          {data.lateJobs.length === 0 &&
          data.quotesWaiting.length === 0 &&
          data.pastDueInvoices.length === 0 &&
          data.staleTraps.length === 0 ? (
            <p className="text-sm text-stone-500">You're caught up on the urgent stuff.</p>
          ) : (
            <>
              {data.lateJobs.map((job) => (
                <TodayRow
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  primary={`Late ${job.minutesLate}m · ${job.number} · ${job.clientName}`}
                  secondary={job.address}
                  phone={job.clientPhone}
                  address={job.address}
                  tone="urgent"
                />
              ))}
              {data.staleTraps.map((trap) => (
                <TodayRow
                  key={trap.id}
                  href={`/jobs/${trap.jobId}`}
                  primary={`Trap ${trap.serial} out since ${format(trap.deployedAt, "MMM d")}`}
                  secondary={`${trap.clientName} · ${trap.locationNote}`}
                />
              ))}
              {data.quotesWaiting.map((quote) => (
                <TodayRow
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  primary={`Quote waiting · ${quote.number} · ${quote.clientName}`}
                  secondary={quote.title}
                  phone={quote.clientPhone}
                />
              ))}
              {data.pastDueInvoices.map((invoice) => (
                <TodayRow
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  primary={`Past due · ${invoice.number} · ${formatMoney(invoice.balance)}`}
                  secondary={invoice.clientName}
                  phone={invoice.clientPhone}
                />
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

function TodayRow({
  href,
  primary,
  secondary,
  phone,
  address,
  tone = "default",
}: {
  href: string;
  primary: string;
  secondary?: string;
  phone?: string | null;
  address?: string;
  tone?: "default" | "urgent";
}) {
  const callHref = telHref(phone);
  const navHref = address ? googleMapsDirUrl({ address }) : null;
  return (
    <div className={`flex items-start justify-between gap-2 border-b border-line/60 py-3 text-sm last:border-0 ${tone === "urgent" ? "text-rose-800" : ""}`}>
      <Link href={href} className="min-w-0 flex-1 transition hover:text-orange">
        <span className="font-semibold">{primary}</span>
        {secondary ? <span className="mt-0.5 block text-muted">{secondary}</span> : null}
      </Link>
      <div className="flex shrink-0 gap-1.5">
        {callHref ? (
          <a href={callHref} aria-label="Call" className="btn-secondary h-9 w-9 !p-0">
            <Phone size={16} />
          </a>
        ) : null}
        {navHref ? (
          <a
            href={navHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Navigate"
            className="btn-secondary h-9 w-9 !p-0"
          >
            <Navigation size={16} />
          </a>
        ) : null}
      </div>
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
      className={`card card-interactive p-4 ${highlight ? "border-rose-200 bg-gradient-to-br from-rose-50 to-panel ring-1 ring-rose-100" : ""}`}
    >
      <p className="stat-value">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted">{label}</p>
    </Link>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <Link href={href} className="text-sm font-bold text-orange hover:underline">
          Open
        </Link>
      </div>
      {children}
    </section>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="chip hover:border-orange/35">
      {label}
    </Link>
  );
}
