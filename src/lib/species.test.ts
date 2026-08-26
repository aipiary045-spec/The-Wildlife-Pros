import assert from "node:assert/strict";
import test from "node:test";
import { matchSpeciesInput } from "./species";

const catalog = [
  { id: "sp-raccoon", commonName: "Raccoon" },
  { id: "sp-squirrel", commonName: "Gray squirrel" },
];

test("matchSpeciesInput returns empty for blank query", () => {
  assert.deepEqual(matchSpeciesInput("  ", catalog), {});
});

test("matchSpeciesInput matches known species case-insensitively", () => {
  assert.deepEqual(matchSpeciesInput("gray SQUIRREL", catalog), { speciesId: "sp-squirrel" });
});

test("matchSpeciesInput treats unknown names as new species", () => {
  assert.deepEqual(matchSpeciesInput("Flying squirrel", catalog), {
    speciesName: "Flying squirrel",
  });
});
