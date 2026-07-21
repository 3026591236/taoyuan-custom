import assert from "node:assert/strict";
import {
  absoluteGameDay,
  inspectSaveProgression,
} from "./save-progression.mjs";

const data = { player: {}, cultivation: {}, game: {} };
const check = (previous, next) => inspectSaveProgression(previous, next, data);

assert.equal(
  check(
    { money: 100000, cultivation: 1000, year: 1, season: "spring", day: 28 },
    { money: 3600000, cultivation: 1000, year: 1, season: "summer", day: 1 },
  ).abnormal,
  false,
  "正常350万跨季增长应放行",
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
  "极端资产注入应回档",
);
assert.match(
  check(
    {
      money: 10000,
      cultivation: 1000,
      aura: 100,
      year: 1,
      season: "spring",
      day: 1,
    },
    {
      money: 80000000,
      cultivation: 300000000,
      aura: 100,
      year: 1,
      season: "spring",
      day: 1,
    },
  ).reasons.join(","),
  /multiple_strong_anomalies/,
  "多指标强异常应回档",
);
assert.equal(
  absoluteGameDay({ year: 2, season: "spring", day: 1 }) -
    absoluteGameDay({ year: 1, season: "winter", day: 28 }),
  1,
  "跨年应正确计算一天",
);

console.log("save progression tests: 5 passed");
