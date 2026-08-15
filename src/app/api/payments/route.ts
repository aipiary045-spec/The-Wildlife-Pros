import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/billing";
import { jsonError, withAuth } from "@/lib/api";

export const POST = withAuth(async (_session, request) => {
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
