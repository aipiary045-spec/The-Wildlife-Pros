import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { normalizeQuoPhone, parseQuoEnvelope, planFromQuoEvent, verifyQuoSignature } from "./quo";

test("incoming Quo ring becomes an intake plan with the caller ID", () => {
  const event = parseQuoEnvelope({
    type: "call.ringing",
    data: {
      resource: { id: "AC-call", direction: "incoming" },
      context: {
        participants: { workspace: ["+15550000001"], external: ["+17045550142"], resolution: "available" },
      },
    },
  });
  const plan = planFromQuoEvent(event);
  assert.equal(plan.action, "intake");
  if (plan.action === "intake") {
    assert.equal(plan.phone, "+17045550142");
    assert.match(plan.details, /Quo/);
  }
});

test("outgoing rings and other Quo events are ignored", () => {
  assert.equal(
    planFromQuoEvent({
      type: "call.ringing",
      data: { resource: { direction: "outgoing" }, context: { participants: { external: ["+17045550142"] } } },
    }).action,
    "ignore",
  );
  assert.equal(planFromQuoEvent({ type: "message.received" }).action, "ignore");
  assert.equal(planFromQuoEvent({ type: "call.ringing", data: { resource: { direction: "incoming" } } }).action, "ignore");
});

test("normalizeQuoPhone keeps a 10-digit US number in E.164", () => {
  assert.equal(normalizeQuoPhone("(704) 555-0142"), "+17045550142");
  assert.equal(normalizeQuoPhone("+1 704 555 0142"), "+17045550142");
  assert.equal(normalizeQuoPhone("55"), null);
});

test("verifyQuoSignature accepts a matching v1 HMAC and rejects a bad one", () => {
  const rawBody = '{"type":"call.ringing"}';
  const webhookId = "msg_1";
  const webhookTimestamp = "1710000000";
  const secretBytes = Buffer.from("super-secret-key");
  const secret = `whsec_${secretBytes.toString("base64")}`;
  const signature = crypto
    .createHmac("sha256", secretBytes)
    .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
    .digest("base64");
  verifyQuoSignature({
    rawBody,
    webhookId,
    webhookTimestamp,
    webhookSignature: `v1,${signature}`,
    secret,
    nowSeconds: 1710000000,
  });
  assert.throws(
    () =>
      verifyQuoSignature({
        rawBody,
        webhookId,
        webhookTimestamp,
        webhookSignature: "v1,not-the-signature",
        secret,
        nowSeconds: 1710000000,
      }),
    /Invalid/,
  );
});
