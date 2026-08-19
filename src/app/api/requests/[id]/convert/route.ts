import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { dateKey } from "@/lib/dates";
import { canConvertRequest, canManageIntake, parseConvertTarget } from "@/lib/intake";
import { queueJobGoogleCalendarSync } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { nextNumber } from "@/lib/utils";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canManageIntake(session.role)) return jsonError("Office only.", 403);
  const { id } = await context.params;
  let to: "quote" | "job";
  try {
    to = parseConvertTarget((await request.json().catch(() => ({}))) as Record<string, unknown>);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not convert that call.");
  }

  const existing = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { client: true, property: true },
  });
  if (!existing) return jsonError("That call is gone.", 404);
  if (!canConvertRequest(existing.status)) {
    return jsonError("That call is already closed or converted.");
  }
  if (!existing.propertyId) {
    return jsonError("Need a street on this call first.");
  }

  if (to === "quote") {
    const count = await prisma.quote.count();
    const quote = await prisma.quote.create({
      data: {
        number: nextNumber("Q", count),
        clientId: existing.clientId,
        propertyId: existing.propertyId,
        createdById: session.id,
        status: "DRAFT",
        title: existing.title,
        message: existing.details,
      },
    });
    await prisma.serviceRequest.update({
      where: { id },
      data: { status: "CONVERTED_QUOTE" },
    });
    return NextResponse.json({ quoteId: quote.id, href: `/quotes/${quote.id}` }, { status: 201 });
  }

  const count = await prisma.job.count();
  const job = await prisma.job.create({
    data: {
      number: nextNumber("JOB", count),
      clientId: existing.clientId,
      propertyId: existing.propertyId,
      createdById: session.id,
      type: "INSPECTION",
      status: existing.preferredAt ? "SCHEDULED" : "UNSCHEDULED",
      title: existing.title,
      instructions: existing.details,
      scheduledStart: existing.preferredAt,
      durationMin: 60,
    },
  });
  await prisma.serviceRequest.update({
    where: { id },
    data: { status: "CONVERTED_JOB" },
  });
  if (existing.client.status === "LEAD") {
    await prisma.client.update({ where: { id: existing.clientId }, data: { status: "ACTIVE" } });
  }
  queueJobGoogleCalendarSync(job.id);
  return NextResponse.json(
    {
      jobId: job.id,
      href: existing.preferredAt ? `/schedule?view=day&date=${dateKey(existing.preferredAt)}` : `/jobs/${job.id}`,
    },
    { status: 201 },
  );
}
