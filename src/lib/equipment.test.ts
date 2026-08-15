import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestSerial } from "./equipment";

test("suggestSerial increments the prefix for that gear type", () => {
  assert.equal(suggestSerial("LIVE_CAGE", ["T-014", "T-021", "OWD-07"]), "T-022");
  assert.equal(suggestSerial("ONE_WAY_DOOR", ["T-014", "OWD-07"]), "OWD-008");
  assert.equal(suggestSerial("CAMERA", []), "CAM-001");
});
