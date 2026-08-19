import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, lineTotals, withAuth } from "@/lib/api";
import { approvedDayOffError } from "@/lib/day-off-guard";
import { queueJobGoogleCalendarSync } from "@/lib/google-calendar";
import { nextNumber } from "@/lib/utils";

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const technicianId = url.searchParams.get("technicianId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const jobs = await prisma.job.findMany({
    where: {
      status: status ? (status as never) : undefined,
      technicianId: technicianId || undefined,
      scheduledStart:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    },
    include: { client: true, property: true, technician: true, lineItems: true },
    orderBy: { scheduledStart: "asc" },
  });
  return NextResponse.json({ jobs });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  if (!body.clientId || !body.propertyId || !body.title) {
    return jsonError("clientId, propertyId, and title are required");
  }
  const count = await prisma.job.count();
  const items = (body.lineItems ?? []) as Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxable?: boolean;
    serviceId?: string;
  }>;
  const totals = lineTotals(items);
  const blocked = await approvedDayOffError(body.technicianId, body.scheduledStart);
  if (blocked) return blocked;

  const job = await prisma.job.create({
    data: {
      number: nextNumber("JOB", count),
      clientId: body.clientId,
      propertyId: body.propertyId,
      quoteId: body.quoteId,
      technicianId: body.technicianId,
      createdById: session.id,
      type: body.type ?? "INSPECTION",
      status: body.scheduledStart ? "SCHEDULED" : "UNSCHEDULED",
      title: body.title,
      instructions: body.instructions,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
      durationMin: body.durationMin ?? 60,
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
    include: { client: true, property: true, lineItems: true },
  });
  queueJobGoogleCalendarSync(job.id);
  return NextResponse.json({ job }, { status: 201 });
});
