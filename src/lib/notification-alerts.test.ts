import assert from "node:assert/strict";
import { test } from "node:test";
import type { NotificationItem } from "./notifications";
import { notificationAlertTone, notificationIdSet } from "./notification-alerts";

const emergency: NotificationItem = {
  id: "emergency:job-1",
  kind: "emergency_dispatch",
  title: "Emergency — go now",
  body: "Snake in kitchen",
  href: "/jobs/job-1",
  urgency: "high",
};

const late: NotificationItem = {
  id: "late:job-2",
  kind: "late_checkin",
  title: "Late for check-in",
  body: "Trap check",
  href: "/jobs/job-2",
  urgency: "high",
};

test("notificationAlertTone stays quiet on bootstrap", () => {
  assert.equal(notificationAlertTone(new Set(), [emergency], true), "none");
});

test("notificationAlertTone uses emergency tone for new emergency alerts", () => {
  assert.equal(notificationAlertTone(new Set(["late:job-2"]), [late, emergency], false), "emergency");
});

test("notificationAlertTone uses regular tone for other new alerts", () => {
  assert.equal(notificationAlertTone(new Set(["emergency:job-1"]), [emergency, late], false), "regular");
});

test("notificationAlertTone stays quiet for acknowledged emergency only", () => {
  const acknowledged = { ...emergency, id: "emergency:job-3", title: "Emergency acknowledged" };
  assert.equal(notificationAlertTone(new Set(), [acknowledged], false), "none");
});

test("notificationIdSet tracks alert ids", () => {
  assert.deepEqual(notificationIdSet([emergency, late]), new Set(["emergency:job-1", "late:job-2"]));
});
