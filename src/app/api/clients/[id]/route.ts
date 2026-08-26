import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      properties: true,
      jobs: { include: { technician: true, property: true }, orderBy: { createdAt: "desc" } },
      notesList: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const client = await prisma.client.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      companyName: body.companyName,
      email: body.email,
      phone: body.phone,
      status: body.status,
      notes: body.notes,
    },
  });
  return NextResponse.json({ client });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { jobs: true } } },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (client._count.jobs > 0) {
    const updated = await prisma.client.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return NextResponse.json({ client: updated, deactivated: true });
  }
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
