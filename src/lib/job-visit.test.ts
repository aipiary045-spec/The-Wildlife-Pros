import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCheckoutBody, visitActionForStatus } from "./job-visit";

test("visitActionForStatus is check-in until the tech is on site", () => {
  assert.equal(visitActionForStatus("SCHEDULED"), "check-in");
  assert.equal(visitActionForStatus("EN_ROUTE"), "check-in");
  assert.equal(visitActionForStatus("UNSCHEDULED"), "check-in");
});

test("visitActionForStatus is check-out while on the job", () => {
  assert.equal(visitActionForStatus("ON_SITE"), "check-out");
  assert.equal(visitActionForStatus("IN_PROGRESS"), "check-out");
});

test("visitActionForStatus hides buttons on closed jobs", () => {
  assert.equal(visitActionForStatus("COMPLETED"), null);
  assert.equal(visitActionForStatus("INVOICED"), null);
  assert.equal(visitActionForStatus("CANCELLED"), null);
  assert.equal(visitActionForStatus("ON_HOLD"), null);
});

test("parseCheckoutBody requires complete or follow_up", () => {
  assert.throws(() => parseCheckoutBody({}), /complete or needs a follow-up/);
  const complete = parseCheckoutBody({ outcome: "complete", notes: "All clear" });
  assert.equal(complete.outcome, "complete");
  assert.equal(complete.notes, "All clear");
});

test("parseCheckoutBody requires a follow-up start time", () => {
  assert.throws(() => parseCheckoutBody({ outcome: "follow_up" }), /date and time/);
  const next = parseCheckoutBody({
    outcome: "follow_up",
    notes: "Trap still active",
    followUp: { scheduledStart: "2026-08-16T13:00:00.000Z", durationMin: 45, technicianId: "tech-1" },
  });
  assert.equal(next.outcome, "follow_up");
  assert.equal(next.followUp?.durationMin, 45);
  assert.equal(next.followUp?.technicianId, "tech-1");
  assert.equal(next.followUp?.scheduledStart.toISOString(), "2026-08-16T13:00:00.000Z");
});
