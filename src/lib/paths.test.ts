import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessJobInFieldView } from "./paths";

const admin = { id: "admin-1", role: "ADMIN" };
const tech = { id: "tech-1", role: "TECHNICIAN" };
const otherJob = { technicianId: "tech-2", type: "INSPECTION" };
const ownJob = { technicianId: "tech-1", type: "INSPECTION" };
const teamEmergency = { technicianId: "tech-2", type: "EMERGENCY" };

test("admins in field view can open any assigned job", () => {
  assert.equal(canAccessJobInFieldView(admin, otherJob, true), true);
});

test("technicians in field view can open their own jobs", () => {
  assert.equal(canAccessJobInFieldView(tech, ownJob, true), true);
});

test("technicians in field view can open another tech's emergency job", () => {
  assert.equal(canAccessJobInFieldView(tech, teamEmergency, true), true);
});

test("technicians in field view cannot open another tech's regular job", () => {
  assert.equal(canAccessJobInFieldView(tech, otherJob, true), false);
});

test("office view does not restrict job access", () => {
  assert.equal(canAccessJobInFieldView(tech, otherJob, false), true);
});
