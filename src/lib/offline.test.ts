import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCacheableApiGet,
  isCacheableFieldPath,
  isQueueableFieldRequest,
  mutationLabel,
  parseOccurredAt,
  requestPath,
} from "./offline";

test("field paths cache jobs and inventory, not billing", () => {
  assert.equal(isCacheableFieldPath("/jobs/abc"), true);
  assert.equal(isCacheableFieldPath("/inventory"), true);
  assert.equal(isCacheableFieldPath("/quotes/abc"), false);
  assert.equal(isCacheableFieldPath("/invoices/abc"), false);
});

test("field API cache only covers jobs and timesheets", () => {
  assert.equal(isCacheableApiGet("/api/jobs/job1"), true);
  assert.equal(isCacheableApiGet("/api/quotes/q1"), false);
  assert.equal(isCacheableApiGet("/api/invoices/i1"), false);
});

test("queueable field mutations cover check-ins, traps, and captures", () => {
  assert.equal(isQueueableFieldRequest("POST", "/api/jobs/job1/check-in"), true);
  assert.equal(isQueueableFieldRequest("POST", "/api/species-logs"), true);
  assert.equal(isQueueableFieldRequest("POST", "/api/invoices"), false);
  assert.equal(mutationLabel("/api/jobs/job1/check-in"), "Check-in");
  assert.equal(requestPath("https://example.com/api/jobs/1"), "/api/jobs/1");
});

test("parseOccurredAt clamps stale and future timestamps", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");
  assert.equal(parseOccurredAt("not-a-date", now).toISOString(), now.toISOString());
  const future = parseOccurredAt("2026-08-18T12:05:00.000Z", now);
  assert.equal(future.toISOString(), now.toISOString());
});
