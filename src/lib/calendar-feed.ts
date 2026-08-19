import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { clientName, propertyAddress } from "@/lib/utils";

export type CalendarFeedToken = {
  userId: string;
  organizationId: string;
};

function secret() {
  const value = process.env.AUTH_SECRET ?? "dev-only-change-me";
  return new TextEncoder().encode(value);
}

export async function createCalendarFeedToken(userId: string, organizationId: string) {
  return new SignJWT({ userId, organizationId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(secret());
}

export async function readCalendarFeedToken(token: string): Promise<CalendarFeedToken | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = String(payload.userId ?? "");
    const organizationId = String(payload.organizationId ?? "");
    if (!userId || !organizationId) return null;
    return { userId, organizationId };
  } catch {
    return null;
  }
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function icsSequence(updatedAt: Date) {
  return Math.max(0, Math.floor(updatedAt.getTime() / 1000));
}

export function calendarFeedUrl(token: string, origin?: string) {
  const base = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/calendar/feed?token=${encodeURIComponent(token)}`;
}

export async function buildTechnicianIcsFeed(token: CalendarFeedToken) {
  const user = await prisma.user.findFirst({
    where: { id: token.userId, organizationId: token.organizationId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!user) return null;

  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const jobs = await prisma.job.findMany({
    where: {
      technicianId: user.id,
      scheduledStart: { gte: now, lte: horizon },
      status: { notIn: ["COMPLETED", "INVOICED"] },
    },
    include: { client: true, property: true },
    orderBy: { scheduledStart: "asc" },
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CritterOps//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "X-WR-CALNAME:CritterOps schedule",
  ];

  for (const job of jobs) {
    if (!job.scheduledStart) continue;
    const end =
      job.scheduledEnd ??
      new Date(job.scheduledStart.getTime() + Math.max(job.durationMin, 30) * 60 * 1000);
    const summary = `${job.number} · ${job.title}`;
    const location = propertyAddress(job.property);
    const description = `${clientName(job.client)}${job.instructions ? ` — ${job.instructions}` : ""}`;
    const eventLines = [
      "BEGIN:VEVENT",
      `UID:${job.id}@critterops`,
      `DTSTAMP:${icsDate(now)}`,
      `LAST-MODIFIED:${icsDate(job.updatedAt)}`,
      `SEQUENCE:${icsSequence(job.updatedAt)}`,
      `DTSTART:${icsDate(job.scheduledStart)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(summary)}`,
      `LOCATION:${icsEscape(location)}`,
      `DESCRIPTION:${icsEscape(description)}`,
    ];
    if (job.status === "CANCELLED") {
      eventLines.push("STATUS:CANCELLED");
    }
    eventLines.push("END:VEVENT");
    lines.push(...eventLines);
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
