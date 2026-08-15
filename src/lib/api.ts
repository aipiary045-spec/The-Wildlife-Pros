import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";

export async function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function withAuth(
  handler: (session: SessionUser, request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    const session = await getSession();
    if (!session) {
      return jsonError("Sign in required", 401);
    }
    try {
      return await handler(session, request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      return jsonError(message, 500);
    }
  };
}

export function lineTotals(
  items: Array<{ quantity: number; unitPrice: number; taxable?: boolean }>,
  taxRate = 0.07,
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxable = items
    .filter((item) => item.taxable !== false)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Number((taxable * taxRate).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount,
    total,
  };
}
