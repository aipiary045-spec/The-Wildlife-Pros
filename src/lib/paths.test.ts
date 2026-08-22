import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessJobInFieldView } from "./paths";

const admin = { id: "admin-1", role: "ADMIN" };
const tech = { id: "tech-1", role: "TECHNICIAN" };
const job = { technicianId: "tech-2" };
const ownJob = { technicianId: "tech-1" };

test("admins in field view can open any assigned job", () => {
  assert.equal(canAccessJobInFieldView(admin, job, true), true);
});

test("technicians in field view can only open their own jobs", () => {
  assert.equal(canAccessJobInFieldView(tech, ownJob, true), true);
  assert.equal(canAccessJobInFieldView(tech, job, true), false);
});

test("office view does not restrict job access", () => {
  assert.equal(canAccessJobInFieldView(tech, job, false), true);
});
