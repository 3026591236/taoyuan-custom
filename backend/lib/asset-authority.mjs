import crypto from "node:crypto";

export const DEFAULT_ASSET_AUTHORITY_MODE = "baseline_only";
export const QUALITY_WHITELIST = new Set([
  "normal",
  "fine",
  "excellent",
  "supreme",
]);

const ASSET_PATHS = Object.freeze({
  player: ["player", "playerStore", "stores.player"],
  cultivation: ["cultivation", "cultivationStore", "stores.cultivation"],
  inventory: ["inventory", "inventoryStore", "stores.inventory"],
});

const getPath = (value, path) =>
  path.split(".").reduce((current, key) => current?.[key], value);
const firstObject = (value, paths) => {
  for (const path of paths) {
    const candidate = getPath(value, path);
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate))
      return candidate;
  }
  return {};
};
const finiteInt = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
};

/** Canonical JSON ignores object key insertion order and preserves array order. */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

export function canonicalHash(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function itemCollections(inventory) {
  return [inventory.items, inventory.inventory, inventory.bag, inventory.tempItems];
}

function collectItems(inventory) {
  const result = [];
  for (const collection of itemCollections(inventory)) {
    if (Array.isArray(collection)) {
      for (const item of collection) result.push(item);
    } else if (collection && typeof collection === "object") {
      for (const [itemId, item] of Object.entries(collection)) {
        result.push(
          item && typeof item === "object"
            ? { ...item, itemId: item.itemId ?? itemId }
            : { itemId, quantity: item },
        );
      }
    }
  }
  return result;
}

function normalizeItems(items) {
  const totals = new Map();
  for (const item of items) {
    const itemId = String(item?.itemId ?? "");
    const quality = String(item?.quality ?? "normal");
    const key = `${itemId}\0${quality}`;
    totals.set(key, (totals.get(key) || 0) + finiteInt(item?.quantity));
  }
  return [...totals.entries()]
    .map(([key, quantity]) => {
      const [itemId, quality] = key.split("\0");
      return { itemId, quality, quantity };
    })
    .filter((item) => item.quantity !== 0)
    .sort((a, b) =>
      a.itemId.localeCompare(b.itemId) || a.quality.localeCompare(b.quality),
    );
}

function normalizeEquipment(collection) {
  return (Array.isArray(collection) ? collection : [])
    .map((item) => ({
      defId: String(item?.defId ?? ""),
      enchantmentId:
        item?.enchantmentId == null ? null : String(item.enchantmentId),
    }))
    .sort(
      (a, b) =>
        a.defId.localeCompare(b.defId) ||
        String(a.enchantmentId ?? "").localeCompare(
          String(b.enchantmentId ?? ""),
        ),
    );
}

/** Extract the asset subset used by the baseline/ledger boundary. */
export function extractAssets(save = {}) {
  const player = firstObject(save, ASSET_PATHS.player);
  const cultivation = firstObject(save, ASSET_PATHS.cultivation);
  const inventory = firstObject(save, ASSET_PATHS.inventory);
  const items = normalizeItems(collectItems(inventory));
  const inventorySpiritStone = items
    .filter((item) => item.itemId === "spirit_stone")
    .reduce((total, item) => total + item.quantity, 0);

  return {
    currencies: {
      money: finiteInt(player.money),
      spiritStone: finiteInt(
        player.spiritStone ??
          player.spirit_stone ??
          cultivation.spiritStone ??
          inventorySpiritStone,
      ),
      aura: finiteInt(cultivation.aura),
      cultivation: finiteInt(cultivation.cultivation),
      mana: finiteInt(cultivation.mana),
      stamina: finiteInt(player.stamina),
    },
    items,
    equipment: {
      weapons: normalizeEquipment(inventory.ownedWeapons),
      rings: normalizeEquipment(inventory.ownedRings),
      hats: normalizeEquipment(inventory.ownedHats),
      shoes: normalizeEquipment(inventory.ownedShoes),
    },
  };
}

const counts = (values, key, quantity = () => 1) => {
  const result = new Map();
  for (const value of values || []) {
    const id = key(value);
    result.set(id, (result.get(id) || 0) + finiteInt(quantity(value), 1));
  }
  return result;
};

export function diffAssets(before, after) {
  const result = { currencies: {}, items: {}, equipment: {} };
  for (const key of Object.keys(after.currencies))
    result.currencies[key] =
      finiteInt(after.currencies[key]) - finiteInt(before.currencies[key]);

  const itemKey = (item) => `${item.itemId}\0${item.quality}`;
  const beforeItems = counts(before.items, itemKey, (item) => item.quantity);
  const afterItems = counts(after.items, itemKey, (item) => item.quantity);
  for (const key of new Set([...beforeItems.keys(), ...afterItems.keys()]))
    result.items[key] = (afterItems.get(key) || 0) - (beforeItems.get(key) || 0);

  for (const type of Object.keys(after.equipment)) {
    const equipmentKey = (item) =>
      `${item.defId}\0${item.enchantmentId ?? ""}`;
    const beforeEquipment = counts(before.equipment[type], equipmentKey);
    const afterEquipment = counts(after.equipment[type], equipmentKey);
    result.equipment[type] = {};
    for (const key of new Set([
      ...beforeEquipment.keys(),
      ...afterEquipment.keys(),
    ]))
      result.equipment[type][key] =
        (afterEquipment.get(key) || 0) - (beforeEquipment.get(key) || 0);
  }
  return result;
}

export function hasPositiveDelta(delta) {
  return (
    Object.values(delta.currencies).some((value) => value > 0) ||
    Object.values(delta.items).some((value) => value > 0) ||
    Object.values(delta.equipment).some((group) =>
      Object.values(group).some((value) => value > 0),
    )
  );
}

/**
 * Pure transition plan. In baseline_only mode a client-reported increase is
 * observed, never treated as an issued/consumed grant. Future ledger/grant
 * enforcement must supply independently issued grants before authorizing it.
 */
export function planAssetBaseline({ previousAssets = null, save }) {
  const assets = extractAssets(save);
  const delta = previousAssets ? diffAssets(previousAssets, assets) : null;
  return {
    assets,
    assetsJson: canonicalJson(assets),
    saveHash: canonicalHash(save),
    delta,
    hasUnverifiedIncrease: delta ? hasPositiveDelta(delta) : false,
    authorizedGrantIds: [],
  };
}

/** Persist the accepted save's baseline on the caller's existing transaction. */
export async function persistAssetBaseline(
  conn,
  { userId, characterId, slot, save, mode = DEFAULT_ASSET_AUTHORITY_MODE },
) {
  if (mode !== "baseline_only")
    throw new Error(`unsupported asset authority mode: ${mode}`);

  const [rows] = await conn.execute(
    `SELECT assets_json FROM asset_baselines
     WHERE user_id = ? AND slot = ? LIMIT 1 FOR UPDATE`,
    [userId, slot],
  );
  let previousAssets = null;
  if (rows.length) {
    try {
      previousAssets =
        typeof rows[0].assets_json === "string"
          ? JSON.parse(rows[0].assets_json)
          : rows[0].assets_json;
    } catch {
      throw new Error("asset baseline is unreadable");
    }
  }

  const plan = planAssetBaseline({ previousAssets, save });
  await conn.execute(
    `INSERT INTO asset_baselines
      (user_id, character_id, slot, schema_version, save_hash, assets_json)
     VALUES (?, ?, ?, 1, ?, ?)
     ON DUPLICATE KEY UPDATE
       character_id = VALUES(character_id),
       schema_version = VALUES(schema_version),
       save_hash = VALUES(save_hash),
       assets_json = VALUES(assets_json)`,
    [userId, characterId, slot, plan.saveHash, plan.assetsJson],
  );
  return { ...plan, established: rows.length === 0, mode };
}
