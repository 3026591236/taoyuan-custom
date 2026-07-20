import type { Weather, Season } from "@/types";
import type { MonsterDef } from "@/types/skill";

/** 采集物定义 */
export interface ForageItemDef {
  itemId: string;
  name: string;
  season: ("spring" | "summer" | "autumn" | "winter")[];
  chance: number; // 出现概率 0-1
  expReward: number;
  terrainBand?: string;
  supplyRole?: string;
  processingDestination?: string;
  surveyNote?: string;
}

export type PatrolAreaId = "general" | "bamboo" | "herb" | "stream";

export interface PatrolAreaDef {
  id: PatrolAreaId;
  name: string;
  shortName: string;
  description: string;
  responsibility: string;
  itemIds?: string[];
}

/** 巡护区只描述本次行动，不进入存档。综合巡查沿用历史资源池和概率。 */
export const PATROL_AREAS: PatrolAreaDef[] = [
  { id: "general", name: "综合巡查", shortName: "综合", description: "沿既有山径巡查全部资源带，出现概率与旧版采集完全一致。", responsibility: "兼顾建材、药植、食材与遗存登记" },
  { id: "bamboo", name: "竹坞材料线", shortName: "竹坞", description: "巡查竹坞、林缘与倒木带，集中补充修造和燃料物资。", responsibility: "洞天修造、器具加工与冬储燃料", itemIds: ["bamboo", "wood", "firewood", "winter_bamboo_shoot", "pine_cone", "camphor_seed", "petrified_wood"] },
  { id: "herb", name: "坡荫药植线", shortName: "坡荫", description: "沿背阴坡和林下腐殖层辨识药植、菌果及季候变化。", responsibility: "炼丹、灵膳与药植种源保全", itemIds: ["herb", "wintersweet", "wild_mushroom", "ginseng", "wild_berry", "mulberry", "camphor_seed"] },
  { id: "stream", name: "溪缘遗存线", shortName: "溪缘", description: "踏查冲刷岸、旧聚落边缘与露头，登记可辨识遗存。", responsibility: "藏珍阁征集、遗存建档与环境线索复核", itemIds: ["ancient_pottery", "bamboo_scroll", "stone_axe_head", "fern_fossil", "petrified_wood"] },
];

/** 天气对采集概率的修正 */
export const WEATHER_FORAGE_MODIFIER: Record<Weather, number> = {
  sunny: 1.0,
  rainy: 1.15,
  stormy: 0.8,
  snowy: 0.9,
  windy: 1.1,
  green_rain: 1.5,
};

/** 青篁秘林采集物 */
export const FORAGE_ITEMS: ForageItemDef[] = [
  {
    itemId: "bamboo",
    name: "竹子",
    season: ["spring", "summer", "autumn"],
    chance: 0.5,
    expReward: 3,
  },
  {
    itemId: "wood",
    name: "木材",
    season: ["spring", "summer", "autumn", "winter"],
    chance: 0.6,
    expReward: 2,
  },
  {
    itemId: "herb",
    name: "草药",
    season: ["spring", "summer", "autumn"],
    chance: 0.3,
    expReward: 5,
  },
  {
    itemId: "firewood",
    name: "柴火",
    season: ["spring", "summer", "autumn", "winter"],
    chance: 0.7,
    expReward: 1,
  },
  {
    itemId: "winter_bamboo_shoot",
    name: "冬笋",
    season: ["winter"],
    chance: 0.35,
    expReward: 8,
  },
  {
    itemId: "wintersweet",
    name: "腊梅",
    season: ["winter"],
    chance: 0.2,
    expReward: 10,
  },
  {
    itemId: "wild_mushroom",
    name: "野蘑菇",
    season: ["autumn"],
    chance: 0.35,
    expReward: 6,
  },
  {
    itemId: "ginseng",
    name: "人参",
    season: ["autumn", "winter"],
    chance: 0.1,
    expReward: 15,
  },
  {
    itemId: "wild_berry",
    name: "野果",
    season: ["summer"],
    chance: 0.4,
    expReward: 4,
  },
  {
    itemId: "pine_cone",
    name: "松果",
    season: ["autumn", "winter"],
    chance: 0.3,
    expReward: 5,
  },
  {
    itemId: "camphor_seed",
    name: "樟树灵种",
    season: ["spring", "summer"],
    chance: 0.15,
    expReward: 5,
  },
  {
    itemId: "mulberry",
    name: "桑葚",
    season: ["summer", "autumn"],
    chance: 0.2,
    expReward: 4,
  },

  // ===== 稀有采集物（藏珍阁化石/古物） =====
  {
    itemId: "ancient_pottery",
    name: "古陶片",
    season: ["spring", "summer", "autumn", "winter"],
    chance: 0.03,
    expReward: 12,
  },
  {
    itemId: "bamboo_scroll",
    name: "竹简",
    season: ["spring", "summer", "autumn"],
    chance: 0.03,
    expReward: 12,
  },
  {
    itemId: "stone_axe_head",
    name: "石斧头",
    season: ["spring", "summer", "autumn", "winter"],
    chance: 0.04,
    expReward: 10,
  },
  {
    itemId: "fern_fossil",
    name: "蕨叶化石",
    season: ["spring", "summer", "autumn"],
    chance: 0.03,
    expReward: 12,
  },
  {
    itemId: "petrified_wood",
    name: "石化木",
    season: ["autumn", "winter"],
    chance: 0.04,
    expReward: 10,
  },
];

const RESOURCE_LINEAGE: Record<string, Pick<ForageItemDef, "terrainBand" | "supplyRole" | "processingDestination" | "surveyNote">> = {
  bamboo: { terrainBand: "竹坞缓坡", supplyRole: "轻型建材", processingDestination: "百匠造台、洞天修造", surveyNote: "记录竹龄与新笋密度，避开幼竹集中带。" },
  wood: { terrainBand: "林缘倒木带", supplyRole: "通用木料", processingDestination: "百匠造台、器具修造", surveyNote: "优先取用风折木，保留仍有生机的立木。" },
  herb: { terrainBand: "坡荫腐殖层", supplyRole: "常用药材", processingDestination: "丹炉、灵膳房", surveyNote: "辨明伴生植被并留根续生。" },
  firewood: { terrainBand: "林下枯落带", supplyRole: "日常燃料", processingDestination: "灵膳房、冬储", surveyNote: "只收干枯枝条，兼查火险堆积。" },
  winter_bamboo_shoot: { terrainBand: "冬季竹根带", supplyRole: "时令食材", processingDestination: "灵膳房", surveyNote: "浅掘取笋，回填土层保护竹鞭。" },
  wintersweet: { terrainBand: "向阳石隙", supplyRole: "芳香药植", processingDestination: "丹炉、赠礼", surveyNote: "记录花期，不折主枝。" },
  wild_mushroom: { terrainBand: "湿润朽木带", supplyRole: "菌类食材", processingDestination: "灵膳房", surveyNote: "核验菌褶与基质，未知菌株不混装。" },
  ginseng: { terrainBand: "深坡阔叶林下", supplyRole: "珍稀药材", processingDestination: "丹炉", surveyNote: "登记叶龄和坐标，仅采成熟株。" },
  wild_berry: { terrainBand: "林缘灌丛", supplyRole: "鲜食果源", processingDestination: "灵膳房、酿制", surveyNote: "留存部分果实供动物取食与自然更新。" },
  pine_cone: { terrainBand: "针叶林缘", supplyRole: "种源与燃料", processingDestination: "育苗、百匠造台", surveyNote: "筛查虫蛀和种鳞完整度。" },
  camphor_seed: { terrainBand: "樟林母树带", supplyRole: "灵种资源", processingDestination: "灵田育苗", surveyNote: "标记母树长势与落种范围。" },
  mulberry: { terrainBand: "溪谷桑丛", supplyRole: "果食与染材", processingDestination: "灵膳房、加工", surveyNote: "观察鸟兽取食痕迹，分批采收。" },
  ancient_pottery: { terrainBand: "溪岸冲刷层", supplyRole: "聚落遗存", processingDestination: "藏珍阁", surveyNote: "记录出土层位，不扩挖周边土层。" },
  bamboo_scroll: { terrainBand: "旧址背水台地", supplyRole: "文字遗存", processingDestination: "藏珍阁", surveyNote: "保持干燥平放，登记残存字迹。" },
  stone_axe_head: { terrainBand: "河阶砾石带", supplyRole: "生产遗存", processingDestination: "藏珍阁", surveyNote: "记录磨制面、石材与伴出物。" },
  fern_fossil: { terrainBand: "溪崖页岩露头", supplyRole: "自然遗存", processingDestination: "藏珍阁", surveyNote: "沿自然裂隙取样，避免破坏整片层理。" },
  petrified_wood: { terrainBand: "坡脚冲积层", supplyRole: "自然遗存与研究样本", processingDestination: "藏珍阁、百匠研究", surveyNote: "拍记纹理和埋藏方向后再收取松动样本。" },
};

for (const item of FORAGE_ITEMS) Object.assign(item, RESOURCE_LINEAGE[item.itemId]);

/** 获取当前季节可采集物 */
export const getForageItems = (season: string): ForageItemDef[] => {
  return FORAGE_ITEMS.filter((f) => f.season.includes(season as any));
};

export const getPatrolItems = (season: string, areaId: PatrolAreaId): ForageItemDef[] => {
  const seasonal = getForageItems(season);
  const area = PATROL_AREAS.find((entry) => entry.id === areaId);
  return area?.itemIds ? seasonal.filter((item) => area.itemIds!.includes(item.itemId)) : seasonal;
};

// ===== 青篁秘林动物遭遇 =====

/** 青篁秘林动物遭遇概率 */
export const FOREST_ENCOUNTER_CHANCE = 0.15;

/** 温和动物定义 */
export interface FriendlyAnimalDef {
  id: string;
  name: string;
  productItemId: string;
  collectExp: number;
  chaseExp: number;
  season: Season[];
  weight: number;
}

export const FRIENDLY_ANIMALS: FriendlyAnimalDef[] = [
  {
    id: "wild_chicken",
    name: "野鸡",
    productItemId: "egg",
    collectExp: 5,
    chaseExp: 8,
    season: ["spring", "summer", "autumn", "winter"],
    weight: 4,
  },
  {
    id: "wild_cow",
    name: "野牛",
    productItemId: "milk",
    collectExp: 5,
    chaseExp: 8,
    season: ["spring", "summer", "autumn"],
    weight: 3,
  },
  {
    id: "wild_rabbit",
    name: "野兔",
    productItemId: "rabbit_fur",
    collectExp: 5,
    chaseExp: 8,
    season: ["spring", "summer", "autumn", "winter"],
    weight: 4,
  },
  {
    id: "wild_goat",
    name: "野山羊",
    productItemId: "goat_milk",
    collectExp: 5,
    chaseExp: 8,
    season: ["spring", "summer", "autumn"],
    weight: 3,
  },
];

/** 青篁秘林野兽定义 */
export const HOSTILE_ANIMALS: MonsterDef[] = [
  {
    id: "forest_wolf",
    name: "青篁秘林狼",
    hp: 40,
    attack: 12,
    defense: 3,
    expReward: 20,
    drops: [
      { itemId: "wolf_pelt", chance: 0.6 },
      { itemId: "wolf_fang", chance: 0.3 },
    ],
    description: "在青篁秘林中游荡的灰狼，警觉而凶猛。",
  },
  {
    id: "forest_bear",
    name: "黑熊",
    hp: 70,
    attack: 18,
    defense: 5,
    expReward: 35,
    drops: [
      { itemId: "bear_pelt", chance: 0.5 },
      { itemId: "bear_gall", chance: 0.2 },
      { itemId: "honey", chance: 0.4 },
    ],
    description: "体型庞大的黑熊，力量惊人。",
  },
  {
    id: "forest_tiger",
    name: "猛虎",
    hp: 100,
    attack: 25,
    defense: 8,
    expReward: 50,
    drops: [
      { itemId: "tiger_pelt", chance: 0.4 },
      { itemId: "tiger_bone", chance: 0.25 },
      { itemId: "tiger_fang", chance: 0.3 },
    ],
    description: "青篁秘林之王，极其危险的猛兽。",
  },
];

/** 固定采集与遭遇产物集合；用于行脚任务兼容旧档重算。 */
export const FORAGE_DISCOVERY_ITEM_IDS = new Set([
  ...FORAGE_ITEMS.map((item) => item.itemId),
  ...FRIENDLY_ANIMALS.map((animal) => animal.productItemId),
  ...HOSTILE_ANIMALS.flatMap((monster) => monster.drops.map((drop) => drop.itemId)),
]);

/** 青篁秘林野兽战败惩罚 */
export const FOREST_DEFEAT_MONEY_PENALTY_RATE = 0.1;
export const FOREST_DEFEAT_MONEY_PENALTY_CAP = 5000;

/** 按季节随机抽取一个动物遭遇（温和70%/野兽30%） */
export const rollForestEncounter = (
  season: Season,
):
  | { type: "friendly"; animal: FriendlyAnimalDef }
  | { type: "hostile"; monster: MonsterDef }
  | null => {
  const friendlyCandidates = FRIENDLY_ANIMALS.filter((a) =>
    a.season.includes(season),
  );
  const hostileCandidates = HOSTILE_ANIMALS;

  if (friendlyCandidates.length === 0 && hostileCandidates.length === 0)
    return null;

  if (Math.random() < 0.7 && friendlyCandidates.length > 0) {
    // 温和动物 — 按权重抽取
    const totalWeight = friendlyCandidates.reduce((s, a) => s + a.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const animal of friendlyCandidates) {
      roll -= animal.weight;
      if (roll <= 0) return { type: "friendly", animal };
    }
    return { type: "friendly", animal: friendlyCandidates[0]! };
  } else if (hostileCandidates.length > 0) {
    // 野兽 — 等权随机
    const idx = Math.floor(Math.random() * hostileCandidates.length);
    return { type: "hostile", monster: hostileCandidates[idx]! };
  }

  return null;
};
