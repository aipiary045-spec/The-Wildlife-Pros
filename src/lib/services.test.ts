import assert from "node:assert/strict";
import { test } from "node:test";
import { canManagePriceList, parseServiceBody } from "./services";

test("office can edit the quote price list; technicians cannot", () => {
  assert.equal(canManagePriceList("OWNER"), true);
  assert.equal(canManagePriceList("DISPATCHER"), true);
  assert.equal(canManagePriceList("ACCOUNTING"), true);
  assert.equal(canManagePriceList("TECHNICIAN"), false);
});

test("parseServiceBody requires a name, job type, and a real price", () => {
  assert.throws(() => parseServiceBody({}), /Name the line item/);
  assert.throws(() => parseServiceBody({ name: "Trap check" }), /job type/);
  assert.throws(() => parseServiceBody({ name: "Trap check", jobType: "TRAPPING", unitPrice: -1 }), /price/);
  const item = parseServiceBody({
    name: "  Live trap check  ",
    jobType: "TRAPPING",
    unitPrice: 89.5,
    taxable: false,
  });
  assert.equal(item.name, "Live trap check");
  assert.equal(item.jobType, "TRAPPING");
  assert.equal(item.unitPrice, 89.5);
  assert.equal(item.taxable, false);
  assert.equal(item.active, true);
});
