import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const items = read("src/data/items.ts");
const usage = read("src/composables/useItemUsage.ts");
const shop = read("src/stores/useShopStore.ts");
const shopView = read("src/views/game/ShopView.vue");
const breeding = read("src/views/game/BreedingView.vue");
const layout = read("src/views/GameLayout.vue");
const combat = read("src/stores/useCombatStore.ts");
const combatView = read("src/views/game/CombatView.vue");
const inventory = read("src/stores/useInventoryStore.ts");
const backend = read("backend/index.mjs");

assert.match(items, /id: "sunny_doll"[\s\S]*?name: "晴天娃娃"/);
assert.match(usage, /"sunny_doll"/);
assert.match(usage, /setTomorrowWeather\("sunny"\)/);
assert.match(shopView, /SUNNY_DOLL_PRICE/);

assert.match(shop, /itemId === "rename_card" && quantity !== 1/);
assert.match(shop, /每个游戏年最多购买1张，不可批量购买/);
assert.match(shopView, /本游戏年已购买过改名卡/);

assert.match(breeding, /<button\s+v-for="hybrid in filteredHybrids"/);
assert.match(breeding, /未育种品种/);
assert.match(breeding, /parentCropA/);
assert.doesNotMatch(breeding, /<Lock v-else/);

assert.match(layout, /handleQuickUseKeydown/);
assert.match(layout, /event\.repeat/);
assert.match(layout, /quickUseBusy/);
const quickUseBlock = layout.slice(
  layout.indexOf("const useQuickSlot = async"),
  layout.indexOf("const handleQuickUseKeydown"),
);
assert.doesNotMatch(quickUseBlock, /showQuickUsePicker\.value = false/);

assert.match(combat, /CONTINUOUS_TRIAL_MAX_RUNS = 100/);
assert.match(combat, /startContinuousTrial/);
assert.match(combat, /纳戒空间不足，连续历练已停止/);
assert.match(inventory, /const addItemsAtomic/);
assert.match(combatView, /连续历练/);

assert.match(backend, /V3\.3\.39/);
console.log("V3.3.39 feedback #83-#87 checks passed");
