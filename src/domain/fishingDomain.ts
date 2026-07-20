import type { FishingLocation, Quality } from "@/types";

export type RandomSource = () => number;

export interface WeightedEntry<T> {
  value: T;
  weight: number;
}

/** 纯加权选择；忽略非正权重，若没有正权重则返回 null。 */
export const weightedPick = <T>(
  entries: readonly WeightedEntry<T>[],
  random: RandomSource = Math.random,
): T | null => {
  const total = entries.reduce(
    (sum, entry) => sum + (entry.weight > 0 ? entry.weight : 0),
    0,
  );
  if (total <= 0) return null;

  let roll = Math.min(Math.max(random(), 0), 1 - Number.EPSILON) * total;
  for (const entry of entries) {
    if (entry.weight <= 0) continue;
    if (roll < entry.weight) return entry.value;
    roll -= entry.weight;
  }
  return entries.find((entry) => entry.weight > 0)?.value ?? null;
};

export const FISHING_JUNK = [
  "trash",
  "driftwood",
  "broken_cd",
  "soggy_newspaper",
] as const;

export interface CrabPotLootDef {
  itemId: string;
  weight: number;
  locationOverride?: FishingLocation;
  replaces?: string;
}

/** 蟹笼产物池：权重与地点替换语义保持不变。 */
export const CRAB_POT_LOOT: readonly CrabPotLootDef[] = [
  { itemId: "snail", weight: 20 },
  { itemId: "freshwater_shrimp", weight: 25 },
  { itemId: "crab", weight: 20 },
  { itemId: "lobster", weight: 10 },
  { itemId: "trash", weight: 10 },
  { itemId: "driftwood", weight: 10 },
  { itemId: "broken_cd", weight: 5 },
  { itemId: "soggy_newspaper", weight: 8 },
  {
    itemId: "cave_shrimp",
    weight: 25,
    locationOverride: "mine",
    replaces: "freshwater_shrimp",
  },
  {
    itemId: "swamp_crab",
    weight: 20,
    locationOverride: "swamp",
    replaces: "crab",
  },
];

/** 为单个蟹笼纯规划一件产物。 */
export const planCrabPotLoot = (
  location: FishingLocation,
  excludeJunk: boolean,
  random: RandomSource = Math.random,
): string | null => {
  let pool = CRAB_POT_LOOT.filter(
    (loot) => !loot.locationOverride || loot.locationOverride === location,
  );
  const overrides = pool.filter(
    (loot) => loot.locationOverride === location,
  );
  if (overrides.length > 0) {
    const replaceIds = new Set(
      overrides.map((loot) => loot.replaces).filter(Boolean),
    );
    pool = pool.filter(
      (loot) =>
        !replaceIds.has(loot.itemId) || loot.locationOverride === location,
    );
  }
  if (excludeJunk) {
    const junk = new Set<string>(FISHING_JUNK);
    pool = pool.filter((loot) => !junk.has(loot.itemId));
  }
  return weightedPick(
    pool.map((loot) => ({ value: loot.itemId, weight: loot.weight })),
    random,
  );
};

export interface TreasurePrizeDef {
  itemId: string | null;
  weight: number;
  minQty: number;
  maxQty: number;
}

/** 宝箱奖品池：权重与数量范围保持不变。 */
export const TREASURE_POOL: readonly TreasurePrizeDef[] = [
  { itemId: "copper_ore", weight: 30, minQty: 1, maxQty: 3 },
  { itemId: "iron_ore", weight: 20, minQty: 1, maxQty: 3 },
  { itemId: "gold_ore", weight: 10, minQty: 1, maxQty: 2 },
  { itemId: "crystal_ore", weight: 5, minQty: 1, maxQty: 1 },
  { itemId: "jade", weight: 3, minQty: 1, maxQty: 1 },
  { itemId: "quartz", weight: 5, minQty: 1, maxQty: 1 },
  { itemId: "wood", weight: 15, minQty: 3, maxQty: 5 },
  { itemId: "firewood", weight: 10, minQty: 2, maxQty: 4 },
  { itemId: "standard_bait", weight: 10, minQty: 2, maxQty: 3 },
  { itemId: "wild_berry", weight: 8, minQty: 1, maxQty: 2 },
  { itemId: "herb", weight: 8, minQty: 1, maxQty: 2 },
  { itemId: "ginseng", weight: 3, minQty: 1, maxQty: 1 },
  { itemId: null, weight: 10, minQty: 50, maxQty: 200 },
];

export interface PlannedTreasure {
  items: { itemId: string; quantity: number }[];
  money: number;
}

/**
 * 纯规划宝箱：先按 chance 判定，再保持原有 30% 双奖品、70% 单奖品语义。
 * 不写库存、不发钱。
 */
export const planTreasureChest = (
  chance: number,
  random: RandomSource = Math.random,
): PlannedTreasure | null => {
  if (random() >= chance) return null;
  const numPrizes = random() < 0.3 ? 2 : 1;
  const items: PlannedTreasure["items"] = [];
  let money = 0;

  for (let i = 0; i < numPrizes; i++) {
    const prize = weightedPick(
      TREASURE_POOL.map((entry) => ({ value: entry, weight: entry.weight })),
      random,
    );
    if (!prize) continue;
    const qty =
      prize.minQty +
      Math.floor(random() * (prize.maxQty - prize.minQty + 1));
    if (prize.itemId) items.push({ itemId: prize.itemId, quantity: qty });
    else money += qty;
  }

  return items.length > 0 || money > 0 ? { items, money } : null;
};

export interface InventoryStackLike {
  itemId: string;
  quantity: number;
  quality: Quality;
}

export interface InventoryBatchItem {
  itemId: string;
  quantity: number;
  quality?: Quality;
}

export interface InventoryCapacitySnapshot {
  main: readonly InventoryStackLike[];
  temporary: readonly InventoryStackLike[];
  mainCapacity: number;
  temporaryCapacity: number;
  maxStack?: number;
}

export interface InventoryBatchSimulation {
  accepted: boolean;
  main: InventoryStackLike[];
  temporary: InventoryStackLike[];
}

/**
 * 按 addItem 的主纳戒→临时纳戒及叠栈顺序模拟整批写入，不修改输入。
 * accepted=false 时调用方应整批不写入，以获得原子语义。
 */
export const simulateInventoryBatch = (
  snapshot: InventoryCapacitySnapshot,
  batch: readonly InventoryBatchItem[],
): InventoryBatchSimulation => {
  const maxStack = snapshot.maxStack ?? 999;
  const main = snapshot.main.map((slot) => ({ ...slot }));
  const temporary = snapshot.temporary.map((slot) => ({ ...slot }));

  const fillExisting = (
    slots: InventoryStackLike[],
    itemId: string,
    quality: Quality,
    initial: number,
  ) => {
    let remaining = initial;
    for (const slot of slots) {
      if (remaining <= 0) break;
      if (
        slot.itemId === itemId &&
        slot.quality === quality &&
        slot.quantity < maxStack
      ) {
        const added = Math.min(remaining, maxStack - slot.quantity);
        slot.quantity += added;
        remaining -= added;
      }
    }
    return remaining;
  };

  const createStacks = (
    slots: InventoryStackLike[],
    capacity: number,
    itemId: string,
    quality: Quality,
    initial: number,
  ) => {
    let remaining = initial;
    while (remaining > 0 && slots.length < capacity) {
      const quantity = Math.min(remaining, maxStack);
      slots.push({ itemId, quantity, quality });
      remaining -= quantity;
    }
    return remaining;
  };

  for (const entry of batch) {
    let remaining = Math.max(0, entry.quantity);
    const quality = entry.quality ?? "normal";
    remaining = fillExisting(main, entry.itemId, quality, remaining);
    remaining = createStacks(
      main,
      snapshot.mainCapacity,
      entry.itemId,
      quality,
      remaining,
    );
    remaining = fillExisting(temporary, entry.itemId, quality, remaining);
    remaining = createStacks(
      temporary,
      snapshot.temporaryCapacity,
      entry.itemId,
      quality,
      remaining,
    );
    if (remaining > 0) return { accepted: false, main, temporary };
  }

  return { accepted: true, main, temporary };
};
