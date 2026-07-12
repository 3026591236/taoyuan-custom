import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useGameStore } from "./useGameStore";
import { usePlayerStore } from "./usePlayerStore";
import { useInventoryStore } from "./useInventoryStore";
import { useSkillStore } from "./useSkillStore";
import { useWalletStore } from "./useWalletStore";
import { getCropsBySeason, getItemById } from "@/data";
import { BAITS, TACKLES, FERTILIZERS } from "@/data/processing";
import {
  isTravelingMerchantDay,
  generateMerchantStock,
  TRAVELING_MERCHANT_POOL,
} from "@/data/travelingMerchant";
import { getMarketMultiplier } from "@/data/market";
import type { MarketCategory } from "@/data/market";
import type { TravelingMerchantStock } from "@/data/travelingMerchant";
import type { Quality } from "@/types";
import { useHiddenNpcStore } from "./useHiddenNpcStore";

export const CULTIVATION_MARKET_ITEMS: ShopItemEntry[] = [
  {
    itemId: "spirit_stone",
    name: "灵石",
    price: 260,
    description: "修炼、炼器、布阵的基础灵材",
  },
  {
    itemId: "spirit_dust",
    name: "灵砂",
    price: 180,
    description: "阵法描纹和符箓调和用的细砂",
  },
  {
    itemId: "array_fragment",
    name: "阵纹残片",
    price: 900,
    description: "破损阵盘残片，可研究聚灵阵",
  },
  {
    itemId: "mystic_iron",
    name: "玄铁",
    price: 8800,
    description: "黑市限量灵矿，用于装备维护和高阶订单",
  },
  {
    itemId: "cloud_silk",
    name: "云纹丝",
    price: 12800,
    description: "维护法衣/云靴的稀有灵丝",
  },
  {
    itemId: "artifact_shard",
    name: "法宝碎片",
    price: 16800,
    description: "灵剑维护与本命法宝蕴养通用材料",
  },
  {
    itemId: "thunder_essence",
    name: "雷精",
    price: 22000,
    description: "护符维护、雷法观想和渡劫准备材料",
  },
  {
    itemId: "cultivation_boost_pill",
    name: "修为丹",
    price: 15000,
    description: "元婴期以下可服用，增长大量修为",
  },
  {
    itemId: "minor_realm_pill",
    name: "境界丹",
    price: 58000,
    description: "元婴期以下可服用，直接提升一个小境界",
  },
  {
    itemId: "ascension_boost_pill",
    name: "直升丹",
    price: 188000,
    description: "元婴期以下可服用，连升三重小境界",
  },
  {
    itemId: "chuanxiong",
    name: "川芎",
    price: 130,
    description: "百草园基础药材，炼精丹常用",
  },
  {
    itemId: "yuzhu",
    name: "玉竹",
    price: 130,
    description: "温润补灵的基础灵药",
  },
  {
    itemId: "baizhi",
    name: "白芷",
    price: 130,
    description: "化神丹与补灵丹辅材",
  },
  {
    itemId: "chishao",
    name: "赤芍",
    price: 210,
    description: "中阶丹方常用药材",
  },
  {
    itemId: "chenxiang",
    name: "沉香",
    price: 210,
    description: "木火灵性温和的炼丹辅材",
  },
  {
    itemId: "suoyang",
    name: "锁阳",
    price: 360,
    description: "炼精与化神丹重要辅药",
  },
  {
    itemId: "shenqu",
    name: "神曲",
    price: 680,
    description: "调和高阶丹性的稀有药材",
  },
  {
    itemId: "mana_recovery_pill",
    name: "回灵丹",
    price: 520,
    description: "回复灵力的小丹，适合修炼前备药",
  },
  {
    itemId: "stamina_pill",
    name: "体力丹",
    price: 80,
    description: "灵石兑换，体力+100，可临时超过上限，额外体力最多+500",
    currency: "spirit_stone",
  },
  {
    itemId: "time_stasis_pill",
    name: "时间禁锢丹",
    price: 600,
    description: "灵石兑换，暂停游戏时间流逝3小时现实时间",
    currency: "spirit_stone",
  },
  {
    itemId: "qi_gathering_pill",
    name: "聚气丹",
    price: 980,
    description: "辅助聚气修行，初期修士常备",
  },
  {
    itemId: "foundation_pill",
    name: "筑基丹",
    price: 3600,
    description: "辅助突破的珍贵丹药",
  },
  {
    itemId: "storage_talisman",
    name: "纳物符",
    price: 12,
    description: "灵石兑换，使用后背包永久+1格，可突破普通上限",
    currency: "spirit_stone",
  },
  {
    itemId: "cosmos_bag",
    name: "乾坤袋",
    price: 45,
    description: "灵石兑换，使用后背包永久+4格，可突破普通上限",
    currency: "spirit_stone",
  },
  {
    itemId: "wood_scripture",
    name: "青木长生诀",
    price: 30,
    description: "灵石兑换，学习后解锁功法，提升修炼与气血",
    currency: "spirit_stone",
  },
  {
    itemId: "thunder_scripture",
    name: "九霄雷诀",
    price: 80,
    description: "灵石兑换，雷法功法，提升战力与渡劫成功率",
    currency: "spirit_stone",
  },
  {
    itemId: "void_scripture",
    name: "太虚归元功",
    price: 150,
    description: "灵石兑换，高阶功法，提升灵力、元神与突破稳定性",
    currency: "spirit_stone",
  },
];

/** 商铺商品项 */
export interface ShopItemEntry {
  itemId: string;
  name: string;
  price: number;
  description: string;
  currency?: "money" | "spirit_stone";
}

export const useShopStore = defineStore("shop", () => {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const inventoryStore = useInventoryStore();
  const skillStore = useSkillStore();

  // === 多商铺导航 ===

  /** 当前选中的商铺（null=商圈总览） */
  const currentShopId = ref<string | null>(null);
  type PlayerAuctionId =
    "spirit_bone_lot" | "cloud_silk_lot" | "artifact_core_lot";
  const marketAuctions = ref<Record<PlayerAuctionId, number>>({
    spirit_bone_lot: 0,
    cloud_silk_lot: 0,
    artifact_core_lot: 0,
  });
  const marketAuctionClaimed = ref<string[]>([]);

  // === 折扣系统 ===

  /** 计算折扣后的价格 */
  const applyDiscount = (price: number): number => {
    const walletStore = useWalletStore();
    const discount = walletStore.getShopDiscount();
    const ringDiscount = inventoryStore.getRingEffectValue("shop_discount");
    // 仙缘能力：狐眼（hu_xian_1）商店价格降低
    const spiritDiscount =
      useHiddenNpcStore().getAbilityValue("hu_xian_1") / 100;
    return Math.floor(
      price * (1 - discount) * (1 - ringDiscount) * (1 - spiritDiscount),
    );
  };

  // === 万物铺 (陈伯) ===

  /** 当前季节可购买的种子 */
  const availableSeeds = computed(() => {
    return getCropsBySeason(gameStore.season)
      .filter((crop) => crop.seedPrice > 0)
      .map((crop) => ({
        seedId: crop.seedId,
        cropName: crop.name,
        price: crop.seedPrice,
        growthDays: crop.growthDays,
        sellPrice: crop.sellPrice,
        regrowth: crop.regrowth ?? false,
        regrowthDays: crop.regrowthDays,
        season: crop.season,
      }));
  });

  /** 购买种子 */
  const buySeed = (seedId: string, quantity: number = 1): boolean => {
    const seed = availableSeeds.value.find((s) => s.seedId === seedId);
    if (!seed) return false;
    if (
      inventoryStore.isAllFull &&
      !inventoryStore.items.some(
        (s) => s.itemId === seedId && s.quantity + quantity <= 999,
      )
    )
      return false;
    const totalCost = applyDiscount(seed.price) * quantity;
    if (!playerStore.spendMoney(totalCost)) return false;
    if (!inventoryStore.addItem(seedId, quantity)) {
      playerStore.earnMoney(totalCost);
      return false;
    }
    return true;
  };

  // === 铁匠铺 (孙铁匠) ===

  const blacksmithItems = computed<ShopItemEntry[]>(() => [
    {
      itemId: "copper_ore",
      name: "铜矿",
      price: 100,
      description: "矿洞中常见的铜矿",
    },
    {
      itemId: "iron_ore",
      name: "铁矿",
      price: 200,
      description: "中层矿洞出产的铁矿",
    },
    {
      itemId: "gold_ore",
      name: "金矿",
      price: 400,
      description: "深层矿洞出产的金矿",
    },
    {
      itemId: "copper_bar",
      name: "铜锭",
      price: 300,
      description: "冶炼好的铜锭",
    },
    {
      itemId: "iron_bar",
      name: "铁锭",
      price: 600,
      description: "冶炼好的铁锭",
    },
    {
      itemId: "gold_bar",
      name: "金锭",
      price: 1200,
      description: "冶炼好的金锭",
    },
    { itemId: "charcoal", name: "木炭", price: 100, description: "烧制的木炭" },
  ]);

  // === 药铺 (林老) ===

  /** 可购买的肥料（shopPrice != null） */
  const shopFertilizers = computed(() =>
    FERTILIZERS.filter((f) => f.shopPrice !== null).map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      price: f.shopPrice!,
    })),
  );

  const cultivationMarketItems = computed<ShopItemEntry[]>(
    () => CULTIVATION_MARKET_ITEMS,
  );

  const apothecaryItems = computed<ShopItemEntry[]>(() => [
    { itemId: "herb", name: "草药", price: 50, description: "山间野生的草药" },
    {
      itemId: "ginseng",
      name: "人参",
      price: 600,
      description: "极其珍贵的野生人参",
    },
    {
      itemId: "animal_medicine",
      name: "兽药",
      price: 150,
      description: "治疗生病的牲畜",
    },
    {
      itemId: "premium_feed",
      name: "精饲料",
      price: 200,
      description: "提升动物心情和好感",
    },
    {
      itemId: "nourishing_feed",
      name: "滋补饲料",
      price: 250,
      description: "加速动物产出",
    },
    {
      itemId: "vitality_feed",
      name: "活力饲料",
      price: 300,
      description: "喂食必定治愈疾病",
    },
    {
      itemId: "fish_feed",
      name: "鱼饲料",
      price: 30,
      description: "鱼塘专用饲料",
    },
    {
      itemId: "water_purifier",
      name: "水质改良剂",
      price: 100,
      description: "改善鱼塘水质",
    },
  ]);

  // === 渔具铺 (秋月) ===

  /** 可购买的鱼饵（shopPrice != null） */
  const shopBaits = computed(() =>
    BAITS.filter((b) => b.shopPrice !== null).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      price: b.shopPrice!,
    })),
  );

  /** 可购买的浮漂（shopPrice != null） */
  const shopTackles = computed(() =>
    TACKLES.filter((t) => t.shopPrice !== null).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.shopPrice!,
    })),
  );

  /** 渔具铺其他商品 */
  const fishingShopItems = computed<ShopItemEntry[]>(() => [
    {
      itemId: "crab_pot",
      name: "蟹笼",
      price: 1500,
      description: "放置在钓鱼地点，每日自动捕获水产（需鱼饵）",
    },
  ]);

  // === 绸缎庄 (素素) ===

  const textileItems = computed<ShopItemEntry[]>(() => [
    {
      itemId: "cloth",
      name: "布匹",
      price: 1200,
      description: "用羊毛纺织的布匹",
    },
    {
      itemId: "silk_cloth",
      name: "丝绸",
      price: 500,
      description: "华美的丝绸",
    },
    {
      itemId: "alpaca_cloth",
      name: "羊驼绒",
      price: 900,
      description: "极其柔软的羊驼绒布",
    },
    {
      itemId: "felt",
      name: "毛毡",
      price: 600,
      description: "用兔毛压制的毛毡",
    },
    {
      itemId: "silk_ribbon",
      name: "丝帕",
      price: 500,
      description: "精心绣制的丝帕",
    },
    {
      itemId: "jade_ring",
      name: "翡翠戒指",
      price: 1500,
      description: "可以用来求婚",
    },
    {
      itemId: "zhiji_jade",
      name: "知己玉佩",
      price: 1500,
      description: "赠予同性挚友可结为知己",
    },
    {
      itemId: "pine_incense",
      name: "松香",
      price: 250,
      description: "清新的松香",
    },
    {
      itemId: "camphor_incense",
      name: "樟脑香",
      price: 400,
      description: "提神醒脑",
    },
    {
      itemId: "osmanthus_incense",
      name: "桂花香",
      price: 800,
      description: "馥郁的桂花香",
    },
  ]);

  // === 通用购买/出售 ===

  /** 购买通用物品 */
  const buyItem = (
    itemId: string,
    price: number,
    quantity: number = 1,
    currency: "money" | "spirit_stone" = "money",
  ): boolean => {
    if (
      inventoryStore.isAllFull &&
      !inventoryStore.items.some(
        (s) => s.itemId === itemId && s.quantity + quantity <= 999,
      )
    )
      return false;
    const totalCost =
      (currency === "spirit_stone" ? price : applyDiscount(price)) * quantity;
    if (currency === "spirit_stone") {
      if (inventoryStore.getItemCount("spirit_stone") < totalCost) return false;
      if (!inventoryStore.removeItem("spirit_stone", totalCost)) return false;
    } else if (!playerStore.spendMoney(totalCost)) return false;
    if (!inventoryStore.addItem(itemId, quantity)) {
      if (currency === "spirit_stone")
        inventoryStore.addItem("spirit_stone", totalCost);
      else playerStore.earnMoney(totalCost);
      return false;
    }
    return true;
  };

  /** 计算不含行情系数的基础售价 */
  const _basePrice = (
    itemId: string,
    quantity: number,
    quality: Quality,
  ): number => {
    const itemDef = getItemById(itemId);
    if (!itemDef) return 0;
    const qualityMultiplier: Record<string, number> = {
      normal: 1.0,
      fine: 1.25,
      excellent: 1.5,
      supreme: 2.0,
      rare: 1.25,
      magic: 1.5,
      legendary: 2.0,
    };
    let bonus = 1.0;
    if (
      itemDef.category === "processed" &&
      skillStore.getSkill("farming").perk10 === "artisan"
    )
      bonus *= 1.25;
    if (
      itemDef.category === "crop" &&
      skillStore.getSkill("farming").perk5 === "harvester"
    )
      bonus *= 1.1;
    if (
      itemDef.category === "animal_product" &&
      skillStore.getSkill("farming").perk5 === "rancher"
    )
      bonus *= 1.2;
    if (
      itemDef.category === "fish" &&
      skillStore.getSkill("fishing").perk5 === "fisher"
    )
      bonus *= 1.25;
    if (
      itemDef.category === "fish" &&
      skillStore.getSkill("fishing").perk10 === "aquaculture"
    )
      bonus *= 1.5;
    if (itemDef.category === "fish" && gameStore.farmMapType === "riverland")
      bonus *= 1.1;
    if (
      itemDef.category === "ore" &&
      skillStore.getSkill("mining").perk10 === "blacksmith"
    )
      bonus *= 1.5;
    const ringSelBonus = inventoryStore.getRingEffectValue("sell_price_bonus");
    // 仙缘结缘：狐仙出售加成
    const hiddenNpcStore = useHiddenNpcStore();
    const sellBonusData = hiddenNpcStore.getBondBonusByType("sell_bonus");
    const spiritSellBonus =
      sellBonusData?.type === "sell_bonus" ? sellBonusData.percent / 100 : 0;
    const multiplier = qualityMultiplier[String(quality)] ?? 1.0;
    return Math.floor(
      itemDef.sellPrice *
        quantity *
        multiplier *
        bonus *
        (1 + ringSelBonus) *
        (1 + spiritSellBonus),
    );
  };

  /** 计算物品售价（不执行出售，用于估价） */
  const calculateSellPrice = (
    itemId: string,
    quantity: number,
    quality: Quality,
  ): number => {
    const itemDef = getItemById(itemId);
    if (!itemDef) return 0;
    const recentVolume =
      getRecentShipping()[itemDef.category as MarketCategory] ?? 0;
    const marketMultiplier = getMarketMultiplier(
      itemDef.category,
      gameStore.year,
      gameStore.seasonIndex,
      gameStore.day,
      recentVolume,
    );
    return Math.floor(_basePrice(itemId, quantity, quality) * marketMultiplier);
  };

  /** 计算不含行情的基础售价（用于显示原价） */
  const calculateBaseSellPrice = (
    itemId: string,
    quantity: number,
    quality: Quality,
  ): number => {
    return _basePrice(itemId, quantity, quality);
  };

  /** 出售物品，返回实际售价（0表示失败） */
  const sellItem = (
    itemId: string,
    quantity: number = 1,
    quality: Quality = "normal",
  ): number => {
    const totalPrice = calculateSellPrice(itemId, quantity, quality);
    // 先算价再扣物品：避免售价异常/未定义时先扣物品导致玩家感知“吞钱”。
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) return 0;
    if (!inventoryStore.removeItem(itemId, quantity, quality)) return 0;
    playerStore.earnMoney(totalPrice);
    return totalPrice;
  };

  // === 旅行商人 ===

  const travelingStock = ref<TravelingMerchantStock[]>([]);
  const travelingStockKey = ref("");

  const isMerchantHere = computed(() => isTravelingMerchantDay(gameStore.day));

  const refreshMerchantStock = () => {
    const key = `${gameStore.year}_${gameStore.seasonIndex}_${gameStore.day}`;
    if (travelingStockKey.value === key) return;
    travelingStock.value = generateMerchantStock(
      gameStore.year,
      gameStore.seasonIndex,
      gameStore.day,
      gameStore.season,
    );
    // 仙缘能力：狐运（hu_xian_3）旅行商人多1件稀有品
    if (useHiddenNpcStore().isAbilityActive("hu_xian_3")) {
      const existingIds = new Set(travelingStock.value.map((s) => s.itemId));
      const available = TRAVELING_MERCHANT_POOL.filter(
        (p) => !existingIds.has(p.itemId),
      );
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)]!;
        const def = getItemById(pick.itemId);
        let price = pick.basePrice;
        if (def && def.sellPrice > 0)
          price = Math.max(price, def.sellPrice * 2);
        travelingStock.value.push({
          itemId: pick.itemId,
          name: pick.name,
          price,
          quantity: 1,
        });
      }
    }
    travelingStockKey.value = key;
  };

  const buyFromTraveler = (itemId: string): boolean => {
    const item = travelingStock.value.find((s) => s.itemId === itemId);
    if (!item || item.quantity <= 0) return false;
    if (
      inventoryStore.isAllFull &&
      !inventoryStore.items.some((s) => s.itemId === itemId && s.quantity < 999)
    )
      return false;
    const finalPrice = applyDiscount(item.price);
    if (!playerStore.spendMoney(finalPrice)) return false;
    if (!inventoryStore.addItem(itemId)) {
      playerStore.earnMoney(finalPrice);
      return false;
    }
    item.quantity--;
    return true;
  };

  // === 出货箱 ===

  /** 出货箱中的物品 */
  const shippingBox = ref<
    { itemId: string; quantity: number; quality: Quality }[]
  >([]);

  /** 添加物品到出货箱 */
  const addToShippingBox = (
    itemId: string,
    quantity: number,
    quality: Quality,
  ): boolean => {
    if (!inventoryStore.removeItem(itemId, quantity, quality)) return false;
    const existing = shippingBox.value.find(
      (s) => s.itemId === itemId && s.quality === quality,
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      shippingBox.value.push({ itemId, quantity, quality });
    }
    return true;
  };

  /** 从出货箱取回物品 */
  const removeFromShippingBox = (
    itemId: string,
    quantity: number,
    quality: Quality,
  ): boolean => {
    const idx = shippingBox.value.findIndex(
      (s) => s.itemId === itemId && s.quality === quality,
    );
    if (idx === -1) return false;
    const entry = shippingBox.value[idx]!;
    if (entry.quantity < quantity) return false;
    // 先计算背包可用空间，避免 addItem 部分添加的副作用
    const MAX_STACK = 999;
    let space = 0;
    for (const s of inventoryStore.items) {
      if (
        s.itemId === itemId &&
        s.quality === quality &&
        s.quantity < MAX_STACK
      ) {
        space += MAX_STACK - s.quantity;
      }
    }
    space +=
      (inventoryStore.capacity - inventoryStore.items.length) * MAX_STACK;
    const toTransfer = Math.min(quantity, space);
    if (toTransfer <= 0) return false;
    // 先从出货箱移除，再添加到背包
    entry.quantity -= toTransfer;
    if (entry.quantity <= 0) {
      shippingBox.value.splice(idx, 1);
    }
    inventoryStore.addItem(itemId, toTransfer, quality);
    return true;
  };

  /** 处理出货箱结算（日结时调用），返回总收入 */
  const processShippingBox = (): number => {
    let total = 0;
    const dayKey = `${gameStore.year}-${gameStore.seasonIndex}-${gameStore.day}`;
    const dayRecord: Record<string, number> = {
      ...(shippingHistory.value[dayKey] ?? {}),
    };
    for (const entry of shippingBox.value) {
      total += calculateSellPrice(entry.itemId, entry.quantity, entry.quality);
      // 记录出货收集
      if (!shippedItems.value.includes(entry.itemId)) {
        shippedItems.value.push(entry.itemId);
      }
      // 记录品类出货量（供需系数用）
      const def = getItemById(entry.itemId);
      if (def) {
        dayRecord[def.category] =
          (dayRecord[def.category] ?? 0) + entry.quantity;
      }
    }
    shippingHistory.value[dayKey] = dayRecord;
    _pruneShippingHistory();
    shippingBox.value = [];
    return total;
  };

  // === 出货收集 ===

  /** 已出货过的物品 ID 集合 */
  const shippedItems = ref<string[]>([]);

  // === 出货历史（供需系数用） ===

  /** 近期出货记录：dayKey → { category → quantity } */
  const shippingHistory = ref<Record<string, Record<string, number>>>({});

  /** 将日期转为绝对天数（用于比较距离） */
  const _toAbsoluteDay = (
    year: number,
    seasonIndex: number,
    day: number,
  ): number => {
    return (year - 1) * 112 + seasonIndex * 28 + day;
  };

  /** 清理超过7天的出货记录 */
  const _pruneShippingHistory = () => {
    const now = _toAbsoluteDay(
      gameStore.year,
      gameStore.seasonIndex,
      gameStore.day,
    );
    const keys = Object.keys(shippingHistory.value);
    for (const key of keys) {
      const parts = key.split("-").map(Number);
      const abs = _toAbsoluteDay(parts[0]!, parts[1]!, parts[2]!);
      if (now - abs > 7) {
        delete shippingHistory.value[key];
      }
    }
  };

  /** 获取近7天各品类总出货量 */
  const marketSignalCards = computed(() => {
    const recent = getRecentShipping();
    const cats: MarketCategory[] = [
      "crop",
      "fish",
      "animal_product",
      "processed",
      "fruit",
      "ore",
      "gem",
    ];
    return cats.map((cat) => ({
      category: cat,
      volume: recent[cat] ?? 0,
      multiplier: getMarketMultiplier(
        cat,
        gameStore.year,
        gameStore.seasonIndex,
        gameStore.day,
        recent[cat] ?? 0,
      ),
    }));
  });

  const PLAYER_MARKET_AUCTIONS: {
    id: PlayerAuctionId;
    name: string;
    desc: string;
    itemId: string;
    itemName: string;
    baseBid: number;
    step: number;
    maxBid: number;
    reward: { itemId: string; name: string; quantity: number }[];
  }[] = [
    {
      id: "spirit_bone_lot",
      name: "玩家拍卖·灵骨整箱",
      desc: "镇魔与公会玩家寄售的灵骨，适合宗门工程与后期维护。",
      itemId: "spirit_bone",
      itemName: "灵骨",
      baseBid: 6000,
      step: 2200,
      maxBid: 5,
      reward: [{ itemId: "spirit_bone", name: "灵骨", quantity: 4 }],
    },
    {
      id: "cloud_silk_lot",
      name: "玩家拍卖·云纹丝卷",
      desc: "商路玩家压箱的云纹丝，常用于护具、商路和宗门补给。",
      itemId: "cloud_silk",
      itemName: "云纹丝",
      baseBid: 9000,
      step: 3200,
      maxBid: 5,
      reward: [{ itemId: "cloud_silk", name: "云纹丝", quantity: 3 }],
    },
    {
      id: "artifact_core_lot",
      name: "玩家拍卖·残器核心",
      desc: "高阶炼器玩家拆解出的法宝碎片与雷精组合包。",
      itemId: "artifact_shard",
      itemName: "法宝碎片",
      baseBid: 14000,
      step: 5200,
      maxBid: 4,
      reward: [
        { itemId: "artifact_shard", name: "法宝碎片", quantity: 3 },
        { itemId: "thunder_essence", name: "雷精", quantity: 1 },
      ],
    },
  ];

  const marketAuctionCards = computed(() =>
    PLAYER_MARKET_AUCTIONS.map((a) => {
      const bids = marketAuctions.value[a.id] ?? 0;
      const key = `${gameStore.year}-${gameStore.season}-${gameStore.day}:${a.id}`;
      return {
        ...a,
        bids,
        price: a.baseBid + bids * a.step,
        capped: bids >= a.maxBid,
        claimed: marketAuctionClaimed.value.includes(key),
      };
    }),
  );

  const bidMarketAuction = (
    id: PlayerAuctionId,
  ): { success: boolean; message: string } => {
    const auction = marketAuctionCards.value.find((a) => a.id === id);
    if (!auction) return { success: false, message: "拍卖不存在。" };
    if (auction.claimed)
      return { success: false, message: "今天已经拿下这组拍品。" };
    if (auction.capped)
      return { success: false, message: "本轮竞价已到最高价，等待明日刷新。" };
    if (!playerStore.spendMoney(auction.price))
      return { success: false, message: `铜钱不足，需要${auction.price}文。` };
    auction.reward.forEach((item) =>
      inventoryStore.addItem(item.itemId, item.quantity),
    );
    marketAuctions.value[id] = (marketAuctions.value[id] ?? 0) + 1;
    marketAuctionClaimed.value.push(
      `${gameStore.year}-${gameStore.season}-${gameStore.day}:${id}`,
    );
    return {
      success: true,
      message: `拍下「${auction.name}」：${auction.reward.map((i) => `${i.name}×${i.quantity}`).join("、")}。`,
    };
  };

  const getRecentShipping = (): Partial<Record<MarketCategory, number>> => {
    _pruneShippingHistory();
    const result: Partial<Record<MarketCategory, number>> = {};
    for (const record of Object.values(shippingHistory.value)) {
      for (const [cat, qty] of Object.entries(record)) {
        result[cat as MarketCategory] =
          (result[cat as MarketCategory] ?? 0) + qty;
      }
    }
    return result;
  };

  // === 序列化 ===

  const serialize = () => ({
    travelingStockKey: travelingStockKey.value,
    travelingStock: travelingStock.value,
    shippingBox: shippingBox.value,
    shippedItems: shippedItems.value,
    shippingHistory: shippingHistory.value,
    marketAuctions: marketAuctions.value,
    marketAuctionClaimed: marketAuctionClaimed.value,
  });

  const deserialize = (data: any) => {
    travelingStockKey.value = data?.travelingStockKey ?? "";
    travelingStock.value = data?.travelingStock ?? [];
    shippingBox.value = data?.shippingBox ?? [];
    shippedItems.value = data?.shippedItems ?? [];
    shippingHistory.value = data?.shippingHistory ?? {};
    marketAuctions.value = {
      spirit_bone_lot: 0,
      cloud_silk_lot: 0,
      artifact_core_lot: 0,
      ...(data?.marketAuctions ?? {}),
    };
    marketAuctionClaimed.value = Array.isArray(data?.marketAuctionClaimed)
      ? data.marketAuctionClaimed
      : [];
    currentShopId.value = null;
  };

  return {
    // 导航
    currentShopId,
    // 折扣
    applyDiscount,
    // 万物铺
    availableSeeds,
    buySeed,
    // 铁匠铺
    blacksmithItems,
    // 渔具铺
    shopBaits,
    shopTackles,
    fishingShopItems,
    // 药铺
    shopFertilizers,
    cultivationMarketItems,
    apothecaryItems,
    // 绸缎庄
    textileItems,
    // 通用
    buyItem,
    sellItem,
    calculateSellPrice,
    calculateBaseSellPrice,
    // 旅行商人
    travelingStock,
    isMerchantHere,
    refreshMerchantStock,
    buyFromTraveler,
    // 出货箱
    shippingBox,
    addToShippingBox,
    removeFromShippingBox,
    processShippingBox,
    // 出货收集
    shippedItems,
    // 行情供需
    getRecentShipping,
    marketSignalCards,
    marketAuctionCards,
    bidMarketAuction,
    // 序列化
    serialize,
    deserialize,
  };
});
