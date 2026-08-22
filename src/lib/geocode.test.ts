import assert from "node:assert/strict";
import { test } from "node:test";
import { isRoadDriveTimes, matrixFromMetersAndSeconds } from "./geocode";

test("matrixFromMetersAndSeconds converts meters and seconds to miles and minutes", () => {
  const { miles, minutes } = matrixFromMetersAndSeconds(
    [
      [0, 1609.344],
      [1609.344, 0],
    ],
    [
      [0, 600],
      [600, 0],
    ],
  );
  assert.equal(miles[0][1], 1);
  assert.equal(minutes[0][1], 10);
});

test("isRoadDriveTimes recognizes road providers", () => {
  assert.equal(isRoadDriveTimes("openrouteservice"), true);
  assert.equal(isRoadDriveTimes("mapbox"), true);
  assert.equal(isRoadDriveTimes("haversine"), false);
});
