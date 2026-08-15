import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    include: {
      properties: true,
      jobs: {
        where: { status: { in: ["SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"] } },
        include: { technician: true, property: true },
        orderBy: { scheduledStart: "asc" },
      },
      quotes: {
        where: { status: { in: ["SENT", "VIEWED", "APPROVED"] } },
        include: { lineItems: true, property: true },
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        where: { status: { in: ["SENT", "VIEWED", "PARTIAL", "OVERDUE", "PAID"] } },
        include: { lineItems: true, payments: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!client) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  await prisma.quote.updateMany({
    where: { clientId: client.id, status: "SENT" },
    data: { status: "VIEWED", viewedAt: new Date() },
  });
  await prisma.invoice.updateMany({
    where: { clientId: client.id, status: "SENT" },
    data: { status: "VIEWED", viewedAt: new Date() },
  });

  return NextResponse.json({
    client: {
      firstName: client.firstName,
      lastName: client.lastName,
      companyName: client.companyName,
      properties: client.properties,
      jobs: client.jobs,
      quotes: client.quotes,
      invoices: client.invoices,
    },
  });
}
