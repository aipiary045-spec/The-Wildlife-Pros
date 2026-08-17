import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatMinutesLate,
  isLateForCheckIn,
  minutesLate,
  parseSnoozeMap,
  snoozeJobs,
  unsnoozedJobs,
} from "./late-checkin";

test("a scheduled job is late once the start time is an hour ago", () => {
  const now = new Date("2026-08-17T15:00:00.000Z");
  assert.equal(
    isLateForCheckIn({ status: "SCHEDULED", scheduledStart: "2026-08-17T13:59:00.000Z" }, now),
    true,
  );
  assert.equal(
    isLateForCheckIn({ status: "SCHEDULED", scheduledStart: "2026-08-17T14:01:00.000Z" }, now),
    false,
  );
  assert.equal(
    isLateForCheckIn({ status: "EN_ROUTE", scheduledStart: "2026-08-17T13:00:00.000Z" }, now),
    true,
  );
});

test("checked-in or closed jobs are not late for check-in", () => {
  const now = new Date("2026-08-17T15:00:00.000Z");
  const start = "2026-08-17T10:00:00.000Z";
  assert.equal(isLateForCheckIn({ status: "ON_SITE", scheduledStart: start }, now), false);
  assert.equal(isLateForCheckIn({ status: "COMPLETED", scheduledStart: start }, now), false);
  assert.equal(isLateForCheckIn({ status: "SCHEDULED", scheduledStart: null }, now), false);
});

test("minutes late and copy", () => {
  const now = new Date("2026-08-17T15:00:00.000Z");
  assert.equal(minutesLate("2026-08-17T13:40:00.000Z", now), 80);
  assert.equal(formatMinutesLate(1), "1 minute late");
  assert.equal(formatMinutesLate(59), "59 minutes late");
  assert.equal(formatMinutesLate(60), "1 hour late");
  assert.equal(formatMinutesLate(90), "1 hour 30 minutes late");
  assert.equal(formatMinutesLate(120), "2 hours late");
});

test("snoozing hides a late job until the timer ends", () => {
  const jobs = [{ id: "a" }, { id: "b" }];
  const snoozed = snoozeJobs({}, ["a"], 1_000, 15_000);
  assert.deepEqual(
    unsnoozedJobs(jobs, snoozed, 10_000).map((job) => job.id),
    ["b"],
  );
  assert.deepEqual(
    unsnoozedJobs(jobs, snoozed, 20_000).map((job) => job.id),
    ["a", "b"],
  );
  assert.deepEqual(parseSnoozeMap('{"a":123}'), { a: 123 });
  assert.deepEqual(parseSnoozeMap("not-json"), {});
});
