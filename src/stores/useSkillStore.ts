import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { SkillType, SkillState, SkillPerk5, SkillPerk10 } from "@/types";
import { useInventoryStore } from "./useInventoryStore";
import { usePlayerStore } from "./usePlayerStore";
import { addLog } from "@/composables/useGameLog";
import { useGameStore } from "./useGameStore";

/** 各等级所需累计经验 **/
const EXP_TABLE = [
  0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000,
];

/** 创建初始百艺状态 */
const createSkill = (type: SkillType): SkillState => {
  return { type, exp: 0, level: 0, perk5: null, perk10: null };
};

export const useSkillStore = defineStore("skill", () => {
  const skills = ref<SkillState[]>([
    createSkill("farming"),
    createSkill("foraging"),
    createSkill("fishing"),
    createSkill("mining"),
    createSkill("combat"),
  ]);

  const getSkill = (type: SkillType): SkillState => {
    return skills.value.find((s) => s.type === type)!;
  };

  const farmingLevel = computed(() => getSkill("farming").level);
  const fishingLevel = computed(() => getSkill("fishing").level);
  const miningLevel = computed(() => getSkill("mining").level);
  const foragingLevel = computed(() => getSkill("foraging").level);
  const combatLevel = computed(() => getSkill("combat").level);
  type ProfessionOrderId =
    "chef_supply" | "angler_stock" | "miner_refine" | "forager_bundle";
  type MasterOrderId =
    | "spirit_banquet"
    | "rare_fish_feast"
    | "hundred_craft"
    | "herb_codex"
    | "monster_drill";
  const professionOrdersDone = ref<string[]>([]);
  const PROFESSION_ORDERS: {
    id: ProfessionOrderId;
    name: string;
    desc: string;
    skill: SkillType;
    itemId: string;
    itemName: string;
    quantity: number;
    money: number;
    exp: number;
  }[] = [
    {
      id: "chef_supply",
      name: "灵膳房供餐",
      desc: "提交蕴灵稻，为万象集、宗门和家族提供日常膳食。",
      skill: "farming",
      itemId: "spirit_rice",
      itemName: "蕴灵稻",
      quantity: 3,
      money: 1600,
      exp: 65,
    },
    {
      id: "angler_stock",
      name: "鱼鲜备货",
      desc: "提交鲫鱼，补足万象市集与家宴消耗。",
      skill: "fishing",
      itemId: "crucian",
      itemName: "鲫鱼",
      quantity: 5,
      money: 1200,
      exp: 55,
    },
    {
      id: "miner_refine",
      name: "矿材精炼",
      desc: "提交铁锭，支撑修仙装备和仙盟工程。",
      skill: "mining",
      itemId: "iron_bar",
      itemName: "铁锭",
      quantity: 3,
      money: 1500,
      exp: 60,
    },
    {
      id: "forager_bundle",
      name: "山野药篓",
      desc: "提交草药，为炼丹、医馆与反馈补偿储备材料。",
      skill: "foraging",
      itemId: "herb",
      itemName: "草药",
      quantity: 6,
      money: 1100,
      exp: 58,
    },
  ];
  const MASTER_ORDERS: {
    id: MasterOrderId;
    name: string;
    desc: string;
    skill: SkillType;
    level: number;
    items: { itemId: string; itemName: string; quantity: number }[];
    money: number;
    exp: number;
    spiritStone: number;
  }[] = [
    {
      id: "spirit_banquet",
      name: "大师委托·灵膳宴",
      desc: "灵耕大师以灵米与月华玉筹备宗门灵膳。",
      skill: "farming",
      level: 7,
      items: [
        { itemId: "spirit_rice", itemName: "蕴灵稻", quantity: 8 },
        { itemId: "moonlight_jade", itemName: "月华玉", quantity: 1 },
      ],
      money: 4200,
      exp: 180,
      spiritStone: 10,
    },
    {
      id: "rare_fish_feast",
      name: "大师委托·珍鱼席",
      desc: "垂钓大师为瀚海商队备下鲜鱼与仙露。",
      skill: "fishing",
      level: 7,
      items: [
        { itemId: "crucian", itemName: "鲫鱼", quantity: 10 },
        { itemId: "immortal_dew", itemName: "仙露", quantity: 1 },
      ],
      money: 3800,
      exp: 170,
      spiritStone: 9,
    },
    {
      id: "hundred_craft",
      name: "大师委托·百工器修",
      desc: "采玄矿大师交付玄铁与图纸，支援炼器升星。",
      skill: "mining",
      level: 8,
      items: [
        { itemId: "mystic_iron", itemName: "玄铁", quantity: 3 },
        { itemId: "forge_blueprint", itemName: "炼器图纸", quantity: 1 },
      ],
      money: 4600,
      exp: 195,
      spiritStone: 12,
    },
    {
      id: "herb_codex",
      name: "大师委托·百草札",
      desc: "采集大师用草药与灵墨整理百草札记。",
      skill: "foraging",
      level: 7,
      items: [
        { itemId: "herb", itemName: "草药", quantity: 12 },
        { itemId: "spirit_ink", itemName: "灵墨", quantity: 2 },
      ],
      money: 3600,
      exp: 175,
      spiritStone: 9,
    },
    {
      id: "monster_drill",
      name: "大师委托·镇魔演武",
      desc: "战斗大师提交妖丹与魂晶，组织镇魔演武。",
      skill: "combat",
      level: 7,
      items: [
        { itemId: "demon_core", itemName: "妖丹", quantity: 1 },
        { itemId: "soul_crystal", itemName: "魂晶", quantity: 1 },
      ],
      money: 4400,
      exp: 190,
      spiritStone: 11,
    },
  ];

  /** 增加经验并自动升级（含戒指经验加成） */
  const addExp = (
    type: SkillType,
    amount: number,
  ): { leveledUp: boolean; newLevel: number } => {
    const ringExpBonus = useInventoryStore().getRingEffectValue("exp_bonus");
    const adjustedAmount = Math.floor(amount * (1 + ringExpBonus));

    const skill = getSkill(type);
    skill.exp += adjustedAmount;
    let leveledUp = false;

    while (skill.level < 10) {
      const nextLevelExp = EXP_TABLE[skill.level + 1]!;
      if (skill.exp >= nextLevelExp) {
        skill.level++;
        leveledUp = true;
      } else {
        break;
      }
    }

    return { leveledUp, newLevel: skill.level };
  };

  /** 获取升级到下一级所需经验 */
  const getExpToNextLevel = (
    type: SkillType,
  ): { current: number; required: number } | null => {
    const skill = getSkill(type);
    if (skill.level >= 10) return null;
    return { current: skill.exp, required: EXP_TABLE[skill.level + 1]! };
  };

  /** 计算百艺对体力消耗的减免 (每级减少1%，10级共减少10%) */
  const getStaminaReduction = (type: SkillType): number => {
    return getSkill(type).level * 0.01;
  };

  /** 设置等级5专精 */
  const setPerk5 = (type: SkillType, perk: SkillPerk5): boolean => {
    const skill = getSkill(type);
    if (skill.level < 5 || skill.perk5 !== null) return false;
    skill.perk5 = perk;
    return true;
  };

  /** 设置等级10专精 */
  const setPerk10 = (type: SkillType, perk: SkillPerk10): boolean => {
    const skill = getSkill(type);
    if (skill.level < 10 || skill.perk10 !== null) return false;
    skill.perk10 = perk;
    return true;
  };

  /** 判断灵植品质（基于灵耕等级） */
  const rollCropQuality = (): "normal" | "fine" | "excellent" | "supreme" => {
    return rollCropQualityWithBonus(0);
  };

  /** 判断灵植品质（带肥料加成 + 可选百艺等级加成） */
  const rollCropQualityWithBonus = (
    qualityBonus: number,
    levelBonus: number = 0,
  ): "normal" | "fine" | "excellent" | "supreme" => {
    const level = farmingLevel.value + levelBonus;
    const roll = Math.random();

    if (level >= 9 && roll < 0.05 + qualityBonus * 0.5) return "supreme";
    if (level >= 6 && roll < 0.15 + qualityBonus) return "excellent";
    if (level >= 3 && roll < 0.3 + qualityBonus) return "fine";
    return "normal";
  };

  /** 判断采集物品质（基于采集等级和专精 + 可选百艺等级加成） */
  const rollForageQuality = (
    levelBonus: number = 0,
  ): "normal" | "fine" | "excellent" | "supreme" => {
    const skill = getSkill("foraging");
    if (skill.perk10 === "botanist") return "excellent";
    const level = skill.level + levelBonus;
    const roll = Math.random();

    if (level >= 9 && roll < 0.05) return "supreme";
    if (level >= 6 && roll < 0.12) return "excellent";
    if (level >= 3 && roll < 0.25) return "fine";
    return "normal";
  };

  const currentOrderKey = () => {
    const g = useGameStore();
    return `${g.year}-${g.season}-${g.day}`;
  };
  const professionOrderCards = computed(() =>
    PROFESSION_ORDERS.map((o) => ({
      ...o,
      done: professionOrdersDone.value.includes(`${currentOrderKey()}:${o.id}`),
      level: getSkill(o.skill).level,
    })),
  );
  const masterOrderCards = computed(() =>
    MASTER_ORDERS.map((o) => ({
      ...o,
      done: professionOrdersDone.value.includes(
        `${currentOrderKey()}:master:${o.id}`,
      ),
      unlocked: getSkill(o.skill).level >= o.level,
      levelNow: getSkill(o.skill).level,
    })),
  );
  const completeProfessionOrder = (
    id: ProfessionOrderId,
  ): { success: boolean; message: string } => {
    const order = PROFESSION_ORDERS.find((o) => o.id === id);
    if (!order) return { success: false, message: "职业委托不存在。" };
    const key = `${currentOrderKey()}:${id}`;
    if (professionOrdersDone.value.includes(key))
      return { success: false, message: "今日已完成。" };
    const inv = useInventoryStore();
    if (inv.getItemCount(order.itemId) < order.quantity)
      return {
        success: false,
        message: `${order.itemName}不足，需要${order.quantity}。`,
      };
    inv.removeItem(order.itemId, order.quantity);
    usePlayerStore().earnMoney(order.money);
    addExp(order.skill, order.exp);
    professionOrdersDone.value.push(key);
    addLog(
      `完成生活职业委托「${order.name}」，获得${order.money}文与${order.exp}百艺经验。`,
    );
    return { success: true, message: `${order.name}完成。` };
  };

  const completeMasterOrder = (
    id: MasterOrderId,
  ): { success: boolean; message: string } => {
    const order = MASTER_ORDERS.find((o) => o.id === id);
    if (!order) return { success: false, message: "大师委托不存在。" };
    const key = `${currentOrderKey()}:master:${id}`;
    if (professionOrdersDone.value.includes(key))
      return { success: false, message: "今日已完成。" };
    if (getSkill(order.skill).level < order.level)
      return {
        success: false,
        message: `${order.name}需要${order.skill} Lv.${order.level}。`,
      };
    const inv = useInventoryStore();
    const missing = order.items.find(
      (i) => inv.getItemCount(i.itemId) < i.quantity,
    );
    if (missing)
      return {
        success: false,
        message: `${missing.itemName}不足，需要${missing.quantity}。`,
      };
    for (const item of order.items) inv.removeItem(item.itemId, item.quantity);
    const player = usePlayerStore();
    player.earnMoney(order.money);
    inv.addItem("spirit_stone", order.spiritStone);
    addExp(order.skill, order.exp);
    professionOrdersDone.value.push(key);
    addLog(
      `完成${order.name}，获得${order.money}文、灵石×${order.spiritStone}与${order.exp}百艺经验。`,
    );
    return { success: true, message: `${order.name}完成。` };
  };

  const serialize = () => {
    return {
      skills: skills.value,
      professionOrdersDone: professionOrdersDone.value,
    };
  };

  const deserialize = (data: ReturnType<typeof serialize>) => {
    const arr: SkillState[] = data.skills ?? [];
    // 确保 5 个百艺都存在（旧存档可能没有 combat）
    const allTypes: SkillType[] = [
      "farming",
      "foraging",
      "fishing",
      "mining",
      "combat",
    ];
    for (const type of allTypes) {
      if (!arr.find((s) => s.type === type)) {
        const newSkill = createSkill(type);
        // 旧存档迁移：mining 的 fighter/warrior/brute → combat
        if (type === "combat") {
          const mining = arr.find((s) => s.type === "mining");
          if (mining && mining.perk5 === "fighter") {
            newSkill.exp = mining.exp;
            newSkill.level = mining.level;
            newSkill.perk5 = "fighter";
            newSkill.perk10 = mining.perk10;
            mining.perk5 = null;
            mining.perk10 = null;
          }
        }
        arr.push(newSkill);
      }
    }
    skills.value = arr;
    professionOrdersDone.value = Array.isArray(
      (data as any).professionOrdersDone,
    )
      ? (data as any).professionOrdersDone
      : [];
  };

  return {
    skills,
    farmingLevel,
    fishingLevel,
    miningLevel,
    foragingLevel,
    combatLevel,
    professionOrderCards,
    masterOrderCards,
    completeProfessionOrder,
    completeMasterOrder,
    getSkill,
    addExp,
    getExpToNextLevel,
    getStaminaReduction,
    setPerk5,
    setPerk10,
    rollCropQuality,
    rollCropQualityWithBonus,
    rollForageQuality,
    serialize,
    deserialize,
  };
});
