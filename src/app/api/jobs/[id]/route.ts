import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { JOB_TYPE_LABEL } from "@/lib/constants";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      technician: true,
      lineItems: true,
      visits: true,
      deployments: { include: { equipment: true, captures: true, checks: true } },
      captures: { include: { species: true } },
      entryPoints: true,
      exclusions: true,
      photos: true,
      notes: { include: { author: true } },
    },
  });
  if (!job) return jsonError("Job not found", 404);
  return NextResponse.json({ job });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const body = await request.json();
  const type = typeof body.type === "string" && body.type in JOB_TYPE_LABEL ? body.type : undefined;
  const job = await prisma.job.update({
    where: { id },
    data: {
      status: body.status,
      technicianId: body.technicianId === "" ? null : body.technicianId,
      scheduledStart: body.scheduledStart === null ? null : body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.scheduledEnd === null ? null : body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      instructions: body.instructions === undefined ? undefined : String(body.instructions || "").trim() || null,
      durationMin: body.durationMin ? Number(body.durationMin) : undefined,
      type: type as never,
      completedAt: body.status === "COMPLETED" ? new Date() : body.status === "CANCELLED" ? undefined : undefined,
    },
    include: { client: true, property: true, technician: true },
  });
  return NextResponse.json({ job });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { invoices: { select: { id: true } } },
  });
  if (!job) return jsonError("Job not found", 404);
  if (job.invoices.length > 0) {
    const cancelled = await prisma.job.update({
      where: { id },
      data: { status: "CANCELLED", technicianId: null, scheduledStart: null, scheduledEnd: null },
    });
    return NextResponse.json({ job: cancelled, cancelled: true });
  }
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
