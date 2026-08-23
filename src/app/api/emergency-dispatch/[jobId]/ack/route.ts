import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { jobId } = await context.params;
  const dispatch = await prisma.emergencyDispatch.findUnique({
    where: { jobId },
  });
  if (!dispatch) return jsonError("Emergency dispatch not found", 404);
  if (
    dispatch.assignedTechnicianId &&
    dispatch.assignedTechnicianId !== session.id &&
    session.role !== "ADMIN"
  ) {
    return jsonError("Only the assigned technician can acknowledge this dispatch.", 403);
  }
  if (dispatch.acknowledgedAt) {
    return NextResponse.json({ dispatch });
  }
  const updated = await prisma.emergencyDispatch.update({
    where: { id: dispatch.id },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedById: session.id,
    },
  });
  return NextResponse.json({ dispatch: updated });
}
