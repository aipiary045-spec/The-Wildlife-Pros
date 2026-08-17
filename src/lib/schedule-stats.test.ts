import assert from "node:assert/strict";
import { test } from "node:test";
import { dayAppointmentStats } from "./schedule-stats";

test("dayAppointmentStats counts live stops for the schedule day", () => {
  const stats = dayAppointmentStats([
    { status: "SCHEDULED" },
    { status: "ON_SITE" },
    { status: "COMPLETED" },
    { status: "INVOICED" },
    { status: "CANCELLED" },
  ]);
  assert.deepEqual(stats, { total: 4, toGo: 2, active: 1, completed: 2 });
});
