import assert from "node:assert/strict";
import { test } from "node:test";
import { jobTypeFromQuoteLines, quoteBillingAction, quoteCanConvert, quoteCanInvoice } from "./quotes";
import { nextOccurrences } from "./recurring";

test("jobTypeFromQuoteLines uses the catalog job type", () => {
  assert.equal(jobTypeFromQuoteLines([{ name: "Inspect", quantity: 1, unitPrice: 149, taxable: true }]), "INSPECTION");
  assert.equal(
    jobTypeFromQuoteLines([
      { name: "Trap", quantity: 1, unitPrice: 325, taxable: true, service: { jobType: "TRAPPING" } },
    ]),
    "TRAPPING",
  );
});

test("quoteCanConvert blocks declined, expired, and already converted", () => {
  assert.equal(quoteCanConvert("SENT"), true);
  assert.equal(quoteCanConvert("APPROVED"), true);
  assert.equal(quoteCanConvert("DRAFT"), true);
  assert.equal(quoteCanConvert("CONVERTED"), false);
  assert.equal(quoteCanConvert("DECLINED"), false);
});

test("quoteCanInvoice only allows sent, viewed, approved, or converted quotes", () => {
  assert.equal(quoteCanInvoice("APPROVED"), true);
  assert.equal(quoteCanInvoice("SENT"), true);
  assert.equal(quoteCanInvoice("VIEWED"), true);
  assert.equal(quoteCanInvoice("CONVERTED"), true);
  assert.equal(quoteCanInvoice("DRAFT"), false);
  assert.equal(quoteCanInvoice("DECLINED"), false);
});

test("quoteBillingAction picks create, pay, paid, or waiting", () => {
  assert.equal(quoteBillingAction({ status: "APPROVED" }, null), "create");
  assert.equal(quoteBillingAction({ status: "CONVERTED" }, null), "create");
  assert.equal(quoteBillingAction({ status: "APPROVED" }, { balance: 100 }), "pay");
  assert.equal(quoteBillingAction({ status: "APPROVED" }, { balance: 0 }), "paid");
  assert.equal(quoteBillingAction({ status: "DRAFT" }, null), "waiting");
  assert.equal(quoteBillingAction({ status: "DECLINED" }, null), null);
});

test("nextOccurrences skips the seed date and steps by frequency", () => {
  const start = new Date(2026, 7, 15, 9, 0, 0);
  const weekly = nextOccurrences({ frequency: "WEEKLY", start, count: 3 });
  assert.equal(weekly.length, 3);
  assert.equal(weekly[0].getDate(), 22);
  assert.equal(weekly[1].getDate(), 29);
  assert.equal(weekly[2].getDate(), 5);
  assert.equal(weekly[2].getMonth(), 8);

  const monthly = nextOccurrences({ frequency: "MONTHLY", start, count: 2 });
  assert.equal(monthly[0].getMonth(), 8);
  assert.equal(monthly[1].getMonth(), 9);
});

test("nextOccurrences stops at endsOn", () => {
  const start = new Date(2026, 7, 15);
  const dates = nextOccurrences({
    frequency: "WEEKLY",
    start,
    count: 8,
    endsOn: new Date(2026, 7, 30),
  });
  assert.equal(dates.length, 2);
});
