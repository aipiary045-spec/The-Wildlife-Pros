import { isTechnician } from "@/lib/paths";

export function canBillQuote(session: { role: string }) {
  return !isTechnician(session.role);
}

export function canBillJob(session: { role: string }) {
  return !isTechnician(session.role);
}

export function canAccessInvoice(session: { role: string }) {
  return !isTechnician(session.role);
}

export function canAccessQuote(session: { role: string }) {
  return true;
}
