import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canReviewDayOff, nextDayOffStatus } from "@/lib/day-off";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canReviewDayOff(session.role)) {
    return jsonError("Only office staff can approve a day off.", 403);
  }
  const { id } = await context.params;
  const body = (await request.json()) as { status?: string };
  const status = nextDayOffStatus(body.status);
  if (status !== "APPROVED" && status !== "DENIED") {
    return jsonError("Approve or deny this day-off request.");
  }
  const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
  if (!existing) return jsonError("That request is gone.", 404);

  const block = await prisma.availabilityBlock.update({
    where: { id },
    data: {
      status,
      reviewedById: session.id,
      reviewedAt: new Date(),
    },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({ block });
}
