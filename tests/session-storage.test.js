import test from "node:test";
import assert from "node:assert/strict";
import { seedData } from "../src/data.js";
import { authenticate, resolveSession } from "../src/session.js";
import { validState, readSavedData } from "../src/persistence.js";
test("all five demo roles authenticate and passwords are not in session data", () => {
  const db = seedData();
  for (const role of ["admin", "auditor", "hod", "faculty", "management"]) {
    const { user, session } = authenticate(
      db,
      `${role}@aap.demo`,
      "Demo@123",
      100,
    );
    assert.equal(user.role, role);
    assert.deepEqual(Object.keys(session).sort(), ["expiresAt", "userId"]);
    assert.ok(resolveSession(db, session, 101));
  }
});
test("wrong and inactive credentials return the same generic error", () => {
  const db = seedData();
  for (const [email, password] of [
    ["unknown@aap.demo", "Demo@123"],
    ["admin@aap.demo", "wrong"],
    ["inactive@aap.demo", "Demo@123"],
  ])
    assert.throws(() => authenticate(db, email, password), {
      message: "Email or password is incorrect.",
    });
});
test("expired and deactivated sessions are invalid", () => {
  const db = seedData(),
    { session } = authenticate(db, "faculty@aap.demo", "Demo@123", 0);
  assert.equal(resolveSession(db, session, session.expiresAt), undefined);
  db.users.find((u) => u.id === session.userId).status = "Inactive";
  assert.equal(resolveSession(db, session, 1), undefined);
});
test("invalid JSON, wrong schema and broken nested data recover safely", () => {
  for (const raw of [
    "invalid",
    JSON.stringify({ schemaVersion: 9 }),
    JSON.stringify({ ...seedData(), evidence: [{ id: "EV", versions: [] }] }),
  ]) {
    const r = readSavedData({ getItem: () => raw }, seedData);
    assert.ok(r.warning);
    assert.ok(validState(r.db));
  }
});
test("valid state round-trips with history without a recovery warning", () => {
  const db = seedData(),
    r = readSavedData({ getItem: () => JSON.stringify(db) }, seedData);
  assert.equal(r.warning, undefined);
  assert.deepEqual(r.db, db);
  assert.ok(validState(db));
});
test("unavailable local storage returns a fresh dataset and clear warning", () => {
  const r = readSavedData(
    {
      getItem: () => {
        throw Error("denied");
      },
    },
    seedData,
  );
  assert.ok(r.warning);
  assert.ok(validState(r.db));
});
