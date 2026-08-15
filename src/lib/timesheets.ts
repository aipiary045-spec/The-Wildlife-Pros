import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { hasOpenPunch, workedMinutes } from "@/lib/time";

function serialize(sheet: {
  id: string;
  status: string;
  breakMin: number;
  date: Date;
  punches: Array<{ id: string; clockInAt: Date; clockOutAt: Date | null; note: string | null }>;
}) {
  return {
    id: sheet.id,
    status: sheet.status,
    breakMin: sheet.breakMin,
    date: sheet.date.toISOString(),
    punches: sheet.punches.map((punch) => ({
      id: punch.id,
      clockInAt: punch.clockInAt.toISOString(),
      clockOutAt: punch.clockOutAt ? punch.clockOutAt.toISOString() : null,
      note: punch.note,
    })),
    workedMin: workedMinutes(sheet.punches, sheet.breakMin),
    open: hasOpenPunch(sheet.punches),
  };
}

export async function getMyTimesheet(userId: string) {
  const today = startOfDay(new Date());
  const [current, recent] = await Promise.all([
    prisma.timesheet.findUnique({
      where: { userId_date: { userId, date: today } },
      include: { punches: { orderBy: { clockInAt: "asc" } } },
    }),
    prisma.timesheet.findMany({
      where: { userId, date: { gte: subDays(today, 13) } },
      include: { punches: { orderBy: { clockInAt: "asc" } } },
      orderBy: { date: "desc" },
    }),
  ]);

  return {
    current: current ? serialize(current) : null,
    recent: recent.map(serialize),
  };
}
