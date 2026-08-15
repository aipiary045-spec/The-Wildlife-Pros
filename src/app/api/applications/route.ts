import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const applications = await prisma.chemicalApplication.findMany({
    include: {
      product: true,
      technician: true,
      job: { include: { client: true, property: true } },
    },
    orderBy: { appliedAt: "desc" },
  });
  return NextResponse.json({ applications });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const application = await prisma.chemicalApplication.create({
    data: {
      jobId: body.jobId,
      productId: body.productId,
      technicianId: body.technicianId ?? session.id,
      targetPests: body.targetPests,
      method: body.method,
      rate: body.rate,
      quantity: body.quantity,
      areaTreated: body.areaTreated,
      weather: body.weather,
      notes: body.notes,
    },
    include: { product: true },
  });
  return NextResponse.json({ application }, { status: 201 });
});
