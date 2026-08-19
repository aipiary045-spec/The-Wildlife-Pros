import { phoneDigits } from "@/lib/intake";

export type DeliveryChannel = "email" | "sms" | "both";

export type MessagingCapabilities = {
  email: boolean;
  sms: boolean;
  fromEmail: string | null;
  fromPhone: string | null;
};

export function messagingCapabilities(): MessagingCapabilities {
  return {
    email: Boolean(process.env.RESEND_API_KEY && process.env.MESSAGING_FROM_EMAIL),
    sms: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM_NUMBER,
    ),
    fromEmail: process.env.MESSAGING_FROM_EMAIL ?? null,
    fromPhone: process.env.TWILIO_FROM_NUMBER ?? null,
  };
}

export function appBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function portalHubUrl(portalToken: string) {
  return `${appBaseUrl()}/portal/${portalToken}`;
}

export function buildQuoteDeliveryMessage(input: {
  clientFirstName: string;
  quoteNumber: string;
  quoteTitle: string;
  total: string;
  hubUrl: string;
  companyName?: string;
}) {
  const who = input.companyName?.trim() || "The Wildlife Pros";
  return [
    `Hi ${input.clientFirstName},`,
    "",
    `${who} sent estimate ${input.quoteNumber}: ${input.quoteTitle}.`,
    `Total: ${input.total}`,
    "",
    `Review and approve here:`,
    input.hubUrl,
    "",
    "Payments are collected by our crew in the field — not through this link.",
  ].join("\n");
}

export function buildEnRouteMessage(input: {
  clientFirstName: string;
  techName?: string;
  jobTitle: string;
  companyName?: string;
}) {
  const who = input.companyName?.trim() || "The Wildlife Pros";
  const tech = input.techName ? `${input.techName} from ${who}` : `Your ${who} technician`;
  return `${tech} is on the way for ${input.jobTitle}. Reply to this number if you need to reschedule.`;
}

export const JOB_NOTIFY_STATUSES = ["SCHEDULED", "EN_ROUTE", "ON_SITE"] as const;

export function jobNotifyProps(
  job: {
    id: string;
    title: string;
    status: string;
    client: { firstName: string; phone: string | null; companyName?: string | null };
    technician?: { firstName: string; lastName: string } | null;
  },
  techFallbackName?: string,
) {
  if (!JOB_NOTIFY_STATUSES.includes(job.status as (typeof JOB_NOTIFY_STATUSES)[number])) {
    return null;
  }
  const message = buildEnRouteMessage({
    clientFirstName: job.client.firstName,
    techName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : techFallbackName,
    jobTitle: job.title,
    companyName: job.client.companyName ?? undefined,
  });
  return {
    jobId: job.id,
    clientPhone: job.client.phone,
    smsHref: smsFallbackUrl(job.client.phone, message),
    autoSendSms: messagingCapabilities().sms,
  };
}

export function smsFallbackUrl(phone: string | null | undefined, body: string) {
  const digits = phoneDigits(phone ?? "");
  if (digits.length < 10) return null;
  const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;
  return `sms:${normalized}?body=${encodeURIComponent(body)}`;
}

export function mailtoFallbackUrl(email: string | null | undefined, subject: string, body: string) {
  if (!email?.trim()) return null;
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function sendEmail(input: { to: string; subject: string; body: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MESSAGING_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false as const, reason: "email_not_configured" as const };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.body,
    }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, reason: data?.message ?? `email_failed_${response.status}` };
  }
  return { ok: true as const };
}

export async function sendSms(input: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    return { ok: false as const, reason: "sms_not_configured" as const };
  }
  const digits = phoneDigits(input.to);
  if (digits.length < 10) {
    return { ok: false as const, reason: "invalid_phone" as const };
  }
  const to = digits.length === 10 ? `+1${digits}` : `+${digits}`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: input.body }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, reason: data?.message ?? `sms_failed_${response.status}` };
  }
  return { ok: true as const };
}
