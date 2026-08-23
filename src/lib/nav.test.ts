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

test("admin mobile tabs prioritize today, schedule, and clients", () => {
  const tabs = primaryTabs("ADMIN").map((item) => item.href);
  assert.deepEqual(tabs, ["/dashboard", "/schedule", "/clients", "/more"]);
});

test("office more still holds work orders, calls, and reports for admin", () => {
  const more = moreItems("ADMIN").map((item) => item.href);
  assert.ok(more.includes("/jobs"));
  assert.ok(more.includes("/calls"));
  assert.ok(more.includes("/reports"));
  assert.ok(!more.includes("/clients"));
  assert.ok(!more.includes("/quotes"));
  assert.ok(!more.includes("/invoices"));
});

test("office sidebar starts with today", () => {
  const groups = sidebarGroups("ADMIN");
  assert.equal(groups[0]?.title, "Day to day");
  assert.equal(groups[0]?.items[0]?.href, "/dashboard");
});

test("technicians keep a simple four-tab phone", () => {
  const tabs = primaryTabs("TECHNICIAN").map((item) => item.href);
  const more = moreItems("TECHNICIAN").map((item) => item.href);
  assert.deepEqual(tabs, ["/field", "/jobs", "/timesheets", "/more"]);
  assert.ok(!more.includes("/calls"));
  assert.ok(more.includes("/inventory"));
  assert.ok(!more.includes("/quotes"));
});

test("page labels and destinations follow the current screen", () => {
  assert.equal(pageLabel("/dashboard", "ADMIN"), "Today");
  assert.equal(pageLabel("/jobs", "ADMIN"), "Work orders");
  assert.equal(pageLabel("/jobs", "TECHNICIAN"), "My work orders");
  assert.equal(isPrimaryDestination("/calls", "ADMIN"), false);
  assert.equal(isMoreDestination("/calls", "ADMIN"), true);
  assert.equal(isPrimaryDestination("/clients", "ADMIN"), true);
  assert.equal(isMoreDestination("/schedule", "ADMIN"), false);
});

test("office More is grouped for daily office and field records", () => {
  const groups = moreGroups("ADMIN");
  assert.deepEqual(
    groups.map((group) => group.title),
    ["Daily office", "Field records", "Team"],
  );
  assert.deepEqual(
    groups[0]?.items.map((item) => item.href),
    ["/calls", "/jobs", "/routes"],
  );
});
