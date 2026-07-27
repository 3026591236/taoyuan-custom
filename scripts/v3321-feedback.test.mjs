import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync(new URL("../src/stores/useCombatStore.ts", import.meta.url), "utf8");
const view = readFileSync(new URL("../src/views/game/CombatView.vue", import.meta.url), "utf8");
const backend = readFileSync(new URL("../backend/index.mjs", import.meta.url), "utf8");

assert.match(store, /const continueTrial = \(\) =>/);
assert.match(store, /zone\.kind !== "trial" \|\| combatResult\.value !== "win"/);
assert.match(store, /if \(drops\.value\.length\)/);
assert.match(store, /enterZone\(zone\.id\)/);
assert.match(store, /continueTrial,/);
assert.match(view, /combatStore\.activeZone\?\.kind === 'trial'/);
assert.match(view, /:disabled="combatStore\.drops\.length > 0"/);
assert.match(view, /@click="combatStore\.continueTrial"/);
assert.match(view, /继续历练/);
assert.match(backend, /V3\.3\.21 红尘连续历练/);
console.log("v3321 feedback #60 checks passed");
