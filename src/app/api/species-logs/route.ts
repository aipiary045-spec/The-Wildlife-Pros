import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const captures = await prisma.captureEvent.findMany({
    include: {
      species: true,
      technician: true,
      job: { include: { client: true, property: true } },
      deployment: { include: { equipment: true } },
    },
    orderBy: { capturedAt: "desc" },
  });
  return NextResponse.json({ captures });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const capture = await prisma.captureEvent.create({
    data: {
      jobId: body.jobId,
      speciesId: body.speciesId,
      technicianId: body.technicianId ?? session.id,
      deploymentId: body.deploymentId,
      quantity: body.quantity ?? 1,
      sex: body.sex,
      ageClass: body.ageClass,
      disposition: body.disposition,
      dispositionNote: body.dispositionNote,
      locationNote: body.locationNote,
    },
    include: { species: true },
  });

  if (body.deploymentId) {
    await prisma.equipmentDeployment.update({
      where: { id: body.deploymentId },
      data: { status: "ACTIVE_CAPTURE" },
    });
  }

  return NextResponse.json({ capture }, { status: 201 });
});
