import assert from "node:assert/strict";
import { test } from "node:test";
import { phonesMatch, telHref } from "./phone";

test("phonesMatch ignores formatting and compares the last 10 digits", () => {
  assert.equal(phonesMatch("(704) 555-0142", "7045550142"), true);
  assert.equal(phonesMatch("1-704-555-0142", "704-555-0142"), true);
  assert.equal(phonesMatch("704-555-0142", "704-555-0199"), false);
  assert.equal(phonesMatch("55", "55"), false);
  assert.equal(telHref("(704) 555-0142"), "tel:+17045550142");
});
