import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canStealEmergencyDispatch, isActiveEmergencyJobStatus } from "@/lib/emergency";
import { claimEmergencyDispatch } from "@/lib/emergency-claim";
import { queueJobGoogleCalendarSync } from "@/lib/google-calendar";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!isTechnician(session.role) && session.role !== "ADMIN") {
    return jsonError("Field staff only.", 403);
  }

  const { jobId } = await context.params;
  const dispatch = await prisma.emergencyDispatch.findUnique({
    where: { jobId },
    include: { job: { include: { client: { select: { organizationId: true } } } } },
  });
  if (!dispatch || dispatch.job.client.organizationId !== session.organizationId) {
    return jsonError("Emergency dispatch not found", 404);
  }
  if (!isActiveEmergencyJobStatus(dispatch.job.status)) {
    return jsonError("This emergency is already closed.", 400);
  }
  if (!canStealEmergencyDispatch(dispatch, session.id)) {
    return NextResponse.json({ job: dispatch.job, dispatch, alreadyAssigned: true });
  }

  const result = await prisma.$transaction(async (tx) => {
    await claimEmergencyDispatch(tx, {
      dispatchId: dispatch.id,
      jobId,
      technicianId: session.id,
    });
    const [job, updated] = await Promise.all([
      tx.job.findUniqueOrThrow({ where: { id: jobId } }),
      tx.emergencyDispatch.findUniqueOrThrow({ where: { id: dispatch.id } }),
    ]);
    return { job, dispatch: updated };
  });

  queueJobGoogleCalendarSync(jobId);
  return NextResponse.json(result);
}
