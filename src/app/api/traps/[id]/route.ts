import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const body = (await request.json()) as {
    locationId?: string | null;
    status?: string;
    name?: string;
    notes?: string;
  };
  const item = await prisma.equipment.update({
    where: { id },
    data: {
      locationId: body.locationId === undefined ? undefined : body.locationId || null,
      name: body.name?.trim() || undefined,
      notes: body.notes === undefined ? undefined : body.notes.trim() || null,
      status: body.status as never,
    },
    include: { location: true },
  });
  return NextResponse.json({ equipment: item });
}
