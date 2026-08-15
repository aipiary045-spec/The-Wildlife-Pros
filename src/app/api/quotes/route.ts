import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, lineTotals, withAuth } from "@/lib/api";
import { nextNumber } from "@/lib/utils";

export const GET = withAuth(async () => {
  const quotes = await prisma.quote.findMany({
    include: { client: true, property: true, lineItems: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ quotes });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  if (!body.clientId || !body.propertyId || !body.title) {
    return jsonError("clientId, propertyId, and title are required");
  }
  const count = await prisma.quote.count();
  const items = (body.lineItems ?? []) as Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxable?: boolean;
    serviceId?: string;
  }>;
  const totals = lineTotals(items);
  const quote = await prisma.quote.create({
    data: {
      number: nextNumber("Q", count),
      clientId: body.clientId,
      propertyId: body.propertyId,
      createdById: session.id,
      status: body.status ?? "DRAFT",
      title: body.title,
      message: body.message,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      ...totals,
      lineItems: {
        create: items.map((item, index) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxable: item.taxable ?? true,
          serviceId: item.serviceId,
          sortOrder: index,
        })),
      },
    },
    include: { lineItems: true, client: true },
  });
  return NextResponse.json({ quote }, { status: 201 });
});
