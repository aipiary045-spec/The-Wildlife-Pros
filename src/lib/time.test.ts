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

test("open punches on a past day stop at end of that day", () => {
  // Clocked in Monday morning, never clocked out; viewing on Wednesday must not show ~42h.
  const sheetDate = new Date(2026, 7, 24); // local Monday Aug 24
  const now = new Date(2026, 7, 26, 12, 0, 0); // Wednesday noon
  const minutes = workedMinutes(
    [{ clockInAt: new Date(2026, 7, 24, 8, 0, 0), clockOutAt: null }],
    0,
    now,
    sheetDate,
  );
  // 8:00 AM → end of Monday = 16 hours
  assert.equal(minutes, 16 * 60);
});

test("open punches today still use live now", () => {
  const sheetDate = new Date(2026, 7, 26);
  const now = new Date(2026, 7, 26, 12, 0, 0);
  const minutes = workedMinutes(
    [{ clockInAt: new Date(2026, 7, 26, 8, 0, 0), clockOutAt: null }],
    0,
    now,
    sheetDate,
  );
  assert.equal(minutes, 4 * 60);
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
