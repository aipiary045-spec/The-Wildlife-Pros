import assert from "node:assert/strict";
import { test } from "node:test";
import { canAssignRole, canChangeUser, canManageTeam, parseCreateUserBody, rolesActorCanAssign } from "./team";

test("only admins manage the team", () => {
  assert.equal(canManageTeam("ADMIN"), true);
  assert.equal(canManageTeam("TECHNICIAN"), false);
});

test("admins can assign admin or technician roles", () => {
  assert.deepEqual(rolesActorCanAssign("ADMIN"), ["ADMIN", "TECHNICIAN"]);
  assert.equal(canAssignRole("ADMIN", "TECHNICIAN"), true);
  assert.equal(canAssignRole("TECHNICIAN", "ADMIN"), false);
});

test("cannot disable yourself or the last admin", () => {
  const admin = { id: "a1", role: "ADMIN" };
  assert.equal(canChangeUser(admin, { id: "a1", role: "ADMIN", status: "ACTIVE" }, "disable", 1), false);
  assert.equal(canChangeUser(admin, { id: "a2", role: "ADMIN", status: "ACTIVE" }, "disable", 1), false);
  assert.equal(canChangeUser(admin, { id: "t1", role: "TECHNICIAN", status: "ACTIVE" }, "disable", 1), true);
});

test("parseCreateUserBody requires a real email and password", () => {
  assert.throws(() => parseCreateUserBody({ firstName: "Pat" }), /required/);
  const user = parseCreateUserBody({
    firstName: "Pat",
    lastName: "Lee",
    email: "pat@thewildlifepros.com",
    password: "secret1",
    role: "TECHNICIAN",
  });
  assert.equal(user.email, "pat@thewildlifepros.com");
  assert.equal(user.role, "TECHNICIAN");
});
