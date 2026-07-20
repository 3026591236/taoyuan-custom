import type { Quality } from "@/types";
import type { ForageItemDef } from "@/data/forage";

export interface PlannedForageReward {
  itemId: string;
  quantity: number;
  quality: Quality;
  expReward: number;
  source: "forage" | "specialty" | "tracker" | "ability" | "friendly" | "hostile";
}

export interface PlanForageOptions {
  items: ForageItemDef[];
  chanceMultiplier: number;
  forestFarm: boolean;
  herbDouble: boolean;
  forester: boolean;
  lumberjack: boolean;
  tracker: boolean;
  moonHerbChance: boolean;
  rollQuality: () => Quality;
  random?: () => number;
}

/** Pure reward planning. Inventory mutation and progression bookkeeping happen later. */
export const planForageRewards = (options: PlanForageOptions): PlannedForageReward[] => {
  const random = options.random ?? Math.random;
  const rewards: PlannedForageReward[] = [];
  for (const item of options.items) {
    if (random() >= Math.min(1, item.chance * options.chanceMultiplier)) continue;
    const baseQuantity = options.forestFarm && random() < 0.2 ? 2 : 1;
    const quantity = options.herbDouble && (item.itemId === "herb" || item.itemId === "ginseng")
      ? baseQuantity * 2
      : baseQuantity;
    rewards.push({ itemId: item.itemId, quantity, quality: options.rollQuality(), expReward: item.expReward, source: "forage" });
  }
  if (options.forester || (options.lumberjack && random() < 0.25)) {
    rewards.push({ itemId: "wood", quantity: 1, quality: "normal", expReward: 0, source: "specialty" });
  }
  if (options.tracker && options.items.length > 0) {
    const item = options.items[Math.floor(random() * options.items.length)]!;
    rewards.push({ itemId: item.itemId, quantity: 1, quality: options.rollQuality(), expReward: 0, source: "tracker" });
  }
  if (options.moonHerbChance && random() < 0.08) {
    rewards.push({ itemId: "moon_herb", quantity: 1, quality: "normal", expReward: 15, source: "ability" });
  }
  return rewards;
};
