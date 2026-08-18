import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessInvoice, canBillJob } from "./billing-access";

test("technicians can bill only their own jobs", () => {
  const tech = { id: "tech-1", role: "TECHNICIAN" };
  const office = { id: "office-1", role: "DISPATCHER" };
  assert.equal(canBillJob(tech, { technicianId: "tech-1" }), true);
  assert.equal(canBillJob(tech, { technicianId: "tech-2" }), false);
  assert.equal(canBillJob(office, { technicianId: "tech-2" }), true);
});

test("technicians can access invoices only for their own jobs", () => {
  const tech = { id: "tech-1", role: "TECHNICIAN" };
  assert.equal(canAccessInvoice(tech, { job: { technicianId: "tech-1" } }), true);
  assert.equal(canAccessInvoice(tech, { job: { technicianId: "tech-2" } }), false);
  assert.equal(canAccessInvoice(tech, { job: null }), false);
});
