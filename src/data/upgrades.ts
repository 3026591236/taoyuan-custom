import type { ToolType, ToolTier } from "@/types";

/** 工具升级所需材料和费用 */
export interface ToolUpgradeCost {
  fromTier: ToolTier;
  toTier: ToolTier;
  money: number;
  materials: { itemId: string; quantity: number }[];
}

/** 通用工具升级费用（水壶/锄头/镐/镰刀/斧头） */
const STANDARD_COSTS: ToolUpgradeCost[] = [
  {
    fromTier: "basic",
    toTier: "iron",
    money: 2000,
    materials: [{ itemId: "copper_bar", quantity: 5 }],
  },
  {
    fromTier: "iron",
    toTier: "steel",
    money: 5000,
    materials: [{ itemId: "iron_bar", quantity: 5 }],
  },
  {
    fromTier: "steel",
    toTier: "iridium",
    money: 10000,
    materials: [{ itemId: "gold_bar", quantity: 5 }],
  },
];

/** 水壶升级费用（首次升级门槛降低） */
const WATERING_CAN_COSTS: ToolUpgradeCost[] = [
  {
    fromTier: "basic",
    toTier: "iron",
    money: 1200,
    materials: [{ itemId: "copper_bar", quantity: 3 }],
  },
  {
    fromTier: "iron",
    toTier: "steel",
    money: 5000,
    materials: [{ itemId: "iron_bar", quantity: 5 }],
  },
  {
    fromTier: "steel",
    toTier: "iridium",
    money: 10000,
    materials: [{ itemId: "gold_bar", quantity: 5 }],
  },
];

/** 各工具的升级费用 */
export const TOOL_UPGRADE_COSTS: Record<ToolType, ToolUpgradeCost[]> = {
  wateringCan: WATERING_CAN_COSTS,
  hoe: STANDARD_COSTS,
  pickaxe: STANDARD_COSTS,
  scythe: STANDARD_COSTS,
  axe: STANDARD_COSTS,
  fishingRod: [
    {
      fromTier: "basic",
      toTier: "iron",
      money: 2000,
      materials: [
        { itemId: "copper_bar", quantity: 5 },
        { itemId: "wood", quantity: 5 },
      ],
    },
    {
      fromTier: "iron",
      toTier: "steel",
      money: 5000,
      materials: [
        { itemId: "iron_bar", quantity: 5 },
        { itemId: "bamboo", quantity: 5 },
      ],
    },
    {
      fromTier: "steel",
      toTier: "iridium",
      money: 10000,
      materials: [
        { itemId: "gold_bar", quantity: 5 },
        { itemId: "bamboo", quantity: 10 },
      ],
    },
  ],
  pan: [
    {
      fromTier: "basic",
      toTier: "iron",
      money: 2000,
      materials: [
        { itemId: "copper_bar", quantity: 5 },
        { itemId: "quartz", quantity: 2 },
      ],
    },
    {
      fromTier: "iron",
      toTier: "steel",
      money: 5000,
      materials: [
        { itemId: "iron_bar", quantity: 5 },
        { itemId: "quartz", quantity: 3 },
      ],
    },
    {
      fromTier: "steel",
      toTier: "iridium",
      money: 10000,
      materials: [
        { itemId: "gold_bar", quantity: 5 },
        { itemId: "quartz", quantity: 5 },
      ],
    },
  ],
};

/** 获取某工具当前可用的升级信息 */
export const getUpgradeCost = (
  type: ToolType,
  currentTier: ToolTier,
): ToolUpgradeCost | undefined => {
  return TOOL_UPGRADE_COSTS[type].find((c) => c.fromTier === currentTier);
};

/** 工具中文名 */
export const TOOL_NAMES: Record<ToolType, string> = {
  wateringCan: "水壶",
  hoe: "锄头",
  pickaxe: "镐",
  fishingRod: "鱼竿",
  scythe: "镰刀",
  axe: "斧头",
  pan: "淘金盘",
};

/** 工具等级中文名 */
export const TIER_NAMES: Record<ToolTier, string> = {
  basic: "初始",
  iron: "铁制",
  steel: "精钢",
  iridium: "铱金",
};

/** V1.7.7 工具精通消耗：满级3级，消耗铜钱与中后期材料换长期效率 */
export interface ToolMasteryCost {
  level: number;
  money: number;
  materials: { itemId: string; quantity: number }[];
  effect: string;
}

export const TOOL_MASTERY_COSTS: ToolMasteryCost[] = [
  {
    level: 1,
    money: 6000,
    materials: [
      { itemId: "iron_bar", quantity: 3 },
      { itemId: "wood", quantity: 20 },
    ],
    effect: "体力消耗额外降低5%",
  },
  {
    level: 2,
    money: 12000,
    materials: [
      { itemId: "gold_bar", quantity: 3 },
      { itemId: "quartz", quantity: 6 },
    ],
    effect: "体力消耗额外降低10%，蓄力效率+1",
  },
  {
    level: 3,
    money: 24000,
    materials: [
      { itemId: "mystic_iron", quantity: 3 },
      { itemId: "artifact_shard", quantity: 2 },
      { itemId: "spirit_stone", quantity: 12 },
    ],
    effect: "体力消耗额外降低15%，蓄力效率+2",
  },
];

export const getToolMasteryCost = (
  currentLevel: number,
): ToolMasteryCost | null => {
  return TOOL_MASTERY_COSTS.find((c) => c.level === currentLevel + 1) ?? null;
};
