import assert from "node:assert/strict";
import {
  absoluteGameDay,
  inspectSaveProgression,
} from "./save-progression.mjs";

const check = (previous, next) => inspectSaveProgression(previous, next);

assert.equal(
  check(
    { money: 100000, cultivation: 1000, year: 1, season: "spring", day: 28 },
    { money: 3600000, cultivation: 1000, year: 1, season: "summer", day: 1 },
  ).abnormal,
  false,
  "正常跨季增长应放行",
);
assert.equal(
  check(
    {
      money: 2000000,
      cultivation: 100000,
      aura: 20000,
      spiritStone: 10,
      year: 2,
      season: "autumn",
      day: 5,
    },
    {
      money: 22000000,
      cultivation: 45000000,
      aura: 8000000,
      spiritStone: 500000,
      year: 2,
      season: "autumn",
      day: 5,
    },
  ).abnormal,
  false,
  "集中正常结算应放行",
);
assert.equal(
  check(
    { money: 10000, year: 1, season: "spring", day: 1 },
    { money: 900000000000000, year: 1, season: "spring", day: 1 },
  ).abnormal,
  true,
  "异常大数值增长应拦截",
);
assert.equal(
  check(
    { money: 900000000000000, year: 1, season: "spring", day: 1 },
    { money: 10000, year: 1, season: "spring", day: 1 },
  ).abnormal,
  false,
  "数值减少不应被增长守卫拦截",
);
assert.equal(
  check(
    { money: 1000, year: 1, season: "spring", day: 1 },
    { money: 1000, year: 999999, season: "unknown", day: 99 },
  ).abnormal,
  false,
  "守卫不应以日期或普通结构变化作为拦截理由",
);
assert.equal(
  absoluteGameDay({ year: 2, season: "spring", day: 1 }) -
    absoluteGameDay({ year: 1, season: "winter", day: 28 }),
  1,
  "跨年应正确计算一天",
);

console.log("save progression tests: 6 passed");
