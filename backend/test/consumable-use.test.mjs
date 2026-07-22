import assert from "node:assert/strict";
import { applyProtectedConsumable, inventoryCount, shanghaiDay } from "../lib/consumable-use.mjs";

const base = (itemId, quantity = 1) => ({
  inventory: { items: [{ itemId, quantity, quality: "normal" }], tempItems: [] },
  player: {
    stamina: 100, maxStamina: 120, staminaCapLevel: 0, bonusMaxStamina: 0,
    staminaPillRealDayKey: "", staminaPillRealDayCount: 0, staminaPillLastUseAt: 0,
    timeStasisPillRealDayKey: "", timeStasisPillRealDayCount: 0,
  },
  cultivation: {
    realmIndex: 0, cultivation: 0, aura: 0, spiritRoot: "mixed",
    ganodermaPillDailyKey: "", ganodermaPillDailyCount: 0, ganodermaPillLastUseAt: 0,
  },
  mining: { guildBadgeBonusAttack: 0, guildBonusMaxHp: 0, guildBonusDropRate: 0, guildBonusDefense: 0 },
  game: { hour: 6 },
});
const now = Date.parse("2026-07-21T15:26:00Z");

// Reward followed immediately by authoritative use: current trusted inventory,
// not an adjacent net delta, is the source of truth.
{
  const save = base("guild_badge", 2);
  const used = applyProtectedConsumable({ data: save, itemId: "guild_badge", quantity: 1, nowMs: now });
  assert.equal(used.ok, true);
  assert.equal(inventoryCount(used.data, "guild_badge"), 1);
  assert.equal(used.data.mining.guildBadgeBonusAttack, 3);
  assert.equal(save.inventory.items[0].quantity, 2, "input stays unchanged until transaction commits");
}

for (const [itemId, field, expected] of [
  ["life_talisman", "guildBonusMaxHp", 15], ["lucky_coin", "guildBonusDropRate", 0.05],
  ["defense_charm", "guildBonusDefense", 0.03],
]) {
  const result = applyProtectedConsumable({ data: base(itemId), itemId, quantity: 1, nowMs: now });
  assert.equal(result.ok, true); assert.equal(result.data.mining[field], expected);
}
{
  const result = applyProtectedConsumable({ data: base("marrow_wash_pill"), itemId: "marrow_wash_pill", quantity: 1, nowMs: now });
  assert.equal(result.data.cultivation.spiritRoot, "wood");
}
{
  const result = applyProtectedConsumable({ data: base("stamina_fruit"), itemId: "stamina_fruit", quantity: 1, nowMs: now });
  assert.equal(result.data.player.staminaCapLevel, 1); assert.equal(result.data.player.maxStamina, 160);
}
{
  const save = base("stamina_pill");
  const result = applyProtectedConsumable({ data: save, itemId: "stamina_pill", quantity: 1, nowMs: now });
  assert.equal(result.ok, true); assert.equal(result.data.player.stamina, 200);
  assert.equal(result.data.game.hour, 6.05, "体力丹的游戏时间成本由服务端写入可信档");
  assert.equal(result.data.player.staminaPillRealDayKey, shanghaiDay(now));
  const cooldownSave = structuredClone(result.data);
  cooldownSave.inventory.items.push({ itemId: "stamina_pill", quantity: 1 });
  assert.equal(applyProtectedConsumable({ data: cooldownSave, itemId: "stamina_pill", quantity: 1, nowMs: now + 9999 }).code, "COOLDOWN");
  cooldownSave.player.staminaPillRealDayCount = 5;
  assert.equal(applyProtectedConsumable({ data: cooldownSave, itemId: "stamina_pill", quantity: 1, nowMs: now + 10000 }).code, "DAILY_LIMIT");
}
{
  const save = base("time_stasis_pill");
  const result = applyProtectedConsumable({ data: save, itemId: "time_stasis_pill", quantity: 1, nowMs: now });
  assert.equal(result.data.player.timeStasisPillFreezeUntil, now + 1800000);
  assert.equal(result.data.player.timeStasisPillRealDayCount, 1);
}
{
  const save = base("ganoderma_pill"); save.cultivation.cultivation = 95;
  const result = applyProtectedConsumable({ data: save, itemId: "ganoderma_pill", quantity: 1, nowMs: now });
  assert.equal(result.ok, true); assert.equal(result.data.cultivation.cultivation, 100);
  assert.equal(result.data.cultivation.aura, 310, "overflow plus fixed aura is server computed");
}
{
  const save = base("marrow_wash_pill"); save.game.hour = 26;
  const result = applyProtectedConsumable({ data: save, itemId: "marrow_wash_pill", quantity: 1, nowMs: now });
  assert.equal(result.code, "PAST_BEDTIME");
  assert.equal(inventoryCount(save, "marrow_wash_pill"), 1, "凌晨禁用不会扣除道具");
}
{
  const save = base("stamina_pill"); save.game.hour = 25.98;
  const result = applyProtectedConsumable({ data: save, itemId: "stamina_pill", quantity: 1, nowMs: now });
  assert.equal(result.ok, true, "临近凌晨2点可完成本次服用");
  assert.equal(result.data.game.hour, 26, "体力丹的时间成本最多推进至就寝时刻");
}
assert.equal(applyProtectedConsumable({ data: base("guild_badge", 0), itemId: "guild_badge", quantity: 1, nowMs: now }).code, "INSUFFICIENT_INVENTORY");
assert.equal(applyProtectedConsumable({ data: base("guild_badge"), itemId: "guild_badge", quantity: NaN, nowMs: now }).code, "INVALID_QUANTITY");
assert.equal(applyProtectedConsumable({ data: base("guild_badge"), itemId: "guild_badge", quantity: Infinity, nowMs: now }).code, "INVALID_QUANTITY");
{
  const save = base("guild_badge"); save.mining.guildBadgeBonusAttack = Infinity;
  assert.equal(applyProtectedConsumable({ data: save, itemId: "guild_badge", quantity: 1, nowMs: now }).code, "INVALID_BASELINE");
}
{
  const save = base("stamina_fruit"); delete save.player.staminaCapLevel;
  const result = applyProtectedConsumable({ data: save, itemId: "stamina_fruit", quantity: 1, nowMs: now });
  assert.equal(result.ok, true, "missing legacy field establishes only fixed zero baseline");
  assert.equal(result.data.player.staminaCapLevel, 1);
}
console.log("consumable use tests passed");
