import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyMeasuredLegs,
  applyStartClock,
  assignJobsToTechnicians,
  haversineMiles,
  matrixTravelEstimator,
  optimizeRoute,
  parseOptimizeMode,
  parseStartHour,
  planDayRoutes,
} from "./routing";

const jordan = { id: "jordan", lat: 35.205, lng: -80.86, capacity: 8 };
const alex = { id: "alex", lat: 35.175, lng: -80.8, capacity: 8 };

test("haversine is zero for the same point", () => {
  assert.equal(haversineMiles({ lat: 35.2, lng: -80.8 }, { lat: 35.2, lng: -80.8 }), 0);
});

test("optimizeRoute orders nearby stops and returns totals plus a return-to-shop leg", () => {
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
  assert.ok(route.returnMiles > 0);
  assert.ok(route.returnDriveMin > 0);
  assert.equal(route.stops[0].sequence, 1);
});

test("matrixTravelEstimator prefers road miles when ordering stops", () => {
  const start = { id: "shop", lat: 35.2, lng: -80.84 };
  const near = { id: "near", lat: 35.198, lng: -80.842, durationMin: 30 };
  const far = { id: "far", lat: 35.12, lng: -80.72, durationMin: 30 };
  // Make the geographically near stop expensive on the road matrix.
  const points = [start, near, far];
  const miles = [
    [0, 40, 5],
    [40, 0, 50],
    [5, 50, 0],
  ];
  const minutes = [
    [0, 60, 10],
    [60, 0, 70],
    [10, 70, 0],
  ];
  const travel = matrixTravelEstimator(points, miles, minutes);
  const route = optimizeRoute([near, far], start, travel);
  assert.equal(route.stops[0].id, "far");
  assert.equal(route.stops[0].milesFromPrev, 5);
  assert.equal(route.stops[0].driveMinFromPrev, 10);
});

test("assignJobsToTechnicians balances two techs", () => {
  const result = assignJobsToTechnicians(
    [
      { id: "a", lat: 35.2, lng: -80.86 },
      { id: "b", lat: 35.17, lng: -80.8 },
    ],
    [jordan, alex],
  );
  assert.equal(result.length, 2);
  assert.equal(result.reduce((sum, item) => sum + item.route.stops.length, 0), 2);
});

test("reorder keeps each job on its assigned technician even when the other home is closer", () => {
  const nearAlex = { id: "a", lat: 35.174, lng: -80.801, technicianId: "jordan", durationMin: 45 };
  const nearJordan = { id: "b", lat: 35.204, lng: -80.859, technicianId: "alex", durationMin: 45 };
  const result = planDayRoutes([jordan, alex], [nearAlex, nearJordan], "reorder");
  const jordanStops = result.find((item) => item.technicianId === "jordan")?.route.stops ?? [];
  const alexStops = result.find((item) => item.technicianId === "alex")?.route.stops ?? [];
  assert.deepEqual(
    jordanStops.map((stop) => stop.id),
    ["a"],
  );
  assert.deepEqual(
    alexStops.map((stop) => stop.id),
    ["b"],
  );
});

test("reorder sends unassigned jobs to the nearest technician home", () => {
  const result = planDayRoutes(
    [jordan, alex],
    [{ id: "loose", lat: 35.174, lng: -80.801, technicianId: null, durationMin: 30 }],
    "reorder",
  );
  const alexStops = result.find((item) => item.technicianId === "alex")?.route.stops ?? [];
  const jordanStops = result.find((item) => item.technicianId === "jordan")?.route.stops ?? [];
  assert.equal(alexStops[0]?.id, "loose");
  assert.equal(jordanStops.length, 0);
});

test("rebalance can move a job off the tech it was assigned to", () => {
  const nearAlex = { id: "a", lat: 35.174, lng: -80.801, technicianId: "jordan", durationMin: 45 };
  const result = planDayRoutes([jordan, alex], [nearAlex], "rebalance");
  const alexStops = result.find((item) => item.technicianId === "alex")?.route.stops ?? [];
  assert.equal(alexStops[0]?.id, "a");
});

test("parse helpers default safely", () => {
  assert.equal(parseOptimizeMode("rebalance"), "rebalance");
  assert.equal(parseOptimizeMode("nope"), "reorder");
  assert.equal(parseStartHour(undefined), 8);
  assert.equal(parseStartHour("7"), 7);
  assert.equal(parseStartHour(3), 5);
  assert.equal(parseStartHour(20), 12);
});

test("applyMeasuredLegs rebuilds ETAs from road minutes", () => {
  const start = { id: "shop", lat: 35.2, lng: -80.84 };
  const route = optimizeRoute(
    [
      { id: "a", lat: 35.21, lng: -80.84, durationMin: 30 },
      { id: "b", lat: 35.22, lng: -80.84, durationMin: 30 },
    ],
    start,
  );
  const measured = applyMeasuredLegs(
    route,
    [
      { miles: 1, minutes: 10 },
      { miles: 2, minutes: 20 },
    ],
    { miles: 3, minutes: 15 },
  );
  assert.equal(measured.stops[0].etaMinutesFromStart, 10);
  assert.equal(measured.stops[1].etaMinutesFromStart, 60);
  assert.equal(measured.totalMiles, 3);
  assert.equal(measured.totalDriveMin, 30);
  assert.equal(measured.returnMiles, 3);
  assert.equal(measured.returnDriveMin, 15);
});

test("applyStartClock uses one origin for ETA and scheduled start", () => {
  const day = new Date(2026, 7, 15);
  const clock = applyStartClock(day, 8, 45, 60);
  assert.equal(clock.origin.getHours(), 8);
  assert.equal(clock.scheduledStart.getHours(), 8);
  assert.equal(clock.scheduledStart.getMinutes(), 45);
  assert.equal(clock.eta.getTime(), clock.scheduledStart.getTime());
  assert.equal(clock.scheduledEnd.getMinutes(), 45);
  assert.equal(clock.scheduledEnd.getHours(), 9);
});
