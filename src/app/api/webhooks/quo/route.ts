import { NextResponse } from "next/server";
import { findMatchingClient } from "@/lib/intake";
import { prisma } from "@/lib/prisma";
import { parseQuoEnvelope, planFromQuoEvent, verifyQuoSignature } from "@/lib/quo";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    verifyQuoSignature({
      rawBody,
      webhookId: request.headers.get("webhook-id"),
      webhookTimestamp: request.headers.get("webhook-timestamp"),
      webhookSignature: request.headers.get("webhook-signature"),
      secret: process.env.QUO_WEBHOOK_KEY,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Quo webhook.";
    const status = message.includes("not set") ? 503 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  let event;
  try {
    event = parseQuoEnvelope(JSON.parse(rawBody) as unknown);
  } catch {
    return NextResponse.json({ error: "Could not read that Quo payload." }, { status: 400 });
  }

  const plan = planFromQuoEvent(event);
  if (plan.action === "ignore") {
    return NextResponse.json({ ok: true, ignored: true, reason: plan.reason });
  }

  const organization = await prisma.organization.findFirst();
  if (!organization) {
    return NextResponse.json({ error: "No CritterOps organization is set up." }, { status: 500 });
  }

  const clients = await prisma.client.findMany({
    include: { properties: { select: { id: true, address1: true, city: true } } },
  });
  const match = findMatchingClient(clients, { phone: plan.phone });
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);

  if (match) {
    const open = await prisma.serviceRequest.findFirst({
      where: {
        clientId: match.id,
        status: { in: ["NEW", "ASSESSED"] },
        createdAt: { gte: since },
      },
    });
    if (open) {
      return NextResponse.json({ ok: true, requestId: open.id, created: false });
    }
    const created = await prisma.serviceRequest.create({
      data: {
        clientId: match.id,
        propertyId: match.properties[0]?.id,
        title: plan.title,
        details: plan.details,
        source: "quo",
      },
    });
    return NextResponse.json({ ok: true, requestId: created.id, created: true, matched: true });
  }

  const last4 = plan.phone.slice(-4);
  const client = await prisma.client.create({
    data: {
      organizationId: organization.id,
      status: "LEAD",
      firstName: "Unknown",
      lastName: last4,
      phone: plan.phone,
      notes: "Created from a Quo ring. Add the real name after the call.",
    },
  });
  const created = await prisma.serviceRequest.create({
    data: {
      clientId: client.id,
      title: plan.title,
      details: plan.details,
      source: "quo",
    },
  });
  return NextResponse.json({ ok: true, requestId: created.id, created: true, matched: false });
}
