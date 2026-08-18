import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canManageIntake, parseRequestPatch, requestIsOpen } from "@/lib/intake";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canManageIntake(session.role)) return jsonError("Office only.", 403);
  const { id } = await context.params;
  let status;
  try {
    status = parseRequestPatch((await request.json()) as Record<string, unknown>);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update that call.");
  }
  const existing = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!existing) return jsonError("That call is gone.", 404);
  if (!requestIsOpen(existing.status)) {
    return jsonError("That call is already closed or converted.");
  }
  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: { status: status as "ASSESSED" | "CLOSED" | "SPAM" },
    include: { client: true, property: true },
  });
  return NextResponse.json({ request: updated });
}
