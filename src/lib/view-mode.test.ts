import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canSwitchViewMode,
  homePathFor,
  isFieldView,
  navRole,
  readViewMode,
} from "./view-mode";

test("only admins can switch working view", () => {
  assert.equal(canSwitchViewMode("ADMIN"), true);
  assert.equal(canSwitchViewMode("TECHNICIAN"), false);
});

test("field view applies to technicians and admins who choose it", () => {
  assert.equal(isFieldView("TECHNICIAN"), true);
  assert.equal(isFieldView("ADMIN", "office"), false);
  assert.equal(isFieldView("ADMIN", "field"), true);
});

test("nav role and home path follow the active view", () => {
  assert.equal(navRole("ADMIN", "office"), "ADMIN");
  assert.equal(navRole("ADMIN", "field"), "TECHNICIAN");
  assert.equal(homePathFor("ADMIN", "office"), "/dashboard");
  assert.equal(homePathFor("ADMIN", "field"), "/field");
  assert.equal(readViewMode(undefined), "office");
  assert.equal(readViewMode("field"), "field");
});
