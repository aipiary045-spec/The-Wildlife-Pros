import { isTechnician } from "@/lib/paths";

export function canBillJob(
  session: { id: string; role: string },
  job: { technicianId: string | null },
) {
  if (!isTechnician(session.role)) return true;
  return job.technicianId === session.id;
}

export function canAccessInvoice(
  session: { id: string; role: string },
  invoice: { job: { technicianId: string | null } | null },
) {
  if (!isTechnician(session.role)) return true;
  if (!invoice.job) return false;
  return invoice.job.technicianId === session.id;
}
