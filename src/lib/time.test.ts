import assert from "node:assert/strict";
import { test } from "node:test";
import { currentPunchElapsedMs, formatDuration, formatElapsedClock, hasOpenPunch, openPunch, punchMinutes, workedMinutes } from "./time";

test("punchMinutes sums closed punches and an open one", () => {
  const now = new Date("2026-08-15T13:00:00.000Z");
  const minutes = punchMinutes(
    [
      { clockInAt: "2026-08-15T08:00:00.000Z", clockOutAt: "2026-08-15T12:00:00.000Z" },
      { clockInAt: "2026-08-15T12:30:00.000Z", clockOutAt: null },
    ],
    now,
  );
  assert.equal(minutes, 4 * 60 + 30);
});

test("workedMinutes subtracts unpaid break", () => {
  const minutes = workedMinutes(
    [{ clockInAt: "2026-08-15T08:00:00.000Z", clockOutAt: "2026-08-15T17:00:00.000Z" }],
    30,
  );
  assert.equal(minutes, 8 * 60 + 30);
});

test("formatDuration and open-punch helper", () => {
  assert.equal(formatDuration(75), "1h 15m");
  assert.equal(formatDuration(12), "12m");
  assert.equal(hasOpenPunch([{ clockInAt: new Date(), clockOutAt: null }]), true);
  assert.equal(hasOpenPunch([{ clockInAt: new Date(), clockOutAt: new Date() }]), false);
});

test("current punch elapsed and clock formatting", () => {
  const now = new Date("2026-08-15T13:05:30.000Z");
  const punches = [{ clockInAt: "2026-08-15T13:00:00.000Z", clockOutAt: null }];
  assert.equal(currentPunchElapsedMs(punches, now), 5 * 60 * 1000 + 30 * 1000);
  assert.equal(formatElapsedClock(5 * 60 * 1000 + 30 * 1000), "5:30");
  assert.equal(formatElapsedClock(65 * 60 * 1000), "1:05:00");
  assert.equal(openPunch(punches)?.clockInAt, "2026-08-15T13:00:00.000Z");
});
