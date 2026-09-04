import assert from "node:assert/strict";
import test from "node:test";
import { nextOpenTime } from "./schedule-slot";

test("nextOpenTime defaults to 09:00 when the day is empty", () => {
  assert.equal(nextOpenTime([]), "09:00");
});

test("nextOpenTime defaults to 09:00 when the last stop has no start", () => {
  assert.equal(nextOpenTime([{ scheduledStart: null, durationMin: 60 }]), "09:00");
});

test("nextOpenTime places after the last stop duration", () => {
  assert.equal(
    nextOpenTime([{ scheduledStart: new Date(2026, 8, 4, 9, 0, 0), durationMin: 90 }]),
    "10:30",
  );
});

test("nextOpenTime uses the last job when several are sorted", () => {
  assert.equal(
    nextOpenTime([
      { scheduledStart: new Date(2026, 8, 4, 8, 0, 0), durationMin: 60 },
      { scheduledStart: new Date(2026, 8, 4, 11, 0, 0), durationMin: 45 },
    ]),
    "11:45",
  );
});
