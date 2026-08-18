import assert from "node:assert/strict";
import { test } from "node:test";
import { offKey, snapClock, suggestInsertTime, suggestNearbySlots } from "./schedule-suggest";
import { fromZonedDateTime, timeValueInZone, zonedParts } from "./timezone";

const willow = { lat: 35.2271, lng: -80.8431 };
const nextDoor = { lat: 35.228, lng: -80.844 };
const twentyMiles = { lat: 35.5, lng: -80.85 };
const tooFar = { lat: 36.1, lng: -80.85 };

function stop(overrides: Partial<{ scheduledStart: Date; technicianId: string; technicianName: string; jobId: string; title: string; address: string; durationMin: number; lat: number; lng: number }>) {
  return {
    jobId: "job",
    technicianId: "jordan",
    technicianName: "Jordan Blake",
    scheduledStart: fromZonedDateTime(2026, 8, 19, 9, 0),
    durationMin: 60,
    ...nextDoor,
    title: "Trap check",
    address: "810 Willow Crest Ln",
    ...overrides,
  };
}

test("suggestInsertTime drops the new stop after the nearby one, on a half hour Eastern clock", () => {
  const insert = suggestInsertTime(fromZonedDateTime(2026, 8, 18, 9, 0), 60, 1);
  assert.equal(timeValueInZone(insert), "10:30");
  const late = suggestInsertTime(fromZonedDateTime(2026, 8, 18, 17, 0), 60, 2);
  assert.ok(zonedParts(late).hour < 17);
});

test("afternoon Eastern jobs stay in the afternoon instead of flipping to 1:30 AM", () => {
  const insert = suggestInsertTime(fromZonedDateTime(2026, 8, 18, 14, 0), 60, 3);
  assert.equal(zonedParts(insert).hour, 15);
  assert.equal(zonedParts(insert).minute, 30);
});

test("snapClock rounds to the half hour on the Eastern clock", () => {
  const snapped = snapClock(fromZonedDateTime(2026, 8, 18, 10, 12));
  assert.equal(timeValueInZone(snapped), "10:00");
});

test("suggestNearbySlots prefers a tech already on that street", () => {
  const now = fromZonedDateTime(2026, 8, 18, 8, 0);
  const suggestions = suggestNearbySlots(
    willow,
    [
      stop({ jobId: "near" }),
      stop({
        jobId: "far",
        technicianId: "alex",
        technicianName: "Alex Nguyen",
        ...tooFar,
        title: "Inspection",
        address: "99 Lake Dr",
      }),
    ],
    { now },
  );
  assert.equal(suggestions[0]?.technicianId, "jordan");
  assert.equal(suggestions[0]?.band, "near");
  assert.match(suggestions[0]?.reason ?? "", /already at 810 Willow Crest/);
  assert.equal(suggestions[0]?.date, "2026-08-19");
  assert.equal(suggestions[0]?.time, "10:30");
  assert.ok(!suggestions.some((item) => item.technicianId === "alex"));
});

test("suggestNearbySlots keeps a stop about 20 miles out and a job months away", () => {
  const now = fromZonedDateTime(2026, 8, 18, 8, 0);
  const suggestions = suggestNearbySlots(
    willow,
    [
      stop({
        jobId: "later",
        scheduledStart: fromZonedDateTime(2026, 11, 3, 9, 0),
        title: "Follow-up",
      }),
      stop({
        jobId: "mid",
        technicianId: "alex",
        technicianName: "Alex Nguyen",
        scheduledStart: fromZonedDateTime(2026, 8, 20, 13, 0),
        durationMin: 45,
        ...twentyMiles,
        title: "Inspection",
        address: "99 Lake Dr",
      }),
    ],
    { now },
  );
  assert.equal(suggestions.length, 2);
  assert.equal(suggestions.find((item) => item.technicianId === "jordan")?.date, "2026-11-03");
  assert.equal(suggestions.find((item) => item.technicianId === "alex")?.band, "on_the_way");
});

test("suggestNearbySlots still offers a same-day slot that is only a little ahead", () => {
  const now = fromZonedDateTime(2026, 8, 18, 10, 5);
  const suggestions = suggestNearbySlots(
    willow,
    [stop({ jobId: "soon", scheduledStart: fromZonedDateTime(2026, 8, 18, 10, 0), durationMin: 30 })],
    { now },
  );
  assert.equal(suggestions[0]?.date, "2026-08-18");
  assert.equal(suggestions[0]?.time, "11:00");
});

test("suggestNearbySlots skips days off and a job you are already editing", () => {
  const now = fromZonedDateTime(2026, 8, 18, 8, 0);
  const nearby = stop({ jobId: "self" });
  assert.deepEqual(suggestNearbySlots(willow, [nearby], { now, excludeJobId: "self" }), []);
  assert.deepEqual(suggestNearbySlots(willow, [nearby], { now, offKeys: [offKey("jordan", "2026-08-19")] }), []);
});
