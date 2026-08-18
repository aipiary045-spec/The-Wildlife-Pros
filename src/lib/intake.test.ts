import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canConvertRequest,
  canManageIntake,
  emailsMatch,
  findMatchingClient,
  findMatchingProperty,
  parseConvertTarget,
  parseIntakeBody,
  parseRequestPatch,
  phonesMatch,
  requestIsOpen,
  streetsMatch,
  telHref,
} from "./intake";

const maya = {
  id: "c1",
  firstName: "Maya",
  lastName: "Nguyen",
  email: "maya@example.com",
  phone: "(704) 555-0142",
  altPhone: null,
  properties: [{ id: "p1", address1: "812 Willow Crest Ln", city: "Charlotte" }],
};

test("office can log intake; technicians cannot", () => {
  assert.equal(canManageIntake("OWNER"), true);
  assert.equal(canManageIntake("DISPATCHER"), true);
  assert.equal(canManageIntake("TECHNICIAN"), false);
});

test("only new or looked-at calls can become a quote or trip", () => {
  assert.equal(requestIsOpen("NEW"), true);
  assert.equal(canConvertRequest("ASSESSED"), true);
  assert.equal(canConvertRequest("CONVERTED_QUOTE"), false);
  assert.equal(canConvertRequest("CLOSED"), false);
});

test("phonesMatch ignores formatting and compares the last 10 digits", () => {
  assert.equal(phonesMatch("(704) 555-0142", "7045550142"), true);
  assert.equal(phonesMatch("1-704-555-0142", "704-555-0142"), true);
  assert.equal(phonesMatch("704-555-0142", "704-555-0199"), false);
  assert.equal(phonesMatch("55", "55"), false);
  assert.equal(telHref("(704) 555-0142"), "tel:+17045550142");
});

test("findMatchingClient prefers an explicit id, then phone, then email", () => {
  assert.equal(findMatchingClient([maya], { clientId: "c1" })?.id, "c1");
  assert.equal(findMatchingClient([maya], { phone: "7045550142" })?.lastName, "Nguyen");
  assert.equal(findMatchingClient([maya], { email: "MAYA@example.com" })?.id, "c1");
  assert.equal(findMatchingClient([maya], { phone: "7045550000" }), null);
  assert.equal(emailsMatch("a@x.com", "A@x.com"), true);
});

test("findMatchingProperty reuses the same street or falls back to the first", () => {
  assert.equal(findMatchingProperty(maya, "812 Willow Crest Ln.")?.id, "p1");
  assert.equal(findMatchingProperty(maya, "99 Oak")?.id, undefined);
  assert.equal(findMatchingProperty(maya, "")?.id, "p1");
  assert.equal(streetsMatch("812 Willow Crest Ln.", "812 willow crest ln"), true);
});

test("parseIntakeBody requires a name or existing client, a title, and a street for new people", () => {
  assert.throws(() => parseIntakeBody({}), /Name the person/);
  assert.throws(() => parseIntakeBody({ firstName: "Maya", lastName: "Nguyen" }), /call about/);
  assert.throws(
    () => parseIntakeBody({ firstName: "Maya", lastName: "Nguyen", title: "Raccoon in the attic" }),
    /street/,
  );
  const created = parseIntakeBody({
    firstName: "  Maya ",
    lastName: "Nguyen",
    phone: "704-555-0142",
    title: "  Raccoon in the attic ",
    address1: "812 Willow Crest Ln",
    preferredOn: "2026-08-20",
  });
  assert.equal(created.firstName, "Maya");
  assert.equal(created.title, "Raccoon in the attic");
  assert.equal(created.city, "Charlotte");
  assert.equal(created.source, "phone");
  assert.equal(created.preferredOn, "2026-08-20");
  const existing = parseIntakeBody({
    clientId: "c1",
    title: "Trap check",
  });
  assert.equal(existing.clientId, "c1");
  assert.equal(existing.address1, "");
});

test("parse helpers accept quote, job, or a simple close", () => {
  assert.equal(parseConvertTarget({ to: "quote" }), "quote");
  assert.equal(parseConvertTarget({ to: "job" }), "job");
  assert.throws(() => parseConvertTarget({ to: "invoice" }), /quote or a first trip/);
  assert.equal(parseRequestPatch({ status: "CLOSED" }), "CLOSED");
  assert.throws(() => parseRequestPatch({ status: "CONVERTED_JOB" }), /looked at/);
});
