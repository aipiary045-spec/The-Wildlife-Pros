import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { jsonError, lineTotals, withAuth } from "@/lib/api";
import { nextNumber } from "@/lib/utils";

export const GET = withAuth(async () => {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, property: true, job: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invoices });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  let clientId = body.clientId as string | undefined;
  let propertyId = body.propertyId as string | undefined;
  let items = (body.lineItems ?? []) as Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxable?: boolean;
    serviceId?: string;
  }>;

  if (body.jobId) {
    const job = await prisma.job.findUnique({
      where: { id: body.jobId },
      include: { lineItems: true, invoices: { select: { id: true } } },
    });
    if (!job) return jsonError("Job not found", 404);
    if (job.invoices.length > 0) return jsonError("This job already has an invoice.");
    clientId = clientId ?? job.clientId;
    propertyId = propertyId ?? job.propertyId;
    if (items.length === 0) {
      items = job.lineItems.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxable: item.taxable,
        serviceId: item.serviceId ?? undefined,
      }));
    }
  }

  if (!clientId) return jsonError("clientId or jobId is required");

  const count = await prisma.invoice.count();
  const totals = lineTotals(items);
  const invoice = await prisma.invoice.create({
    data: {
      number: nextNumber("INV", count),
      clientId,
      propertyId,
      jobId: body.jobId,
      createdById: session.id,
      status: "DRAFT",
      dueOn: body.dueOn ? new Date(body.dueOn) : addDays(new Date(), 14),
      ...totals,
      balance: totals.total,
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

  if (body.jobId) {
    await prisma.job.update({ where: { id: body.jobId }, data: { status: "INVOICED" } });
  }

  return NextResponse.json({ invoice }, { status: 201 });
});
