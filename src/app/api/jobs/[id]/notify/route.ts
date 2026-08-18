import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { buildEnRouteMessage, messagingCapabilities, sendSms, smsFallbackUrl } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { clientName } from "@/lib/utils";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { client: true, technician: true },
  });
  if (!job) return jsonError("Work order not found", 404);

  const body = buildEnRouteMessage({
    clientFirstName: job.client.firstName,
    techName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : session.firstName,
    jobTitle: job.title,
    companyName: job.client.companyName ?? undefined,
  });

  const caps = messagingCapabilities();
  let sent = false;
  let error: string | null = null;

  if (!job.client.phone) {
    error = "Client has no phone on file.";
  } else if (caps.sms) {
    const result = await sendSms({ to: job.client.phone, body });
    if (result.ok) sent = true;
    else error = typeof result.reason === "string" ? result.reason : "SMS failed.";
  } else {
    error = "SMS is not configured. Use the link below to text from your phone.";
  }

  return NextResponse.json({
    sent,
    error,
    capabilities: caps,
    fallback: {
      sms: smsFallbackUrl(job.client.phone, body),
      message: body,
      clientName: clientName(job.client),
    },
  });
}
