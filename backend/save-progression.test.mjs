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

const mortalBase = {
  cultivation: { realmIndex: 27 },
  ascension: {
    ascended: false,
    ascensionQuestComplete: false,
    immortalRealmStage: 0,
    merit: 0,
    immortalJade: 0,
    ruleFragments: 0,
  },
};
const trueImmortal = {
  cultivation: { realmIndex: 27 },
  ascension: {
    ascended: true,
    ascensionQuestComplete: true,
    immortalRealmStage: 0,
    merit: 1300,
    immortalJade: 350,
    ruleFragments: 180,
    immortalEssence: 10,
    immortalBodyLevel: 1,
    immortalBoneLevel: 1,
    immortalSoulLevel: 1,
  },
};
const goldImmortal = {
  cultivation: { realmIndex: 27 },
  ascension: {
    ...trueImmortal.ascension,
    immortalRealmStage: 4,
    merit: 50,
    immortalJade: 46,
    ruleFragments: 22,
  },
};

assert.equal(
  inspectSaveProgression({}, {}, trueImmortal, mortalBase).abnormal,
  false,
  "完成飞升任务的大乘后期可正常飞升",
);
assert.equal(
  inspectSaveProgression({}, {}, goldImmortal, trueImmortal).abnormal,
  true,
  "单次可信存档不得连续跨越多个仙阶",
);
assert.equal(
  inspectSaveProgression(
    {},
    {},
    { ...trueImmortal, ascension: { ...trueImmortal.ascension, immortalRealmStage: 1, merit: 1220, immortalJade: 330, ruleFragments: 172 } },
    trueImmortal,
  ).abnormal,
  false,
  "资源充足时允许正常晋升一个仙阶",
);
assert.equal(
  inspectSaveProgression(
    {},
    {},
    goldImmortal,
    { ...trueImmortal, ascension: { ...trueImmortal.ascension, merit: 10 } },
  ).abnormal,
  true,
  "资源不足时不得直接写入太乙金仙",
);
assert.equal(
  inspectSaveProgression(
    { immortalMerit: 100, immortalJade: 10, year: 1, season: "spring", day: 1 },
    { immortalMerit: 200000, immortalJade: 50000, year: 1, season: "spring", day: 1 },
  ).abnormal,
  true,
  "同日仙界核心资源异常增长应拦截",
);
assert.equal(
  inspectSaveProgression(
    {},
    {},
    { ...trueImmortal, ascension: { ...trueImmortal.ascension, gearLevels: { weapon: 150 } } },
    { ...trueImmortal, ascension: { ...trueImmortal.ascension, gearLevels: { weapon: 1 } } },
  ).abnormal,
  true,
  "单次仙器等级异常增长应拦截",
);
assert.equal(
  inspectSaveProgression(
    {},
    {},
    { ...mortalBase, ascension: { ...mortalBase.ascension, immortalRealmStage: 4 } },
    mortalBase,
  ).abnormal,
  true,
  "未飞升角色不得携带仙阶",
);

console.log("save progression tests: 13 passed");
