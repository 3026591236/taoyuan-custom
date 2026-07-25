const SEASON_INDEX = new Map([
  ["spring", 0],
  ["春", 0],
  ["summer", 1],
  ["夏", 1],
  ["autumn", 2],
  ["fall", 2],
  ["秋", 2],
  ["winter", 3],
  ["冬", 3],
]);

const finite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function absoluteGameDay(summary = {}) {
  const year = Math.trunc(finite(summary.year, 1));
  const season = SEASON_INDEX.get(
    String(summary.season ?? "spring").toLowerCase(),
  );
  const day = Math.trunc(finite(summary.day, 1));
  if (year < 1 || year > 100000 || season == null || day < 1 || day > 28)
    return null;
  return (year - 1) * 112 + season * 28 + (day - 1);
}

/**
 * 实时存档守卫只处理异常大数值增长。
 * 普通状态变化、数值减少、日期变化和集中结算均不在此处裁决，避免守卫干预正常玩法。
 */
const IMMORTAL_BREAKTHROUGH_COSTS = [
  null,
  { merit: 80, jade: 20, rule: 8 },
  { merit: 180, jade: 48, rule: 22 },
  { merit: 340, jade: 86, rule: 42 },
  { merit: 650, jade: 150, rule: 86 },
];

const ascensionFromSave = (save = {}) =>
  save?.ascension || save?.ascensionStore || save?.stores?.ascension || {};

const cultivationFromSave = (save = {}) =>
  save?.cultivation || save?.cultivationStore || save?.stores?.cultivation || {};

const nonNegativeInt = (value) =>
  Number.isSafeInteger(Number(value)) && Number(value) >= 0;

const recordValues = (record = {}) =>
  Object.values(record && typeof record === "object" && !Array.isArray(record) ? record : {});

const sumRecord = (record = {}) =>
  recordValues(record).reduce(
    (total, value) => total + Math.max(0, Math.trunc(finite(value, 0))),
    0,
  );

const hasInvalidRecordValue = (record = {}) =>
  recordValues(record).some((value) => !nonNegativeInt(value));

/**
 * 实时存档守卫处理高置信异常增长与仙界关键进度。
 * 阈值刻意留出远高于正常单次操作的余量；历史高数值保持不动，只有继续异常增长才回滚。
 */
export function inspectSaveProgression(
  previous = {},
  next = {},
  nextSave = null,
  previousSave = null,
  _options = {},
) {
  const reasons = [];
  const previousDay = absoluteGameDay(previous);
  const nextDay = absoluteGameDay(next);
  const dayDelta =
    previousDay != null && nextDay != null
      ? Math.max(0, nextDay - previousDay)
      : 0;

  const fields = [
    { key: "money", jump: 5e8, perDay: 5e7 },
    { key: "cultivation", jump: 2e9, perDay: 2e8 },
    { key: "aura", jump: 1e9, perDay: 1e8 },
    { key: "spiritStone", jump: 5e7, perDay: 5e6 },
    { key: "immortalJade", jump: 2000, perDay: 1000, relative: false },
    { key: "immortalMerit", jump: 10000, perDay: 5000, relative: false },
  ];

  for (const rule of fields) {
    const before = finite(previous[rule.key], 0);
    const after = Number(next[rule.key] ?? before);
    if (!Number.isFinite(after)) continue;
    const delta = after - before;
    const allowedExtreme = rule.jump + dayDelta * rule.perDay;
    const relativeLimit = rule.relative === false ? rule.jump : Math.max(rule.jump, Math.abs(before) * 100);
    if (delta > allowedExtreme && delta > relativeLimit) {
      reasons.push(`${rule.key}_extreme_jump:${before}->${after}`);
    }
  }

  if (nextSave && previousSave) {
    const beforeAsc = ascensionFromSave(previousSave);
    const afterAsc = ascensionFromSave(nextSave);
    const beforeCu = cultivationFromSave(previousSave);
    const beforeAscended = beforeAsc?.ascended === true;
    const afterAscended = afterAsc?.ascended === true;
    const beforeStage = Number(beforeAsc?.immortalRealmStage ?? 0);
    const afterStage = Number(afterAsc?.immortalRealmStage ?? 0);

    if (!nonNegativeInt(afterStage) || afterStage > 4) {
      reasons.push(`immortalRealmStage_invalid:${String(afterAsc?.immortalRealmStage)}`);
    }
    if (!afterAscended && afterStage !== 0) {
      reasons.push(`immortalRealmStage_without_ascension:${afterStage}`);
    }
    if (!beforeAscended && afterAscended) {
      const mortalRealm = Math.trunc(finite(beforeCu?.realmIndex ?? beforeCu?.realm, 0));
      if (mortalRealm < 27 || afterAsc?.ascensionQuestComplete !== true) {
        reasons.push(`ascension_prerequisite_invalid:realm_${mortalRealm}`);
      }
    }
    if (afterStage > beforeStage) {
      if (!afterAscended || afterStage - beforeStage > 1) {
        reasons.push(`immortalRealmStage_jump:${beforeStage}->${afterStage}`);
      } else {
        const cost = { merit: 0, jade: 0, rule: 0 };
        for (let stage = beforeStage + 1; stage <= afterStage; stage += 1) {
          const part = IMMORTAL_BREAKTHROUGH_COSTS[stage];
          if (!part) continue;
          cost.merit += part.merit;
          cost.jade += part.jade;
          cost.rule += part.rule;
        }
        if (
          finite(beforeAsc?.merit, 0) < cost.merit ||
          finite(beforeAsc?.immortalJade, 0) < cost.jade ||
          finite(beforeAsc?.ruleFragments, 0) < cost.rule
        ) {
          reasons.push(`immortalRealmStage_unfunded:${beforeStage}->${afterStage}`);
        }
      }
    }

    const ascensionGrowthRules = [
      ["ruleFragments", 2000],
      ["immortalEssence", 5000],
      ["immortalBodyLevel", 20],
      ["immortalBoneLevel", 20],
      ["immortalSoulLevel", 20],
    ];
    for (const [key, maxGrowth] of ascensionGrowthRules) {
      const before = finite(beforeAsc?.[key], 0);
      const after = Number(afterAsc?.[key] ?? before);
      if (!Number.isFinite(after) || after < 0) {
        reasons.push(`${key}_invalid:${String(afterAsc?.[key])}`);
      } else if (after - before > maxGrowth + dayDelta * maxGrowth) {
        reasons.push(`${key}_extreme_jump:${before}->${after}`);
      }
    }

    const structuredGrowthRules = [
      ["gearLevels", 20],
      ["caveLevels", 20],
      ["fatePlateLevels", 20],
      ["trialWins", 100],
      ["riftClears", 100],
    ];
    for (const [key, maxGrowth] of structuredGrowthRules) {
      if (hasInvalidRecordValue(afterAsc?.[key])) {
        reasons.push(`${key}_invalid`);
        continue;
      }
      const before = sumRecord(beforeAsc?.[key]);
      const after = sumRecord(afterAsc?.[key]);
      if (after - before > maxGrowth + dayDelta * maxGrowth) {
        reasons.push(`${key}_extreme_jump:${before}->${after}`);
      }
    }
  }

  return {
    abnormal: reasons.length > 0,
    reasons,
    dayDelta,
  };
}
