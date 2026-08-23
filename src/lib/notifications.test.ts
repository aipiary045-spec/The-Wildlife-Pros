import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNotifications } from "./notifications";

const lateJob = {
  id: "job1",
  number: "JOB-0001",
  title: "Squirrel trapping",
  status: "SCHEDULED",
  scheduledStart: "2026-08-17T13:00:00.000Z",
  minutesLate: 90,
  clientName: "Nguyen",
  address: "12 Oak St",
  technicianName: "Jordan Blake",
};

test("technicians only see their late check-ins", () => {
  const items = buildNotifications({
    techView: true,
    lateJobs: [lateJob],
    needsADay: 3,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "late_checkin");
  assert.match(items[0]?.title ?? "", /Squirrel trapping/);
  assert.match(items[0]?.body ?? "", /1 hour 30 minutes late/);
});

test("emergency dispatches outrank other alerts", () => {
  const items = buildNotifications({
    techView: false,
    lateJobs: [lateJob],
    emergencyDispatches: [
      {
        jobId: "em1",
        title: "Snake in kitchen",
        address: "12 Oak St",
        techName: "Jordan Blake",
        acknowledged: false,
        overdue: false,
      },
    ],
  });
  assert.equal(items[0]?.kind, "emergency_dispatch");
  assert.match(items[0]?.title ?? "", /Emergency dispatched/);
});

test("technicians see unassigned emergency steal alert", () => {
  const items = buildNotifications({
    techView: true,
    lateJobs: [],
    emergencyDispatches: [
      {
        jobId: "em1",
        title: "Bat in bedroom",
        address: "9 Elm St",
        techName: "Unassigned",
        acknowledged: false,
        overdue: false,
        assignedToMe: false,
        unassigned: true,
      },
    ],
  });
  assert.equal(items.length, 1);
  assert.match(items[0]?.title ?? "", /unassigned/i);
  assert.equal(items[0]?.stealJobId, "em1");
});

test("technicians see team emergency alert when not assigned", () => {
  const items = buildNotifications({
    techView: true,
    lateJobs: [],
    emergencyDispatches: [
      {
        jobId: "em1",
        title: "Bat in bedroom",
        address: "9 Elm St",
        techName: "Jordan Blake",
        acknowledged: false,
        overdue: false,
        assignedToMe: false,
      },
    ],
  });
  assert.equal(items.length, 1);
  assert.match(items[0]?.title ?? "", /steal if you're closer/i);
  assert.equal(items[0]?.stealJobId, "em1");
});

test("technicians see go-now alert when assigned", () => {
  const items = buildNotifications({
    techView: true,
    lateJobs: [],
    emergencyDispatches: [
      {
        jobId: "em1",
        title: "Bat in bedroom",
        address: "9 Elm St",
        techName: "Jordan Blake",
        acknowledged: false,
        overdue: false,
        assignedToMe: true,
      },
    ],
  });
  assert.equal(items.length, 1);
  assert.match(items[0]?.title ?? "", /go now/i);
});

test("office sees late check-ins first, then scheduling and intake counts", () => {
  const items = buildNotifications(
    {
      techView: false,
      lateJobs: [lateJob],
      followUps: [
        {
          id: "need1",
          title: "Trap check",
          dueOn: new Date(2026, 7, 16),
          clientName: "Nguyen",
          address: "12 Oak St",
        },
      ],
      timeOff: [{ id: "off1", date: new Date(2026, 7, 20), name: "Alex Nguyen", reason: "Wedding" }],
      needsADay: 5,
      newCalls: 2,
    },
    new Date(2026, 7, 17, 12, 0, 0),
  );
  assert.equal(items[0]?.kind, "late_checkin");
  assert.match(items[0]?.title ?? "", /Jordan Blake/);
  assert.equal(items.some((item) => item.kind === "follow_up" && item.title === "Return trip is overdue"), true);
  assert.equal(items.some((item) => item.kind === "time_off" && item.title.includes("Alex Nguyen")), true);
  assert.equal(items.some((item) => item.title === "5 jobs need a day on the schedule"), true);
  assert.equal(items.some((item) => item.title === "2 calls still need a next step"), true);
  assert.equal(items.some((item) => item.title.includes("invoice")), false);
  assert.equal(items.some((item) => item.title.includes("quote")), false);
});

test("office with nothing waiting gets an empty list", () => {
  assert.deepEqual(buildNotifications({ techView: false, lateJobs: [] }), []);
});
