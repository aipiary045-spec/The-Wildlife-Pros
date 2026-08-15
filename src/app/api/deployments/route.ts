import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const deployments = await prisma.equipmentDeployment.findMany({
    include: { equipment: true, property: true, job: { include: { client: true } }, captures: true },
    orderBy: { deployedAt: "desc" },
  });
  return NextResponse.json({ deployments });
});

export const POST = withAuth(async (_session, request) => {
  const body = (await request.json()) as {
    equipmentId?: string;
    jobId?: string;
    propertyId?: string;
    locationNote?: string;
    targetSpecies?: string;
    baitUsed?: string;
  };
  if (!body.equipmentId || !body.jobId) {
    return jsonError("Pick a trap and a job");
  }
  const locationNote = body.locationNote?.trim();
  if (!locationNote) {
    return jsonError("Say where on the property this trap sits");
  }

  const [equipment, job] = await Promise.all([
    prisma.equipment.findUnique({ where: { id: body.equipmentId } }),
    prisma.job.findUnique({ where: { id: body.jobId } }),
  ]);
  if (!equipment) return jsonError("Trap not found", 404);
  if (!job) return jsonError("Job not found", 404);

  const live = await prisma.equipmentDeployment.findFirst({
    where: { equipmentId: equipment.id, retrievedAt: null },
  });
  if (live) {
    return jsonError(`${equipment.serialNumber} is already in the field`, 409);
  }

  const deployment = await prisma.equipmentDeployment.create({
    data: {
      equipmentId: equipment.id,
      jobId: job.id,
      propertyId: job.propertyId,
      locationNote,
      targetSpecies: body.targetSpecies?.trim() || null,
      baitUsed: body.baitUsed?.trim() || null,
      status: "DEPLOYED",
    },
    include: { equipment: true },
  });
  await prisma.equipment.update({
    where: { id: equipment.id },
    data: { status: "DEPLOYED" },
  });
  return NextResponse.json({ deployment }, { status: 201 });
});

export const PATCH = withAuth(async (_session, request) => {
  const body = (await request.json()) as {
    id?: string;
    status?: string;
    locationNote?: string;
  };
  if (!body.id) return jsonError("Deployment id required");

  const retrieved = body.status === "RETRIEVED";
  const equipmentStatus =
    body.status === "RETRIEVED"
      ? "IN_INVENTORY"
      : body.status === "ACTIVE_CAPTURE" || body.status === "NEEDS_CHECK" || body.status === "DEPLOYED"
        ? body.status
        : undefined;

  const deployment = await prisma.equipmentDeployment.update({
    where: { id: body.id },
    data: {
      status: body.status ? (body.status as never) : undefined,
      retrievedAt: retrieved ? new Date() : undefined,
      locationNote: body.locationNote,
    },
  });
  if (equipmentStatus) {
    await prisma.equipment.update({
      where: { id: deployment.equipmentId },
      data: { status: equipmentStatus as never },
    });
  }
  return NextResponse.json({ deployment });
});
