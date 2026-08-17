import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupWorkOrders,
  jobIsLateOnToday,
  matchesWorkOrderSearch,
  parseWorkOrderView,
  workOrderBucket,
  workOrderCounts,
  workOrderViews,
} from "./work-orders";

const now = new Date(2026, 7, 17, 15, 0, 0);

test("work orders land in a pipeline bucket", () => {
  assert.equal(workOrderBucket({ status: "UNSCHEDULED", scheduledStart: null }, now), "needs_day");
  assert.equal(workOrderBucket({ status: "SCHEDULED", scheduledStart: new Date(2026, 7, 17, 9, 0, 0) }, now), "today");
  assert.equal(workOrderBucket({ status: "SCHEDULED", scheduledStart: new Date(2026, 7, 16, 9, 0, 0) }, now), "late");
  assert.equal(workOrderBucket({ status: "SCHEDULED", scheduledStart: new Date(2026, 7, 18, 9, 0, 0) }, now), "upcoming");
  assert.equal(workOrderBucket({ status: "ON_SITE", scheduledStart: new Date(2026, 7, 16, 9, 0, 0) }, now), "today");
  assert.equal(workOrderBucket({ status: "COMPLETED", scheduledStart: new Date(2026, 7, 16, 9, 0, 0) }, now), "needs_invoice");
  assert.equal(workOrderBucket({ status: "INVOICED", scheduledStart: new Date(2026, 7, 16, 9, 0, 0) }, now), "closed");
  assert.equal(workOrderBucket({ status: "ON_HOLD", scheduledStart: new Date(2026, 7, 17, 9, 0, 0) }, now), "parked");
});

test("today's overdue check-in stays on Today, marked late", () => {
  const job = { status: "SCHEDULED", scheduledStart: new Date(2026, 7, 17, 9, 0, 0) };
  assert.equal(workOrderBucket(job, now), "today");
  assert.equal(jobIsLateOnToday(job, now), true);
});

test("office defaults to action needed; technicians default to today", () => {
  assert.equal(parseWorkOrderView(null, false), "action");
  assert.equal(parseWorkOrderView(null, true), "today");
  assert.equal(parseWorkOrderView("needs_day", false), "needs_day");
  assert.equal(parseWorkOrderView("nope", true), "today");
});

test("action needed is late + today + needs a day", () => {
  const jobs = [
    { id: "a", status: "SCHEDULED", scheduledStart: new Date(2026, 7, 16, 9, 0, 0) },
    { id: "b", status: "SCHEDULED", scheduledStart: new Date(2026, 7, 17, 9, 0, 0) },
    { id: "c", status: "UNSCHEDULED", scheduledStart: null },
    { id: "d", status: "COMPLETED", scheduledStart: new Date(2026, 7, 15, 9, 0, 0) },
  ];
  const views = workOrderViews(false);
  const counts = workOrderCounts(jobs, views, now);
  assert.equal(counts.action, 3);
  assert.equal(counts.needs_invoice, 1);
  const sections = groupWorkOrders(jobs, views[0]!, now);
  assert.deepEqual(
    sections.map((section) => section.key),
    ["late", "today", "needs_day"],
  );
});

test("search matches job number, client, and address", () => {
  const job = {
    number: "JOB-0004",
    title: "Squirrel trapping",
    clientName: "Nguyen",
    address: "12 Oak St",
    technicianName: "Jordan Blake",
  };
  assert.equal(matchesWorkOrderSearch(job, "oak"), true);
  assert.equal(matchesWorkOrderSearch(job, "jordan"), true);
  assert.equal(matchesWorkOrderSearch(job, "raccoon"), false);
});
