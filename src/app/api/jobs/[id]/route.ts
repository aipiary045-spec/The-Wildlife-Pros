import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { JOB_TYPE_LABEL } from "@/lib/constants";
import { approvedDayOffError } from "@/lib/day-off-guard";
import { queueJobGoogleCalendarSync, removeJobGoogleCalendar } from "@/lib/google-calendar";

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
  const blocked = await approvedDayOffError(body.technicianId, body.scheduledStart);
  if (blocked) return blocked;
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
  queueJobGoogleCalendarSync(job.id);
  return NextResponse.json({ job });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return jsonError("Job not found", 404);
  await removeJobGoogleCalendar(id);
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
