import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEmergencyInstructions,
  buildEmergencyTeamBroadcastSms,
  buildEmergencyTechSms,
  emergencyIsOverdue,
  gearHintsForTags,
  parseHazardTags,
  sortJobsEmergencyFirst,
} from "./emergency";

test("parseHazardTags keeps known tags only", () => {
  assert.deepEqual(parseHazardTags(["SNAKE", "NOPE", "BAT"]), ["SNAKE", "BAT"]);
});

test("buildEmergencyInstructions includes gear hints", () => {
  const text = buildEmergencyInstructions({
    message: "Snake in kitchen",
    hazardTags: ["SNAKE", "PET_PRESENT"],
  });
  assert.match(text, /Snake in kitchen/);
  assert.match(text, /Snake hook/);
  assert.match(text, /Secure pets/);
});

test("gearHintsForTags dedupes gear lines", () => {
  assert.deepEqual(gearHintsForTags(["SNAKE", "BAT"]), gearHintsForTags(["SNAKE", "BAT"]));
  assert.equal(gearHintsForTags(["SNAKE"]).length, 1);
});

test("sortJobsEmergencyFirst pins emergency jobs", () => {
  const sorted = sortJobsEmergencyFirst([
    { id: "a", type: "INSPECTION", emergencyDispatch: null },
    { id: "b", type: "EMERGENCY", emergencyDispatch: { acknowledgedAt: null } },
  ]);
  assert.equal(sorted[0]?.id, "b");
});

test("emergencyIsOverdue waits five minutes", () => {
  const createdAt = new Date("2026-08-22T12:00:00Z");
  assert.equal(
    emergencyIsOverdue({ createdAt, acknowledgedAt: null }, new Date("2026-08-22T12:04:00Z")),
    false,
  );
  assert.equal(
    emergencyIsOverdue({ createdAt, acknowledgedAt: null }, new Date("2026-08-22T12:06:00Z")),
    true,
  );
});

test("buildEmergencyTechSms includes navigate link when provided", () => {
  const body = buildEmergencyTechSms({
    situation: "Bat in bedroom",
    address: "12 Main St",
    jobId: "job-1",
    mapUrl: "https://maps.google.com",
  });
  assert.match(body, /EMERGENCY dispatch/);
  assert.match(body, /Navigate:/);
});

test("buildEmergencyTeamBroadcastSms names assigned tech and invites backup", () => {
  const body = buildEmergencyTeamBroadcastSms({
    situation: "Snake in kitchen",
    address: "12 Main St",
    assignedTechName: "Alex Nguyen",
    jobId: "job-1",
  });
  assert.match(body, /EMERGENCY alert/);
  assert.match(body, /Alex Nguyen is assigned/);
  assert.match(body, /get there sooner/i);
});
