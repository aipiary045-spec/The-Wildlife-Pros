import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldSyncJobToGoogleCalendar } from "./google-calendar";

test("shouldSyncJobToGoogleCalendar requires tech, start, and active status", () => {
  assert.equal(
    shouldSyncJobToGoogleCalendar({
      status: "SCHEDULED",
      technicianId: "tech-1",
      scheduledStart: new Date("2026-08-20T13:00:00.000Z"),
    }),
    true,
  );
  assert.equal(
    shouldSyncJobToGoogleCalendar({
      status: "UNSCHEDULED",
      technicianId: "tech-1",
      scheduledStart: null,
    }),
    false,
  );
  assert.equal(
    shouldSyncJobToGoogleCalendar({
      status: "CANCELLED",
      technicianId: "tech-1",
      scheduledStart: new Date("2026-08-20T13:00:00.000Z"),
    }),
    false,
  );
});
