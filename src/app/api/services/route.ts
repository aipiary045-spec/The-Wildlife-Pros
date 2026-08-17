import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canManagePriceList, parseServiceBody } from "@/lib/services";

export const GET = withAuth(async (session, request) => {
  const all = new URL(request.url).searchParams.get("all") === "1" && canManagePriceList(session.role);
  const services = await prisma.service.findMany({
    where: all ? undefined : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ services });
});

export const POST = withAuth(async (session, request) => {
  if (!canManagePriceList(session.role)) return jsonError("Office only.", 403);
  let input;
  try {
    input = parseServiceBody((await request.json()) as Record<string, unknown>);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save that line.");
  }
  const service = await prisma.service.create({
    data: {
      organizationId: session.organizationId,
      name: input.name,
      description: input.description,
      jobType: input.jobType as never,
      unitPrice: input.unitPrice,
      taxable: input.taxable,
      active: input.active,
    },
  });
  return NextResponse.json({ service }, { status: 201 });
});
