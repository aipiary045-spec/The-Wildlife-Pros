import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (session) => {
  const locations = await prisma.inventoryLocation.findMany({
    where: { organizationId: session.organizationId },
    include: { _count: { select: { equipment: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ locations });
});

export const POST = withAuth(async (session, request) => {
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) return jsonError("Name the location (shop, truck, shed…).");
  const count = await prisma.inventoryLocation.count({ where: { organizationId: session.organizationId } });
  const location = await prisma.inventoryLocation.upsert({
    where: { organizationId_name: { organizationId: session.organizationId, name } },
    create: { organizationId: session.organizationId, name, sortOrder: count },
    update: {},
  });
  return NextResponse.json({ location }, { status: 201 });
});
