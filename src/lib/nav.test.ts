import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isMoreDestination,
  isPrimaryDestination,
  moreGroups,
  moreItems,
  pageLabel,
  primaryTabs,
  sidebarGroups,
} from "./nav";

test("dispatch mobile tabs prioritize today, schedule, and clients", () => {
  const tabs = primaryTabs("DISPATCHER").map((item) => item.href);
  assert.deepEqual(tabs, ["/dashboard", "/schedule", "/clients", "/more"]);
});

test("accounting mobile tabs prioritize today, invoices, and clients", () => {
  const tabs = primaryTabs("ACCOUNTING").map((item) => item.href);
  assert.deepEqual(tabs, ["/dashboard", "/invoices", "/clients", "/more"]);
});

test("office more still holds quotes, work orders, and reports for dispatch", () => {
  const more = moreItems("DISPATCHER").map((item) => item.href);
  assert.ok(more.includes("/quotes"));
  assert.ok(more.includes("/jobs"));
  assert.ok(more.includes("/calls"));
  assert.ok(more.includes("/reports"));
  assert.ok(!more.includes("/clients"));
});

test("office sidebar starts with today", () => {
  const groups = sidebarGroups("OWNER");
  assert.equal(groups[0]?.title, "Day to day");
  assert.equal(groups[0]?.items[0]?.href, "/dashboard");
});

test("technicians keep a simple four-tab phone", () => {
  const tabs = primaryTabs("TECHNICIAN").map((item) => item.href);
  const more = moreItems("TECHNICIAN").map((item) => item.href);
  assert.deepEqual(tabs, ["/field", "/jobs", "/timesheets", "/more"]);
  assert.ok(!more.includes("/calls"));
  assert.ok(more.includes("/quotes"));
});

test("page labels and destinations follow the current screen", () => {
  assert.equal(pageLabel("/dashboard", "OWNER"), "Today");
  assert.equal(pageLabel("/quotes", "OWNER"), "Quotes");
  assert.equal(pageLabel("/jobs", "OWNER"), "Work orders");
  assert.equal(pageLabel("/jobs", "TECHNICIAN"), "My work orders");
  assert.equal(isPrimaryDestination("/calls", "DISPATCHER"), false);
  assert.equal(isMoreDestination("/calls", "DISPATCHER"), true);
  assert.equal(isPrimaryDestination("/clients", "DISPATCHER"), true);
  assert.equal(isMoreDestination("/quotes", "DISPATCHER"), true);
  assert.equal(isMoreDestination("/schedule", "OWNER"), false);
});

test("office More is grouped so money and field tools are easy to find", () => {
  const groups = moreGroups("DISPATCHER");
  assert.deepEqual(
    groups.map((group) => group.title),
    ["Daily office", "Business", "Team", "Field records"],
  );
  assert.deepEqual(
    groups[0]?.items.map((item) => item.href),
    ["/calls", "/jobs", "/quotes", "/invoices", "/routes"],
  );
});
