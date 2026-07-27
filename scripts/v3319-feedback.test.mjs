import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const usage = read("src/composables/useItemUsage.ts");
for (const itemId of ["guild_badge", "life_talisman", "lucky_coin", "defense_charm"])
  assert.match(usage, new RegExp(`SPECIAL_USABLE_ITEM_IDS[\\s\\S]*?"${itemId}"`), `${itemId} 必须在背包可使用清单`);
assert.match(usage, /consumeProtected\(itemId, quantity\)/, "受保护永久道具必须把批量数量交给服务器");

const protectedUse = read("src/composables/useProtectedConsumable.ts");
assert.match(protectedUse, /guild_badge: "仙盟徽章"/, "权威结算提示应使用正式物品名");

const mining = read("src/views/game/MiningView.vue");
assert.match(mining, /useItemUsage/);
assert.match(mining, /await itemUsage\.useItem\(itemId, "normal", quantity\)/, "矿洞永久道具必须走统一权威使用入口");
assert.doesNotMatch(mining, /const handleConfirmUseItem = \(\) =>[\s\S]*?miningStore\.useCombatItem\([\s\S]*?pendingCanBatch/, "矿洞确认不得把永久道具直接交给本地 store");

const items = read("src/data/items.ts");
assert.match(items, /id: "guild_badge"[\s\S]*?可在背包直接使用/);

const backend = read("backend/index.mjs");
assert.match(backend, /V3\.3\.19 仙盟永久道具使用修复/);
console.log("V3.3.19 仙盟永久道具专项测试通过");
