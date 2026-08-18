import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (_session, request) => {
  const body = await request.json();
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  const material = typeof body.material === "string" ? body.material.trim() : "";
  if (!jobId) return jsonError("Pick a work order.");
  if (!material) return jsonError("Name the material used.");

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return jsonError("Work order not found", 404);

  const exclusion = await prisma.exclusionWork.create({
    data: {
      jobId,
      entryPointId: typeof body.entryPointId === "string" ? body.entryPointId : undefined,
      material,
      quantity: typeof body.quantity === "string" ? body.quantity.trim() || null : null,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    },
  });

  return NextResponse.json({ exclusion }, { status: 201 });
});
