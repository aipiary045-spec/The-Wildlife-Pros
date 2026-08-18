import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePinned, pushRecent, recentFromPath, togglePinned, togglePinnedClients } from "./recent";

test("pushRecent dedupes and caps the list", () => {
  const first = pushRecent([], { href: "/clients/a", label: "A", kind: "client" });
  const second = pushRecent(first, { href: "/clients/b", label: "B", kind: "client" });
  const third = pushRecent(second, { href: "/clients/a", label: "A again", kind: "client" });
  assert.equal(third.length, 2);
  assert.equal(third[0]?.label, "A again");
});

test("togglePinnedClients adds and removes with labels", () => {
  assert.deepEqual(togglePinnedClients([], "c1", "Riley Hart"), [{ id: "c1", label: "Riley Hart" }]);
  assert.deepEqual(togglePinnedClients([{ id: "c1", label: "Riley Hart" }], "c1", "Riley Hart"), []);
});

test("parsePinned migrates legacy id-only storage", () => {
  assert.deepEqual(parsePinned(JSON.stringify(["c1", "c2"])), [
    { id: "c1", label: "Client" },
    { id: "c2", label: "Client" },
  ]);
});

test("togglePinned adds and removes client ids", () => {
  assert.deepEqual(togglePinned([], "c1"), ["c1"]);
  assert.deepEqual(togglePinned(["c1"], "c1"), []);
});

test("recentFromPath maps detail pages", () => {
  assert.deepEqual(recentFromPath("/jobs/j1", "WO-1"), {
    href: "/jobs/j1",
    label: "WO-1",
    kind: "job",
  });
  assert.equal(recentFromPath("/schedule", "Schedule"), null);
});
