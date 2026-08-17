"use client";

import Link from "next/link";
import { NewClientButton } from "@/components/crm/NewClientDialog";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";
import type { ScheduleJobCard, ScheduleTech } from "@/components/schedule/job-card";
import type { ScheduleClient } from "@/components/schedule/NewJobDialog";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { formatMoney } from "@/lib/utils";

type DashboardProps = {
  today: {
    total: number;
    totalMoney: number;
    toGo: number;
    toGoMoney: number;
    active: number;
    activeMoney: number;
    completed: number;
    completedMoney: number;
  };
  requests: { new: number; assessed: number; converted: number; spark: number[] };
  quotes: {
    approved: { count: number; total: number };
    awaiting: { count: number; total: number };
    draft: { count: number; total: number };
    spark: number[];
    converted: number[];
  };
  jobs: {
    needsInvoice: { count: number; total: number };
    unscheduled: { count: number; total: number };
    active: { count: number; total: number };
    spark: number[];
    completed: number[];
  };
  invoices: {
    overdue: { count: number; total: number; balance: number };
    awaiting: { count: number; balance: number };
    draft: { count: number; total: number; balance: number };
    spark: number[];
    paid: number[];
  };
  payments: { collectedWeek: number; openBalance: number };
  fieldPulse: {
    activeTraps: number;
    clockedIn: number;
    latestCapture?: { species: string; address: string };
  };
  technicians: ScheduleTech[];
  clients: ScheduleClient[];
  jobsToday: ScheduleJobCard[];
  unscheduled: ScheduleJobCard[];
};

export function HomeDashboard(props: DashboardProps) {
  const todayKey = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">Home</p>
          <h1 className="font-display text-2xl tracking-wide md:text-3xl">Today at The Wildlife Pros</h1>
        </div>
        <NewClientButton />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PipelineCard
          title="Requests"
          accent="#38bdf8"
          rows={[
            { label: "New", count: props.requests.new },
            { label: "Assessed", count: props.requests.assessed },
            { label: "Converted", count: props.requests.converted },
          ]}
          action="Schedule visits"
          href="/schedule"
          spark={props.requests.spark}
        />
        <PipelineCard
          title="Quotes"
          accent="#e879f9"
          rows={[
            { label: "Approved", count: props.quotes.approved.count, money: props.quotes.approved.total },
            { label: "Awaiting", count: props.quotes.awaiting.count, money: props.quotes.awaiting.total },
            { label: "Draft", count: props.quotes.draft.count, money: props.quotes.draft.total },
          ]}
          action="Open quotes"
          href="/quotes"
          spark={props.quotes.spark}
          compare={props.quotes.converted}
        />
        <PipelineCard
          title="Jobs"
          accent="#eab308"
          rows={[
            { label: "Needs invoicing", count: props.jobs.needsInvoice.count, money: props.jobs.needsInvoice.total },
            { label: "Unscheduled", count: props.jobs.unscheduled.count, money: props.jobs.unscheduled.total },
            { label: "Active", count: props.jobs.active.count, money: props.jobs.active.total },
          ]}
          action="Batch from jobs"
          href="/jobs"
          spark={props.jobs.spark}
          compare={props.jobs.completed}
        />
        <PipelineCard
          title="Invoices"
          accent="#a78bfa"
          rows={[
            { label: "Past due", count: props.invoices.overdue.count, money: props.invoices.overdue.balance },
            { label: "Awaiting payment", count: props.invoices.awaiting.count, money: props.invoices.awaiting.balance },
            { label: "Draft", count: props.invoices.draft.count, money: props.invoices.draft.total },
          ]}
          action="View invoices"
          href="/invoices"
          spark={props.invoices.spark}
          compare={props.invoices.paid}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Today&apos;s appointments</h2>
          <Link href="/schedule?view=day" className="text-sm font-medium text-orange">
            Open calendar
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TodayStat label="Total" value={props.today.total} money={props.today.totalMoney} />
          <TodayStat label="To go" value={props.today.toGo} money={props.today.toGoMoney} />
          <TodayStat label="Active" value={props.today.active} money={props.today.activeMoney} />
          <TodayStat label="Completed" value={props.today.completed} money={props.today.completedMoney} />
        </div>
        <ScheduleWorkspace
          view="day"
          date={toDateKey(todayKey)}
          weekOf={toDateKey(todayKey)}
          technicians={props.technicians}
          jobs={props.jobsToday}
          unscheduled={props.unscheduled}
          clients={props.clients}
          compact
        />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-semibold">Square collections</h2>
            <p className="mt-3 text-sm text-stone-600">Collected this week</p>
            <p className="font-display text-3xl">{formatMoney(props.payments.collectedWeek)}</p>
            <p className="mt-3 text-sm text-stone-600">Still on the books</p>
            <p className="font-display text-2xl">{formatMoney(props.payments.openBalance)}</p>
            <p className="mt-3 text-xs text-stone-500">
              Staff take Terminal, POS, cash, or a keyed card on the invoice. Clients never pay in CritterOps.
            </p>
            <Link href="/invoices" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-orange">
              View invoices
            </Link>
          </article>
          <article className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-semibold">Field pulse</h2>
            <p className="mt-3 text-sm text-stone-600">Traps in the field</p>
            <p className="font-display text-2xl">{props.fieldPulse.activeTraps}</p>
            <p className="mt-3 text-sm text-stone-600">Clocked in</p>
            <p className="font-display text-2xl">{props.fieldPulse.clockedIn}</p>
            {props.fieldPulse.latestCapture ? (
              <p className="mt-3 text-sm text-stone-600">
                Latest capture: {props.fieldPulse.latestCapture.species} at {props.fieldPulse.latestCapture.address}
              </p>
            ) : (
              <p className="mt-3 text-sm text-stone-500">No captures logged yet today.</p>
            )}
            <Link href="/field" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-orange">
              Open field view
            </Link>
          </article>
      </section>
    </div>
  );
}

function TodayStat({ label, value, money }: { label: string; value: number; money: number }) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="font-display text-xl">{value}</p>
      <p className="text-xs text-stone-500">{formatMoney(money)}</p>
    </div>
  );
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
