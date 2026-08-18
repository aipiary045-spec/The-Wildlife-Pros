import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildQuoteDeliveryMessage,
  mailtoFallbackUrl,
  messagingCapabilities,
  portalHubUrl,
  sendEmail,
  sendSms,
  smsFallbackUrl,
  type DeliveryChannel,
} from "@/lib/messaging";
import { formatMoney } from "@/lib/utils";

export const deliveryChannelSchema = z.enum(["email", "sms", "both"]);

export async function deliverQuote(input: {
  quote: {
    id: string;
    number: string;
    title: string;
    total: { toString(): string } | number;
    status: string;
    client: {
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      portalToken: string;
      companyName: string | null;
    };
  };
  channel: DeliveryChannel;
  markSent: boolean;
}) {
  const hubUrl = portalHubUrl(input.quote.client.portalToken);
  const total = formatMoney(input.quote.total);
  const body = buildQuoteDeliveryMessage({
    clientFirstName: input.quote.client.firstName,
    quoteNumber: input.quote.number,
    quoteTitle: input.quote.title,
    total,
    hubUrl,
    companyName: input.quote.client.companyName ?? undefined,
  });
  const subject = `${input.quote.number} · ${input.quote.title}`;

  const caps = messagingCapabilities();
  const delivered: { email?: boolean; sms?: boolean } = {};
  const errors: string[] = [];

  if (input.channel === "email" || input.channel === "both") {
    if (!input.quote.client.email) {
      errors.push("Client has no email on file.");
    } else if (caps.email) {
      const result = await sendEmail({
        to: input.quote.client.email,
        subject,
        body,
      });
      if (result.ok) delivered.email = true;
      else errors.push(typeof result.reason === "string" ? result.reason : "Email failed.");
    }
  }

  if (input.channel === "sms" || input.channel === "both") {
    if (!input.quote.client.phone) {
      errors.push("Client has no phone on file.");
    } else if (caps.sms) {
      const result = await sendSms({ to: input.quote.client.phone, body });
      if (result.ok) delivered.sms = true;
      else errors.push(typeof result.reason === "string" ? result.reason : "SMS failed.");
    }
  }

  const quote = input.markSent
    ? await prisma.quote.update({
        where: { id: input.quote.id },
        data: {
          status: input.quote.status === "APPROVED" ? undefined : "SENT",
          sentAt: new Date(),
        },
        include: { client: true },
      })
    : input.quote;

  const fallback = {
    hubUrl,
    mailto: mailtoFallbackUrl(input.quote.client.email, subject, body),
    sms: smsFallbackUrl(input.quote.client.phone, body),
    message: body,
  };

  const sentAutomatically = Boolean(delivered.email || delivered.sms);
  if (!sentAutomatically && errors.length === 0 && !caps.email && !caps.sms) {
    errors.push("Add Resend or Twilio env vars to send automatically, or use the copy / SMS / email links.");
  }

  return {
    quote,
    hubUrl,
    delivered,
    capabilities: caps,
    fallback,
    errors,
    sentAutomatically,
  };
}
