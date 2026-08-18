import assert from "node:assert/strict";
import { test } from "node:test";
import { offKey, snapClock, suggestInsertTime, suggestNearbySlots } from "./schedule-suggest";

const willow = { lat: 35.2271, lng: -80.8431 };
const nextDoor = { lat: 35.228, lng: -80.844 };
const far = { lat: 35.5, lng: -80.85 };

test("suggestInsertTime drops the new stop after the nearby one, on a half hour", () => {
  const start = new Date(2026, 7, 18, 9, 0, 0);
  const insert = suggestInsertTime(start, 60, 1);
  assert.equal(insert.getHours(), 10);
  assert.equal(insert.getMinutes(), 30);
  const late = suggestInsertTime(new Date(2026, 7, 18, 17, 0, 0), 60, 2);
  assert.ok(late.getHours() < 17 || late.getHours() === 10);
});

test("snapClock rounds to the half hour", () => {
  const snapped = snapClock(new Date(2026, 7, 18, 10, 12, 0));
  assert.equal(snapped.getMinutes(), 0);
});

test("suggestNearbySlots prefers a tech already on that street", () => {
  const now = new Date(2026, 7, 18, 8, 0, 0);
  const suggestions = suggestNearbySlots(
    willow,
    [
      {
        jobId: "near",
        technicianId: "jordan",
        technicianName: "Jordan Blake",
        scheduledStart: new Date(2026, 7, 19, 9, 0, 0),
        durationMin: 60,
        ...nextDoor,
        title: "Trap check",
        address: "810 Willow Crest Ln",
      },
      {
        jobId: "far",
        technicianId: "alex",
        technicianName: "Alex Nguyen",
        scheduledStart: new Date(2026, 7, 19, 9, 0, 0),
        durationMin: 60,
        ...far,
        title: "Inspection",
        address: "99 Lake Dr",
      },
    ],
    { now, days: 14 },
  );
  assert.equal(suggestions[0]?.technicianId, "jordan");
  assert.equal(suggestions[0]?.band, "near");
  assert.match(suggestions[0]?.reason ?? "", /already at 810 Willow Crest/);
  assert.equal(suggestions[0]?.date, "2026-08-19");
  assert.ok(!suggestions.some((item) => item.technicianId === "alex"));
});

test("suggestNearbySlots skips days off and a job you are already editing", () => {
  const now = new Date(2026, 7, 18, 8, 0, 0);
  const stop = {
    jobId: "self",
    technicianId: "jordan",
    technicianName: "Jordan Blake",
    scheduledStart: new Date(2026, 7, 19, 9, 0, 0),
    durationMin: 60,
    ...nextDoor,
    title: "Same job",
    address: "812 Willow Crest Ln",
  };
  assert.deepEqual(suggestNearbySlots(willow, [stop], { now, excludeJobId: "self" }), []);
  assert.deepEqual(suggestNearbySlots(willow, [stop], { now, offKeys: [offKey("jordan", "2026-08-19")] }), []);
});
