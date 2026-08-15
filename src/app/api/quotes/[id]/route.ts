import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, property: true, lineItems: true },
  });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  return NextResponse.json({ quote });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const now = new Date();
  const quote = await prisma.quote.update({
    where: { id },
    data: {
      status: body.status,
      sentAt: body.status === "SENT" ? now : undefined,
      approvedAt: body.status === "APPROVED" ? now : undefined,
      declinedAt: body.status === "DECLINED" ? now : undefined,
      title: body.title,
      message: body.message,
    },
  });
  return NextResponse.json({ quote });
}
