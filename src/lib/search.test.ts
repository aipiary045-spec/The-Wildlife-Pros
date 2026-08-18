import assert from "node:assert/strict";
import { test } from "node:test";
import { equipmentSearchResult, groupSearchResults, searchQueryReady } from "./search";

test("searchQueryReady accepts two characters or three phone digits", () => {
  assert.equal(searchQueryReady("a"), false);
  assert.equal(searchQueryReady("ab"), true);
  assert.equal(searchQueryReady("704"), true);
});

test("equipmentSearchResult links to inventory", () => {
  const result = equipmentSearchResult({
    id: "eq1",
    serialNumber: "T-014",
    name: "Raccoon trap",
    type: "LIVE_CAGE",
    status: "DEPLOYED",
  });
  assert.equal(result.kind, "equipment");
  assert.equal(result.href, "/inventory?serial=T-014");
});

test("groupSearchResults keeps stable section order", () => {
  const groups = groupSearchResults([
    { id: "1", kind: "invoice", title: "INV", subtitle: "", href: "/invoices/1" },
    { id: "2", kind: "client", title: "Client", subtitle: "", href: "/clients/2" },
    { id: "3", kind: "job", title: "Job", subtitle: "", href: "/jobs/3" },
    { id: "4", kind: "equipment", title: "T-014", subtitle: "", href: "/inventory?serial=T-014" },
  ]);
  assert.deepEqual(
    groups.map((group) => group.kind),
    ["client", "job", "invoice", "equipment"],
  );
});
