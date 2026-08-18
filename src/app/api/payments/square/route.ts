import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordPayment } from "@/lib/billing";
import { jsonError, withAuth } from "@/lib/api";
import { canAccessInvoice } from "@/lib/billing-access";
import { dollarsToCents, getSquareClient, squarePublicConfig } from "@/lib/square";

export const POST = withAuth(async (session, request) => {
  const config = squarePublicConfig();
  if (!config.configured) {
    return jsonError("Square is not configured. Add access token, location, and application ID.", 503);
  }

  const body = (await request.json()) as {
    invoiceId?: string;
    sourceId?: string;
    amount?: number;
    idempotencyKey?: string;
  };
  if (!body.invoiceId || !body.sourceId || body.amount == null) {
    return jsonError("invoiceId, sourceId, and amount are required");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: body.invoiceId },
    include: { client: true, job: { select: { technicianId: true } } },
  });
  if (!invoice) return jsonError("Invoice not found", 404);
  if (!canAccessInvoice(session, invoice)) return jsonError("You cannot collect on this invoice.", 403);

  const client = getSquareClient();
  if (!client) return jsonError("Square is not configured", 503);

  try {
    const response = await client.payments.create({
      sourceId: body.sourceId,
      idempotencyKey: body.idempotencyKey ?? crypto.randomUUID(),
      amountMoney: {
        amount: dollarsToCents(Number(body.amount)),
        currency: "USD",
      },
      autocomplete: true,
      locationId: config.locationId,
      referenceId: invoice.number,
      note: `CritterOps ${invoice.number} · ${invoice.client.lastName}`,
    });

    const squarePayment = response.payment;
    if (!squarePayment?.id) {
      return jsonError("Square did not return a payment");
    }

    const result = await recordPayment({
      invoiceId: invoice.id,
      amount: Number(body.amount),
      method: "SQUARE",
      reference: squarePayment.id,
      squarePaymentId: squarePayment.id,
      squareReceiptUrl: squarePayment.receiptUrl ?? undefined,
      notes: "Collected in CritterOps via Square",
    });

    return NextResponse.json(
      {
        ...result,
        squarePaymentId: squarePayment.id,
        receiptUrl: squarePayment.receiptUrl ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Square payment failed";
    return jsonError(message, 502);
  }
});
