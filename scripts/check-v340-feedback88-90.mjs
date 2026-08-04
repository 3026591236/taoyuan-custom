import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const processing = read("src/data/processing.ts");
const processingStore = read("src/stores/useProcessingStore.ts");
const processingView = read("src/views/game/ProcessingView.vue");
const combat = read("src/stores/useCombatStore.ts");
const cultivation = read("src/stores/useCultivationStore.ts");
const cultivationView = read("src/views/game/CultivationView.vue");
const shop = read("src/stores/useShopStore.ts");
const items = read("src/data/items.ts");
const knowledge = read("src/data/knowledgeBase.ts");
const backend = read("backend/index.mjs");

assert.match(processing, /id: "crystal_turquoise"[\s\S]*name: "打磨绿松石饰品"[\s\S]*inputQuantity: 2[\s\S]*outputQuantity: 1[\s\S]*processingDays: 3[\s\S]*完成后需手动收取/);
assert.match(processingView, /成品仍在机器内，点击下方按钮收取/);
assert.match(processingView, /需休息推进\$\{recipe\.processingDays\}个游戏日/);
assert.match(processingStore, /addItemsAtomic\(refunds\)/);
assert.match(processingStore, /取消失败：纳戒无法完整接收退回原料/);

for (const [id, rebirth, daily, gain] of [
  ["primordial_spirit_realm", 8, 3, 180],
  ["primordial_spirit_depths", 10, 2, 320],
]) {
  const block = combat.slice(combat.indexOf(`id: "${id}"`));
  assert.match(block, new RegExp(`minRebirth: ${rebirth}[\\s\\S]*dailyLimit: ${daily}`));
  assert.match(combat, new RegExp(`zone\\?\\.id === "${id}"`));
  assert.match(combat, /zone\.id === "primordial_spirit_depths" \? 320 : 180/);
}
assert.match(cultivation, /const gainYuanShenExp = \(amount: number\)/);
assert.match(cultivation, /gainYuanShenExp,/);
assert.match(cultivationView, /8转·元神秘境/);
assert.match(cultivationView, /10转·元神秘境深层/);

assert.match(shop, /itemId: "longkui"[\s\S]*price: 2200/);
assert.match(shop, /itemId: "paper"[\s\S]*price: 30/);
assert.match(items, /paper: "万象行·药庐供应；用于族谱修订"/);
assert.match(items, /longkui: "洞府百草园现实日领取；修仙市集高价补给"/);
assert.match(knowledge, /V3\.3\.40：元神秘境、龙葵与纸从哪里获得/);
assert.match(backend, /V3\.3\.40/);

console.log("V3.3.40 feedback #88-#90 checks passed");
