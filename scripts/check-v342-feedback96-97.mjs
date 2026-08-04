import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const cultivationView = read("src/views/game/CultivationView.vue");
const alchemyView = read("src/views/game/AlchemyView.vue");
const items = read("src/data/items.ts");
const cultivationStore = read("src/stores/useCultivationStore.ts");
const backend = read("backend/index.mjs");
const pkg = JSON.parse(read("package.json"));

assert.equal(pkg.version, "3.3.42");
assert.match(
  cultivationView,
  /cultivation\.aura >= cultivation\.rebirthCost\.aura[\s\S]*text-success[\s\S]*text-caution/,
);
assert.match(
  cultivationView,
  /player\.money >= cultivation\.rebirthCost\.money[\s\S]*player\.money\.toLocaleString\(\)[\s\S]*cultivation\.rebirthCost\.money\.toLocaleString\(\)/,
);
assert.match(
  alchemyView,
  /name: "龙颜丹"[\s\S]*desc: "永久体力上限\+20；上品\/极品另加体魄与悟性经验"/,
);
assert.match(
  items,
  /name: "龙颜丹"[\s\S]*永久提升体力上限20点；炼制为上品或极品时，另加体魄与悟性经验/,
);
assert.match(
  cultivationStore,
  /pillId === "dragon_face_pill"[\s\S]*player\.addBonusMaxStamina\(20\)[\s\S]*体力上限\+20/,
);
assert.match(backend, /V3\.3\.42 转生条件与龙颜丹说明修复/);

console.log("V3.3.42 feedback #96-#97 checks passed");
