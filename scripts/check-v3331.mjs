import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const store = read("../src/stores/useCultivationStore.ts");
const cultivationView = read("../src/views/game/CultivationView.vue");
const charInfoView = read("../src/views/game/CharInfoView.vue");
const backend = read("../backend/index.mjs");
const pkg = JSON.parse(read("../package.json"));
const lock = JSON.parse(read("../package-lock.json"));

assert.match(store, /const isMaxRealm = computed\(\(\) => realmIndex\.value >= REALMS\.length - 1\)/);
assert.match(store, /const canBreakthrough = computed\([\s\S]*?!isMaxRealm\.value &&[\s\S]*?cultivation\.value >= maxCultivation\.value/);

const breakthroughStart = store.indexOf("  const breakthrough = () => {");
const costDeduction = store.indexOf("    aura.value -= cost;", breakthroughStart);
const maxRealmGuard = store.indexOf("    if (isMaxRealm.value) {", breakthroughStart);
assert.ok(breakthroughStart >= 0 && maxRealmGuard > breakthroughStart);
assert.ok(costDeduction > maxRealmGuard, "highest-realm guard must run before aura deduction");
assert.match(store.slice(maxRealmGuard, costDeduction), /return false;/);
assert.match(store, /凡界境界已圆满，请前往修仙之途飞升/);
assert.match(cultivationView, /cultivation\.isMaxRealm[\s\S]*?凡界境界已圆满/);
assert.match(charInfoView, /cultivationStore\.isMaxRealm[\s\S]*?已圆满/);
assert.match(backend, /V3\.3\.31 凡界圆满突破保护/);

assert.equal(pkg.version, "3.3.31");
assert.equal(lock.version, "3.3.31");
assert.equal(lock.packages[""].version, "3.3.31");

console.log("V3.3.31 feedback #68 max-realm breakthrough guard: OK");
