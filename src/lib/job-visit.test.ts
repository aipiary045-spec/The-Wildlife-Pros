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
  const complete = parseCheckoutBody({
    outcome: "complete",
    notes: "All clear",
    workDone: ["inspection", "no_activity"],
    siteLeft: "secure",
  });
  assert.equal(complete.outcome, "complete");
  assert.equal(complete.notes, "All clear");
  assert.deepEqual(complete.workDone, ["inspection", "no_activity"]);
  assert.equal(complete.trapPlaced, false);
});

test("parseCheckoutBody asks for days until return instead of a calendar slot", () => {
  assert.throws(() => parseCheckoutBody({ outcome: "follow_up" }), /how many days/);
  const next = parseCheckoutBody({
    outcome: "follow_up",
    notes: "Trap still active",
    returnInDays: 3,
    workDone: ["trap_check"],
    trapPlaced: true,
    trapLat: 35.2,
    trapLng: -80.8,
    trapNote: "South eave",
  });
  assert.equal(next.outcome, "follow_up");
  assert.equal(next.followUp?.returnInDays, 3);
  assert.equal(next.trapPlaced, true);
  assert.equal(next.trapLat, 35.2);
  assert.ok(next.followUp?.dueOn.getTime() > Date.now());
});
