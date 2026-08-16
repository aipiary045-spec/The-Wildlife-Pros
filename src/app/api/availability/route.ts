import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      userId,
      date: from || to
        ? {
            gte: from ? startOfDay(new Date(from)) : undefined,
            lte: to ? startOfDay(new Date(to)) : undefined,
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
  const userId = body.userId || session.id;
  const office = ["OWNER", "ADMIN", "DISPATCHER"].includes(session.role);
  if (userId !== session.id && !office) {
    return jsonError("You can only set your own days off.", 403);
  }
  if (!body.date) return jsonError("Pick a day you are not available.");
  const date = startOfDay(new Date(body.date.includes("T") ? body.date : `${body.date}T12:00:00`));
  if (Number.isNaN(date.getTime())) return jsonError("Pick a valid day.");

  const block = await prisma.availabilityBlock.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      reason: body.reason?.trim() || "Unavailable",
    },
    update: { reason: body.reason?.trim() || "Unavailable" },
  });
  return NextResponse.json({ block }, { status: 201 });
});

export const DELETE = withAuth(async (session, request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return jsonError("Missing availability id.");
  const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
  if (!existing) return jsonError("That day off is already gone.", 404);
  const office = ["OWNER", "ADMIN", "DISPATCHER"].includes(session.role);
  if (existing.userId !== session.id && !office) {
    return jsonError("You can only clear your own days off.", 403);
  }
  await prisma.availabilityBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
