import assert from "node:assert/strict";
import { test } from "node:test";
import { isApprovedDayOff, nextDayOffStatus, offKey, parseDayOffDate } from "./day-off";

test("parseDayOffDate reads a local calendar day", () => {
  const date = parseDayOffDate("2026-08-18");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 7);
  assert.equal(date.getDate(), 18);
});

test("only APPROVED days block the schedule", () => {
  assert.equal(isApprovedDayOff("APPROVED"), true);
  assert.equal(isApprovedDayOff("REQUESTED"), false);
  assert.equal(isApprovedDayOff("DENIED"), false);
});

test("office can approve or deny a request", () => {
  assert.equal(nextDayOffStatus("APPROVED"), "APPROVED");
  assert.equal(nextDayOffStatus("DENIED"), "DENIED");
  assert.equal(nextDayOffStatus("nope"), null);
});

test("offKey ties a tech to a calendar day", () => {
  assert.equal(offKey("tech-1", "2026-08-18"), "tech-1:2026-08-18");
});
