import CryptoJS from "crypto-js";

const SAVE_KEY = "taoyuanxiang_2024_secret";
export const PROTECTED_CONSUMABLES = new Set([
  "guild_badge", "life_talisman", "lucky_coin", "defense_charm",
  "marrow_wash_pill", "stamina_fruit", "stamina_pill",
  "time_stasis_pill", "ganoderma_pill",
]);

const REALM_MAX = [100,220,420,760,1200,1800,2600,3700,5200,7200,11000,16000,24000,40000,65000,100000,160000,250000,400000,650000,1000000,1600000,2600000,4200000,6800000,11000000,18000000,30000000];
const ROOTS = ["mixed", "wood", "water", "earth", "fire", "metal", "celestial"];
const STAMINA_CAPS = [120, 160, 200, 250, 300];
const PASSOUT_HOUR = 26;
const store = (data, name) => data?.[name] || data?.[`${name}Store`] || data?.stores?.[name] || null;
const finiteNumber = (value, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const safeInt = (value, fallback = 0) => Number.isSafeInteger(value) ? value : fallback;

export function shanghaiDay(nowMs) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nowMs));
}

function inventoryEntries(inventory) {
  return [inventory?.items, inventory?.tempItems].filter(Array.isArray);
}

export function inventoryCount(data, itemId) {
  const inventory = store(data, "inventory");
  return inventoryEntries(inventory).flat().reduce((sum, item) => item?.itemId === itemId ? sum + Math.max(0, safeInt(item.quantity)) : sum, 0);
}

function deductInventory(data, itemId, quantity) {
  const inventory = store(data, "inventory");
  if (!inventory || inventoryCount(data, itemId) < quantity) return false;
  let remaining = quantity;
  for (const entries of inventoryEntries(inventory)) {
    for (let i = 0; i < entries.length && remaining > 0; i++) {
      const item = entries[i];
      if (item?.itemId !== itemId) continue;
      const available = Math.max(0, safeInt(item.quantity));
      const take = Math.min(available, remaining);
      item.quantity = available - take;
      remaining -= take;
    }
    for (let i = entries.length - 1; i >= 0; i--) if (entries[i]?.quantity <= 0) entries.splice(i, 1);
  }
  return remaining === 0;
}

function fail(code, message) { return { ok: false, code, message }; }
function validBaseline(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return typeof value === "number" && Number.isFinite(value) && Number.isSafeInteger(value) && value >= min && value <= max;
}
function validRate(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER; }
function validGameHour(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= PASSOUT_HOUR; }

/** Apply one server-authoritative protected use to a clone of a trusted save. */
export function applyProtectedConsumable(input) {
  const itemId = String(input.itemId || "");
  if (!PROTECTED_CONSUMABLES.has(itemId)) return fail("ITEM_NOT_PROTECTED", "该道具不属于权威消费范围。");
  const quantity = Number(input.quantity ?? 1);
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100) return fail("INVALID_QUANTITY", "使用数量无效。");
  if (itemId !== "guild_badge" && itemId !== "life_talisman" && itemId !== "lucky_coin" && itemId !== "defense_charm" && quantity !== 1)
    return fail("SINGLE_USE_ONLY", "该道具每次只能使用一个。");
  const nowMs = Number(input.nowMs);
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) return fail("INVALID_SERVER_TIME", "服务器时间无效。");
  const data = structuredClone(input.data);
  const player = store(data, "player");
  const cultivation = store(data, "cultivation");
  const mining = store(data, "mining");
  const game = store(data, "game");
  if (!player || !cultivation || !mining || !store(data, "inventory")) return fail("SAVE_STRUCTURE_INVALID", "云存档结构不完整。");
  const isPill = ["marrow_wash_pill", "stamina_pill", "time_stasis_pill", "ganoderma_pill"].includes(itemId);
  if (isPill && (!game || !validGameHour(game.hour)))
    return fail("INVALID_GAME_TIME", "游戏时间基线异常。");
  if (isPill && game.hour >= PASSOUT_HOUR)
    return fail("PAST_BEDTIME", "已经凌晨2点了，不能继续服用丹药，请立刻休息。");
  if (!deductInventory(data, itemId, quantity)) return fail("INSUFFICIENT_INVENTORY", "道具库存不足。");
  const effect = { itemId, quantity, serverTime: nowMs };

  const miningRules = {
    guild_badge: ["guildBadgeBonusAttack", 3], life_talisman: ["guildBonusMaxHp", 15],
    lucky_coin: ["guildBonusDropRate", 0.05], defense_charm: ["guildBonusDefense", 0.03],
  };
  if (miningRules[itemId]) {
    const [field, amount] = miningRules[itemId];
    const before = mining[field] ?? 0;
    if (!validRate(before)) return fail("INVALID_BASELINE", "永久属性基线异常。");
    const after = before + amount * quantity;
    if (!Number.isFinite(after) || after > Number.MAX_SAFE_INTEGER) return fail("EFFECT_OVERFLOW", "永久属性已达安全上限。");
    mining[field] = after;
    effect.path = `mining.${field}`; effect.before = before; effect.after = after;
  } else if (itemId === "marrow_wash_pill") {
    const before = cultivation.spiritRoot ?? "mixed";
    const index = ROOTS.indexOf(before);
    if (index < 0) return fail("INVALID_BASELINE", "灵根基线异常。");
    if (index >= ROOTS.length - 1) return fail("EFFECT_AT_CAP", "已是天灵根，无法继续使用。");
    cultivation.spiritRoot = ROOTS[index + 1];
    effect.path = "cultivation.spiritRoot"; effect.before = before; effect.after = cultivation.spiritRoot;
  } else if (itemId === "stamina_fruit") {
    const before = player.staminaCapLevel ?? 0;
    const bonus = player.bonusMaxStamina ?? 0;
    if (!validBaseline(before, 0, 4) || !validBaseline(bonus)) return fail("INVALID_BASELINE", "体力上限基线异常。");
    if (before >= 4) return fail("EFFECT_AT_CAP", "体力上限已达到最高。");
    player.staminaCapLevel = before + 1;
    player.maxStamina = STAMINA_CAPS[before + 1] + bonus;
    effect.path = "player.staminaCapLevel"; effect.before = before; effect.after = before + 1; effect.maxStamina = player.maxStamina;
  } else if (itemId === "stamina_pill") {
    const day = shanghaiDay(nowMs);
    const oldKey = typeof player.staminaPillRealDayKey === "string" ? player.staminaPillRealDayKey : "";
    const oldCount = oldKey === day ? (player.staminaPillRealDayCount ?? 0) : 0;
    const last = player.staminaPillLastUseAt ?? 0;
    const stamina = player.stamina;
    const maxStamina = player.maxStamina;
    if (!validBaseline(oldCount, 0, 5) || !validBaseline(last) || !validBaseline(stamina) || !validBaseline(maxStamina, 1)) return fail("INVALID_BASELINE", "体力丹计数或体力基线异常。");
    if (oldCount >= 5) return fail("DAILY_LIMIT", "今日（上海时间）体力丹已达5枚上限。");
    if (last > 0 && nowMs - last < 10_000) return fail("COOLDOWN", "体力丹药力尚未化开，请稍后再服用。");
    const after = Math.min(stamina + 100, maxStamina + 500);
    if (after <= stamina) return fail("EFFECT_AT_CAP", "体力已经达到体力丹可提升的上限。");
    player.stamina = after; player.staminaPillRealDayKey = day; player.staminaPillRealDayCount = oldCount + 1; player.staminaPillLastUseAt = nowMs;
    const hourBefore = game.hour;
    game.hour = Math.min(PASSOUT_HOUR, hourBefore + 0.05);
    effect.path = "player.stamina"; effect.before = stamina; effect.after = after; effect.dailyKey = day; effect.dailyCount = oldCount + 1;
    effect.gameTime = { before: hourBefore, after: game.hour };
  } else if (itemId === "time_stasis_pill") {
    const day = shanghaiDay(nowMs);
    const oldKey = typeof player.timeStasisPillRealDayKey === "string" ? player.timeStasisPillRealDayKey : "";
    const oldCount = oldKey === day ? (player.timeStasisPillRealDayCount ?? 0) : 0;
    const freezeUntil = player.timeStasisPillFreezeUntil ?? 0;
    if (!validBaseline(oldCount, 0, 3) || !validBaseline(freezeUntil)) return fail("INVALID_BASELINE", "时间禁锢丹计数基线异常。");
    if (oldCount >= 3) return fail("DAILY_LIMIT", "今日（上海时间）时间禁锢丹已达3枚上限。");
    player.timeStasisPillRealDayKey = day; player.timeStasisPillRealDayCount = oldCount + 1;
    player.timeStasisPillFreezeUntil = Math.max(freezeUntil, nowMs) + 30 * 60_000;
    effect.path = "player.timeStasisPillFreezeUntil"; effect.before = freezeUntil; effect.after = player.timeStasisPillFreezeUntil; effect.dailyKey = day; effect.dailyCount = oldCount + 1;
  } else if (itemId === "ganoderma_pill") {
    const day = shanghaiDay(nowMs);
    const oldKey = typeof cultivation.ganodermaPillDailyKey === "string" ? cultivation.ganodermaPillDailyKey : "";
    const oldCount = oldKey === day ? (cultivation.ganodermaPillDailyCount ?? 0) : 0;
    const last = cultivation.ganodermaPillLastUseAt ?? 0;
    const realm = cultivation.realmIndex ?? 0;
    const beforeCult = cultivation.cultivation;
    const beforeAura = cultivation.aura;
    if (!validBaseline(oldCount, 0, 3) || !validBaseline(last) || !validBaseline(realm, 0, REALM_MAX.length - 1) || !validBaseline(beforeCult) || !validBaseline(beforeAura)) return fail("INVALID_BASELINE", "灵芝培元丹基线异常。");
    if (oldCount >= 3) return fail("DAILY_LIMIT", "灵芝培元丹今日已达3枚上限。");
    if (last > 0 && nowMs - last < 10_000) return fail("COOLDOWN", "灵芝药力尚未炼化，请稍后再服用。");
    const gain = Math.max(1, Math.floor(REALM_MAX[realm] * 0.15));
    const room = Math.max(0, REALM_MAX[realm] - beforeCult);
    const actual = Math.min(room, gain);
    const overflow = gain - actual;
    cultivation.cultivation = beforeCult + actual; cultivation.aura = beforeAura + 300 + overflow;
    cultivation.ganodermaPillDailyKey = day; cultivation.ganodermaPillDailyCount = oldCount + 1; cultivation.ganodermaPillLastUseAt = nowMs;
    effect.path = "cultivation.ganoderma"; effect.before = { cultivation: beforeCult, aura: beforeAura }; effect.after = { cultivation: cultivation.cultivation, aura: cultivation.aura }; effect.dailyKey = day; effect.dailyCount = oldCount + 1;
  }
  return { ok: true, data, effect };
}

export function encryptSave(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SAVE_KEY).toString();
}
