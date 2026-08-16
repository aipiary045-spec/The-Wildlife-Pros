import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { canReviewDayOff, parseDayOffDate } from "@/lib/day-off";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (session, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const office = canReviewDayOff(session.role);
  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      userId: office ? userId : session.id,
      status: status === "REQUESTED" || status === "APPROVED" || status === "DENIED" ? status : undefined,
      date:
        from || to
          ? {
              gte: from ? parseDayOffDate(from) : undefined,
              lte: to ? parseDayOffDate(to) : undefined,
            }
          : undefined,
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, color: true } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ blocks });
});

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as { userId?: string; date?: string; reason?: string };
  const office = canReviewDayOff(session.role);
  const userId = body.userId && office ? body.userId : session.id;
  if (userId !== session.id && !office) {
    return jsonError("You can only request your own days off.", 403);
  }
  let date: Date;
  try {
    date = parseDayOffDate(body.date);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Pick the day you need off.");
  }

  const existing = await prisma.availabilityBlock.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing?.status === "APPROVED") {
    return jsonError("That day is already approved off.");
  }
  if (existing?.status === "REQUESTED") {
    return jsonError("That day is already waiting on the office.");
  }

  const autoApprove = office && userId !== session.id;
  const now = new Date();
  const block = await prisma.availabilityBlock.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      reason: body.reason?.trim() || "Day off",
      status: autoApprove ? "APPROVED" : "REQUESTED",
      reviewedById: autoApprove ? session.id : null,
      reviewedAt: autoApprove ? now : null,
    },
    update: {
      reason: body.reason?.trim() || existing?.reason || "Day off",
      status: autoApprove ? "APPROVED" : "REQUESTED",
      reviewedById: autoApprove ? session.id : null,
      reviewedAt: autoApprove ? now : null,
    },
  });
  return NextResponse.json({ block }, { status: 201 });
});

export const DELETE = withAuth(async (session, request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return jsonError("Missing day-off id.");
  const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
  if (!existing) return jsonError("That day off is already gone.", 404);
  const office = canReviewDayOff(session.role);
  if (existing.userId !== session.id && !office) {
    return jsonError("You can only cancel your own request.", 403);
  }
  if (!office && existing.status === "APPROVED") {
    return jsonError("Ask the office to take an approved day off the schedule.");
  }
  await prisma.availabilityBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
