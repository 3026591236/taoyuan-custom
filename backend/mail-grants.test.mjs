import assert from "node:assert/strict";
import { matchIssuedMailGrants } from "./lib/mail-grants.mjs";

const item = (itemId, quantity, quality = "normal") => ({ itemId, quantity, quality });
const save = ({ money = 100, stamina = 50, spirit = 10, herb = 0, herbQuality = "normal" } = {}) => ({
  player: {
    money,
    stamina,
    maxStamina: 100,
    attributes: {
      physique: { level: 1, exp: 0 },
      strength: { level: 1, exp: 0 },
      agility: { level: 1, exp: 0 },
      perception: { level: 1, exp: 0 },
    },
  },
  cultivation: { cultivation: 0, aura: 0, mana: 10, realmIndex: 0 },
  inventory: {
    items: [item("spirit_stone", spirit), ...(herb ? [item("herb", herb, herbQuality)] : [])],
  },
});
const grant = (id, rewards) => ({ id, rewards });

{
  const result = matchIssuedMailGrants(save(), save({ money: 120 }), [grant("money", { money: 20 })]);
  assert.deepEqual(result.matchedIds, ["money"]);
  assert.equal(result.mismatch, false);
}
{
  const grants = [grant("first", { money: 20 }), grant("second", { items: [item("herb", 2)] })];
  const result = matchIssuedMailGrants(save(), save({ money: 120 }), grants);
  assert.deepEqual(result.matchedIds, ["first"]);
}
{
  const grants = [grant("money", { money: 20 }), grant("herb", { items: [item("herb", 2)] })];
  const result = matchIssuedMailGrants(save(), save({ money: 120, herb: 2 }), grants);
  assert.deepEqual(new Set(result.matchedIds), new Set(["money", "herb"]));
}
{
  const result = matchIssuedMailGrants(save(), save({ money: 121 }), [grant("money", { money: 20 })]);
  assert.equal(result.mismatch, true);
  assert.deepEqual(result.matchedIds, []);
}
{
  const result = matchIssuedMailGrants(save({ herb: 1 }), save({ herb: 1, herbQuality: "rare" }), [
    grant("herb", { items: [item("herb", 1)] }),
  ]);
  assert.equal(result.mismatch, true);
}
{
  const before = save();
  const after = structuredClone(before);
  after.game = { day: 2 };
  const result = matchIssuedMailGrants(before, after, [grant("money", { money: 20 })]);
  assert.equal(result.mismatch, false);
  assert.deepEqual(result.matchedIds, []);
}
{
  const result = matchIssuedMailGrants(save(), save(), [
    grant("notice", {}),
    grant("money", { money: 20 }),
  ]);
  assert.deepEqual(result.matchedIds, ["notice"]);
}
console.log("ok - mail grant matching and protected deltas");
