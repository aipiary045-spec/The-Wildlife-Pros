export type QuoteLineForJob = {
  name: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  serviceId?: string | null;
  service?: { jobType?: string | null } | null;
};

export function jobTypeFromQuoteLines(items: QuoteLineForJob[]) {
  const typed = items.find((item) => item.service?.jobType)?.service?.jobType;
  return typed || "INSPECTION";
}

export function quoteCanConvert(status: string) {
  return !["DECLINED", "EXPIRED", "CONVERTED"].includes(status);
}

export function quoteCanInvoice(status: string) {
  return ["SENT", "VIEWED", "APPROVED", "CONVERTED"].includes(status);
}

export type QuoteBillingAction = "create" | "pay" | "paid" | "waiting" | null;

export function quoteBillingAction(
  quote: { status: string },
  invoice: { balance: number } | null | undefined,
): QuoteBillingAction {
  if (invoice) return Number(invoice.balance) > 0 ? "pay" : "paid";
  if (quoteCanInvoice(quote.status)) return "create";
  if (quote.status === "DRAFT") return "waiting";
  return null;
}
