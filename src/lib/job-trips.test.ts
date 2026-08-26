import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTripVisitMap,
  formatTripVisitLabel,
  parseIncludedTrips,
  sortTripChain,
  tripVisitForJob,
  tripVisitInfo,
} from "./job-trips";

test("parseIncludedTrips accepts 2–99 and rejects open-ended values", () => {
  assert.equal(parseIncludedTrips(null), null);
  assert.equal(parseIncludedTrips(1), null);
  assert.equal(parseIncludedTrips(4), 4);
  assert.equal(parseIncludedTrips("6"), 6);
  assert.equal(parseIncludedTrips(100), null);
});

test("sortTripChain orders by scheduled start then created time", () => {
  const sorted = sortTripChain([
    { id: "b", createdAt: "2026-08-02", scheduledStart: "2026-08-10T09:00:00Z" },
    { id: "a", createdAt: "2026-08-01", scheduledStart: "2026-08-03T09:00:00Z" },
    { id: "c", createdAt: "2026-08-03", scheduledStart: null },
  ]);
  assert.deepEqual(sorted.map((job) => job.id), ["a", "b", "c"]);
});

test("buildTripVisitMap labels each job in a multi-trip package", () => {
  const map = buildTripVisitMap([
    { id: "root", createdAt: "2026-08-01", scheduledStart: "2026-08-03", includedTrips: 3 },
    { id: "trip2", sourceJobId: "root", createdAt: "2026-08-02", scheduledStart: "2026-08-10", includedTrips: 3 },
    { id: "trip3", sourceJobId: "root", createdAt: "2026-08-03", scheduledStart: "2026-08-17", includedTrips: 3 },
  ]);
  assert.equal(map.get("root")?.visitNumber, 1);
  assert.equal(map.get("trip2")?.visitNumber, 2);
  assert.equal(map.get("trip3")?.visitNumber, 3);
  assert.equal(formatTripVisitLabel(map.get("trip2")!), "Visit 2 of 3");
});

test("tripVisitForJob flags visits past the included count", () => {
  const chain = [
    { id: "root", createdAt: "2026-08-01", scheduledStart: "2026-08-03", includedTrips: 2 },
    { id: "trip2", sourceJobId: "root", createdAt: "2026-08-02", scheduledStart: "2026-08-10", includedTrips: 2 },
    { id: "extra", sourceJobId: "root", createdAt: "2026-08-03", scheduledStart: "2026-08-17", includedTrips: 2 },
  ];
  const info = tripVisitForJob(chain[2]!, chain);
  assert.equal(tripVisitInfo(2, 2)?.overIncluded, false);
  assert.equal(info?.visitNumber, 3);
  assert.equal(info?.overIncluded, true);
});
