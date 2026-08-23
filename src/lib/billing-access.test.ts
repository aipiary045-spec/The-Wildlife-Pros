import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessInvoice, canBillJob, canBillQuote } from "./billing-access";

test("technicians cannot invoice or collect payment", () => {
  const tech = { id: "tech-1", role: "TECHNICIAN" };
  const office = { id: "office-1", role: "ADMIN" };
  assert.equal(canBillQuote(tech), false);
  assert.equal(canBillQuote(office), true);
  assert.equal(canBillJob(tech), false);
  assert.equal(canBillJob(office), true);
  assert.equal(canAccessInvoice(tech), false);
  assert.equal(canAccessInvoice(office), true);
});
