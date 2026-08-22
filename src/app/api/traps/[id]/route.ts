import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteEquipment, isDeployedStatus, parseEquipmentBody } from "@/lib/equipment";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const existing = await prisma.equipment.findUnique({
    where: { id },
    include: {
      deployments: { where: { retrievedAt: null }, take: 1 },
      _count: { select: { deployments: true } },
    },
  });
  if (!existing) return jsonError("Trap not found", 404);

  let input;
  try {
    input = parseEquipmentBody((await request.json()) as Record<string, unknown>);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save that trap.");
  }

  if (isDeployedStatus(existing.status)) {
    const changed =
      input.serialNumber !== existing.serialNumber ||
      input.type !== existing.type ||
      input.locationId !== existing.locationId ||
      input.status !== existing.status;
    if (changed) {
      return jsonError("This trap is in the field. Only name, manufacturer, and notes can be edited here.");
    }
    const item = await prisma.equipment.update({
      where: { id },
      data: {
        name: input.name,
        manufacturer: input.manufacturer,
        notes: input.notes,
      },
      include: { location: true },
    });
    return NextResponse.json({ equipment: item });
  }

  if (input.serialNumber !== existing.serialNumber) {
    const duplicate = await prisma.equipment.findUnique({ where: { serialNumber: input.serialNumber } });
    if (duplicate && duplicate.id !== id) {
      return jsonError(`Serial ${input.serialNumber} is already in inventory`, 409);
    }
  }

  const item = await prisma.equipment.update({
    where: { id },
    data: {
      serialNumber: input.serialNumber,
      name: input.name,
      type: input.type as never,
      manufacturer: input.manufacturer,
      notes: input.notes,
      locationId: input.locationId,
      status: input.status as never,
    },
    include: { location: true },
  });
  return NextResponse.json({ equipment: item });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const existing = await prisma.equipment.findUnique({
    where: { id },
    include: { _count: { select: { deployments: true } } },
  });
  if (!existing) return jsonError("Trap not found", 404);

  const gate = canDeleteEquipment({
    deploymentCount: existing._count.deployments,
    status: existing.status,
  });
  if (!gate.ok) return jsonError(gate.reason, 409);

  await prisma.equipment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
