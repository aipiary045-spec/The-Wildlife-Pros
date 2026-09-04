import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { parseVisitPlanBody } from "@/lib/visit-plans";
import { createVisitPlanWithOptionalFirstTrip } from "@/lib/visit-plans.server";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async () => {
  const plans = await prisma.visitPlan.findMany({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      client: true,
      property: true,
      preferredTech: { select: { id: true, firstName: true, lastName: true } },
      jobs: {
        select: { id: true, visitNumber: true, status: true, scheduledStart: true },
        orderBy: { visitNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ plans });
});

export const POST = withAuth(async (session, request) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseVisitPlanBody(body);
    const result = await createVisitPlanWithOptionalFirstTrip(input, session.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create visit plan.", 400);
  }
});
