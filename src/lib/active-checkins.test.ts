import assert from "node:assert/strict";
import { test } from "node:test";
import { checkInsByTechnician, formatOnSiteDuration } from "./active-checkins";

test("formatOnSiteDuration covers short and long visits", () => {
  assert.equal(formatOnSiteDuration(0), "Just checked in");
  assert.equal(formatOnSiteDuration(12), "12m on site");
  assert.equal(formatOnSiteDuration(59), "59m on site");
  assert.equal(formatOnSiteDuration(60), "1h on site");
  assert.equal(formatOnSiteDuration(90), "1h 30m on site");
  assert.equal(formatOnSiteDuration(120), "2h on site");
});

test("checkInsByTechnician maps one active check-in per tech", () => {
  const checkIns = [
    {
      jobId: "job-a",
      jobNumber: "JOB-0001",
      jobTitle: "Inspection",
      clientName: "Ada Lovelace",
      address: "1 Main St",
      technicianId: "tech-1",
      technicianName: "Alex Tech",
      startedAt: new Date("2026-08-21T12:00:00.000Z"),
      minutesOnSite: 15,
    },
    {
      jobId: "job-b",
      jobNumber: "JOB-0002",
      jobTitle: "Trap check",
      clientName: "Grace Hopper",
      address: "2 Oak Ave",
      technicianId: "tech-2",
      technicianName: "Blake Tech",
      startedAt: new Date("2026-08-21T11:30:00.000Z"),
      minutesOnSite: 45,
    },
  ];

  const byTech = checkInsByTechnician(checkIns);
  assert.equal(byTech["tech-1"]?.jobId, "job-a");
  assert.equal(byTech["tech-2"]?.minutesOnSite, 45);
  assert.equal(byTech["tech-3"], undefined);
});
