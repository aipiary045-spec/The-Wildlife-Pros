import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { isOfficeRole } from "@/lib/roles";
import { workedMinutes } from "@/lib/time";

export const GET = withAuth(async (session, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const office = isOfficeRole(session.role);

  const sheets = await prisma.timesheet.findMany({
    where: {
      userId: office ? userId || undefined : session.id,
      date: {
        gte: from ? startOfDay(new Date(from)) : undefined,
        lte: to ? startOfDay(new Date(to)) : undefined,
      },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true, color: true } },
      punches: { orderBy: { clockInAt: "asc" } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    timesheets: sheets.map((sheet) => ({
      ...sheet,
      workedMin: workedMinutes(sheet.punches, sheet.breakMin),
      open: sheet.punches.some((punch) => !punch.clockOutAt),
    })),
  });
});
