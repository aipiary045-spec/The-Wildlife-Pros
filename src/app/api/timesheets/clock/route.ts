import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { parseOccurredAt } from "@/lib/offline";
import { hasOpenPunch, workedMinutes } from "@/lib/time";

const CLOSED_JOB_STATUSES = new Set(["COMPLETED", "CANCELLED", "INVOICED"]);

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as {
    action?: "in" | "out";
    note?: string;
    occurredAt?: unknown;
    force?: boolean;
  };
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

  if (!body.force) {
    const openEntry = await prisma.timeEntry.findFirst({
      where: { userId: session.id, endedAt: null, jobId: { not: null } },
      include: { job: { select: { id: true, number: true, title: true, status: true } } },
      orderBy: { startedAt: "desc" },
    });
    if (openEntry?.job && !CLOSED_JOB_STATUSES.has(openEntry.job.status)) {
      return NextResponse.json(
        {
          error: "Still checked in on a job. Check out there first, or clock out of the day anyway.",
          openJob: {
            id: openEntry.job.id,
            number: openEntry.job.number,
            title: openEntry.job.title,
          },
        },
        { status: 409 },
      );
    }
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
