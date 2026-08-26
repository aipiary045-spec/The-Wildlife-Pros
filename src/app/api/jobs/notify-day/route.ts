import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { buildNotifyKindMessage, messagingCapabilities, sendSms } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);

  const payload = (await request.json().catch(() => ({}))) as {
    jobIds?: unknown;
    force?: boolean;
  };
  const jobIds = Array.isArray(payload.jobIds)
    ? payload.jobIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const force = Boolean(payload.force);

  if (jobIds.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  const caps = messagingCapabilities();
  const jobs = await prisma.job.findMany({
    where: { id: { in: jobIds } },
    include: { client: true, technician: true },
  });
  const byId = new Map(jobs.map((job) => [job.id, job]));

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of jobIds) {
    const job = byId.get(id);
    if (!job) {
      failed += 1;
      continue;
    }
    if (job.customerNotifiedAt && !force) {
      skipped += 1;
      continue;
    }
    if (!job.client.phone) {
      failed += 1;
      continue;
    }
    if (!caps.sms) {
      failed += 1;
      continue;
    }

    const body = buildNotifyKindMessage("en_route", {
      type: job.type,
      clientFirstName: job.client.firstName,
      techName: job.technician
        ? `${job.technician.firstName} ${job.technician.lastName}`
        : session.firstName,
      jobTitle: job.title,
      companyName: job.client.companyName ?? undefined,
    });

    const result = await sendSms({ to: job.client.phone, body });
    if (!result.ok) {
      failed += 1;
      continue;
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { customerNotifiedAt: new Date() },
    });
    sent += 1;
  }

  return NextResponse.json({ sent, skipped, failed });
}
