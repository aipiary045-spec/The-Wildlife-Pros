import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEnRouteMessage,
  buildQuoteDeliveryMessage,
  jobNotifyProps,
  portalHubUrl,
  smsFallbackUrl,
} from "./messaging";
import { parseTrapScan, trapQrPayload, isStaleTrap } from "./trap-qr";

test("portalHubUrl builds customer hub links", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://the-wildlife-pros.vercel.app";
  assert.equal(portalHubUrl("demo-token"), "https://the-wildlife-pros.vercel.app/portal/demo-token");
  process.env.NEXT_PUBLIC_APP_URL = original;
});

test("buildQuoteDeliveryMessage includes hub link and total", () => {
  const body = buildQuoteDeliveryMessage({
    clientFirstName: "Riley",
    quoteNumber: "Q-0001",
    quoteTitle: "Raccoon attic",
    total: "$655.91",
    hubUrl: "https://example.com/portal/tok",
  });
  assert.match(body, /Q-0001/);
  assert.match(body, /\$655\.91/);
  assert.match(body, /https:\/\/example\.com\/portal\/tok/);
});

test("buildEnRouteMessage names the technician", () => {
  const body = buildEnRouteMessage({
    clientFirstName: "Riley",
    techName: "Jordan Lee",
    jobTitle: "Trap check",
  });
  assert.match(body, /Jordan Lee/);
  assert.match(body, /Trap check/);
});

test("smsFallbackUrl normalizes US numbers", () => {
  assert.equal(
    smsFallbackUrl("(704) 555-0142", "On the way"),
    "sms:+17045550142?body=On%20the%20way",
  );
});

test("jobNotifyProps builds sms link for active visits only", () => {
  const active = jobNotifyProps(
    {
      id: "job-1",
      title: "Trap check",
      status: "SCHEDULED",
      client: { firstName: "Riley", phone: "(704) 555-0142" },
      technician: { firstName: "Jordan", lastName: "Lee" },
    },
    "Alex",
  );
  assert.ok(active);
  assert.equal(active?.jobId, "job-1");
  assert.match(active?.smsHref ?? "", /^sms:\+17045550142/);

  assert.equal(
    jobNotifyProps(
      {
        id: "job-2",
        title: "Done",
        status: "COMPLETED",
        client: { firstName: "Riley", phone: "(704) 555-0142" },
      },
      "Alex",
    ),
    null,
  );
});

test("trap QR payload round-trips through parseTrapScan", () => {
  assert.equal(trapQrPayload("t-014"), "critterops:trap:T-014");
  assert.equal(parseTrapScan("critterops:trap:T-014"), "T-014");
  assert.equal(parseTrapScan("T-014"), "T-014");
});

test("isStaleTrap flags week-old deployments", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");
  assert.equal(isStaleTrap("2026-08-10T12:00:00.000Z", now), true);
  assert.equal(isStaleTrap("2026-08-17T12:00:00.000Z", now), false);
});
