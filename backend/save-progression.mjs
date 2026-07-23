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
export function inspectSaveProgression(previous = {}, next = {}) {
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
    { key: "immortalJade", jump: 5e7, perDay: 5e6 },
    { key: "immortalMerit", jump: 5e7, perDay: 5e6 },
  ];

  for (const rule of fields) {
    const before = finite(previous[rule.key], 0);
    const after = Number(next[rule.key] ?? before);
    if (!Number.isFinite(after)) continue;
    const delta = after - before;
    const allowedExtreme = rule.jump + dayDelta * rule.perDay;
    if (
      delta > allowedExtreme &&
      delta > Math.max(rule.jump, Math.abs(before) * 100)
    ) {
      reasons.push(`${rule.key}_extreme_jump:${before}->${after}`);
    }
  }

  return {
    abnormal: reasons.length > 0,
    reasons,
    dayDelta,
  };
}
