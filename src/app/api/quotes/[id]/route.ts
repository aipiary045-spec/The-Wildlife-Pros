import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, lineTotals } from "@/lib/api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, property: true, lineItems: true },
  });
  if (!quote) return jsonError("Quote not found", 404);
  return NextResponse.json({ quote });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) return jsonError("Quote not found", 404);
  if (existing.status === "CONVERTED") {
    return jsonError("This quote already became a job. Edit the job instead.");
  }

  const body = await request.json();
  const now = new Date();
  const items = Array.isArray(body.lineItems)
    ? (body.lineItems as Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        taxable?: boolean;
        serviceId?: string;
      }>)
    : null;
  if (items && (items.length === 0 || items.some((item) => !String(item.name ?? "").trim()))) {
    return jsonError("Add at least one named service.");
  }
  const totals = items ? lineTotals(items) : null;

  const quote = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.quoteLineItem.deleteMany({ where: { quoteId: id } });
    }
    return tx.quote.update({
      where: { id },
      data: {
        status: body.status,
        sentAt: body.status === "SENT" ? now : undefined,
        approvedAt: body.status === "APPROVED" ? now : undefined,
        declinedAt: body.status === "DECLINED" ? now : undefined,
        title: typeof body.title === "string" ? body.title.trim() : undefined,
        message: body.message === undefined ? undefined : String(body.message || "").trim() || null,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        ...(totals ?? {}),
        lineItems: items
          ? {
              create: items.map((item, index) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxable: item.taxable ?? true,
                serviceId: item.serviceId,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: { lineItems: true, client: true, property: true },
    });
  });
  return NextResponse.json({ quote });
}
