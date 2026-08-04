import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const statusBar = read("src/components/game/StatusBar.vue");
const combat = read("src/stores/useCombatStore.ts");
const shop = read("src/stores/useShopStore.ts");
const items = read("src/data/items.ts");
const backend = read("backend/index.mjs");
const pkg = JSON.parse(read("package.json"));

assert.equal(pkg.version, "3.3.41");
assert.match(statusBar, /cultivationStore\.combatPower\.toLocaleString\(\)/);
assert.match(statusBar, /router\.push\('\/game\/charinfo'\)/);
assert.match(statusBar, /与战力排行榜使用同一总战力口径/);
assert.match(combat, /连续历练已自动拾取：\$\{summary\}/);
assert.match(combat, /showFloat\(`自动拾取 \$\{summary\}`, "success"\)/);
assert.match(combat, /纳戒空间不足，连续历练已停止；未拾取掉落仍保留在结算页/);
assert.match(shop, /itemId: "paper"[\s\S]*price: 30/);
assert.match(shop, /itemId: "longkui"[\s\S]*price: 2200/);
assert.match(items, /paper: "万象行·药庐供应；用于族谱修订"/);
assert.match(items, /longkui: "洞府百草园现实日领取；修仙市集高价补给"/);
assert.match(backend, /V3\.3\.41 战力显示与连续历练提示/);
console.log("V3.3.41 feedback #91-#95 checks passed");
