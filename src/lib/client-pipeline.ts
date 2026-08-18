export type PipelineStage = {
  id: string;
  label: string;
  state: "done" | "current" | "upcoming" | "skipped";
  href?: string;
};

export function buildClientPipeline(input: {
  openCalls: number;
  quotes: Array<{ id: string; status: string }>;
  jobs: Array<{ id: string; status: string }>;
  invoices: Array<{ id: string; status: string; balance: number | { toString(): string } }>;
}): PipelineStage[] {
  const waitingQuote = input.quotes.some((quote) => ["SENT", "VIEWED"].includes(quote.status));
  const approvedQuote = input.quotes.some((quote) => quote.status === "APPROVED");
  const activeJob = input.jobs.some((job) => !["COMPLETED", "INVOICED", "CANCELLED"].includes(job.status));
  const completedJob = input.jobs.some((job) => ["COMPLETED", "INVOICED"].includes(job.status));
  const openInvoice = input.invoices.some(
    (invoice) => !["PAID", "VOID"].includes(invoice.status) && Number(invoice.balance) > 0,
  );
  const paid = input.invoices.some((invoice) => invoice.status === "PAID");

  const stages: Array<Omit<PipelineStage, "state">> = [
    { id: "call", label: "Call / intake" },
    { id: "quote", label: "Quote" },
    { id: "job", label: "Work order" },
    { id: "invoice", label: "Invoice" },
    { id: "paid", label: "Paid" },
  ];

  const flags = {
    call: input.openCalls > 0 || waitingQuote || approvedQuote || activeJob || completedJob || openInvoice || paid,
    quote: waitingQuote || approvedQuote || activeJob || completedJob || openInvoice || paid,
    job: activeJob || completedJob || openInvoice || paid,
    invoice: openInvoice || paid,
    paid,
  };

  let currentSet = false;
  return stages.map((stage) => {
    const id = stage.id as keyof typeof flags;
    if (!flags[id]) {
      return { ...stage, state: "skipped" as const };
    }
    if (paid && id === "paid") {
      return { ...stage, state: "done" as const };
    }
    if (paid) {
      return { ...stage, state: "done" as const };
    }
    if (!currentSet) {
      if (
        (id === "call" && input.openCalls > 0) ||
        (id === "quote" && (waitingQuote || approvedQuote) && !activeJob && !completedJob) ||
        (id === "job" && activeJob) ||
        (id === "invoice" && openInvoice) ||
        (id === "paid" && false)
      ) {
        currentSet = true;
        return { ...stage, state: "current" as const };
      }
      if (
        (id === "call" && !waitingQuote && !approvedQuote && !activeJob) ||
        (id === "quote" && approvedQuote && !activeJob) ||
        (id === "job" && completedJob && openInvoice) ||
        (id === "invoice" && !openInvoice && !paid)
      ) {
        return { ...stage, state: "done" as const };
      }
    }
    if (id === "call" && !input.openCalls && (waitingQuote || approvedQuote || activeJob || completedJob)) {
      return { ...stage, state: "done" as const };
    }
    if (id === "quote" && (activeJob || completedJob || openInvoice) && !waitingQuote) {
      return { ...stage, state: "done" as const };
    }
    if (id === "job" && (openInvoice || paid) && !activeJob) {
      return { ...stage, state: "done" as const };
    }
    if (id === "invoice" && paid) {
      return { ...stage, state: "done" as const };
    }
    if (!currentSet && flags[id]) {
      currentSet = true;
      return { ...stage, state: "current" as const };
    }
    return { ...stage, state: currentSet ? ("upcoming" as const) : ("done" as const) };
  });
}
