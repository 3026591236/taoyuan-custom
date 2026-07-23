import crypto from "node:crypto";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function floatingWelfareConfigVersion(config) {
  return crypto.createHash("sha256").update(stableJson(config)).digest("hex").slice(0, 24);
}

export function welfareResetForGift(gift = {}) {
  if (gift.type === "newbie") return "once";
  if (gift.type === "daily") return "daily";
  if (gift.type === "seven_day") return "sevenDay";
  return ["once", "daily", "sevenDay"].includes(gift.reset) ? gift.reset : "once";
}

const dayIndex = (key) => Math.floor(Date.parse(`${key}T00:00:00.000Z`) / 86400000);

/** Resolve a period entirely from server-owned dates/config semantics. */
export function resolveWelfarePeriod(gift, today, firstSeenDate = today) {
  if (!dateKeyPattern.test(today)) return { kind: "invalid_date" };
  const reset = welfareResetForGift(gift);
  if (reset === "once") return { kind: "ok", reset, periodKey: "once" };
  if (reset === "daily") return { kind: "ok", reset, periodKey: `daily:${today}` };
  const first = dateKeyPattern.test(firstSeenDate) ? firstSeenDate : today;
  const day = dayIndex(today) - dayIndex(first) + 1;
  if (day < 1) return { kind: "invalid_date" };
  if (day > 7) return { kind: "expired", reset, day };
  return { kind: "ok", reset, day, periodKey: `sevenDay:${day}` };
}

export function floatingWelfareSourceId(configVersion, giftId, periodKey) {
  return `${String(configVersion).slice(0, 24)}:${String(giftId).slice(0, 40)}:${String(periodKey).slice(0, 24)}`;
}
