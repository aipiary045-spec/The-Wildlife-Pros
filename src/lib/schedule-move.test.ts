import assert from "node:assert/strict";
import { test } from "node:test";
import { jobNeedsMove } from "./schedule-move";

test("jobNeedsMove is false when the job is already on that tech and day", () => {
  assert.equal(
    jobNeedsMove(
      { technicianId: "t1", scheduledStart: new Date(2026, 7, 15, 9, 0, 0) },
      "t1",
      "2026-08-15",
    ),
    false,
  );
});

test("jobNeedsMove is true when the technician changes", () => {
  assert.equal(
    jobNeedsMove(
      { technicianId: "t1", scheduledStart: new Date(2026, 7, 15, 9, 0, 0) },
      "t2",
      "2026-08-15",
    ),
    true,
  );
});

test("jobNeedsMove is true for unscheduled jobs", () => {
  assert.equal(jobNeedsMove({ technicianId: null, scheduledStart: null }, "t1", "2026-08-15"), true);
});
