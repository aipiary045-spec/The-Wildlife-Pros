import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { deliveryChannelSchema, deliverQuote } from "@/lib/quote-delivery";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const body = (await request.json()) as { channel?: string };
  const channel = deliveryChannelSchema.safeParse(body.channel);
  if (!channel.success) return jsonError("channel must be email, sms, or both");

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!quote) return jsonError("Quote not found", 404);
  if (quote.status === "CONVERTED") return jsonError("This quote already became a job.");

  const result = await deliverQuote({
    quote,
    channel: channel.data,
    markSent: quote.status === "DRAFT" || quote.status === "DECLINED",
  });

  return NextResponse.json(result);
}
