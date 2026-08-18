import assert from "node:assert/strict";
import { test } from "node:test";
import {
  callLogDayHeading,
  canAutoFillClient,
  canConvertRequest,
  canManageIntake,
  emailsMatch,
  findMatchingClient,
  findMatchingProperty,
  formatCallLoggedAt,
  groupCallsByDay,
  parseConvertTarget,
  parseIntakeBody,
  parseRequestPatch,
  partitionCallLog,
  phonesMatch,
  requestIsOpen,
  searchClients,
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

test("searchClients lists every person who matches a number or name", () => {
  const mayaOak = {
    ...maya,
    id: "oak",
    properties: [{ id: "p-oak", address1: "10 Oak St", city: "Charlotte" }],
  };
  const mayaPine = {
    ...maya,
    id: "pine",
    phone: "(704) 555-0199",
    email: "maya.pine@example.com",
    properties: [{ id: "p-pine", address1: "55 Pine Hollow Ct", city: "Pineville" }],
  };
  const jordan = {
    id: "jordan",
    firstName: "Jordan",
    lastName: "Blake",
    email: null,
    phone: "704-555-0100",
    altPhone: null,
    properties: [{ id: "p-j", address1: "1 Shop Rd", city: "Charlotte" }],
  };
  const hits = searchClients([mayaOak, mayaPine, jordan], { firstName: "Maya" });
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((item) => item.id).sort(), ["oak", "pine"]);
  assert.equal(searchClients([mayaOak, mayaPine, jordan], { firstName: "Maya", lastName: "Nguyen" }).length, 2);
  assert.equal(searchClients([mayaOak, mayaPine, jordan], { phone: "555014" })[0]?.id, "oak");
  assert.equal(canAutoFillClient(hits, { firstName: "Maya" }), false);
  assert.equal(canAutoFillClient([mayaOak], { phone: "7045550142" }), true);
  assert.equal(canAutoFillClient([mayaOak], { firstName: "Maya", lastName: "Nguyen" }), true);
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

test("call log keeps open work separate from already handled calls", () => {
  const { open, handled } = partitionCallLog([
    { id: "1", status: "NEW" },
    { id: "2", status: "ASSESSED" },
    { id: "3", status: "CONVERTED_QUOTE" },
    { id: "4", status: "CLOSED" },
    { id: "5", status: "CONVERTED_JOB" },
  ]);
  assert.deepEqual(
    open.map((item) => item.id),
    ["1", "2"],
  );
  assert.deepEqual(
    handled.map((item) => item.id),
    ["3", "4", "5"],
  );
});

test("call log groups by Eastern calendar day, newest day first", () => {
  const groups = groupCallsByDay(
    [
      { id: "late-night", createdAt: "2026-08-18T03:30:00.000Z" },
      { id: "monday-morning", createdAt: "2026-08-17T14:00:00.000Z" },
      { id: "monday-afternoon", createdAt: "2026-08-17T20:00:00.000Z" },
    ],
    "America/New_York",
  );
  assert.deepEqual(
    groups.map((group) => [group.dateKey, group.items.map((item) => item.id)]),
    [
      ["2026-08-17", ["late-night", "monday-morning", "monday-afternoon"]],
    ],
  );
  const split = groupCallsByDay(
    [
      { id: "tuesday", createdAt: "2026-08-18T04:05:00.000Z" },
      { id: "monday", createdAt: "2026-08-18T03:55:00.000Z" },
    ],
    "America/New_York",
  );
  assert.deepEqual(
    split.map((group) => group.dateKey),
    ["2026-08-18", "2026-08-17"],
  );
});

test("call log day headings say today, yesterday, or the weekday", () => {
  assert.equal(callLogDayHeading("2026-08-18", "2026-08-18"), "Today");
  assert.equal(callLogDayHeading("2026-08-17", "2026-08-18"), "Yesterday");
  assert.equal(callLogDayHeading("2026-08-16", "2026-08-18"), "Sunday, Aug 16");
  assert.equal(formatCallLoggedAt("2026-08-18T14:05:00.000Z", "America/New_York"), "10:05 AM");
});

test("parse helpers accept quote, job, or a simple close", () => {
  assert.equal(parseConvertTarget({ to: "quote" }), "quote");
  assert.equal(parseConvertTarget({ to: "job" }), "job");
  assert.throws(() => parseConvertTarget({ to: "invoice" }), /quote or a first trip/);
  assert.equal(parseRequestPatch({ status: "CLOSED" }), "CLOSED");
  assert.throws(() => parseRequestPatch({ status: "CONVERTED_JOB" }), /looked at/);
});
