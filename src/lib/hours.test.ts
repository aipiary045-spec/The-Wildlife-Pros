import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHoursGrid, hoursByDay, punchMinutes, applyDayOffsToGrid } from "./hours";

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

test("buildHoursGrid fills daily columns and week totals", () => {
  const mon = new Date(2026, 7, 17); // Monday
  const tue = new Date(2026, 7, 18);
  const days = [
    mon,
    tue,
    new Date(2026, 7, 19),
    new Date(2026, 7, 20),
    new Date(2026, 7, 21),
    new Date(2026, 7, 22),
    new Date(2026, 7, 23),
  ];
  const grid = buildHoursGrid(
    [
      {
        userId: "u1",
        date: mon,
        status: "CLOCKED_OUT",
        breakMin: 0,
        punches: [{ clockInAt: new Date(2026, 7, 17, 8, 0, 0), clockOutAt: new Date(2026, 7, 17, 16, 0, 0) }],
        user: { id: "u1", firstName: "Jordan", lastName: "Blake", color: "#E85D04" },
      },
      {
        userId: "u1",
        date: tue,
        status: "CLOCKED_IN",
        breakMin: 0,
        punches: [{ clockInAt: new Date(2026, 7, 18, 8, 0, 0), clockOutAt: null }],
        user: { id: "u1", firstName: "Jordan", lastName: "Blake", color: "#E85D04" },
      },
      {
        userId: "u2",
        date: mon,
        status: "CLOCKED_OUT",
        breakMin: 30,
        punches: [{ clockInAt: new Date(2026, 7, 17, 9, 0, 0), clockOutAt: new Date(2026, 7, 17, 17, 0, 0) }],
        user: { id: "u2", firstName: "Alex", lastName: "Rivera", color: "#111111" },
      },
    ],
    days,
    new Date(2026, 7, 18, 12, 0, 0),
  );

  assert.equal(grid.rows.length, 2);
  assert.equal(grid.rows[0]?.user.firstName, "Alex"); // sorted by name
  assert.equal(grid.rows[0]?.byDay["2026-08-17"], 450); // 8h - 30m
  assert.equal(grid.rows[1]?.byDay["2026-08-17"], 480);
  assert.equal(grid.rows[1]?.byDay["2026-08-18"], 240); // open punch to noon
  assert.equal(grid.rows[1]?.open, true);
  assert.equal(grid.rows[1]?.weekMinutes, 720);
  assert.equal(grid.dayTotals[0], 930);
  assert.equal(grid.weekTotal, 1170);
});

test("applyDayOffsToGrid marks Off days and adds off-only people", () => {
  const mon = new Date(2026, 7, 17);
  const days = [
    mon,
    new Date(2026, 7, 18),
    new Date(2026, 7, 19),
    new Date(2026, 7, 20),
    new Date(2026, 7, 21),
    new Date(2026, 7, 22),
    new Date(2026, 7, 23),
  ];
  const base = buildHoursGrid(
    [
      {
        userId: "u1",
        date: mon,
        status: "CLOCKED_OUT",
        breakMin: 0,
        punches: [{ clockInAt: new Date(2026, 7, 17, 8, 0, 0), clockOutAt: new Date(2026, 7, 17, 12, 0, 0) }],
        user: { id: "u1", firstName: "Jordan", lastName: "Blake" },
      },
    ],
    days,
  );
  const { grid, offKeys } = applyDayOffsToGrid(base, [
    {
      userId: "u2",
      date: mon,
      user: { id: "u2", firstName: "Alex", lastName: "Rivera" },
    },
    {
      userId: "u1",
      date: new Date(2026, 7, 18),
      user: { id: "u1", firstName: "Jordan", lastName: "Blake" },
    },
  ]);
  assert.equal(grid.rows.length, 2);
  assert.deepEqual(offKeys.u1, ["2026-08-18"]);
  assert.deepEqual(offKeys.u2, ["2026-08-17"]);
  assert.equal(grid.rows.find((row) => row.user.id === "u2")?.weekMinutes, 0);
});
