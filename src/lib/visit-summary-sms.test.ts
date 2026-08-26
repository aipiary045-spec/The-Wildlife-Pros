import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVisitSummarySms, visitSummarySmsHref } from "./visit-summary-sms";

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

test("visitSummarySmsHref builds an sms draft link", () => {
  const href = visitSummarySmsHref(
    "(704) 555-0142",
    { clientFirstName: "Riley", jobTitle: "Squirrel trapping" },
    { outcome: "complete", workDone: ["trap_check"], trapPlaced: false },
  );
  assert.match(href ?? "", /^sms:\+17045550142\?body=/);
  assert.match(decodeURIComponent(href?.split("body=")[1] ?? ""), /Hi Riley/);
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
