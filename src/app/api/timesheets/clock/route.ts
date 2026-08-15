import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { hasOpenPunch, workedMinutes } from "@/lib/time";

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as { action?: "in" | "out"; note?: string };
  if (body.action !== "in" && body.action !== "out") {
    return jsonError("action must be in or out");
  }

  const today = startOfDay(new Date());
  const now = new Date();

  const existing = await prisma.timesheet.findUnique({
    where: { userId_date: { userId: session.id, date: today } },
    include: { punches: { orderBy: { clockInAt: "asc" } } },
  });

  if (body.action === "in") {
    if (existing && hasOpenPunch(existing.punches)) {
      return jsonError("Already clocked in. Clock out before starting another punch.");
    }

    const sheet = existing
      ? await prisma.timesheet.update({
          where: { id: existing.id },
          data: {
            status: "CLOCKED_IN",
            punches: { create: { clockInAt: now, note: body.note } },
          },
          include: { punches: { orderBy: { clockInAt: "asc" } } },
        })
      : await prisma.timesheet.create({
          data: {
            userId: session.id,
            date: today,
            status: "CLOCKED_IN",
            punches: { create: { clockInAt: now, note: body.note } },
          },
          include: { punches: { orderBy: { clockInAt: "asc" } } },
        });

    return NextResponse.json({
      timesheet: {
        ...sheet,
        workedMin: workedMinutes(sheet.punches, sheet.breakMin),
        open: true,
      },
    });
  }

  if (!existing) {
    return jsonError("No timesheet for today. Clock in first.");
  }

  const open = [...existing.punches].reverse().find((punch) => !punch.clockOutAt);
  if (!open) {
    return jsonError("Already clocked out.");
  }

  await prisma.timePunch.update({
    where: { id: open.id },
    data: { clockOutAt: now, note: body.note ?? open.note },
  });

  const sheet = await prisma.timesheet.update({
    where: { id: existing.id },
    data: { status: "CLOCKED_OUT" },
    include: { punches: { orderBy: { clockInAt: "asc" } } },
  });

  return NextResponse.json({
    timesheet: {
      ...sheet,
      workedMin: workedMinutes(sheet.punches, sheet.breakMin),
      open: false,
    },
  });
});
