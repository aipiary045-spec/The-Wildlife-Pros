import crypto from "node:crypto";
import { phoneDigits } from "@/lib/intake";

const MAX_AGE_SECONDS = 5 * 60;

export type QuoEnvelope = {
  id?: string;
  type?: string;
  data?: {
    resource?: {
      id?: string;
      direction?: string;
    };
    context?: {
      participants?: {
        workspace?: string[];
        external?: string[];
        resolution?: string;
      };
      senderIdentifier?: string;
    };
  };
};

export type QuoCallPlan =
  | { action: "ignore"; reason: string }
  | { action: "intake"; phone: string; title: string; details: string };

export function parseQuoEnvelope(body: unknown): QuoEnvelope {
  if (!body || typeof body !== "object") throw new Error("Quo sent an empty payload.");
  return body as QuoEnvelope;
}

export function normalizeQuoPhone(value?: string | null) {
  const digits = phoneDigits(value);
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 7 && value?.startsWith("+")) return `+${digits}`;
  return null;
}

export function planFromQuoEvent(event: QuoEnvelope): QuoCallPlan {
  if (event.type !== "call.ringing") {
    return { action: "ignore", reason: "Not a ringing call." };
  }
  if (event.data?.resource?.direction !== "incoming") {
    return { action: "ignore", reason: "Outgoing call." };
  }
  const external = event.data.context?.participants?.external ?? [];
  const phone = normalizeQuoPhone(external[0]);
  if (!phone) {
    return { action: "ignore", reason: "No caller ID yet." };
  }
  return {
    action: "intake",
    phone,
    title: "Incoming Quo call",
    details: `Rang on Quo · ${phone}`,
  };
}

export function verifyQuoSignature(input: {
  rawBody: string;
  webhookId?: string | null;
  webhookTimestamp?: string | null;
  webhookSignature?: string | null;
  secret?: string | null;
  nowSeconds?: number;
}) {
  const secret = input.secret?.trim();
  if (!secret) throw new Error("QUO_WEBHOOK_KEY is not set.");
  const webhookId = input.webhookId?.trim();
  const webhookTimestamp = input.webhookTimestamp?.trim();
  const webhookSignature = input.webhookSignature?.trim();
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new Error("Missing Quo webhook headers.");
  }
  const timestamp = Number(webhookTimestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > MAX_AGE_SECONDS) {
    throw new Error("Stale Quo webhook.");
  }
  const secretBase64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const secretBytes = Buffer.from(secretBase64, "base64");
  const signedContent = `${webhookId}.${webhookTimestamp}.${input.rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const provided = webhookSignature
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [version, signature] = entry.split(",");
      return version === "v1" ? signature : undefined;
    })
    .filter((signature): signature is string => Boolean(signature));
  const ok = provided.some((signature) => {
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
  if (!ok) throw new Error("Invalid Quo webhook signature.");
}
