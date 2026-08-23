import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVisitSummarySms } from "./visit-summary-sms";

test("buildVisitSummarySms formats customer-friendly visit bullets", () => {
  const body = buildVisitSummarySms({
    clientFirstName: "Riley",
    techName: "Jordan Lee",
    jobTitle: "Squirrel trapping",
    checkout: {
      outcome: "complete",
      workDone: ["trap_check", "capture"],
      trapPlaced: false,
      captures: [{ speciesName: "Gray squirrel", quantity: 1, disposition: "RELOCATED" }],
    },
  });
  assert.match(body, /Hi Riley/);
  assert.match(body, /Jordan Lee/);
  assert.match(body, /Checked existing traps/);
  assert.match(body, /gray squirrel relocated/i);
  assert.match(body, /Today's visit is complete/i);
});

test("buildVisitSummarySms mentions return timing for follow-up visits", () => {
  const body = buildVisitSummarySms({
    clientFirstName: "Sam",
    jobTitle: "Trap check",
    checkout: {
      outcome: "follow_up",
      workDone: ["trap_check"],
      trapPlaced: true,
      trapNote: "South eave",
      followUp: { returnInDays: 3, dueOn: new Date() },
    },
  });
  assert.match(body, /Trap on site — South eave/);
  assert.match(body, /in about 3 days/i);
});
