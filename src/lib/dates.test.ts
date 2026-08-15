import assert from "node:assert/strict";
import { test } from "node:test";
import { adjacentDate, dateKey, hourLabel, jobTimelinePlacement, parseDateParam, parseScheduleView, periodLabel, scheduleRange, timeFromTimelineRatio, tripStartOnDay } from "./dates";
import { homePath, safeNextPath } from "./paths";

test("parseDateParam reads a local calendar day", () => {
  const date = parseDateParam("2026-08-15");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 7);
  assert.equal(date.getDate(), 15);
});

test("scheduleRange covers a full Mon-Sun week", () => {
  const saturday = parseDateParam("2026-08-15");
  const { from, to, days } = scheduleRange("week", saturday);
  assert.equal(dateKey(from), "2026-08-10");
  assert.equal(dateKey(to), "2026-08-16");
  assert.equal(days.length, 7);
  assert.equal(dateKey(days[6]), "2026-08-16");
});

test("scheduleRange day view is a single calendar day", () => {
  const { from, to, days } = scheduleRange("day", parseDateParam("2026-08-15"));
  assert.equal(days.length, 1);
  assert.equal(from.getDate(), 15);
  assert.equal(to.getDate(), 15);
});

test("adjacentDate steps by day or week", () => {
  const date = parseDateParam("2026-08-15");
  assert.equal(dateKey(adjacentDate("day", date, 1)), "2026-08-16");
  assert.equal(dateKey(adjacentDate("week", date, -1)), "2026-08-08");
});

test("periodLabel and view parser", () => {
  assert.equal(parseScheduleView("week"), "week");
  assert.equal(parseScheduleView("day"), "day");
  assert.equal(parseScheduleView("nope"), "day");
  assert.match(periodLabel("day", parseDateParam("2026-08-15")), /Saturday/);
  assert.equal(periodLabel("week", parseDateParam("2026-08-15")), "Aug 10 – Aug 16");
});

test("safeNextPath rejects Chrome DevTools and protocol-relative URLs", () => {
  assert.equal(safeNextPath("/.well-known/appspecific/com.chrome.devtools.json"), "/dashboard");
  assert.equal(safeNextPath("//evil.example"), "/dashboard");
  assert.equal(safeNextPath("/schedule"), "/schedule");
  assert.equal(safeNextPath("/field?view=week"), "/field?view=week");
  assert.equal(homePath("TECHNICIAN"), "/field");
  assert.equal(homePath("OWNER"), "/dashboard");
});

test("tripStartOnDay keeps the original clock time on a new calendar day", () => {
  const start = tripStartOnDay(new Date(2026, 7, 15, 9, 0, 0), new Date(2026, 7, 16));
  assert.equal(dateKey(start), "2026-08-16");
  assert.equal(start.getHours(), 9);
  assert.equal(start.getMinutes(), 0);
});

test("tripStartOnDay defaults to 9:00 when the source has no time", () => {
  const start = tripStartOnDay(null, new Date(2026, 7, 17));
  assert.equal(start.getDate(), 17);
  assert.equal(start.getHours(), 9);
});

test("day timeline snaps drop position to a 15-minute clock", () => {
  const day = parseDateParam("2026-08-15");
  const seven = timeFromTimelineRatio(day, 0);
  assert.equal(seven.getHours(), 7);
  assert.equal(seven.getMinutes(), 0);
  const nine = timeFromTimelineRatio(day, 2 / 11);
  assert.equal(nine.getHours(), 9);
  assert.equal(nine.getMinutes(), 0);
  const end = timeFromTimelineRatio(day, 1);
  assert.equal(end.getHours(), 18);
  assert.equal(end.getMinutes(), 0);
});

test("jobTimelinePlacement keeps a block on the 7am–6pm track", () => {
  const place = jobTimelinePlacement(new Date(2026, 7, 15, 9, 0, 0), 60);
  assert.ok(place.left > 17 && place.left < 19);
  assert.ok(place.width > 8 && place.width < 10);
  const early = jobTimelinePlacement(new Date(2026, 7, 15, 5, 0, 0), 60);
  assert.equal(early.left, 0);
});

test("hourLabel uses 12-hour clock", () => {
  assert.equal(hourLabel(7), "7 AM");
  assert.equal(hourLabel(12), "12 PM");
  assert.equal(hourLabel(17), "5 PM");
});
