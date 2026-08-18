import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesClientSearch } from "./clients";

const maya = {
  firstName: "Maya",
  lastName: "Nguyen",
  companyName: null,
  email: "maya@example.com",
  phone: "(704) 555-0142",
  altPhone: "704-555-0199",
  properties: [{ address1: "812 Willow Crest Ln", city: "Charlotte" }],
};

test("client search matches name, street, city, email, and phone digits", () => {
  assert.equal(matchesClientSearch(maya, ""), true);
  assert.equal(matchesClientSearch(maya, "maya"), true);
  assert.equal(matchesClientSearch(maya, "Nguyen"), true);
  assert.equal(matchesClientSearch(maya, "maya nguyen"), true);
  assert.equal(matchesClientSearch(maya, "willow"), true);
  assert.equal(matchesClientSearch(maya, "Charlotte"), true);
  assert.equal(matchesClientSearch(maya, "maya@"), true);
  assert.equal(matchesClientSearch(maya, "5550142"), true);
  assert.equal(matchesClientSearch(maya, "555-0199"), true);
  assert.equal(matchesClientSearch(maya, "raccoon"), false);
});
