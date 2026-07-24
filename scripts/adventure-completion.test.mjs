import assert from 'node:assert/strict';
import fs from 'node:fs';

const store = fs.readFileSync('src/stores/useLongTermStore.ts', 'utf8');
const view = fs.readFileSync('src/views/game/EventView.vue', 'utf8');

assert.match(store, /const completed = new Set\(adventureDone\.value\)/);
assert.match(store, /ADVENTURES\.find\(\(adventure\) => !completed\.has\(adventure\.id\)\) \?\? null/);
assert.doesNotMatch(store, /adventureIndex\.value % ADVENTURES\.length/);
assert.match(view, /v-else class="reward-card claimed"/);
assert.match(view, /现有奇遇链已全部完成/);
assert.match(view, /一次性成长豪礼，第7日领完后不会在第8日重置/);
assert.match(view, /七日豪礼已完成/);

const adventures = ['a', 'b', 'c', 'd'];
function currentAdventure(index, done) {
  const completed = new Set(done);
  const current = adventures[index];
  if (current && !completed.has(current)) return current;
  return adventures.find((adventure) => !completed.has(adventure)) ?? null;
}
assert.equal(currentAdventure(0, []), 'a');
assert.equal(currentAdventure(1, ['a']), 'b');
assert.equal(currentAdventure(4, ['a', 'b']), 'c');
assert.equal(currentAdventure(4, adventures), null);
console.log('adventure completion and seven-day copy checks passed');
