import { PipelineCard } from "@/components/dashboard/PipelineCard";

export type PipelineOverviewData = {
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
};

export function PipelineOverview(props: PipelineOverviewData) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <PipelineCard
        title="Requests"
        accent="#38bdf8"
        rows={[
          { label: "New", count: props.requests.new },
          { label: "Assessed", count: props.requests.assessed },
          { label: "Converted", count: props.requests.converted },
        ]}
        action="Open schedule"
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
        action="Open work orders"
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
  );
}
