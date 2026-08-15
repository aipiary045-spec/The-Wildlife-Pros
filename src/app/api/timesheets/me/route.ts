import { NextResponse } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { hasOpenPunch, workedMinutes } from "@/lib/time";

export const GET = withAuth(async (session) => {
  const today = startOfDay(new Date());
  const [current, recent] = await Promise.all([
    prisma.timesheet.findUnique({
      where: { userId_date: { userId: session.id, date: today } },
      include: { punches: { orderBy: { clockInAt: "asc" } } },
    }),
    prisma.timesheet.findMany({
      where: { userId: session.id, date: { gte: subDays(today, 13) } },
      include: { punches: { orderBy: { clockInAt: "asc" } } },
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({
    current: current
      ? {
          ...current,
          workedMin: workedMinutes(current.punches, current.breakMin),
          open: hasOpenPunch(current.punches),
        }
      : null,
    recent: recent.map((sheet) => ({
      ...sheet,
      workedMin: workedMinutes(sheet.punches, sheet.breakMin),
      open: hasOpenPunch(sheet.punches),
    })),
  });
});
