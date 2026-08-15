import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const POST = withAuth(async (_session, request) => {
  const body = await request.json();
  const invoice = await prisma.invoice.findUnique({
    where: { id: body.invoiceId },
    include: { payments: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: body.amount,
      method: body.method ?? "CARD",
      reference: body.reference,
      notes: body.notes,
    },
  });

  const paid = invoice.payments.reduce((sum, item) => sum + Number(item.amount), 0) + Number(body.amount);
  const total = Number(invoice.total);
  const balance = Number((total - paid).toFixed(2));
  const status = balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : invoice.status;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      balance: Math.max(balance, 0),
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });

  return NextResponse.json({ payment, balance, status }, { status: 201 });
});
