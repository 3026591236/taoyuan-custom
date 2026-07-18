import fs from "node:fs";
import assert from "node:assert/strict";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const backend = read("backend/index.mjs");
const items = read("src/data/items.ts");
const hanhai = read("src/stores/useHanhaiStore.ts");
const inventory = read("src/stores/useInventoryStore.ts");
const hidden = read("src/stores/useHiddenNpcStore.ts");
const hiddenDefs = read("src/data/hiddenNpcs.ts");
const fruitTrees = read("src/data/fruitTrees.ts");
const crops = read("src/data/crops.ts");
const buildings = read("src/data/buildings.ts");
const allText = [backend, ...fs.readdirSync(new URL("../src", import.meta.url), { recursive: true }).filter(String).filter(p => /\.(ts|vue)$/.test(p)).map(p => read(`src/${p}`))].join("\n");

// Save ownership, slot validation, and conflict serialization.
assert.match(backend, /Number\.isInteger\(slot\) \|\| slot < 0 \|\| slot > 2/);
assert.match(backend, /SELECT id, name FROM characters WHERE user_id = \? AND slot = \? LIMIT 1 FOR UPDATE/);
assert.match(backend, /SELECT updated_at, character_id, player_name, raw, data_json FROM saves WHERE user_id = \? AND slot = \? LIMIT 1 FOR UPDATE/);
assert.match(backend, /LAST_LOADED_AT_REQUIRED/);
assert.doesNotMatch(backend, /\{ raw, meta, data, characterId \}/);
assert.match(backend, /character_id=VALUES\(character_id\)/);

// Feedback remains anonymous but is rate limited and daily capped.
assert.match(backend, /app\.post\("\/api\/feedbacks"/);
assert.match(backend, /consumeFeedbackBurst/);
assert.match(backend, /FEEDBACK_DAILY_LIMIT/);
assert.doesNotMatch(backend.slice(backend.indexOf('app.post("/api/feedbacks"'), backend.indexOf('app.get("/api/feedbacks"')), /请先登录账号/);

// Hanhai equipment definitions are no longer ordinary items; grant by equip type and migrate legacy stacks.
for (const id of ["trade_desert_blade", "trade_turquoise_pendant", "trade_silk_robe"]) {
  assert.equal((items.match(new RegExp(`id: "${id}"`, "g")) || []).length, 0, `${id} ordinary item remains`);
  assert.match(inventory, new RegExp(`migrateTradeEquipment\\("${id}"`));
  assert.match(hanhai, new RegExp(`\\["${id}", inventoryStore\\.has`));
}
for (const method of ["addWeapon", "addRing", "addHat", "addShoe"]) assert.match(hanhai, new RegExp(`inventoryStore\\.${method}`));
assert.match(hanhai, /兑换发放失败，积分与限购次数已退还/);

// Dragon crop/bond IDs coexist, with one-release fallback.
assert.match(crops, /id: "dragon_pearl"/);
assert.match(items, /id: "dragon_bond_pearl"/);
assert.match(hiddenDefs, /bondItemId: "dragon_bond_pearl"/);
assert.match(hidden, /legacyDragonBondItem/);

// Persimmon crop and tree fruit are distinct; explicit fruit-bat pool follows tree output.
assert.match(crops, /id: "persimmon"/);
assert.match(fruitTrees, /fruitId: "fresh_persimmon"/);
assert.match(fruitTrees, /fruitId: "fresh_persimmon"/);
assert.match(buildings, /"fresh_persimmon"/);
assert.match(read("src/data/processing.ts"), /id: "seed_from_persimmon"[\s\S]*?inputItemId: "persimmon"/);
assert.match(read("src/data/processing.ts"), /id: "dry_persimmon"[\s\S]*?inputItemId: "persimmon"/);

// Stasis pill text only: no stale actual-duration claim remains.
assert.doesNotMatch(allText, /时间禁锢丹[^\n]{0,100}3小时现实时间|暂停游戏时间流逝3小时现实时间/);
assert.match(allText, /时间禁锢丹[^\n]{0,100}30分钟|暂停游戏时间流逝30分钟现实时间/);

// DB secret is mandatory and no old literal remains.
assert.match(backend, /TAOYUAN_DB_PASSWORD is required/);
assert.doesNotMatch(backend, /password: "taoyuan2026"/);

console.log("V3.1.3 audit assertions passed");
