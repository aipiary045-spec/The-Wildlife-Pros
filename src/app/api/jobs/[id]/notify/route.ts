import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  buildNotifyKindMessage,
  messagingCapabilities,
  sendSms,
  smsFallbackUrl,
  type JobNotifyKind,
} from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { clientName } from "@/lib/utils";

const KINDS = new Set<JobNotifyKind>(["en_route", "on_site", "complete"]);

function parseKind(value: unknown): JobNotifyKind {
  if (typeof value === "string" && KINDS.has(value as JobNotifyKind)) {
    return value as JobNotifyKind;
  }
  return "en_route";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;

  const payload = (await request.json().catch(() => ({}))) as {
    kind?: string;
    force?: boolean;
  };
  const kind = parseKind(payload.kind);
  const force = Boolean(payload.force);

  const job = await prisma.job.findUnique({
    where: { id },
    include: { client: true, technician: true },
  });
  if (!job) return jsonError("Work order not found", 404);

  const alreadyNotified = Boolean(job.customerNotifiedAt);

  if (kind === "en_route" && alreadyNotified && !force) {
    return NextResponse.json({
      sent: false,
      alreadyNotified: true,
      error: "Customer already texted for this job.",
    });
  }

  const body = buildNotifyKindMessage(kind, {
    type: job.type,
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
    if (result.ok) {
      sent = true;
      if (kind === "en_route") {
        await prisma.job.update({
          where: { id: job.id },
          data: { customerNotifiedAt: new Date() },
        });
      }
    } else {
      error = typeof result.reason === "string" ? result.reason : "SMS failed.";
    }
  } else {
    error = "SMS is not configured. Use the link below to text from your phone.";
  }

  return NextResponse.json({
    sent,
    alreadyNotified: kind === "en_route" ? alreadyNotified || sent : alreadyNotified,
    error,
    capabilities: caps,
    fallback: {
      sms: smsFallbackUrl(job.client.phone, body),
      message: body,
      clientName: clientName(job.client),
    },
  });
}
