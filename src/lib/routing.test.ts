import assert from "node:assert/strict";
import { test } from "node:test";
import { assignJobsToTechnicians, haversineMiles, optimizeRoute } from "./routing";

test("haversine is zero for the same point", () => {
  assert.equal(haversineMiles({ lat: 35.2, lng: -80.8 }, { lat: 35.2, lng: -80.8 }), 0);
});

test("optimizeRoute orders nearby stops and returns totals", () => {
  const start = { id: "shop", lat: 35.2, lng: -80.84 };
  const route = optimizeRoute(
    [
      { id: "far", lat: 35.12, lng: -80.72, durationMin: 30 },
      { id: "near", lat: 35.198, lng: -80.842, durationMin: 30 },
    ],
    start,
  );
  assert.equal(route.stops[0].id, "near");
  assert.equal(route.stops.length, 2);
  assert.ok(route.totalMiles > 0);
  assert.ok(route.totalDriveMin > 0);
});

test("assignJobsToTechnicians balances two techs", () => {
  const result = assignJobsToTechnicians(
    [
      { id: "a", lat: 35.2, lng: -80.86 },
      { id: "b", lat: 35.17, lng: -80.8 },
    ],
    [
      { id: "jordan", lat: 35.205, lng: -80.86, capacity: 8 },
      { id: "alex", lat: 35.175, lng: -80.8, capacity: 8 },
    ],
  );
  assert.equal(result.length, 2);
  assert.equal(result.reduce((sum, item) => sum + item.route.stops.length, 0), 2);
});
