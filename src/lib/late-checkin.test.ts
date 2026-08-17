import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMinutesLate, isLateForCheckIn, minutesLate, undismissedJobs } from "./late-checkin";

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

test("a job stays late for check-in hours later, not only at the one-hour mark", () => {
  const now = new Date("2026-08-17T18:00:00.000Z");
  assert.equal(
    isLateForCheckIn({ status: "SCHEDULED", scheduledStart: "2026-08-17T08:00:00.000Z" }, now),
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

test("closing hides the current list until a new late job appears", () => {
  const jobs = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(
    undismissedJobs(jobs, ["a"]).map((job) => job.id),
    ["b"],
  );
  assert.deepEqual(
    undismissedJobs([...jobs, { id: "c" }], ["a", "b"]).map((job) => job.id),
    ["c"],
  );
});
