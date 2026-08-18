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
    pastDueInvoices: 4,
    needsADay: 3,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "late_checkin");
  assert.match(items[0]?.title ?? "", /Squirrel trapping/);
  assert.match(items[0]?.body ?? "", /1 hour 30 minutes late/);
});

test("office sees late check-ins first, then other useful counts", () => {
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
      pastDueInvoices: 2,
      needsInvoice: 1,
      quotesWaiting: 3,
      needsADay: 5,
      newCalls: 2,
    },
    new Date(2026, 7, 17, 12, 0, 0),
  );
  assert.equal(items[0]?.kind, "late_checkin");
  assert.match(items[0]?.title ?? "", /Jordan Blake/);
  assert.equal(items.some((item) => item.kind === "follow_up" && item.title === "Return trip is overdue"), true);
  assert.equal(items.some((item) => item.kind === "time_off" && item.title.includes("Alex Nguyen")), true);
  assert.equal(items.some((item) => item.title === "2 invoices are past due"), true);
  assert.equal(items.some((item) => item.title === "5 jobs need a day on the schedule"), true);
  assert.equal(items.some((item) => item.title === "3 quotes are waiting on the customer"), true);
  assert.equal(items.some((item) => item.title === "1 finished job still needs an invoice"), true);
  assert.equal(items.some((item) => item.title === "2 new calls are waiting"), true);
});

test("office with nothing waiting gets an empty list", () => {
  assert.deepEqual(buildNotifications({ techView: false, lateJobs: [] }), []);
});
