import assert from "node:assert/strict";
import { test } from "node:test";
import { serviceToLineDraft } from "@/components/billing/LineItemsEditor";

test("serviceToLineDraft copies catalog fields into a quote line", () => {
  assert.deepEqual(
    serviceToLineDraft({
      id: "svc-1",
      name: "Raccoon trapping",
      unitPrice: 325,
      taxable: true,
    }),
    {
      name: "Raccoon trapping",
      quantity: 1,
      unitPrice: 325,
      taxable: true,
      serviceId: "svc-1",
    },
  );
});
