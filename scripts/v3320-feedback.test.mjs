import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const store = readFileSync(new URL('../src/stores/useCultivationStore.ts', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/views/game/CultivationView.vue', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../backend/index.mjs', import.meta.url), 'utf8');

assert.match(store, /deepMeditationUnlocked = computed\(\(\) => realmIndex\.value >= 13\)/);
assert.match(store, /maxCultivation\.value \* \(0\.018 \+ fieldTier\.value \* 0\.001\)/);
assert.match(store, /const deepMeditate = \(\) =>/);
assert.match(store, /player\.consumeStamina\(25\)/);
assert.match(store, /mana\.value -= deepMeditationManaCost\.value/);
assert.match(store, /const realmScaledSpend = Math\.floor\(maxCultivation\.value \* 0\.012\)/);
assert.match(store, /deepMeditate,/);
assert.match(view, /运转大周天/);
assert.match(view, /境界自适应 · 灵气→修为/);
assert.match(view, /修炼渠道/);
assert.match(view, /红尘历练\/秘境/);
assert.match(backend, /V3\.3\.20 大周天与高阶修炼拓展/);

const maxCultivation = 250000;
const fieldTier = 4;
const voidManual = 9;
const realmScaledSpend = Math.floor(maxCultivation * 0.012);
const deepGain = Math.floor(
  Math.floor(maxCultivation * (0.018 + fieldTier * 0.001)) *
    (1 + voidManual * 0.025) *
    1.1,
);
assert.equal(realmScaledSpend, 3000);
assert.ok(deepGain >= 6000, `expected meaningful high-realm gain, got ${deepGain}`);
console.log('v3320 feedback #59 checks passed', { realmScaledSpend, deepGain });
