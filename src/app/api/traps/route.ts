import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

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
  const body = await request.json();
  const item = await prisma.equipment.create({
    data: {
      serialNumber: body.serialNumber,
      name: body.name,
      type: body.type,
      manufacturer: body.manufacturer,
      notes: body.notes,
    },
  });
  return NextResponse.json({ equipment: item }, { status: 201 });
});
