import assert from "node:assert/strict";
import fs from "node:fs";

const cultivation = fs.readFileSync("src/stores/useCultivationStore.ts", "utf8");
const combat = fs.readFileSync("src/stores/useCombatStore.ts", "utf8");
const artifactView = fs.readFileSync("src/views/game/DestinedArtifactView.vue", "utf8");
const cultivationView = fs.readFileSync("src/views/game/CultivationView.vue", "utf8");
const backend = fs.readFileSync("backend/index.mjs", "utf8");

assert.match(cultivation, /destinedArtifactResonanceUnlocked[\s\S]*rebirthCount\.value >= 3/);
assert.match(cultivation, /destinedArtifactResonanceMultiplier[\s\S]*\? 1\.3 : 1/);
assert.match(cultivation, /destinedArtifactPower[\s\S]*360[\s\S]*destinedArtifactResonanceMultiplier/);
assert.match(cultivation, /destinedArtifactActiveLimit[\s\S]*destinedArtifactResonanceUnlocked\.value \? 1 : 0/);
assert.match(cultivation, /const resonance = destinedArtifactResonanceMultiplier\.value/);
assert.match(combat, /artifactBonus[\s\S]*destinedArtifactResonanceMultiplier/);
assert.match(artifactView, /三转轮回共鸣已生效[\s\S]*主动威能效果\+30%[\s\S]*每日威能次数\+1/);
assert.match(cultivationView, /3转·法宝轮回共鸣/);
assert.match(backend, /destinedArtifactLevel[\s\S]*num\(cu\.rebirthCount\) >= 3 \? 1\.3 : 1/);
assert.match(backend, /V3\.3\.32 三转法宝轮回共鸣/);

const power = (level, rebirth) => Math.floor(level * 360 * (rebirth >= 3 ? 1.3 : 1));
assert.equal(power(26, 2), 9360);
assert.equal(power(26, 3), 12168);
assert.equal(power(26, 3) - power(26, 2), 2808);
console.log("V3.3.32 artifact resonance scenarios: OK");
