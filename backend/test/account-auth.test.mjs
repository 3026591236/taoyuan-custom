import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { validateNewPassword, verifyAndHashPassword } from "../lib/account-auth.mjs";
test("password change requires six characters and verifies current bcrypt password", () => {
  const oldHash = bcrypt.hashSync("old-pass", 4);
  assert.equal(validateNewPassword("12345").ok, false);
  assert.equal(verifyAndHashPassword("wrong", oldHash, "new-pass").ok, false);
  const changed = verifyAndHashPassword("old-pass", oldHash, "new-pass");
  assert.equal(changed.ok, true); assert.equal(bcrypt.compareSync("new-pass", changed.hash), true); assert.equal(bcrypt.compareSync("old-pass", changed.hash), false);
});
