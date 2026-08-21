import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workedMinutes } from "@/lib/time";

import { isOfficeRole } from "@/lib/roles";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: "SUBMITTED" | "APPROVED" | "REJECTED" | "CLOCKED_OUT";
    notes?: string;
    breakMin?: number;
  };

  const sheet = await prisma.timesheet.findUnique({
    where: { id },
    include: { punches: true },
  });
  if (!sheet) return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });

  const own = sheet.userId === session.id;
  if (!own && !isOfficeRole(session.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if ((body.status === "APPROVED" || body.status === "REJECTED") && !isOfficeRole(session.role)) {
    return NextResponse.json({ error: "Only office staff can approve timesheets" }, { status: 403 });
  }

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      notes: body.notes,
      breakMin: body.breakMin,
      status: body.status,
      approvedById: body.status === "APPROVED" ? session.id : body.status === "REJECTED" ? session.id : undefined,
      approvedAt: body.status === "APPROVED" || body.status === "REJECTED" ? new Date() : undefined,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      punches: { orderBy: { clockInAt: "asc" } },
    },
  });

  return NextResponse.json({
    timesheet: {
      ...updated,
      workedMin: workedMinutes(updated.punches, updated.breakMin),
      open: updated.punches.some((punch) => !punch.clockOutAt),
    },
  });
}
