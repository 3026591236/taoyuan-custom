/* global console */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const { weightedPick, simulateInventoryBatch } = await import(
  new URL("../src/domain/fishingDomain.ts", import.meta.url)
);

// weightedPick：全零/负权重必须返回 null。
assert.equal(
  weightedPick(
    [
      { value: "a", weight: 0 },
      { value: "b", weight: -3 },
    ],
    () => 0.5,
  ),
  null,
);

// 边界确定性：0 命中首个正权重；精确跨过首段边界时命中下一项；接近1命中末项。
const weighted = [
  { value: "first", weight: 2 },
  { value: "second", weight: 3 },
];
assert.equal(weightedPick(weighted, () => 0), "first");
assert.equal(weightedPick(weighted, () => 2 / 5), "second");
assert.equal(weightedPick(weighted, () => 0.999999), "second");

// 容量模拟：主纳戒现有栈优先，然后可使用临时纳戒现有栈与空槽。
const acceptedSnapshot = {
  main: [{ itemId: "ore", quantity: 998, quality: "normal" }],
  temporary: [{ itemId: "ore", quantity: 998, quality: "normal" }],
  mainCapacity: 1,
  temporaryCapacity: 2,
  maxStack: 999,
};
const accepted = simulateInventoryBatch(acceptedSnapshot, [
  { itemId: "ore", quantity: 3 },
]);
assert.equal(accepted.accepted, true);
assert.deepEqual(accepted.main, [
  { itemId: "ore", quantity: 999, quality: "normal" },
]);
assert.deepEqual(accepted.temporary, [
  { itemId: "ore", quantity: 999, quality: "normal" },
  { itemId: "ore", quantity: 1, quality: "normal" },
]);

// 批次原子预检：后续物品放不下时整批判失败，且原始快照未被修改。
const fullSnapshot = {
  main: [{ itemId: "ore", quantity: 998, quality: "normal" }],
  temporary: [],
  mainCapacity: 1,
  temporaryCapacity: 0,
  maxStack: 999,
};
const before = JSON.parse(JSON.stringify(fullSnapshot));
const rejected = simulateInventoryBatch(fullSnapshot, [
  { itemId: "ore", quantity: 1 },
  { itemId: "fish", quantity: 1 },
]);
assert.equal(rejected.accepted, false);
assert.deepEqual(fullSnapshot, before);

// fishing store 的存档字段必须原样保留。
const storeSource = await readFile(
  new URL("../src/stores/useFishingStore.ts", import.meta.url),
  "utf8",
);
const serializeMatch = storeSource.match(
  /const serialize = \(\) => \{[\s\S]*?return \{([\s\S]*?)\n\x20{4}\};\n\x20{2}\};/,
);
assert.ok(serializeMatch, "未找到 fishing serialize");
const fields = [...serializeMatch[1].matchAll(/^\s+(\w+):/gm)].map(
  (match) => match[1],
);
assert.deepEqual(fields, [
  "equippedBait",
  "equippedTackle",
  "tackleDurability",
  "fishingLocation",
  "crabPots",
]);

console.log("V3.2.1 fishing domain checks passed");
