import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const client = await prisma.client.findUnique({ where: { portalToken: token } });
  if (!client) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  const body = (await request.json()) as {
    type: "approve_quote" | "decline_quote" | "pay_invoice";
    id: string;
    note?: string;
    method?: "CARD" | "ACH" | "CHECK";
  };

  if (body.type === "approve_quote" || body.type === "decline_quote") {
    const quote = await prisma.quote.findFirst({ where: { id: body.id, clientId: client.id } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    const approved = body.type === "approve_quote";
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: approved ? "APPROVED" : "DECLINED",
        approvedAt: approved ? new Date() : null,
        declinedAt: approved ? null : new Date(),
        clientNote: body.note,
      },
    });
    return NextResponse.json({ quote: updated });
  }

  if (body.type === "pay_invoice") {
    const invoice = await prisma.invoice.findFirst({ where: { id: body.id, clientId: client.id } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.balance,
        method: body.method ?? "CARD",
        reference: "client-hub",
      },
    });
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", balance: 0, paidAt: new Date() },
    });
    return NextResponse.json({ invoice: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
