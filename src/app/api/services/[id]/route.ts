import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePriceList, parseServiceBody } from "@/lib/services";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canManagePriceList(session.role)) return jsonError("Office only.", 403);
  const { id } = await context.params;
  let input;
  try {
    input = parseServiceBody((await request.json()) as Record<string, unknown>);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save that line.");
  }
  const existing = await prisma.service.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return jsonError("That line is gone.", 404);
  const service = await prisma.service.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description ?? null,
      jobType: input.jobType as never,
      unitPrice: input.unitPrice,
      taxable: input.taxable,
      active: input.active,
    },
  });
  return NextResponse.json({ service });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canManagePriceList(session.role)) return jsonError("Office only.", 403);
  const { id } = await context.params;
  const existing = await prisma.service.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return jsonError("That line is gone.", 404);
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
