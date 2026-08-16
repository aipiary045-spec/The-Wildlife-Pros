import assert from "node:assert/strict";
import { test } from "node:test";
import { groupInvoicesByAge, invoiceAge } from "./invoice-aging";

const now = new Date(2026, 7, 16, 12, 0, 0);

test("invoiceAge buckets open balances", () => {
  assert.equal(invoiceAge({ status: "SENT", dueOn: new Date(2026, 7, 20), balance: 100 }, now), "not_yet_due");
  assert.equal(invoiceAge({ status: "SENT", dueOn: new Date(2026, 7, 16), balance: 100 }, now), "due");
  assert.equal(invoiceAge({ status: "SENT", dueOn: new Date(2026, 7, 10), balance: 100 }, now), "past_due");
  assert.equal(invoiceAge({ status: "DRAFT", dueOn: new Date(2026, 7, 10), balance: 100 }, now), "draft");
  assert.equal(invoiceAge({ status: "PAID", dueOn: new Date(2026, 7, 10), balance: 0 }, now), "paid");
});

test("groupInvoicesByAge keeps past due first", () => {
  const grouped = groupInvoicesByAge(
    [
      { id: "a", status: "SENT", dueOn: new Date(2026, 7, 20), balance: 50 },
      { id: "b", status: "OVERDUE", dueOn: new Date(2026, 7, 1), balance: 80 },
      { id: "c", status: "SENT", dueOn: new Date(2026, 7, 16), balance: 20 },
    ],
    now,
  );
  assert.deepEqual(grouped.pastDue.map((item) => item.id), ["b"]);
  assert.deepEqual(grouped.due.map((item) => item.id), ["c"]);
  assert.deepEqual(grouped.notYetDue.map((item) => item.id), ["a"]);
});
