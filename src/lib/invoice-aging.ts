import { startOfDay } from "date-fns";

export type InvoiceAge = "draft" | "not_yet_due" | "due" | "past_due" | "paid";

export function invoiceAge(
  invoice: { status: string; dueOn: Date | string | null; balance: number | string },
  now = new Date(),
): InvoiceAge {
  if (invoice.status === "VOID" || invoice.status === "PAID" || Number(invoice.balance) <= 0) {
    return "paid";
  }
  if (invoice.status === "DRAFT") return "draft";
  if (!invoice.dueOn) return "due";
  const due = startOfDay(new Date(invoice.dueOn)).getTime();
  const today = startOfDay(now).getTime();
  if (due < today || invoice.status === "OVERDUE") return "past_due";
  if (due === today) return "due";
  return "not_yet_due";
}

export function groupInvoicesByAge<T extends { status: string; dueOn: Date | string | null; balance: number | string }>(
  invoices: T[],
  now = new Date(),
) {
  const draft: T[] = [];
  const notYetDue: T[] = [];
  const due: T[] = [];
  const pastDue: T[] = [];
  const paid: T[] = [];
  for (const invoice of invoices) {
    const age = invoiceAge(invoice, now);
    if (age === "draft") draft.push(invoice);
    else if (age === "not_yet_due") notYetDue.push(invoice);
    else if (age === "due") due.push(invoice);
    else if (age === "past_due") pastDue.push(invoice);
    else paid.push(invoice);
  }
  return { pastDue, due, notYetDue, draft, paid };
}
