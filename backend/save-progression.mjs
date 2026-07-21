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

export function inspectSaveProgression(previous = {}, next = {}, plainData) {
  const reasons = [];
  if (!plainData || typeof plainData !== "object" || Array.isArray(plainData))
    return { abnormal: true, reasons: ["invalid_save_structure"], dayDelta: 0 };

  const stack = [plainData];
  let visited = 0;
  while (stack.length) {
    const value = stack.pop();
    if (++visited > 250000) {
      reasons.push("save_structure_too_large");
      break;
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      reasons.push("non_finite_number");
      break;
    }
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) stack.push(child);
    }
  }

  const previousDay = absoluteGameDay(previous);
  const nextDay = absoluteGameDay(next);
  if (nextDay == null) reasons.push("invalid_game_date");
  const dayDelta =
    previousDay != null && nextDay != null
      ? Math.max(0, nextDay - previousDay)
      : 0;

  const fields = [
    { key: "money", hard: 1e14, jump: 5e8, perDay: 5e7, strong: 5e7 },
    { key: "cultivation", hard: 1e16, jump: 2e9, perDay: 2e8, strong: 2e8 },
    { key: "aura", hard: 1e15, jump: 1e9, perDay: 1e8, strong: 1e8 },
    { key: "spiritStone", hard: 1e12, jump: 5e7, perDay: 5e6, strong: 5e6 },
  ];
  let strongCount = 0;
  for (const rule of fields) {
    const before = finite(previous[rule.key], 0);
    const after = Number(next[rule.key] ?? before);
    if (!Number.isFinite(after) || after < 0) {
      reasons.push(`${rule.key}_invalid:${String(next[rule.key])}`);
      continue;
    }
    if (after > rule.hard) reasons.push(`${rule.key}_hard_limit:${after}`);
    const delta = after - before;
    const allowedExtreme = rule.jump + dayDelta * rule.perDay;
    if (
      delta > allowedExtreme &&
      delta > Math.max(rule.jump, Math.abs(before) * 100)
    )
      reasons.push(`${rule.key}_extreme_jump:${before}->${after}`);
    if (
      delta > rule.strong + dayDelta * (rule.perDay / 2) &&
      delta > Math.max(rule.strong, Math.abs(before) * 20)
    )
      strongCount += 1;
  }
  if (strongCount >= 2)
    reasons.push(`multiple_strong_anomalies:${strongCount}`);

  return {
    abnormal: reasons.length > 0,
    reasons: [...new Set(reasons)],
    dayDelta,
  };
}
