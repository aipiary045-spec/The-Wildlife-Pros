import assert from "node:assert/strict";
import { test } from "node:test";
import { canAssignRole, canChangeUser, canManageTeam, parseCreateUserBody, rolesActorCanAssign } from "./team";

test("only office roles manage the team", () => {
  assert.equal(canManageTeam("OWNER"), true);
  assert.equal(canManageTeam("ADMIN"), true);
  assert.equal(canManageTeam("DISPATCHER"), true);
  assert.equal(canManageTeam("TECHNICIAN"), false);
  assert.equal(canManageTeam("ACCOUNTING"), false);
});

test("dispatchers can only add technicians", () => {
  assert.deepEqual(rolesActorCanAssign("DISPATCHER"), ["TECHNICIAN"]);
  assert.equal(canAssignRole("ADMIN", "OWNER"), false);
  assert.equal(canAssignRole("OWNER", "ADMIN"), true);
});

test("cannot disable yourself or the last owner", () => {
  const owner = { id: "o1", role: "OWNER" };
  assert.equal(canChangeUser(owner, { id: "o1", role: "OWNER", status: "ACTIVE" }, "disable", 1), false);
  assert.equal(canChangeUser(owner, { id: "o2", role: "OWNER", status: "ACTIVE" }, "disable", 1), false);
  assert.equal(canChangeUser(owner, { id: "t1", role: "TECHNICIAN", status: "ACTIVE" }, "disable", 1), true);
});

test("admin cannot change an owner; dispatcher cannot disable office staff", () => {
  const admin = { id: "a1", role: "ADMIN" };
  const dispatch = { id: "d1", role: "DISPATCHER" };
  assert.equal(canChangeUser(admin, { id: "o1", role: "OWNER", status: "ACTIVE" }, "disable", 2), false);
  assert.equal(canChangeUser(dispatch, { id: "a1", role: "ADMIN", status: "ACTIVE" }, "disable", 1), false);
  assert.equal(canChangeUser(dispatch, { id: "t1", role: "TECHNICIAN", status: "ACTIVE" }, "disable", 1), true);
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
