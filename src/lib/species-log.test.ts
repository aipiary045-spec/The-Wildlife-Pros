import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeCapturesBySpecies } from "./species-log";

test("summarizeCapturesBySpecies totals quantity by common name", () => {
  const summary = summarizeCapturesBySpecies([
    { quantity: 2, species: { commonName: "Raccoon" } },
    { quantity: 1, species: { commonName: "Gray squirrel" } },
    { quantity: 1, species: { commonName: "Raccoon" } },
  ]);
  assert.deepEqual(summary, [
    { name: "Raccoon", count: 3 },
    { name: "Gray squirrel", count: 1 },
  ]);
});
