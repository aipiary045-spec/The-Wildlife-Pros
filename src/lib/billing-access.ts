import { isTechnician } from "@/lib/paths";

export function canBillQuote(session: { id: string; role: string }) {
  if (!isTechnician(session.role)) return true;
  return true;
}

export function canBillJob(
  session: { id: string; role: string },
  job: { technicianId: string | null },
) {
  if (!isTechnician(session.role)) return true;
  return false;
}

export function canAccessInvoice(
  session: { id: string; role: string },
  invoice: {
    createdById?: string | null;
    quoteId?: string | null;
    job: { technicianId: string | null } | null;
  },
) {
  if (!isTechnician(session.role)) return true;
  if (invoice.quoteId && invoice.createdById === session.id) return true;
  if (invoice.job?.technicianId === session.id) return true;
  return false;
}

export function canAccessQuote(session: { role: string }) {
  return true;
}
