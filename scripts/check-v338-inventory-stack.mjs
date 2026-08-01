import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const limit = read("src/constants/inventory.ts");
const inventory = read("src/stores/useInventoryStore.ts");
const warehouse = read("src/stores/useWarehouseStore.ts");
const fishing = read("src/domain/fishingDomain.ts");
const forage = read("src/composables/useForageSettlement.ts");
const shop = read("src/stores/useShopStore.ts");
const fishPond = read("src/stores/useFishPondStore.ts");
const animal = read("src/views/game/AnimalView.vue");
const inventoryView = read("src/views/game/InventoryView.vue");
const backend = read("backend/index.mjs");
const pkg = JSON.parse(read("package.json"));
const dbUpdate = read("scripts/update-v338-db.mjs");

assert.match(limit, /MAX_ITEM_STACK = 99_999/);
for (const [name, source] of Object.entries({ inventory, warehouse, fishing, forage, shop, fishPond, animal })) {
  assert.match(source, /MAX_ITEM_STACK/, `${name} must use the shared stack limit`);
}
assert.doesNotMatch(
  [inventory, warehouse, fishing, forage, shop, fishPond, animal].join("\n"),
  /(?:MAX_STACK\s*=|quantity\s*[+<][^\n]*|maxStack\s*\?\?)\s*999(?:\D|$)/,
  "inventory paths must not retain the 999 item stack limit",
);
assert.match(inventoryView, /v-if="inventoryStore\.items\.length > 0"[\s\S]*?>一键整理<\/Button/);
assert.equal(pkg.version, "3.3.38");
assert.match(backend, /V3\.3\.38 纳戒扩容与一键整理/);
assert.match(dbUpdate, /mailSourceId = "feedback-adoption-82"/);
assert.match(dbUpdate, /\.slice\(0, 100\)/);

const split = (quantity, max = 99_999) => {
  const stacks = [];
  while (quantity > 0) {
    const batch = Math.min(quantity, max);
    stacks.push(batch);
    quantity -= batch;
  }
  return stacks;
};
assert.deepEqual(split(99_999), [99_999]);
assert.deepEqual(split(100_000), [99_999, 1]);
assert.deepEqual(split(250_000), [99_999, 99_999, 50_002]);

console.log("v3.3.38 inventory stack checks passed");
