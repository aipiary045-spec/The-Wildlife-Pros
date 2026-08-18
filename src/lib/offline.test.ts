import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCacheableApiGet,
  isCacheableFieldPath,
  isQueueableFieldRequest,
  mutationLabel,
  parseOccurredAt,
  queuedPayload,
  withOccurredAt,
} from "./offline";

test("parseOccurredAt keeps a recent client timestamp", () => {
  const now = new Date("2026-08-17T18:00:00.000Z");
  const kept = parseOccurredAt("2026-08-17T17:10:00.000Z", now);
  assert.equal(kept.toISOString(), "2026-08-17T17:10:00.000Z");
});

test("parseOccurredAt ignores junk and far-future times", () => {
  const now = new Date("2026-08-17T18:00:00.000Z");
  assert.equal(parseOccurredAt("nope", now).toISOString(), now.toISOString());
  assert.equal(parseOccurredAt("2026-08-18T18:00:00.000Z", now).toISOString(), now.toISOString());
});

test("parseOccurredAt clamps timestamps older than 36 hours", () => {
  const now = new Date("2026-08-17T18:00:00.000Z");
  const clamped = parseOccurredAt("2026-08-10T18:00:00.000Z", now);
  assert.equal(clamped.toISOString(), "2026-08-16T06:00:00.000Z");
});

test("field mutations that can wait for a signal", () => {
  assert.equal(isQueueableFieldRequest("POST", "/api/timesheets/clock"), true);
  assert.equal(isQueueableFieldRequest("POST", "/api/jobs/job_1/check-in"), true);
  assert.equal(isQueueableFieldRequest("POST", "/api/jobs/job_1/check-out"), true);
  assert.equal(isQueueableFieldRequest("POST", "/api/species-logs"), true);
  assert.equal(isQueueableFieldRequest("POST", "/api/deployments"), true);
  assert.equal(isQueueableFieldRequest("PATCH", "/api/deployments"), true);
  assert.equal(isQueueableFieldRequest("POST", "/api/traps"), false);
  assert.equal(isQueueableFieldRequest("GET", "/api/jobs"), false);
  assert.equal(mutationLabel("/api/jobs/abc/check-in"), "Check-in");
  assert.equal(mutationLabel("/api/deployments"), "Trap");
});

test("pages and GETs the technician phone can reuse offline", () => {
  assert.equal(isCacheableFieldPath("/field"), true);
  assert.equal(isCacheableFieldPath("/jobs/abc"), true);
  assert.equal(isCacheableFieldPath("/quotes/abc"), true);
  assert.equal(isCacheableFieldPath("/invoices/abc"), true);
  assert.equal(isCacheableFieldPath("/dashboard"), false);
  assert.equal(isCacheableApiGet("/api/timesheets/me"), true);
  assert.equal(isCacheableApiGet("/api/jobs/late-checkin"), true);
  assert.equal(isCacheableApiGet("/api/quotes/q1"), true);
  assert.equal(isCacheableApiGet("/api/invoices/i1"), true);
  assert.equal(isCacheableApiGet("/api/clients"), false);
});

test("withOccurredAt stamps JSON bodies that have no client time yet", () => {
  const next = withOccurredAt("POST", { body: JSON.stringify({ action: "in" }) }, "2026-08-17T18:00:00.000Z");
  assert.deepEqual(JSON.parse(String(next.body)), { action: "in", occurredAt: "2026-08-17T18:00:00.000Z" });
  const empty = withOccurredAt("POST", undefined, "2026-08-17T18:00:00.000Z");
  assert.deepEqual(JSON.parse(String(empty.body)), { occurredAt: "2026-08-17T18:00:00.000Z" });
  assert.deepEqual(queuedPayload(), { queued: true, offline: true });
});
