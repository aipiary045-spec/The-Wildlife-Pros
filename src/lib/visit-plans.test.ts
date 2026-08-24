import assert from "node:assert/strict";
import { test } from "node:test";
import { parseVisitPlanBody, visitPlanStats } from "./visit-plans";

test("visit plan stats track created, completed, and remaining trips", () => {
  const stats = visitPlanStats(
    { totalVisits: 4, status: "ACTIVE" },
    [
      { id: "1", visitNumber: 1, status: "COMPLETED", scheduledStart: new Date() },
      { id: "2", visitNumber: 2, status: "UNSCHEDULED", scheduledStart: null },
    ],
  );
  assert.equal(stats.created, 2);
  assert.equal(stats.completed, 1);
  assert.equal(stats.unscheduled, 1);
  assert.equal(stats.remaining, 2);
  assert.equal(stats.canAddTrip, false);
});

test("next trip can be added after the previous one is done", () => {
  const stats = visitPlanStats(
    { totalVisits: 3, status: "ACTIVE" },
    [{ id: "1", visitNumber: 1, status: "COMPLETED", scheduledStart: new Date() }],
  );
  assert.equal(stats.canAddTrip, true);
  assert.equal(stats.nextVisitNumber, 2);
});

test("parseVisitPlanBody requires client, property, title, and visit count", () => {
  assert.throws(() => parseVisitPlanBody({}), /client/i);
  const parsed = parseVisitPlanBody({
    clientId: "c1",
    propertyId: "p1",
    title: "Monthly monitoring",
    totalVisits: 6,
  });
  assert.equal(parsed.totalVisits, 6);
  assert.equal(parsed.createFirstTrip, true);
});
