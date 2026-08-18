import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessInvoice, canBillJob, canBillQuote } from "./billing-access";

test("technicians bill from quotes, not work orders", () => {
  const tech = { id: "tech-1", role: "TECHNICIAN" };
  const office = { id: "office-1", role: "DISPATCHER" };
  assert.equal(canBillQuote(tech), true);
  assert.equal(canBillJob(tech, { technicianId: "tech-1" }), false);
  assert.equal(canBillJob(office, { technicianId: "tech-2" }), true);
});

test("technicians can access invoices they created from a quote", () => {
  const tech = { id: "tech-1", role: "TECHNICIAN" };
  assert.equal(
    canAccessInvoice(tech, { quoteId: "q1", createdById: "tech-1", job: null }),
    true,
  );
  assert.equal(
    canAccessInvoice(tech, { quoteId: "q1", createdById: "tech-2", job: null }),
    false,
  );
});

test("technicians can still access invoices on their own jobs", () => {
  const tech = { id: "tech-1", role: "TECHNICIAN" };
  assert.equal(canAccessInvoice(tech, { job: { technicianId: "tech-1" } }), true);
  assert.equal(canAccessInvoice(tech, { job: { technicianId: "tech-2" } }), false);
});
