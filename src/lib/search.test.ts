import assert from "node:assert/strict";
import { test } from "node:test";
import { groupSearchResults, searchQueryReady } from "./search";

test("searchQueryReady accepts two characters or three phone digits", () => {
  assert.equal(searchQueryReady("a"), false);
  assert.equal(searchQueryReady("ab"), true);
  assert.equal(searchQueryReady("704"), true);
});

test("groupSearchResults keeps stable section order", () => {
  const groups = groupSearchResults([
    { id: "1", kind: "invoice", title: "INV", subtitle: "", href: "/invoices/1" },
    { id: "2", kind: "client", title: "Client", subtitle: "", href: "/clients/2" },
    { id: "3", kind: "job", title: "Job", subtitle: "", href: "/jobs/3" },
  ]);
  assert.deepEqual(
    groups.map((group) => group.kind),
    ["client", "job", "invoice"],
  );
});
