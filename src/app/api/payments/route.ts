import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/billing";
import { jsonError, withAuth } from "@/lib/api";
import { canAccessInvoice } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as {
    invoiceId?: string;
    amount?: number;
    method?: "CASH" | "CHECK" | "SQUARE" | "CARD" | "ACH" | "OTHER";
    reference?: string;
    notes?: string;
  };
  if (!body.invoiceId || body.amount == null) {
    return jsonError("invoiceId and amount are required");
  }
  const invoice = await prisma.invoice.findUnique({
    where: { id: body.invoiceId },
    include: { job: { select: { technicianId: true } } },
  });
  if (!invoice) return jsonError("Invoice not found", 404);
  if (!canAccessInvoice(session)) return jsonError("Office collects payment. Technicians do not take invoices.", 403);
  try {
    const result = await recordPayment({
      invoiceId: body.invoiceId,
      amount: Number(body.amount),
      method: body.method ?? "SQUARE",
      reference: body.reference,
      notes: body.notes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to record payment");
  }
});
