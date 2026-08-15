import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
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
      applications: { include: { product: true } },
      photos: true,
      notes: { include: { author: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const job = await prisma.job.update({
    where: { id },
    data: {
      status: body.status,
      technicianId: body.technicianId,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      title: body.title,
      instructions: body.instructions,
      completedAt: body.status === "COMPLETED" ? new Date() : undefined,
    },
    include: { client: true, property: true, technician: true },
  });
  return NextResponse.json({ job });
}
