import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canBillQuote } from "@/lib/billing-access";
import { QuoteInvoiceError, convertQuoteToInvoice } from "@/lib/quote-invoice";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canBillQuote(session)) return jsonError("You cannot invoice quotes.", 403);
  const { id } = await context.params;
  try {
    const invoice = await convertQuoteToInvoice({ quoteId: id, createdById: session.id });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof QuoteInvoiceError) return jsonError(error.message, error.status);
    throw error;
  }
}
