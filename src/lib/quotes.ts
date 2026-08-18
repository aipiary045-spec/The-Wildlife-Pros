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
  return ["SENT", "VIEWED", "APPROVED"].includes(status);
}
