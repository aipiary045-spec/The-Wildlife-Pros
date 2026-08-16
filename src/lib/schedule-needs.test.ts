import assert from "node:assert/strict";
import { test } from "node:test";
import { dueOnFromReturnDays, groupNeedsByPriority, needPriority, parseReturnInDays } from "./schedule-needs";

test("dueOnFromReturnDays lands on the start of that calendar day", () => {
  const from = new Date(2026, 7, 16, 14, 30, 0);
  const due = dueOnFromReturnDays(3, from);
  assert.equal(due.getFullYear(), 2026);
  assert.equal(due.getMonth(), 7);
  assert.equal(due.getDate(), 19);
  assert.equal(due.getHours(), 0);
});

test("needPriority splits overdue, due today, and upcoming", () => {
  const now = new Date(2026, 7, 16, 9, 0, 0);
  assert.equal(needPriority(new Date(2026, 7, 15), now), "overdue");
  assert.equal(needPriority(new Date(2026, 7, 16, 18, 0, 0), now), "due");
  assert.equal(needPriority(new Date(2026, 7, 20), now), "upcoming");
});

test("groupNeedsByPriority keeps overdue first", () => {
  const now = new Date(2026, 7, 16);
  const grouped = groupNeedsByPriority(
    [
      { id: "a", dueOn: new Date(2026, 7, 20) },
      { id: "b", dueOn: new Date(2026, 7, 10) },
      { id: "c", dueOn: new Date(2026, 7, 16) },
    ],
    now,
  );
  assert.deepEqual(grouped.overdue.map((item) => item.id), ["b"]);
  assert.deepEqual(grouped.due.map((item) => item.id), ["c"]);
  assert.deepEqual(grouped.upcoming.map((item) => item.id), ["a"]);
});

test("parseReturnInDays rejects junk", () => {
  assert.equal(parseReturnInDays("7"), 7);
  assert.throws(() => parseReturnInDays(0), /1–365/);
  assert.throws(() => parseReturnInDays("nope"), /1–365/);
});
