import fs from "node:fs";
const cave=fs.readFileSync("src/views/game/CaveView.vue","utf8");
const store=fs.readFileSync("src/stores/useCultivationStore.ts","utf8");
for (const [ok,msg] of [
 [cave.includes("兑换份数") && cave.includes("全部"),"quantity controls"],
 [cave.includes("exchangeForSpiritStones(recipeId, batches)"),"view batch call"],
 [store.includes("exchangeForSpiritStones = (id: string, batches = 1)"),"store batch signature"],
 [store.includes("actualBatches = Math.min(safeBatches, maxBatches)"),"inventory clamp"],
 [store.includes("recipe.spiritStones * actualBatches"),"reward multiplication"],
]) if(!ok) throw new Error(`Missing ${msg}`);
console.log("V3.3.36 feedback #80 static contracts: OK");
