import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AVATAR_ID, SAFE_AVATAR_IDS, sanitizeAvatarId, validateCharacterName, renameTrustedSave } from "../lib/account-profile.mjs";
test("avatar public whitelist rejects URL and markup", () => {
  for (const bad of ["https://evil.test/a.png", "<img onerror=alert(1)>", "", null]) assert.equal(sanitizeAvatarId(bad), DEFAULT_AVATAR_ID);
  for (const id of SAFE_AVATAR_IDS) assert.equal(sanitizeAvatarId(id), id);
});
test("character names enforce length and characters", () => {
  assert.equal(validateCharacterName("桃源_7").ok, true);
  assert.equal(validateCharacterName("a b").ok, false);
  assert.equal(validateCharacterName("<script>").ok, false);
  assert.equal(validateCharacterName("甲".repeat(21)).ok, false);
});
test("rename consumes exactly one card from trusted save without mutating input", () => {
  const original = { player: { playerName: "旧名" }, inventory: { items: [{ itemId: "rename_card", quantity: 2 }], tempItems: [] } };
  const result = renameTrustedSave(original, "新名");
  assert.equal(result.ok, true); assert.equal(result.data.player.playerName, "新名"); assert.equal(result.data.inventory.items[0].quantity, 1);
  assert.equal(original.inventory.items[0].quantity, 2);
  assert.equal(renameTrustedSave({ player: {}, inventory: { items: [] } }, "新名").code, "RENAME_CARD_REQUIRED");
});
