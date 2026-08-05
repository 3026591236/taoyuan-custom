import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const combatStore = read("src/stores/useCombatStore.ts");
const combatView = read("src/views/game/CombatView.vue");
const backend = read("backend/index.mjs");
const pkg = JSON.parse(read("package.json"));

assert.equal(pkg.version, "3.3.43");
assert.match(
  combatStore,
  /supportsContinuousChallenge[\s\S]*zone\.kind === "trial"[\s\S]*zone\.id === "spirit_forest"[\s\S]*zone\.id === "dark_cave"/,
);
assert.match(
  combatStore,
  /if \(pendingRealmChoice\.value\)[\s\S]*连续挑战已暂停/,
);
assert.match(
  combatStore,
  /pendingRealmChoice\.value = null;[\s\S]*continuousTrial\.value[\s\S]*scheduleNextContinuousTrial\(\)/,
);
assert.match(combatStore, /addItemsAtomic\(grants\)/);
assert.match(combatStore, /CONTINUOUS_TRIAL_MAX_RUNS = 100/);
assert.match(
  combatView,
  /supportsContinuousChallenge\(zone\)[\s\S]*连续挑战/,
);
assert.match(backend, /V3\.3\.43 秘境连续挑战/);

console.log("V3.3.43 feedback #98 checks passed");
