import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { EQUIPMENT_TYPE_LABEL } from "@/lib/constants";
import { suggestSerial } from "@/lib/equipment";

export const GET = withAuth(async () => {
  const equipment = await prisma.equipment.findMany({
    include: {
      deployments: {
        where: { retrievedAt: null },
        include: { property: true, job: true },
        orderBy: { deployedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { serialNumber: "asc" },
  });
  return NextResponse.json({ equipment });
});

export const POST = withAuth(async (_session, request) => {
  const body = (await request.json()) as {
    serialNumber?: string;
    name?: string;
    type?: string;
    manufacturer?: string;
    notes?: string;
  };
  const type = body.type && body.type in EQUIPMENT_TYPE_LABEL ? body.type : "LIVE_CAGE";
  let serialNumber = body.serialNumber?.trim();
  if (!serialNumber) {
    const existing = await prisma.equipment.findMany({ select: { serialNumber: true } });
    serialNumber = suggestSerial(
      type,
      existing.map((item) => item.serialNumber),
    );
  }
  const duplicate = await prisma.equipment.findUnique({ where: { serialNumber } });
  if (duplicate) {
    return jsonError(`Serial ${serialNumber} is already in inventory`, 409);
  }
  const item = await prisma.equipment.create({
    data: {
      serialNumber,
      name: body.name?.trim() || `${EQUIPMENT_TYPE_LABEL[type]} ${serialNumber}`,
      type: type as never,
      manufacturer: body.manufacturer?.trim() || null,
      notes: body.notes?.trim() || null,
      status: "IN_INVENTORY",
    },
  });
  return NextResponse.json({ equipment: item }, { status: 201 });
});
