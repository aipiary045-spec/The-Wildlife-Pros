import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const deployments = await prisma.equipmentDeployment.findMany({
    include: { equipment: true, property: true, job: { include: { client: true } }, captures: true },
    orderBy: { deployedAt: "desc" },
  });
  return NextResponse.json({ deployments });
});

export const POST = withAuth(async (_session, request) => {
  const body = await request.json();
  const deployment = await prisma.equipmentDeployment.create({
    data: {
      equipmentId: body.equipmentId,
      jobId: body.jobId,
      propertyId: body.propertyId,
      locationNote: body.locationNote,
      targetSpecies: body.targetSpecies,
      baitUsed: body.baitUsed,
      status: "DEPLOYED",
    },
  });
  await prisma.equipment.update({
    where: { id: body.equipmentId },
    data: { status: "DEPLOYED" },
  });
  return NextResponse.json({ deployment }, { status: 201 });
});

export const PATCH = withAuth(async (_session, request) => {
  const body = await request.json();
  const deployment = await prisma.equipmentDeployment.update({
    where: { id: body.id },
    data: {
      status: body.status,
      retrievedAt: body.status === "RETRIEVED" ? new Date() : undefined,
      locationNote: body.locationNote,
    },
  });
  if (body.status) {
    await prisma.equipment.update({
      where: { id: deployment.equipmentId },
      data: { status: body.status },
    });
  }
  return NextResponse.json({ deployment });
});
