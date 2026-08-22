import assert from "node:assert/strict";
import { test } from "node:test";
import { canDeleteEquipment, parseEquipmentBody, suggestSerial } from "./equipment";

test("suggestSerial increments the prefix for that gear type", () => {
  assert.equal(suggestSerial("LIVE_CAGE", ["T-014", "T-021", "OWD-07"]), "T-022");
  assert.equal(suggestSerial("ONE_WAY_DOOR", ["T-014", "OWD-07"]), "OWD-008");
  assert.equal(suggestSerial("CAMERA", []), "CAM-001");
});

test("canDeleteEquipment blocks field traps and traps with history", () => {
  assert.equal(canDeleteEquipment({ deploymentCount: 0, status: "IN_INVENTORY" }).ok, true);
  assert.equal(canDeleteEquipment({ deploymentCount: 2, status: "IN_INVENTORY" }).ok, false);
  assert.equal(canDeleteEquipment({ deploymentCount: 0, status: "DEPLOYED" }).ok, false);
});

test("parseEquipmentBody requires serial and name", () => {
  assert.throws(() => parseEquipmentBody({ serialNumber: "", name: "Trap" }));
  const parsed = parseEquipmentBody({
    serialNumber: "T-099",
    name: "Test trap",
    type: "LIVE_CAGE",
    status: "IN_INVENTORY",
  });
  assert.equal(parsed.serialNumber, "T-099");
  assert.equal(parsed.status, "IN_INVENTORY");
});
