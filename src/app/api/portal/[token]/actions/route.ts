import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const client = await prisma.client.findUnique({ where: { portalToken: token } });
  if (!client) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  const body = (await request.json()) as {
    type: "approve_quote" | "decline_quote";
    id: string;
    note?: string;
  };

  if (body.type === "approve_quote" || body.type === "decline_quote") {
    const quote = await prisma.quote.findFirst({ where: { id: body.id, clientId: client.id } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    const approved = body.type === "approve_quote";
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: approved ? "APPROVED" : "DECLINED",
        approvedAt: approved ? new Date() : null,
        declinedAt: approved ? null : new Date(),
        clientNote: body.note,
      },
    });
    return NextResponse.json({ quote: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
