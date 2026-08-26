import assert from "node:assert/strict";
import { test } from "node:test";
import { nextFieldStop } from "./field-next-stop";

test("nextFieldStop skips the current job and finished stops", () => {
  const stops = [
    { id: "a", status: "COMPLETED" },
    { id: "b", status: "ON_SITE" },
    { id: "c", status: "COMPLETED" },
    { id: "d", status: "SCHEDULED" },
  ];
  assert.equal(nextFieldStop(stops, "b")?.id, "d");
  assert.equal(nextFieldStop(stops, "d"), null);
  assert.equal(nextFieldStop(stops, "missing"), null);
});
