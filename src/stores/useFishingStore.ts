import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type {
  FishDef,
  BaitType,
  TackleType,
  BaitDef,
  TackleDef,
  ToolTier,
  Quality,
  FishingLocation,
  CrabPotState,
  MiniGameParams,
  MiniGameRating,
} from "@/types";
import {
  getAvailableFish,
  getBaitById,
  getTackleById,
  getItemById,
} from "@/data";
import { FISH } from "@/data/fish";
import { useGameStore } from "./useGameStore";
import { usePlayerStore } from "./usePlayerStore";
import { useInventoryStore } from "./useInventoryStore";
import { useSkillStore } from "./useSkillStore";
import { useAchievementStore } from "./useAchievementStore";
import { useQuestStore } from "./useQuestStore";
import { useCookingStore } from "./useCookingStore";
import { useWalletStore } from "./useWalletStore";
import { useSecretNoteStore } from "./useSecretNoteStore";
import { useHiddenNpcStore } from "./useHiddenNpcStore";
import {
  FISHING_JUNK,
  planCrabPotLoot,
  planTreasureChest,
  simulateInventoryBatch,
  weightedPick,
} from "@/domain/fishingDomain";

const STAMINA_COST = 4;
const MAX_CRAB_POTS = 12;
const MAX_CRAB_POTS_PER_LOCATION = 3;
const TEMP_INVENTORY_CAPACITY = 10;

export const useFishingStore = defineStore("fishing", () => {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const inventoryStore = useInventoryStore();
  const skillStore = useSkillStore();

  /** 当前垂钓地点 */
  const fishingLocation = ref<FishingLocation>("creek");

  /** 切换垂钓地点 */
  const setLocation = (loc: FishingLocation) => {
    fishingLocation.value = loc;
  };

  /** 当前可钓的鱼 */
  const availableFish = computed(() =>
    getAvailableFish(
      gameStore.season,
      gameStore.weather,
      fishingLocation.value,
    ),
  );

  /** 当前垂钓会话状态 */
  const currentFish = ref<FishDef | null>(null);

  /** 上次垂钓的宝箱结果 */
  const lastTreasure = ref<{
    items: { itemId: string; name: string; quantity: number }[];
    money: number;
  } | null>(null);

  /** 上次是否完美 */
  const lastPerfect = ref(false);

  /** 鱼饵/浮漂装备 */
  const equippedBait = ref<BaitType | null>(null);
  const equippedTackle = ref<TackleType | null>(null);
  const tackleDurability = ref(0);

  /** 当次垂钓会话的鱼饵/浮漂 */
  const activeBaitDef = ref<BaitDef | null>(null);
  const activeTackleDef = ref<TackleDef | null>(null);

  /** 蟹笼 */
  const crabPots = ref<CrabPotState[]>([]);

  /** 装备鱼饵（仅标记类型，不从纳戒取出） */
  const equipBait = (type: BaitType): { success: boolean; message: string } => {
    const def = getBaitById(type);
    if (!def) return { success: false, message: "无效的鱼饵。" };
    if (inventoryStore.getItemCount(type) <= 0)
      return { success: false, message: "纳戒中没有该鱼饵。" };
    equippedBait.value = type;
    return { success: true, message: `装备了${def.name}。` };
  };

  /** 卸下鱼饵 */
  const unequipBait = (): string => {
    if (!equippedBait.value) return "没有装备鱼饵。";
    const def = getBaitById(equippedBait.value);
    equippedBait.value = null;
    return `卸下了${def?.name ?? "鱼饵"}。`;
  };

  /** 装备浮漂 */
  const equipTackle = (
    type: TackleType,
  ): { success: boolean; message: string } => {
    const def = getTackleById(type);
    if (!def) return { success: false, message: "无效的浮漂。" };
    const rodTier = inventoryStore.getTool("fishingRod")?.tier ?? "basic";
    if (rodTier === "basic")
      return { success: false, message: "需要铁制或更好的鱼竿才能装备浮漂。" };
    if (!inventoryStore.removeItem(type, 1))
      return { success: false, message: "纳戒中没有该浮漂。" };
    if (equippedTackle.value) {
      // 先扣除新浮漂，再检查旧浮漂回收容量；这样满纳戒中被扣除的物品也能腾出位置。
      unequipTackle();
      if (equippedTackle.value) {
        // 回收失败时把新浮漂原样退回，旧装备保持不变。
        inventoryStore.addItem(type, 1);
        return { success: false, message: "未能收回当前浮漂，装备未更换。" };
      }
    }
    equippedTackle.value = type;
    tackleDurability.value = def.maxDurability;
    return {
      success: true,
      message: `装备了${def.name}。(耐久: ${def.maxDurability})`,
    };
  };

  /** 卸下浮漂；有剩余耐久时必须先确保纳戒可接收。 */
  const unequipTackle = (): string => {
    if (!equippedTackle.value) return "没有装备浮漂。";
    const tackle = equippedTackle.value;
    const def = getTackleById(tackle);
    if (
      tackleDurability.value > 0 &&
      !inventoryStore.canAcceptItem(tackle, 1)
    ) {
      return `纳戒容量不足，${def?.name ?? "浮漂"}仍保持装备。`;
    }
    if (tackleDurability.value > 0 && !inventoryStore.addItem(tackle, 1)) {
      return `未能收回${def?.name ?? "浮漂"}，仍保持装备。`;
    }
    equippedTackle.value = null;
    tackleDurability.value = 0;
    return `卸下了${def?.name ?? "浮漂"}。`;
  };

  /** 开始垂钓 */
  const startFishing = (): {
    success: boolean;
    message: string;
    junk?: boolean;
  } => {
    const rodMultiplier = inventoryStore.getToolStaminaMultiplier("fishingRod");
    // 旋转亮片减免体力
    const tackleDef = equippedTackle.value
      ? getTackleById(equippedTackle.value)
      : null;
    const tackleStaminaReduction = tackleDef?.staminaReduction ?? 0;
    const ringFishingReduction =
      inventoryStore.getRingEffectValue("fishing_stamina");
    const ringGlobalReduction =
      inventoryStore.getRingEffectValue("stamina_reduction");
    const staminaCost = Math.max(
      1,
      Math.floor(
        STAMINA_COST *
          rodMultiplier *
          (1 - skillStore.getStaminaReduction("fishing")) *
          (1 - tackleStaminaReduction) *
          (1 - ringFishingReduction) *
          (1 - ringGlobalReduction),
      ),
    );
    if (!playerStore.consumeStamina(staminaCost)) {
      return { success: false, message: "体力不足，无法垂钓。" };
    }

    // 确定鱼池：magic_bait 忽略季节但仍限地点
    const baitDef = equippedBait.value ? getBaitById(equippedBait.value) : null;
    const loc = fishingLocation.value;
    const fishPool = baitDef?.ignoresSeason
      ? FISH.filter(
          (f) =>
            (f.location ?? "creek") === loc &&
            (f.weather.includes("any") ||
              f.weather.includes(gameStore.weather as any)),
        )
      : availableFish.value;

    if (fishPool.length === 0) {
      playerStore.restoreStamina(staminaCost);
      return { success: false, message: "当前季节和天气没有可钓的鱼。" };
    }

    // 先确认至少有一条当前条件下具备正权重的鱼；失败不消耗饵和浮漂。
    if (!pickRandomFish(fishPool, baitDef, () => 0)) {
      playerStore.restoreStamina(staminaCost);
      return {
        success: false,
        message: "当前鱼池没有符合垂钓条件的鱼。",
      };
    }

    // 确认可进行本次垂钓后，才消耗鱼饵与浮漂耐久。
    activeBaitDef.value = baitDef ?? null;
    if (equippedBait.value) {
      inventoryStore.removeItem(equippedBait.value, 1);
      if (inventoryStore.getItemCount(equippedBait.value) <= 0) {
        equippedBait.value = null;
      }
    }

    activeTackleDef.value = tackleDef ?? null;
    if (equippedTackle.value && tackleDef) {
      tackleDurability.value--;
      if (tackleDurability.value <= 0) {
        equippedTackle.value = null;
      }
    }

    // 垃圾判定：基础12%概率钓到垃圾，垂钓等级每级-1%，使用鱼饵减半
    const junkBase = 0.12 - skillStore.fishingLevel * 0.01;
    const junkChance = Math.max(0, baitDef ? junkBase * 0.5 : junkBase);
    if (Math.random() < junkChance) {
      const junkId =
        FISHING_JUNK[Math.floor(Math.random() * FISHING_JUNK.length)]!;
      const junkName = getItemById(junkId)?.name ?? junkId;
      currentFish.value = null;
      if (
        !inventoryStore.canAcceptItem(junkId, 1) ||
        !inventoryStore.addItem(junkId, 1)
      ) {
        return {
          success: false,
          junk: true,
          message: `钓上了${junkName}，但纳戒容量不足，未能收取。(-${staminaCost}体力)`,
        };
      }
      skillStore.addExp("fishing", 3);
      return {
        success: true,
        junk: true,
        message: `钓上了${junkName}……(-${staminaCost}体力)`,
      };
    }

    // 随机顺序保持原语义：先垃圾判定，再按鱼权重选择。
    const fish = pickRandomFish(fishPool, baitDef);
    if (!fish) {
      // 前置正权重检查已通过，正常情况下不会到达；防御性恢复会话状态。
      endFishing();
      return { success: false, message: "当前鱼池没有符合垂钓条件的鱼。" };
    }
    currentFish.value = fish;
    lastTreasure.value = null;
    lastPerfect.value = false;

    let msg = `抛竿入水……感觉有${fish.name}在附近！(-${staminaCost}体力)`;
    if (activeBaitDef.value) msg += ` [${activeBaitDef.value.name}]`;
    if (activeTackleDef.value) msg += ` [${activeTackleDef.value.name}]`;
    return { success: true, message: msg };
  };

  /** 计算小游戏参数（在 startFishing 之后调用） */
  const calculateMiniGameParams = (): MiniGameParams => {
    const fish = currentFish.value!;
    const rodTier = inventoryStore.getTool("fishingRod")?.tier ?? "basic";
    const level = skillStore.fishingLevel;

    // 基础钩子高度（鱼竿等级）
    const rodHookMap: Record<ToolTier, number> = {
      basic: 40,
      iron: 45,
      steel: 50,
      iridium: 60,
    };
    let hookHeight = rodHookMap[rodTier] + level * 2;

    // 基础时限（鱼竿等级）
    const rodTimeMap: Record<ToolTier, number> = {
      basic: 30,
      iron: 33,
      steel: 36,
      iridium: 40,
    };
    const timeLimit = rodTimeMap[rodTier];

    // 鱼速度（难度为默认，鱼种可覆盖）
    const difficultySpeedMap: Record<string, number> = {
      easy: 1.0,
      normal: 2.0,
      hard: 3.0,
      legendary: 4.0,
    };
    const difficultyDirMap: Record<string, number> = {
      easy: 0.02,
      normal: 0.04,
      hard: 0.06,
      legendary: 0.08,
    };
    let fishSpeed =
      fish.miniGameSpeed ?? difficultySpeedMap[fish.difficulty] ?? 2.0;
    let fishChangeDir =
      fish.miniGameDirChange ?? difficultyDirMap[fish.difficulty] ?? 0.04;

    // 物理参数
    let gravity = 1.5;
    let scoreGain = 0.15;
    let scoreLoss = 0.1;

    // 鱼饵效果
    if (activeBaitDef.value?.behaviorModifier) {
      fishSpeed *= 1 - activeBaitDef.value.behaviorModifier.calm * 0.3;
    }
    if (activeBaitDef.value?.struggleBonus) {
      fishSpeed *= 0.9;
    }

    // 浮漂效果
    if (activeTackleDef.value) {
      // 旋转浮漂：重力减免（下落更慢）
      if (activeTackleDef.value.staminaReduction)
        gravity *= 1 - activeTackleDef.value.staminaReduction;
      // 陷阱浮漂：进度流失减半
      if (activeTackleDef.value.extraBreakChance) scoreLoss *= 0.5;
      // 软木浮漂：钩子高度+15
      if (activeTackleDef.value.struggleBonus) hookHeight += 15;
      // 铅坠浮漂：鱼改变方向概率减半
      if (activeTackleDef.value.dangerReduction) fishChangeDir *= 0.5;
    }

    // 钓翁令牌效果：鱼速度 -10%
    const walletStore = useWalletStore();
    const calmBonus = walletStore.getFishingCalmBonus();
    if (calmBonus > 0) {
      fishSpeed *= 1 - calmBonus;
    }

    // 戒指效果：鱼速度降低
    const ringCalmBonus = inventoryStore.getRingEffectValue("fishing_calm");
    if (ringCalmBonus > 0) {
      fishSpeed *= 1 - ringCalmBonus;
    }

    return {
      fishName: fish.name,
      difficulty: fish.difficulty,
      hookHeight,
      fishSpeed,
      fishChangeDir,
      gravity,
      liftSpeed: 3.0,
      scoreGain,
      scoreLoss,
      timeLimit,
    };
  };

  /** 根据难度、垂钓等级和鱼竿等级加权随机选鱼 */
  const pickRandomFish = (
    pool?: FishDef[],
    baitDef: BaitDef | null = activeBaitDef.value,
    random: () => number = Math.random,
  ): FishDef | null => {
    const fishPool = pool ?? availableFish.value;
    const cookingStore = useCookingStore();
    const fishingBuff =
      cookingStore.activeBuff?.type === "fishing" ||
      cookingStore.activeBuff?.type === "all_skills"
        ? cookingStore.activeBuff.value
        : 0;
    const luckBuff =
      cookingStore.activeBuff?.type === "luck"
        ? cookingStore.activeBuff.value / 100
        : 0;
    const effectiveLevel = skillStore.fishingLevel + fishingBuff;
    const rodTier = inventoryStore.getTool("fishingRod")?.tier ?? "basic";
    const hasAngler = skillStore.getSkill("fishing").perk10 === "angler";
    // 定向鱼饵权重倍率
    const hardMult = baitDef?.hardWeightMult ?? 1;
    const legendaryMult = baitDef?.legendaryWeightMult ?? 1;
    // 仙缘：龙瞳（long_ling_3）传说鱼捕获率+20%，鱼引结缘提升稀有鱼概率
    const hiddenNpcStore = useHiddenNpcStore();
    const legendaryBoost =
      1 + hiddenNpcStore.getAbilityValue("long_ling_3") / 100;
    const bondBonus = hiddenNpcStore.getBondBonusByType("fish_attraction");
    const fishAttractionMult = bondBonus?.type === "fish_attraction" ? 1.5 : 1;
    const weights: number[] = fishPool.map((f) => {
      if (f.difficulty === "legendary") {
        const minLevel = hasAngler ? 6 : 8;
        if (rodTier === "basic" || effectiveLevel < minLevel) return 0;
        return (
          (hasAngler ? 1.5 : 0.5) *
          (1 + luckBuff) *
          legendaryMult *
          legendaryBoost
        );
      }
      if (f.difficulty === "hard") {
        if (rodTier === "basic" && effectiveLevel < 4) return 0;
        return (
          (rodTier === "basic" ? 0.5 : 1) *
          (1 + luckBuff) *
          hardMult *
          fishAttractionMult
        );
      }
      if (f.difficulty === "easy") return 3;
      if (f.difficulty === "normal") return 2;
      return 0.5;
    });
    return weightedPick(
      fishPool.map((fish, index) => ({
        value: fish,
        weight: weights[index] ?? 0,
      })),
      random,
    );
  };

  /** 完成垂钓（小游戏结束后调用） */
  const completeFishing = (
    rating: MiniGameRating,
  ): {
    message: string;
    fishName?: string;
    fishId?: string;
    difficulty?: string;
    sellPrice?: number;
    description?: string;
    quality?: Quality;
    quantity?: number;
    success: boolean;
  } | null => {
    if (!currentFish.value) return null;

    // poor = 鱼跑了
    if (rating === "poor") {
      const fish = currentFish.value;
      endFishing();
      return {
        message: `鱼跑掉了……${fish.name}逃脱了！`,
        fishName: fish.name,
        fishId: fish.id,
        difficulty: fish.difficulty,
        sellPrice: fish.sellPrice,
        description: fish.description,
        success: false,
      };
    }

    // 品质计算
    const qualityOrder: Quality[] = ["normal", "fine", "excellent", "supreme"];
    let quality: Quality = skillStore.rollCropQuality();
    // 水手专精：鱼品质至少为优良
    if (
      skillStore.getSkill("fishing").perk10 === "mariner" &&
      quality === "normal"
    ) {
      quality = "fine";
    }
    // 戒指效果：鱼品质提升
    const ringFishQualityBonus =
      inventoryStore.getRingEffectValue("fish_quality_bonus");
    if (ringFishQualityBonus > 0 && Math.random() < ringFishQualityBonus) {
      const idx = qualityOrder.indexOf(quality);
      const newIdx = Math.min(idx + 1, qualityOrder.length - 1);
      quality = qualityOrder[newIdx]!;
    }
    // 品质浮标：品质+1档
    if (activeTackleDef.value?.qualityBoost) {
      const idx = qualityOrder.indexOf(quality);
      const newIdx = Math.min(
        idx + activeTackleDef.value.qualityBoost,
        qualityOrder.length - 1,
      );
      quality = qualityOrder[newIdx]!;
    }
    // 小游戏评级品质加成
    if (rating === "perfect") {
      const idx = qualityOrder.indexOf(quality);
      const newIdx = Math.min(idx + 2, qualityOrder.length - 1);
      quality = qualityOrder[newIdx]!;
    } else if (rating === "excellent") {
      const idx = qualityOrder.indexOf(quality);
      const newIdx = Math.min(idx + 1, qualityOrder.length - 1);
      quality = qualityOrder[newIdx]!;
    }

    // 溪流灵田洞天雨天品质+1档
    if (gameStore.farmMapType === "riverland" && gameStore.isRainy) {
      const idx = qualityOrder.indexOf(quality);
      if (idx < qualityOrder.length - 1) {
        quality = qualityOrder[idx + 1]!;
      }
    }

    // 仙缘能力：龙泽（long_ling_1）瀑布垂钓品质+1
    if (
      fishingLocation.value === "waterfall" &&
      useHiddenNpcStore().isAbilityActive("long_ling_1")
    ) {
      const idx = qualityOrder.indexOf(quality);
      if (idx < qualityOrder.length - 1) {
        quality = qualityOrder[idx + 1]!;
      }
    }

    // 野生鱼饵：概率双倍（诱饵师专精翻倍）
    const luremasterCatchMult =
      skillStore.getSkill("fishing").perk10 === "luremaster" ? 2 : 1;
    const doubleCatchChance =
      (activeBaitDef.value?.doubleCatchChance ?? 0) * luremasterCatchMult;
    const catchQty =
      doubleCatchChance > 0 && Math.random() < doubleCatchChance ? 2 : 1;
    const caughtFish = {
      name: currentFish.value.name,
      id: currentFish.value.id,
      difficulty: currentFish.value.difficulty,
      sellPrice: currentFish.value.sellPrice,
      description: currentFish.value.description,
    };

    if (
      !inventoryStore.canAcceptItem(currentFish.value.id, catchQty, quality) ||
      !inventoryStore.addItem(currentFish.value.id, catchQty, quality)
    ) {
      const message = `钓上了${currentFish.value.name}，但纳戒容量不足，未能收取！`;
      lastPerfect.value = false;
      endFishing();
      return {
        message,
        fishName: caughtFish.name,
        fishId: caughtFish.id,
        difficulty: caughtFish.difficulty,
        sellPrice: caughtFish.sellPrice,
        description: caughtFish.description,
        quality,
        quantity: catchQty,
        success: false,
      };
    }

    // addItem 已负责发现图鉴和记录物品获得；这里只推进鱼获专属进度。
    const achievementStore = useAchievementStore();
    achievementStore.recordFishCaught();
    useQuestStore().onItemObtained(currentFish.value.id, catchQty);

    // 4% 概率获得秘密笔记
    if (Math.random() < 0.04) {
      useSecretNoteStore().tryCollectNote();
    }

    // 经验
    const difficultyExpMult: Record<string, number> = {
      easy: 1,
      normal: 1.5,
      hard: 2,
      legendary: 3,
    };
    const expGain =
      currentFish.value.sellPrice *
      (difficultyExpMult[currentFish.value.difficulty] ?? 1);
    const riverlandBonus = gameStore.farmMapType === "riverland" ? 1.25 : 1.0;
    const perfectMult = rating === "perfect" ? 2 : 1;
    skillStore.addExp(
      "fishing",
      Math.floor(expGain * riverlandBonus * perfectMult),
    );

    const ratingTag = rating === "perfect" ? " [完美!]" : "";
    let message =
      catchQty > 1
        ? `成功钓上了${catchQty}条${currentFish.value.name}！${ratingTag}`
        : `成功钓上了${currentFish.value.name}！${ratingTag}`;

    // 宝箱先纯规划，再整批容量预检；不足时物品和钱都不发。
    const treasureResult = rollTreasureChest();
    const treasure = treasureResult.treasure;
    if (treasure) {
      lastTreasure.value = treasure;
      const treasureNames = treasure.items
        .map((t) => `${t.name}×${t.quantity}`)
        .join("、");
      if (treasure.money > 0) {
        message += ` 宝箱：${treasureNames}${treasureNames ? "、" : ""}${treasure.money}文！`;
      } else {
        message += ` 宝箱：${treasureNames}！`;
      }
    } else if (treasureResult.blocked) {
      lastTreasure.value = null;
      message += " 宝箱中的物品无法全部装入纳戒，宝箱暂未带走，错过了其中的钱物。";
    }

    lastPerfect.value = rating === "perfect";
    endFishing();
    return {
      message,
      fishName: caughtFish.name,
      fishId: caughtFish.id,
      difficulty: caughtFish.difficulty,
      sellPrice: caughtFish.sellPrice,
      description: caughtFish.description,
      quality,
      quantity: catchQty,
      success: true,
    };
  };

  /** 垂钓宝箱：规划与发放分离，容量不足时整箱不发。 */
  const rollTreasureChest = (): {
    treasure: {
      items: { itemId: string; name: string; quantity: number }[];
      money: number;
    } | null;
    blocked: boolean;
  } => {
    const cookingStore = useCookingStore();
    const luckBuff = cookingStore.activeBuff?.type === "luck" ? 0.05 : 0;
    const ringTreasureFind = inventoryStore.getRingEffectValue("treasure_find");
    const ringLuck = inventoryStore.getRingEffectValue("luck");
    const chance =
      0.15 +
      skillStore.fishingLevel * 0.01 +
      luckBuff +
      ringTreasureFind +
      ringLuck * 0.3;
    const planned = planTreasureChest(chance);
    if (!planned) return { treasure: null, blocked: false };

    const capacity = simulateInventoryBatch(
      {
        main: inventoryStore.items,
        temporary: inventoryStore.tempItems,
        mainCapacity: inventoryStore.capacity,
        temporaryCapacity: TEMP_INVENTORY_CAPACITY,
      },
      planned.items,
    );
    if (!capacity.accepted) return { treasure: null, blocked: true };

    const items = planned.items.map((item) => ({
      ...item,
      name: getItemById(item.itemId)?.name ?? item.itemId,
    }));
    for (const item of planned.items) {
      inventoryStore.addItem(item.itemId, item.quantity);
    }
    if (planned.money > 0) playerStore.earnMoney(planned.money);

    return {
      treasure: { items, money: planned.money },
      blocked: false,
    };
  };

  const endFishing = () => {
    currentFish.value = null;
    activeBaitDef.value = null;
    activeTackleDef.value = null;
  };

  // =========== 蟹笼系统 ===========

  /** 放置蟹笼 */
  const placeCrabPot = (
    location: FishingLocation,
  ): { success: boolean; message: string } => {
    if (crabPots.value.length >= MAX_CRAB_POTS) {
      return { success: false, message: `蟹笼已达上限 (${MAX_CRAB_POTS})。` };
    }
    const atLocation = crabPots.value.filter(
      (p) => p.location === location,
    ).length;
    if (atLocation >= MAX_CRAB_POTS_PER_LOCATION) {
      return {
        success: false,
        message: `该地点蟹笼已达上限 (${MAX_CRAB_POTS_PER_LOCATION})。`,
      };
    }
    if (!inventoryStore.removeItem("crab_pot", 1)) {
      return { success: false, message: "纳戒中没有蟹笼。" };
    }
    crabPots.value.push({ location, hasBait: false });
    return { success: true, message: "蟹笼已放置。" };
  };

  /** 回收蟹笼；容量不足时保留原笼。 */
  const removeCrabPot = (
    location: FishingLocation,
  ): { success: boolean; message: string } => {
    const idx = crabPots.value.findIndex((p) => p.location === location);
    if (idx === -1) return { success: false, message: "该地点没有蟹笼。" };
    if (!inventoryStore.canAcceptItem("crab_pot", 1)) {
      return { success: false, message: "纳戒容量不足，蟹笼仍留在原处。" };
    }
    if (!inventoryStore.addItem("crab_pot", 1)) {
      return { success: false, message: "未能收回蟹笼，蟹笼仍留在原处。" };
    }
    crabPots.value.splice(idx, 1);
    return { success: true, message: "蟹笼已回收。" };
  };

  /** 给蟹笼装饵 (指定地点的所有蟹笼) */
  const baitCrabPots = (
    location: FishingLocation,
  ): { success: boolean; message: string } => {
    const pots = crabPots.value.filter(
      (p) => p.location === location && !p.hasBait,
    );
    if (pots.length === 0)
      return { success: false, message: "该地点蟹笼都已有饵料。" };
    let baited = 0;
    for (const pot of pots) {
      if (inventoryStore.removeItem("standard_bait", 1)) {
        pot.hasBait = true;
        baited++;
      } else {
        break;
      }
    }
    if (baited === 0) return { success: false, message: "没有鱼饵了。" };
    return { success: true, message: `装饵${baited}个蟹笼。` };
  };

  /** 全局装饵（雇工自动调用，不限地点） */
  const baitAllCrabPots = (): number => {
    const pots = crabPots.value.filter((p) => !p.hasBait);
    let baited = 0;
    for (const pot of pots) {
      if (inventoryStore.removeItem("standard_bait", 1)) {
        pot.hasBait = true;
        baited++;
      } else {
        break;
      }
    }
    return baited;
  };

  /** 各地点蟹笼统计 */
  const crabPotsByLocation = computed(() => {
    const map: Partial<
      Record<FishingLocation, { total: number; baited: number }>
    > = {};
    for (const pot of crabPots.value) {
      if (!map[pot.location]) map[pot.location] = { total: 0, baited: 0 };
      map[pot.location]!.total++;
      if (pot.hasBait) map[pot.location]!.baited++;
    }
    return map;
  });

  /** 每日收获蟹笼 (由 useEndDay 调用) */
  const collectCrabPots = (): {
    collected: { itemId: string; name: string }[];
    blocked: number;
    message?: string;
  } => {
    const isLuremaster = skillStore.getSkill("fishing").perk10 === "luremaster";
    const isMariner = skillStore.getSkill("fishing").perk10 === "mariner";
    const collected: { itemId: string; name: string }[] = [];
    let blocked = 0;

    for (const pot of crabPots.value) {
      if (!pot.hasBait && !isLuremaster) continue;

      const lootId = planCrabPotLoot(pot.location, isMariner);
      if (!lootId) continue;
      if (
        !inventoryStore.canAcceptItem(lootId, 1) ||
        !inventoryStore.addItem(lootId, 1)
      ) {
        blocked++;
        continue;
      }

      const itemDef = getItemById(lootId);
      collected.push({
        itemId: lootId,
        name: itemDef?.name ?? lootId,
      });
      // addItem 已负责图鉴；仅成功入包后加经验并消耗饵料状态。
      if (itemDef) {
        skillStore.addExp("fishing", Math.floor(itemDef.sellPrice * 0.5));
      }
      // 诱饵师无饵可产出，成功后同样保持 false。
      pot.hasBait = false;
    }

    return {
      collected,
      blocked,
      message:
        blocked > 0
          ? `纳戒容量不足，还有${blocked}只蟹笼未收获。`
          : undefined,
    };
  };

  const serialize = () => {
    return {
      equippedBait: equippedBait.value,
      equippedTackle: equippedTackle.value,
      tackleDurability: tackleDurability.value,
      fishingLocation: fishingLocation.value,
      crabPots: crabPots.value,
    };
  };

  const deserialize = (data: ReturnType<typeof serialize>) => {
    equippedBait.value = data.equippedBait ?? null;
    equippedTackle.value = data.equippedTackle ?? null;
    tackleDurability.value = data.tackleDurability ?? 0;
    fishingLocation.value = data.fishingLocation ?? "creek";
    crabPots.value = (data as any).crabPots ?? [];
  };

  return {
    availableFish,
    fishingLocation,
    currentFish,
    lastTreasure,
    lastPerfect,
    equippedBait,
    equippedTackle,
    tackleDurability,
    crabPots,
    crabPotsByLocation,
    setLocation,
    equipBait,
    unequipBait,
    equipTackle,
    unequipTackle,
    startFishing,
    calculateMiniGameParams,
    completeFishing,
    endFishing,
    placeCrabPot,
    removeCrabPot,
    baitCrabPots,
    baitAllCrabPots,
    collectCrabPots,
    serialize,
    deserialize,
  };
});
