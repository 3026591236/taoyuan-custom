import type {
  MuseumItemDef,
  MuseumMilestone,
  MuseumThemeCollection,
  MuseumRestorationDef,
} from "@/types";

/** 藏珍阁可捐赠物品全目录 */
export const MUSEUM_ITEMS: MuseumItemDef[] = [
  // ===== 矿石 (7) =====
  {
    id: "copper_ore",
    name: "铜矿",
    category: "ore",
    sourceHint: "玄矿幽脉浅层采集",
  },
  {
    id: "iron_ore",
    name: "铁矿",
    category: "ore",
    sourceHint: "玄矿幽脉冰霜层采集",
  },
  {
    id: "gold_ore",
    name: "金矿",
    category: "ore",
    sourceHint: "玄矿幽脉熔岩层采集",
  },
  {
    id: "crystal_ore",
    name: "水晶矿",
    category: "ore",
    sourceHint: "玄矿幽脉水晶层采集",
  },
  {
    id: "shadow_ore",
    name: "暗影矿",
    category: "ore",
    sourceHint: "玄矿幽脉暗影层采集",
  },
  {
    id: "void_ore",
    name: "虚空矿",
    category: "ore",
    sourceHint: "玄矿幽脉深渊层采集",
  },
  {
    id: "iridium_ore",
    name: "铱矿",
    category: "ore",
    sourceHint: "幽骨矿窟采集",
  },

  // ===== 宝石 (7) =====
  {
    id: "quartz",
    name: "石英",
    category: "gem",
    sourceHint: "玄矿幽脉各层采集",
  },
  {
    id: "jade",
    name: "翡翠",
    category: "gem",
    sourceHint: "玄矿幽脉冰霜层以下",
  },
  {
    id: "ruby",
    name: "红宝石",
    category: "gem",
    sourceHint: "玄矿幽脉熔岩层以下",
  },
  {
    id: "moonstone",
    name: "月光石",
    category: "gem",
    sourceHint: "玄矿幽脉水晶层",
  },
  {
    id: "obsidian",
    name: "黑曜石",
    category: "gem",
    sourceHint: "玄矿幽脉暗影层",
  },
  {
    id: "dragon_jade",
    name: "龙玉",
    category: "gem",
    sourceHint: "玄矿幽脉深渊层",
  },
  {
    id: "prismatic_shard",
    name: "五彩碎片",
    category: "gem",
    sourceHint: "极其稀有，深层宝箱",
  },

  // ===== 金属锭 (4) =====
  {
    id: "copper_bar",
    name: "铜锭",
    category: "bar",
    sourceHint: "熔炉冶炼铜矿",
  },
  { id: "iron_bar", name: "铁锭", category: "bar", sourceHint: "熔炉冶炼铁矿" },
  { id: "gold_bar", name: "金锭", category: "bar", sourceHint: "熔炉冶炼金矿" },
  {
    id: "iridium_bar",
    name: "铱锭",
    category: "bar",
    sourceHint: "熔炉冶炼铱矿",
  },

  // ===== 化石 (8) =====
  {
    id: "trilobite_fossil",
    name: "三叶虫化石",
    category: "fossil",
    sourceHint: "玄矿幽脉浅层/冰霜层宝箱",
  },
  {
    id: "amber",
    name: "琥珀",
    category: "fossil",
    sourceHint: "玄矿幽脉暗河层掉落",
  },
  {
    id: "ammonite_fossil",
    name: "菊石化石",
    category: "fossil",
    sourceHint: "玄矿幽脉熔岩/水晶层宝箱",
  },
  {
    id: "fern_fossil",
    name: "蕨叶化石",
    category: "fossil",
    sourceHint: "青篁秘林稀有采集",
  },
  {
    id: "shell_fossil",
    name: "螺壳化石",
    category: "fossil",
    sourceHint: "玄矿幽脉浅层/冰霜层宝箱",
  },
  {
    id: "bone_fragment",
    name: "骨骸碎片",
    category: "fossil",
    sourceHint: "深层怪物稀有掉落",
  },
  {
    id: "petrified_wood",
    name: "石化木",
    category: "fossil",
    sourceHint: "青篁秘林稀有采集",
  },
  {
    id: "dragon_tooth",
    name: "龙牙化石",
    category: "fossil",
    sourceHint: "深渊层宝箱或骨龙掉落",
  },

  // ===== 古物 (10) =====
  {
    id: "ancient_pottery",
    name: "古陶片",
    category: "artifact",
    sourceHint: "青篁秘林稀有采集",
  },
  {
    id: "jade_disc",
    name: "玉璧残片",
    category: "artifact",
    sourceHint: "水晶层宝箱",
  },
  {
    id: "bronze_mirror",
    name: "铜镜",
    category: "artifact",
    sourceHint: "熔岩层宝箱",
  },
  {
    id: "ancient_coin",
    name: "远古铜钱",
    category: "artifact",
    sourceHint: "玄矿幽脉暗河层掉落",
  },
  {
    id: "oracle_bone",
    name: "甲骨片",
    category: "artifact",
    sourceHint: "暗影层宝箱",
  },
  {
    id: "jade_pendant",
    name: "玉佩",
    category: "artifact",
    sourceHint: "水晶层掉落",
  },
  {
    id: "ancient_seed",
    name: "远古灵种",
    category: "artifact",
    sourceHint: "深层宝箱极稀有",
  },
  {
    id: "bamboo_scroll",
    name: "竹简",
    category: "artifact",
    sourceHint: "青篁秘林稀有采集",
  },
  {
    id: "stone_axe_head",
    name: "石斧头",
    category: "artifact",
    sourceHint: "青篁秘林稀有采集",
  },
  {
    id: "painted_pottery",
    name: "彩陶碎片",
    category: "artifact",
    sourceHint: "熔岩层宝箱",
  },

  // ===== 仙灵 (4) =====
  {
    id: "fox_bead",
    name: "狐珠",
    category: "spirit",
    sourceHint: "玄矿幽脉深处（与狐仙有关的线索）",
  },
  {
    id: "spirit_peach",
    name: "灵桃",
    category: "spirit",
    sourceHint: "桃夭赐福的桃树概率产出",
  },
  {
    id: "moon_herb",
    name: "月草",
    category: "spirit",
    sourceHint: "月兔赐福后采集概率获得",
  },
  {
    id: "dream_silk",
    name: "梦丝",
    category: "spirit",
    sourceHint: "归女赐福后织布机概率产出",
  },
];

/** 藏珍阁分类标签 */
export const MUSEUM_CATEGORIES = [
  { key: "ore" as const, label: "矿石" },
  { key: "gem" as const, label: "宝石" },
  { key: "bar" as const, label: "金属锭" },
  { key: "fossil" as const, label: "化石" },
  { key: "artifact" as const, label: "古物" },
  { key: "spirit" as const, label: "仙灵" },
];

/** 藏珍阁里程碑奖励 */
export const MUSEUM_MILESTONES: MuseumMilestone[] = [
  { count: 5, name: "初窥门径", reward: { money: 300 } },
  {
    count: 10,
    name: "小有收藏",
    reward: { money: 500, items: [{ itemId: "ancient_seed", quantity: 1 }] },
  },
  { count: 15, name: "矿石鉴赏家", reward: { money: 1000 } },
  {
    count: 20,
    name: "博古通今",
    reward: {
      money: 1500,
      items: [{ itemId: "prismatic_shard", quantity: 1 }],
    },
  },
  { count: 25, name: "文物守护者", reward: { money: 3000 } },
  {
    count: 30,
    name: "远古探秘",
    reward: { money: 5000, items: [{ itemId: "iridium_bar", quantity: 3 }] },
  },
  { count: 36, name: "藏珍阁之星", reward: { money: 10000 } },
  {
    count: 40,
    name: "灵物全鉴",
    reward: { money: 8000, items: [{ itemId: "moonstone", quantity: 3 }] },
  },
];

/** 根据ID查找藏珍阁物品 */
export const getMuseumItemById = (id: string): MuseumItemDef | undefined =>
  MUSEUM_ITEMS.find((item) => item.id === id);

/** V1.7.4 主题收藏：让全收集从数量目标变成主题目标 */
export const MUSEUM_THEME_COLLECTIONS: MuseumThemeCollection[] = [
  {
    id: "mine_core",
    name: "矿脉初鉴",
    desc: "集齐基础矿石与金属锭，建立矿物展柜。",
    itemIds: [
      "copper_ore",
      "iron_ore",
      "gold_ore",
      "copper_bar",
      "iron_bar",
      "gold_bar",
    ],
    reward: { fame: 60, money: 1600 },
  },
  {
    id: "gem_light",
    name: "宝石星辉",
    desc: "展出多色宝石，提升藏珍阁观赏度。",
    itemIds: ["quartz", "jade", "ruby", "moonstone", "obsidian", "dragon_jade"],
    reward: {
      fame: 90,
      money: 2600,
      items: [{ itemId: "spirit_stone", quantity: 8 }],
    },
  },
  {
    id: "fossil_age",
    name: "远古生灵",
    desc: "复原化石谱系，吸引学者远道而来。",
    itemIds: [
      "trilobite_fossil",
      "ammonite_fossil",
      "fern_fossil",
      "shell_fossil",
      "bone_fragment",
      "dragon_tooth",
    ],
    reward: {
      fame: 120,
      money: 3600,
      items: [{ itemId: "jade_slip", quantity: 1 }],
    },
  },
  {
    id: "ancient_civilization",
    name: "古国遗响",
    desc: "串联古陶、铜镜、甲骨与玉器，讲述远古文明。",
    itemIds: [
      "ancient_pottery",
      "jade_disc",
      "bronze_mirror",
      "oracle_bone",
      "jade_pendant",
      "bamboo_scroll",
    ],
    reward: { fame: 150, money: 5200 },
  },
  {
    id: "spirit_wonders",
    name: "仙灵奇珍",
    desc: "收藏仙灵相关奇物，开启藏珍阁灵物终局陈列。",
    itemIds: [
      "fox_bead",
      "spirit_peach",
      "moon_herb",
      "dream_silk",
      "prismatic_shard",
    ],
    reward: {
      fame: 220,
      money: 8000,
      items: [{ itemId: "soul_crystal", quantity: 1 }],
    },
  },
];

/** V1.7.4 文物修复：消耗资源换名望和高阶奖励 */
export const MUSEUM_RESTORATIONS: MuseumRestorationDef[] = [
  {
    id: "pottery_repair",
    name: "彩陶拼合",
    desc: "修复彩陶与古陶展品，增加基础人气。",
    requiredDonations: 8,
    cost: {
      money: 1200,
      items: [
        { itemId: "stone", quantity: 20 },
        { itemId: "clay", quantity: 6 },
      ],
    },
    reward: { fame: 45, itemId: "ancient_pottery", quantity: 1 },
  },
  {
    id: "jade_polish",
    name: "玉器抛光",
    desc: "整理玉璧、玉佩与翡翠展柜。",
    requiredDonations: 14,
    cost: {
      money: 2600,
      items: [
        { itemId: "jade", quantity: 2 },
        { itemId: "spirit_stone", quantity: 5 },
      ],
    },
    reward: { fame: 80, itemId: "jade_slip", quantity: 1 },
  },
  {
    id: "fossil_frame",
    name: "化石骨架复原",
    desc: "搭建化石骨架，显著提高馆藏吸引力。",
    requiredDonations: 22,
    cost: {
      money: 5200,
      items: [
        { itemId: "bone_fragment", quantity: 2 },
        { itemId: "wood", quantity: 40 },
      ],
    },
    reward: { fame: 130, itemId: "dragon_tooth", quantity: 1 },
  },
  {
    id: "spirit_showcase",
    name: "灵物恒温展柜",
    desc: "为仙灵奇珍布置恒温灵柜，形成终局展示。",
    requiredDonations: 32,
    cost: {
      money: 9000,
      items: [
        { itemId: "spirit_stone", quantity: 18 },
        { itemId: "moonstone", quantity: 2 },
      ],
    },
    reward: { fame: 220, itemId: "soul_crystal", quantity: 1 },
  },
];
