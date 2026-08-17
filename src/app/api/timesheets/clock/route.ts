import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { parseOccurredAt } from "@/lib/offline";
import { hasOpenPunch, workedMinutes } from "@/lib/time";

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as { action?: "in" | "out"; note?: string; occurredAt?: unknown };
  if (body.action !== "in" && body.action !== "out") {
    return jsonError("action must be in or out");
  }

  const occurredAt = parseOccurredAt(body.occurredAt);
  const day = startOfDay(occurredAt);
  const openPunch = await prisma.timePunch.findFirst({
    where: { clockOutAt: null, timesheet: { userId: session.id } },
    orderBy: { clockInAt: "desc" },
  });

  if (body.action === "in") {
    if (openPunch) {
      return jsonError("Already clocked in. Clock out before starting another punch.");
    }

    const existing = await prisma.timesheet.findUnique({
      where: { userId_date: { userId: session.id, date: day } },
      include: { punches: { orderBy: { clockInAt: "asc" } } },
    });

    const sheet = existing
      ? await prisma.timesheet.update({
          where: { id: existing.id },
          data: {
            status: "CLOCKED_IN",
            punches: { create: { clockInAt: occurredAt, note: body.note } },
          },
          include: { punches: { orderBy: { clockInAt: "asc" } } },
        })
      : await prisma.timesheet.create({
          data: {
            userId: session.id,
            date: day,
            status: "CLOCKED_IN",
            punches: { create: { clockInAt: occurredAt, note: body.note } },
          },
          include: { punches: { orderBy: { clockInAt: "asc" } } },
        });

    return NextResponse.json({
      timesheet: {
        ...sheet,
        workedMin: workedMinutes(sheet.punches, sheet.breakMin, occurredAt),
        open: true,
      },
    });
  }

  if (!openPunch) {
    return jsonError("Already clocked out.");
  }

  await prisma.timePunch.update({
    where: { id: openPunch.id },
    data: { clockOutAt: occurredAt, note: body.note ?? openPunch.note },
  });

  const sheet = await prisma.timesheet.update({
    where: { id: openPunch.timesheetId },
    data: { status: "CLOCKED_OUT" },
    include: { punches: { orderBy: { clockInAt: "asc" } } },
  });

  return NextResponse.json({
    timesheet: {
      ...sheet,
      workedMin: workedMinutes(sheet.punches, sheet.breakMin, occurredAt),
      open: hasOpenPunch(sheet.punches),
    },
  });
});
