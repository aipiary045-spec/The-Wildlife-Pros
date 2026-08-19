import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { APP_TIMEZONE } from "@/lib/timezone";
import { clientName, propertyAddress } from "@/lib/utils";

const INACTIVE = new Set(["CANCELLED", "COMPLETED", "INVOICED"]);
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

function serviceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  return JSON.parse(raw) as {
    client_email: string;
    private_key: string;
  };
}

export function googleCalendarSyncConfigured() {
  if (process.env.GOOGLE_CALENDAR_SYNC === "false") return false;
  return Boolean(serviceAccount());
}

function calendarClient(impersonateEmail: string) {
  const credentials = serviceAccount();
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  }
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [CALENDAR_SCOPE],
    subject: impersonateEmail,
  });
  return google.calendar({ version: "v3", auth });
}

export function shouldSyncJobToGoogleCalendar(job: {
  status: string;
  technicianId: string | null;
  scheduledStart: Date | null;
}) {
  if (!job.technicianId || !job.scheduledStart) return false;
  if (INACTIVE.has(job.status)) return false;
  return true;
}

function eventBody(job: {
  id: string;
  number: string;
  title: string;
  instructions: string | null;
  scheduledStart: Date;
  scheduledEnd: Date | null;
  durationMin: number;
  client: Parameters<typeof clientName>[0];
  property: Parameters<typeof propertyAddress>[0];
}) {
  const end =
    job.scheduledEnd ??
    new Date(job.scheduledStart.getTime() + Math.max(job.durationMin, 30) * 60 * 1000);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const description = [
    clientName(job.client),
    job.instructions ? job.instructions : null,
    `${appUrl}/jobs/${job.id}`,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    summary: `${job.number} · ${job.title}`,
    location: propertyAddress(job.property),
    description,
    start: { dateTime: job.scheduledStart.toISOString(), timeZone: APP_TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: APP_TIMEZONE },
    extendedProperties: {
      private: {
        critteropsJobId: job.id,
      },
    },
  };
}

async function deleteCalendarEvent(technicianEmail: string, eventId: string) {
  const calendar = calendarClient(technicianEmail);
  try {
    await calendar.events.delete({ calendarId: "primary", eventId });
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status === 404 || status === 410) return;
    throw error;
  }
}

async function clearStoredCalendarEvent(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { googleCalendarEventId: null, googleCalendarUserId: null },
  });
}

export async function syncJobGoogleCalendar(jobId: string) {
  if (!googleCalendarSyncConfigured()) return { synced: false as const, reason: "not_configured" as const };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { client: true, property: true, technician: true },
  });
  if (!job) return { synced: false as const, reason: "missing" as const };

  const removeStoredEvent = async () => {
    if (!job.googleCalendarEventId || !job.googleCalendarUserId) {
      await clearStoredCalendarEvent(jobId);
      return;
    }
    const priorTech = await prisma.user.findUnique({
      where: { id: job.googleCalendarUserId },
      select: { email: true },
    });
    if (priorTech?.email) {
      await deleteCalendarEvent(priorTech.email, job.googleCalendarEventId);
    }
    await clearStoredCalendarEvent(jobId);
  };

  if (!shouldSyncJobToGoogleCalendar(job)) {
    await removeStoredEvent();
    return { synced: true as const, action: "removed" as const };
  }

  const technicianEmail = job.technician?.email;
  if (!technicianEmail) {
    await removeStoredEvent();
    return { synced: false as const, reason: "no_technician_email" as const };
  }

  if (
    job.googleCalendarEventId &&
    job.googleCalendarUserId &&
    job.googleCalendarUserId !== job.technicianId
  ) {
    const priorTech = await prisma.user.findUnique({
      where: { id: job.googleCalendarUserId },
      select: { email: true },
    });
    if (priorTech?.email) {
      await deleteCalendarEvent(priorTech.email, job.googleCalendarEventId);
    }
    await prisma.job.update({
      where: { id: jobId },
      data: { googleCalendarEventId: null, googleCalendarUserId: null },
    });
    job.googleCalendarEventId = null;
    job.googleCalendarUserId = null;
  }

  const calendar = calendarClient(technicianEmail);
  const body = eventBody({
    ...job,
    scheduledStart: job.scheduledStart!,
  });

  if (job.googleCalendarEventId) {
    try {
      await calendar.events.patch({
        calendarId: "primary",
        eventId: job.googleCalendarEventId,
        requestBody: body,
      });
      await prisma.job.update({
        where: { id: jobId },
        data: { googleCalendarUserId: job.technicianId },
      });
      return { synced: true as const, action: "updated" as const };
    } catch (error) {
      const status = (error as { code?: number }).code;
      if (status !== 404 && status !== 410) throw error;
    }
  }

  const created = await calendar.events.insert({
    calendarId: "primary",
    requestBody: body,
  });
  const eventId = created.data.id;
  if (!eventId) {
    throw new Error("Google Calendar did not return an event id");
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      googleCalendarEventId: eventId,
      googleCalendarUserId: job.technicianId,
    },
  });
  return { synced: true as const, action: "created" as const };
}

export function queueJobGoogleCalendarSync(jobId: string) {
  if (!googleCalendarSyncConfigured()) return;
  void syncJobGoogleCalendar(jobId).catch((error) => {
    console.error("[google-calendar] sync failed", jobId, error);
  });
}

export async function removeJobGoogleCalendar(jobId: string) {
  if (!googleCalendarSyncConfigured()) return;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { googleCalendarEventId: true, googleCalendarUserId: true },
  });
  if (!job?.googleCalendarEventId || !job.googleCalendarUserId) return;
  const priorTech = await prisma.user.findUnique({
    where: { id: job.googleCalendarUserId },
    select: { email: true },
  });
  if (priorTech?.email) {
    await deleteCalendarEvent(priorTech.email, job.googleCalendarEventId);
  }
}
