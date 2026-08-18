import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isMoreDestination,
  moreGroups,
  moreItems,
  pageLabel,
  primaryTabs,
  sidebarGroups,
} from "./nav";

test("office main tabs are schedule, clients, jobs, and more", () => {
  const tabs = primaryTabs("DISPATCHER").map((item) => item.href);
  assert.deepEqual(tabs, ["/schedule", "/clients", "/jobs", "/more"]);
  assert.equal(primaryTabs("DISPATCHER")[2]?.label, "Work orders");
});

test("office reports and call log live under More, not the main tabs", () => {
  const tabs = primaryTabs("OWNER").map((item) => item.href);
  const more = moreItems("OWNER").map((item) => item.href);
  assert.ok(!tabs.includes("/reports"));
  assert.ok(!tabs.includes("/calls"));
  assert.ok(more.includes("/calls"));
  assert.ok(more.includes("/quotes"));
  assert.ok(more.includes("/invoices"));
  assert.ok(more.includes("/reports"));
  assert.ok(!more.includes("/jobs"));
  assert.ok(!more.includes("/schedule"));
  assert.ok(!more.includes("/clients"));
});

test("office More is grouped so money and field tools are easy to find", () => {
  const groups = moreGroups("DISPATCHER");
  assert.deepEqual(
    groups.map((group) => group.title),
    ["Daily office", "Business", "Team", "Field records"],
  );
  assert.deepEqual(
    groups[0]?.items.map((item) => item.href),
    ["/calls", "/quotes", "/invoices"],
  );
  assert.ok(groups[0]?.items[0]?.description);
});

test("office sidebar groups day-to-day work first", () => {
  const groups = sidebarGroups("OWNER");
  assert.equal(groups[0]?.title, "Day to day");
  assert.deepEqual(
    groups[0]?.items.map((item) => item.href),
    ["/schedule", "/clients", "/jobs", "/calls"],
  );
});

test("technicians keep a simple four-tab phone", () => {
  const tabs = primaryTabs("TECHNICIAN").map((item) => item.href);
  const more = moreItems("TECHNICIAN").map((item) => item.href);
  assert.deepEqual(tabs, ["/field", "/jobs", "/timesheets", "/more"]);
  assert.ok(!more.includes("/calls"));
  assert.ok(more.includes("/quotes"));
  assert.equal(moreGroups("TECHNICIAN")[0]?.title, "Also on this phone");
});

test("page labels and All-tools destinations follow the current screen", () => {
  assert.equal(pageLabel("/quotes", "OWNER"), "Quotes");
  assert.equal(pageLabel("/quotes/abc", "OWNER"), "Quotes");
  assert.equal(pageLabel("/quotes/pricing", "OWNER"), "Price list");
  assert.equal(pageLabel("/jobs", "OWNER"), "Work orders");
  assert.equal(pageLabel("/jobs", "TECHNICIAN"), "My jobs");
  assert.equal(pageLabel("/more", "OWNER"), "More");
  assert.equal(isMoreDestination("/quotes", "OWNER"), true);
  assert.equal(isMoreDestination("/jobs", "OWNER"), false);
  assert.equal(isMoreDestination("/more", "OWNER"), true);
  assert.equal(isMoreDestination("/schedule", "OWNER"), false);
});
