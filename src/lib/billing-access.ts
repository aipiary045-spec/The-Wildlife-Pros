import { isTechnician } from "@/lib/paths";

/** Staff may invoice from an approved quote (field or office). */
export function canBillQuote(session: { id: string; role: string }) {
  return Boolean(session.id && session.role);
}

/** Technicians cannot create invoices from work orders — office only. */
export function canBillJob(
  session: { id: string; role: string },
  _job: { technicianId: string | null },
) {
  return !isTechnician(session.role);
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
  return Boolean(session.role);
}
