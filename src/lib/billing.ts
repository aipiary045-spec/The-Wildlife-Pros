import type { PaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function recordPayment(input: {
  invoiceId: string;
  amount: number;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
  squarePaymentId?: string;
  squareReceiptUrl?: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { payments: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const alreadyPaid = invoice.payments.reduce((sum, item) => sum + Number(item.amount), 0);
  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount,
      method: input.method ?? "SQUARE",
      reference: input.reference,
      notes: input.notes,
      squarePaymentId: input.squarePaymentId,
      squareReceiptUrl: input.squareReceiptUrl,
    },
  });

  const paid = alreadyPaid + amount;
  const total = Number(invoice.total);
  const balance = Number((total - paid).toFixed(2));
  const status = balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : invoice.status;

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      balance: Math.max(balance, 0),
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });

  return { payment, invoice: updated, balance: updated.balance, status: updated.status };
}
