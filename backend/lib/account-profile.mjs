export const SAFE_AVATAR_IDS = Object.freeze([
  "bamboo_scholar", "peach_swordswoman", "cloud_alchemist", "crane_hermit",
  "lotus_mystic", "thunder_guardian", "moon_rabbit", "golden_carp",
]);
const SAFE_AVATAR_SET = new Set(SAFE_AVATAR_IDS);
export const DEFAULT_AVATAR_ID = "bamboo_scholar";
export const RENAME_CARD_ID = "rename_card";

export function sanitizeAvatarId(value) {
  return SAFE_AVATAR_SET.has(value) ? value : DEFAULT_AVATAR_ID;
}
export function validateCharacterName(value) {
  const name = String(value ?? "").trim();
  if (Array.from(name).length < 1 || Array.from(name).length > 20)
    return { ok: false, code: "INVALID_NAME_LENGTH", message: "角色名需1-20个字符。" };
  if (!/^[\p{Script=Han}a-zA-Z0-9_]+$/u.test(name))
    return { ok: false, code: "INVALID_NAME_CHARACTERS", message: "角色名只能使用中文、字母、数字和下划线。" };
  return { ok: true, name };
}
const store = (data, key) => data?.[key] || data?.[`${key}Store`] || data?.stores?.[key] || null;
export function renameTrustedSave(data, nextName) {
  const checked = validateCharacterName(nextName);
  if (!checked.ok) return checked;
  const copy = structuredClone(data);
  const player = store(copy, "player");
  const inventory = store(copy, "inventory");
  if (!player || !inventory) return { ok: false, code: "SAVE_STRUCTURE_INVALID", message: "云存档结构不完整。" };
  const lists = [inventory.items, inventory.tempItems].filter(Array.isArray);
  let card = null;
  for (const list of lists) {
    card = list.find((item) => item?.itemId === RENAME_CARD_ID && Number.isSafeInteger(item.quantity) && item.quantity > 0);
    if (card) break;
  }
  if (!card) return { ok: false, code: "RENAME_CARD_REQUIRED", message: "需要1张改名卡。" };
  card.quantity -= 1;
  for (const list of lists) {
    for (let i = list.length - 1; i >= 0; i--) if (list[i]?.itemId === RENAME_CARD_ID && list[i].quantity <= 0) list.splice(i, 1);
  }
  player.playerName = checked.name;
  if (Object.hasOwn(player, "name")) player.name = checked.name;
  return { ok: true, data: copy, name: checked.name };
}
