import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dateKeyInZone,
  fromZonedDateTime,
  startOfZonedDay,
  timeValueInZone,
  zonedParts,
} from "./timezone";

test("fromZonedDateTime stores Eastern wall time as the correct UTC instant", () => {
  const nine = fromZonedDateTime(2026, 8, 18, 9, 0);
  assert.equal(nine.toISOString(), "2026-08-18T13:00:00.000Z");
  assert.equal(dateKeyInZone(nine), "2026-08-18");
  assert.equal(timeValueInZone(nine), "09:00");
  assert.equal(zonedParts(nine).hour, 9);
});

test("startOfZonedDay is midnight Eastern, not UTC", () => {
  const mondayNightUtc = new Date("2026-08-18T02:00:00.000Z");
  const start = startOfZonedDay(mondayNightUtc);
  assert.equal(dateKeyInZone(start), "2026-08-17");
  assert.equal(timeValueInZone(start), "00:00");
});
