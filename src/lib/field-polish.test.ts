import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarFeedUrl, createCalendarFeedToken, icsSequence, readCalendarFeedToken } from "./calendar-feed";
import { groupPhotoPairs } from "./photo-pairs";
import { packageAvailability, QUOTE_PACKAGES, resolvePackageLines } from "./quote-packages";

const services = [
  { id: "s1", name: "Wildlife inspection", unitPrice: 149, taxable: true },
  { id: "s2", name: "Raccoon trapping program", unitPrice: 325, taxable: true },
  { id: "s3", name: "Squirrel exclusion", unitPrice: 890, taxable: true },
];

test("resolvePackageLines maps catalog services into quote lines", () => {
  const pkg = QUOTE_PACKAGES.find((item) => item.id === "inspection-trap");
  assert.ok(pkg);
  const lines = resolvePackageLines(pkg, services);
  assert.equal(lines.length, 2);
  assert.equal(lines[0]?.name, "Wildlife inspection");
  assert.equal(lines[1]?.serviceId, "s2");
});

test("packageAvailability flags missing price list items", () => {
  const pkg = QUOTE_PACKAGES.find((item) => item.id === "exclusion-cleanup");
  assert.ok(pkg);
  const status = packageAvailability(pkg, services);
  assert.equal(status.available, false);
  assert.deepEqual(status.missing, ["Attic sanitation"]);
});

test("calendar feed tokens round-trip", async () => {
  const token = await createCalendarFeedToken("tech-1", "org-1");
  const payload = await readCalendarFeedToken(token);
  assert.deepEqual(payload, { userId: "tech-1", organizationId: "org-1" });
});

test("calendarFeedUrl builds a subscribe link", () => {
  assert.equal(
    calendarFeedUrl("abc123", "https://example.com"),
    "https://example.com/api/calendar/feed?token=abc123",
  );
});

test("icsSequence increases with updatedAt", () => {
  const earlier = new Date("2026-01-01T12:00:00.000Z");
  const later = new Date("2026-01-02T12:00:00.000Z");
  assert.ok(icsSequence(later) > icsSequence(earlier));
});

test("groupPhotoPairs groups before and after by entry point", () => {
  const { pairs, other } = groupPhotoPairs([
    {
      id: "1",
      kind: "BEFORE",
      url: "a",
      caption: null,
      entryPoint: { label: "Soffit vent" },
    },
    {
      id: "2",
      kind: "AFTER",
      url: "b",
      caption: null,
      entryPoint: { label: "Soffit vent" },
    },
    {
      id: "3",
      kind: "CAPTURE",
      url: "c",
      caption: null,
      entryPoint: null,
    },
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]?.before?.id, "1");
  assert.equal(pairs[0]?.after?.id, "2");
  assert.equal(other.length, 1);
  assert.equal(other[0]?.kind, "CAPTURE");
});
