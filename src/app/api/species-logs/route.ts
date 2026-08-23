import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { parseOccurredAt } from "@/lib/offline";
import { resolveSpeciesId } from "@/lib/species";

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
  const body = (await request.json()) as Record<string, unknown>;
  if (!body.jobId) return jsonError("jobId is required");
  let speciesId: string;
  try {
    speciesId = await resolveSpeciesId(session.organizationId, {
      speciesId: typeof body.speciesId === "string" ? body.speciesId : undefined,
      speciesName: typeof body.speciesName === "string" ? body.speciesName : undefined,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Pick a species.");
  }

  const capture = await prisma.captureEvent.create({
    data: {
      jobId: String(body.jobId),
      speciesId,
      technicianId: typeof body.technicianId === "string" ? body.technicianId : session.id,
      deploymentId: typeof body.deploymentId === "string" ? body.deploymentId : undefined,
      quantity: Number(body.quantity ?? 1) || 1,
      sex: typeof body.sex === "string" ? body.sex : undefined,
      ageClass: typeof body.ageClass === "string" ? body.ageClass : undefined,
      disposition: (body.disposition as never) ?? "RELOCATED",
      dispositionNote: typeof body.dispositionNote === "string" ? body.dispositionNote : undefined,
      locationNote: typeof body.locationNote === "string" ? body.locationNote : undefined,
      capturedAt: parseOccurredAt(body.occurredAt),
    },
    include: { species: true },
  });

  if (typeof body.deploymentId === "string" && body.deploymentId) {
    await prisma.equipmentDeployment.update({
      where: { id: body.deploymentId },
      data: { status: "ACTIVE_CAPTURE" },
    });
  }

  return NextResponse.json({ capture }, { status: 201 });
});
