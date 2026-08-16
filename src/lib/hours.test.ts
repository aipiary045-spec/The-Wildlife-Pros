import assert from "node:assert/strict";
import { test } from "node:test";
import { hoursByDay, punchMinutes } from "./hours";

test("punchMinutes subtracts unpaid break", () => {
  const punches = [
    { clockInAt: new Date(2026, 7, 16, 8, 0, 0), clockOutAt: new Date(2026, 7, 16, 12, 0, 0) },
    { clockInAt: new Date(2026, 7, 16, 12, 30, 0), clockOutAt: new Date(2026, 7, 16, 16, 30, 0) },
  ];
  assert.equal(punchMinutes(punches, 30), 450);
});

test("hoursByDay rolls timesheets onto calendar days", () => {
  const days = hoursByDay([
    {
      date: new Date(2026, 7, 17),
      breakMin: 0,
      punches: [{ clockInAt: new Date(2026, 7, 17, 8, 0, 0), clockOutAt: new Date(2026, 7, 17, 12, 0, 0) }],
    },
    {
      date: new Date(2026, 7, 16),
      breakMin: 0,
      punches: [{ clockInAt: new Date(2026, 7, 16, 9, 0, 0), clockOutAt: new Date(2026, 7, 16, 10, 0, 0) }],
    },
  ]);
  assert.equal(days.length, 2);
  assert.equal(days[0]?.minutes, 60);
  assert.equal(days[1]?.minutes, 240);
});
