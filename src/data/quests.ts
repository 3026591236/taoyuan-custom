import type { QuestTemplateDef, QuestInstance, QuestType } from '@/types/quest'
import type { Season } from '@/types/game'
import { getNpcById } from './npcs'

export const QUEST_TEMPLATES: QuestTemplateDef[] = [
  {
    type: 'delivery',
    targets: [
      // 常见作物 — 混合季节
      { itemId: 'cabbage', name: '青菜', minQty: 2, maxQty: 5, seasons: ['spring'], unitPrice: 35 },
      { itemId: 'radish', name: '萝卜', minQty: 2, maxQty: 4, seasons: ['spring'], unitPrice: 55 },
      { itemId: 'potato', name: '土豆', minQty: 2, maxQty: 4, seasons: ['spring'], unitPrice: 50 },
      { itemId: 'rice', name: '稻米', minQty: 2, maxQty: 5, seasons: ['summer'], unitPrice: 40 },
      { itemId: 'watermelon', name: '西瓜', minQty: 1, maxQty: 3, seasons: ['summer'], unitPrice: 80 },
      { itemId: 'chili', name: '辣椒', minQty: 2, maxQty: 4, seasons: ['summer'], unitPrice: 45 },
      { itemId: 'pumpkin', name: '南瓜', minQty: 1, maxQty: 3, seasons: ['autumn'], unitPrice: 100 },
      { itemId: 'sweet_potato', name: '红薯', minQty: 2, maxQty: 4, seasons: ['autumn'], unitPrice: 60 },
      { itemId: 'winter_wheat', name: '冬小麦', minQty: 2, maxQty: 5, seasons: ['winter'], unitPrice: 45 },
      { itemId: 'garlic', name: '大蒜', minQty: 2, maxQty: 4, seasons: ['winter'], unitPrice: 50 }
    ],
    npcPool: ['chen_bo', 'liu_niang', 'lin_lao', 'xiao_man'],
    rewardMultiplier: 3,
    friendshipReward: 5
  },
  {
    type: 'fishing',
    targets: [
      { itemId: 'crucian', name: '鲫鱼', minQty: 1, maxQty: 3, seasons: [], unitPrice: 15 },
      { itemId: 'carp', name: '鲤鱼', minQty: 1, maxQty: 2, seasons: ['spring', 'summer'], unitPrice: 25 },
      { itemId: 'grass_carp', name: '草鱼', minQty: 1, maxQty: 2, seasons: ['summer', 'autumn'], unitPrice: 30 },
      { itemId: 'catfish', name: '鲶鱼', minQty: 1, maxQty: 2, seasons: ['summer'], unitPrice: 40 },
      { itemId: 'bass', name: '鲈鱼', minQty: 1, maxQty: 2, seasons: ['autumn'], unitPrice: 35 },
      { itemId: 'loach', name: '泥鳅', minQty: 1, maxQty: 3, seasons: ['summer', 'autumn'], unitPrice: 20 },
      { itemId: 'creek_shrimp', name: '溪虾', minQty: 2, maxQty: 4, seasons: ['spring', 'summer', 'autumn'], unitPrice: 30 },
      { itemId: 'silver_carp', name: '白鲢', minQty: 1, maxQty: 2, seasons: ['summer'], unitPrice: 25 }
    ],
    npcPool: ['qiu_yue', 'chen_bo', 'lin_lao'],
    rewardMultiplier: 3,
    friendshipReward: 3
  },
  {
    type: 'mining',
    targets: [
      { itemId: 'copper_ore', name: '铜矿', minQty: 3, maxQty: 8, seasons: [], unitPrice: 10 },
      { itemId: 'iron_ore', name: '铁矿', minQty: 3, maxQty: 6, seasons: [], unitPrice: 20 },
      { itemId: 'gold_ore', name: '金矿', minQty: 2, maxQty: 4, seasons: [], unitPrice: 40 },
      { itemId: 'quartz', name: '石英', minQty: 1, maxQty: 3, seasons: [], unitPrice: 30 },
      { itemId: 'jade', name: '翡翠', minQty: 1, maxQty: 2, seasons: [], unitPrice: 80 }
    ],
    npcPool: ['a_shi', 'xiao_man', 'chen_bo'],
    rewardMultiplier: 2,
    friendshipReward: 3
  },
  {
    type: 'gathering',
    targets: [
      { itemId: 'wood', name: '木材', minQty: 5, maxQty: 10, seasons: [], unitPrice: 5 },
      { itemId: 'herb', name: '草药', minQty: 2, maxQty: 5, seasons: ['spring', 'summer', 'autumn'], unitPrice: 15 },
      { itemId: 'firewood', name: '柴火', minQty: 5, maxQty: 10, seasons: [], unitPrice: 3 },
      { itemId: 'bamboo', name: '竹子', minQty: 3, maxQty: 6, seasons: ['spring', 'summer'], unitPrice: 10 },
      { itemId: 'pine_cone', name: '松果', minQty: 2, maxQty: 4, seasons: ['autumn', 'winter'], unitPrice: 10 },
      { itemId: 'wild_mushroom', name: '野蘑菇', minQty: 2, maxQty: 4, seasons: ['autumn'], unitPrice: 20 },
      { itemId: 'wild_berry', name: '野果', minQty: 3, maxQty: 5, seasons: ['summer'], unitPrice: 10 },
      { itemId: 'ginseng', name: '人参', minQty: 1, maxQty: 2, seasons: ['autumn', 'winter'], unitPrice: 50 }
    ],
    npcPool: ['lin_lao', 'liu_niang', 'xiao_man'],
    rewardMultiplier: 3,
    friendshipReward: 5
  }
]

// 委托类型描述映射（预留）
export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  delivery: '送',
  fishing: '钓',
  mining: '采',
  gathering: '收集',
  special_order: '特殊'
}

const QUEST_TYPE_VERBS: Record<QuestType, string> = {
  delivery: '送给',
  fishing: '钓到',
  mining: '采集',
  gathering: '收集',
  special_order: '收集'
}

/** 特殊订单模板 */
interface SpecialOrderTemplate {
  name: string
  targetItemId: string
  targetItemName: string
  quantity: number
  /** 多材料目标（可选）；存在时会覆盖单目标展示与提交逻辑 */
  targets?: { itemId: string; name: string; quantity: number }[]
  days: number
  moneyReward: number
  itemReward: { itemId: string; quantity: number }[]
  seasons: Season[]
  npcId: string
  /** 难度梯度: 1=第7天(简单), 2=第14天(普通), 3=第21天(困难), 4=第28天(极难) */
  tier: number
  /** 订单分类标签 */
  orderTag?: string
  /** 自定义描述 */
  description?: string
}

/** 按梯度分层的特殊订单模板 */
const SPECIAL_ORDER_TEMPLATES: SpecialOrderTemplate[] = [
  // === 第1梯度 (第7天): 简单, 7天时限, 数量少, 奖励适中 ===
  {
    name: '铜矿采购',
    targetItemId: 'copper_ore',
    targetItemName: '铜矿',
    quantity: 15,
    days: 7,
    moneyReward: 600,
    itemReward: [{ itemId: 'iron_ore', quantity: 3 }],
    seasons: [],
    npcId: 'a_shi',
    tier: 1
  },
  {
    name: '鲜鱼征集',
    targetItemId: 'crucian',
    targetItemName: '鲫鱼',
    quantity: 8,
    days: 7,
    moneyReward: 500,
    itemReward: [{ itemId: 'standard_bait', quantity: 10 }],
    seasons: [],
    npcId: 'qiu_yue',
    tier: 1
  },
  {
    name: '蔬菜采购',
    targetItemId: 'cabbage',
    targetItemName: '青菜',
    quantity: 10,
    days: 7,
    moneyReward: 500,
    itemReward: [{ itemId: 'basic_fertilizer', quantity: 5 }],
    seasons: ['spring'],
    npcId: 'liu_niang',
    tier: 1
  },
  {
    name: '木材备料',
    targetItemId: 'wood',
    targetItemName: '木材',
    quantity: 30,
    days: 7,
    moneyReward: 400,
    itemReward: [{ itemId: 'charcoal', quantity: 5 }],
    seasons: [],
    npcId: 'chen_bo',
    tier: 1
  },
  // === 第2梯度 (第14天): 普通, 7天时限, 数量中等, 奖励较好 ===
  {
    name: '铁矿备料',
    targetItemId: 'iron_ore',
    targetItemName: '铁矿',
    quantity: 15,
    days: 7,
    moneyReward: 1200,
    itemReward: [{ itemId: 'charcoal', quantity: 10 }],
    seasons: [],
    npcId: 'a_shi',
    tier: 2
  },
  {
    name: '珍鱼征集令',
    targetItemId: 'catfish',
    targetItemName: '鲶鱼',
    quantity: 5,
    days: 7,
    moneyReward: 1000,
    itemReward: [{ itemId: 'standard_bait', quantity: 20 }],
    seasons: ['summer'],
    npcId: 'qiu_yue',
    tier: 2
  },
  {
    name: '冬储备战',
    targetItemId: 'winter_wheat',
    targetItemName: '冬小麦',
    quantity: 15,
    days: 7,
    moneyReward: 1200,
    itemReward: [{ itemId: 'seed_garlic', quantity: 5 }],
    seasons: ['winter'],
    npcId: 'chen_bo',
    tier: 2
  },
  {
    name: '药材收集',
    targetItemId: 'herb',
    targetItemName: '草药',
    quantity: 15,
    days: 7,
    moneyReward: 800,
    itemReward: [{ itemId: 'quality_fertilizer', quantity: 3 }],
    seasons: ['spring', 'summer', 'autumn'],
    npcId: 'lin_lao',
    tier: 2
  },
  // === 第3梯度 (第21天): 困难, 7天时限, 数量大, 奖励丰厚 ===
  {
    name: '丰收计划',
    targetItemId: 'pumpkin',
    targetItemName: '南瓜',
    quantity: 10,
    days: 7,
    moneyReward: 2000,
    itemReward: [{ itemId: 'quality_fertilizer', quantity: 5 }],
    seasons: ['autumn'],
    npcId: 'liu_niang',
    tier: 3
  },
  {
    name: '西瓜大丰收',
    targetItemId: 'watermelon',
    targetItemName: '西瓜',
    quantity: 10,
    days: 7,
    moneyReward: 2200,
    itemReward: [{ itemId: 'seed_watermelon', quantity: 5 }],
    seasons: ['summer'],
    npcId: 'xiao_man',
    tier: 3
  },
  {
    name: '深层金矿',
    targetItemId: 'gold_ore',
    targetItemName: '金矿',
    quantity: 15,
    days: 7,
    moneyReward: 2500,
    itemReward: [{ itemId: 'gold_ore', quantity: 5 }],
    seasons: [],
    npcId: 'a_shi',
    tier: 3
  },
  {
    name: '药材囤积',
    targetItemId: 'ginseng',
    targetItemName: '人参',
    quantity: 6,
    days: 7,
    moneyReward: 2000,
    itemReward: [{ itemId: 'herb', quantity: 15 }],
    seasons: ['autumn', 'winter'],
    npcId: 'lin_lao',
    tier: 3
  },
  // === 第4梯度 (第28天): 极难, 7天时限, 数量极大, 奖励最丰厚 ===
  {
    name: '矿石大征集',
    targetItemId: 'gold_ore',
    targetItemName: '金矿',
    quantity: 25,
    days: 7,
    moneyReward: 4000,
    itemReward: [
      { itemId: 'gold_ore', quantity: 10 },
      { itemId: 'jade', quantity: 2 }
    ],
    seasons: [],
    npcId: 'a_shi',
    tier: 4
  },
  {
    name: '丰年盛宴',
    targetItemId: 'pumpkin',
    targetItemName: '南瓜',
    quantity: 20,
    days: 7,
    moneyReward: 4500,
    itemReward: [
      { itemId: 'quality_fertilizer', quantity: 10 },
      { itemId: 'speed_gro', quantity: 5 }
    ],
    seasons: ['autumn'],
    npcId: 'liu_niang',
    tier: 4
  },
  {
    name: '渔王挑战',
    targetItemId: 'catfish',
    targetItemName: '鲶鱼',
    quantity: 12,
    days: 7,
    moneyReward: 3500,
    itemReward: [{ itemId: 'wild_bait', quantity: 10 }],
    seasons: ['summer'],
    npcId: 'qiu_yue',
    tier: 4
  },
  {
    name: '冬日大囤货',
    targetItemId: 'winter_wheat',
    targetItemName: '冬小麦',
    quantity: 30,
    days: 7,
    moneyReward: 3500,
    itemReward: [
      { itemId: 'seed_garlic', quantity: 10 },
      { itemId: 'charcoal', quantity: 10 }
    ],
    seasons: ['winter'],
    npcId: 'chen_bo',
    tier: 4
  },

  // === 内容纵深 V1.3：宗门灵植订单，把种田、修仙、秘境材料串起来 ===
  {
    name: '宗门灵膳备料',
    targetItemId: 'spirit_rice',
    targetItemName: '蕴灵稻',
    quantity: 8,
    days: 7,
    moneyReward: 900,
    itemReward: [
      { itemId: 'spirit_stone', quantity: 6 },
      { itemId: 'seed_dew_grass', quantity: 3 }
    ],
    seasons: ['spring', 'summer'],
    npcId: 'lin_lao',
    tier: 1,
    orderTag: '宗门灵植',
    description: '宗门膳房需要蕴灵稻熬制灵粥，交付后可换取灵石与凝露草种子。'
  },
  {
    name: '丹房凝露单',
    targetItemId: 'dew_grass',
    targetItemName: '凝露草',
    quantity: 10,
    days: 7,
    moneyReward: 1200,
    itemReward: [
      { itemId: 'spirit_stone', quantity: 8 },
      { itemId: 'wood_spirit', quantity: 1 }
    ],
    seasons: ['spring', 'autumn'],
    npcId: 'lin_lao',
    tier: 2,
    orderTag: '宗门灵植',
    description: '丹房炼回灵丹缺少凝露草，完成后可获得灵石和青丘旧林常见的木灵珠。'
  },
  {
    name: '筑基丹主材',
    targetItemId: 'vermilion_fruit',
    targetItemName: '朱果',
    quantity: 6,
    days: 7,
    moneyReward: 2400,
    itemReward: [
      { itemId: 'spirit_stone', quantity: 14 },
      { itemId: 'soul_crystal', quantity: 1 },
      { itemId: 'seed_spirit_rice', quantity: 4 }
    ],
    seasons: ['summer', 'autumn'],
    npcId: 'lin_lao',
    tier: 3,
    orderTag: '宗门灵植',
    description: '宗门要开炉炼筑基丹，急需朱果压住丹火，奖励会补给秘境材料。'
  },
  {
    name: '四时灵植供奉',
    targetItemId: 'snow_lotus',
    targetItemName: '雪莲',
    quantity: 5,
    days: 7,
    moneyReward: 3600,
    itemReward: [
      { itemId: 'spirit_stone', quantity: 22 },
      { itemId: 'thunder_essence', quantity: 1 },
      { itemId: 'seed_vermilion_fruit', quantity: 3 }
    ],
    seasons: ['winter'],
    npcId: 'lin_lao',
    tier: 4,
    orderTag: '宗门灵植',
    description: '冬日供奉需要雪莲镇住灵脉，完成后可获得高阶灵石奖励和雷精。'
  },
  {
    name: '高阶雪莲清心丹材',
    targetItemId: 'ice_soul_lotus',
    targetItemName: '冰魄雪莲',
    quantity: 3,
    days: 7,
    moneyReward: 4200,
    itemReward: [
      { itemId: 'spirit_stone', quantity: 12 },
      { itemId: 'soul_crystal', quantity: 2 }
    ],
    seasons: ['winter'],
    npcId: 'lin_lao',
    tier: 3,
    orderTag: '宗门灵植',
    description: '宗门丹房急需冰魄雪莲炼制清心护魂类丹药。'
  },
  {
    name: '灵芝培元委托',
    targetItemId: 'purple_ganoderma',
    targetItemName: '紫韵灵芝',
    quantity: 3,
    days: 7,
    moneyReward: 4800,
    itemReward: [
      { itemId: 'spirit_stone', quantity: 15 },
      { itemId: 'thunder_essence', quantity: 1 }
    ],
    seasons: ['spring', 'autumn'],
    npcId: 'lin_lao',
    tier: 3,
    orderTag: '宗门灵植',
    description: '宗门丹房征集紫韵灵芝，准备用于培元丹药。'
  },
  {
    name: '护魂丹双材令',
    targetItemId: 'ice_soul_lotus',
    targetItemName: '冰魄雪莲',
    quantity: 2,
    targets: [
      { itemId: 'ice_soul_lotus', name: '冰魄雪莲', quantity: 2 },
      { itemId: 'purple_ganoderma', name: '紫韵灵芝', quantity: 2 }
    ],
    days: 7,
    moneyReward: 6200,
    itemReward: [
      { itemId: 'spirit_stone', quantity: 20 },
      { itemId: 'star_iron', quantity: 1 },
      { itemId: 'artifact_shard', quantity: 1 }
    ],
    seasons: ['spring', 'autumn', 'winter'],
    npcId: 'lin_lao',
    tier: 4,
    orderTag: '宗门灵植',
    description: '宗门长老需要冰魄雪莲与紫韵灵芝合炼护魂丹，奖励高阶炼器材料。'
  }
]

const TIER_LABELS = ['简单', '普通', '困难', '极难']
const TIER_FRIENDSHIP = [5, 8, 12, 15]

/** 根据当前季节和梯度生成特殊订单 (tier: 1-4 对应 第7/14/21/28天) */
export const generateSpecialOrder = (season: Season, tier: number): QuestInstance | null => {
  const clampedTier = Math.max(1, Math.min(4, tier))
  const valid = SPECIAL_ORDER_TEMPLATES.filter(t => t.tier === clampedTier && (t.seasons.length === 0 || t.seasons.includes(season)))
  if (valid.length === 0) return null

  const template = valid[Math.floor(Math.random() * valid.length)]!
  const npcDef = getNpcById(template.npcId)
  const npcName = npcDef?.name ?? template.npcId
  const tierLabel = TIER_LABELS[clampedTier - 1]

  questCounter++
  return {
    id: `special_${Date.now()}_${questCounter}`,
    type: 'special_order',
    npcId: template.npcId,
    npcName,
    tierLabel,
    orderTag: template.orderTag,
    description: template.description ?? `${npcName}急需${template.quantity}个${template.targetItemName}。`,
    targetItemId: template.targetItemId,
    targetItemName: template.targetItemName,
    targetQuantity: template.quantity,
    collectedQuantity: 0,
    targets: template.targets?.map(t => ({ itemId: t.itemId, name: t.name, quantity: t.quantity, collectedQuantity: 0 })),
    moneyReward: template.moneyReward,
    friendshipReward: TIER_FRIENDSHIP[clampedTier - 1]!,
    daysRemaining: template.days,
    accepted: false,
    itemReward: template.itemReward
  }
}

let questCounter = 0

/** 根据当前季节生成随机委托 */
export const generateQuest = (season: Season, _day: number): QuestInstance | null => {
  // 随机选择委托类型
  const typeIndex = Math.floor(Math.random() * QUEST_TEMPLATES.length)
  const template = QUEST_TEMPLATES[typeIndex]!

  // 按季节过滤目标
  const validTargets = template.targets.filter(t => t.seasons.length === 0 || t.seasons.includes(season))
  if (validTargets.length === 0) return null

  // 随机选择目标
  const target = validTargets[Math.floor(Math.random() * validTargets.length)]!

  // 从候选池随机选择 NPC
  const npcId = template.npcPool[Math.floor(Math.random() * template.npcPool.length)]!
  const npcDef = getNpcById(npcId)
  const npcName = npcDef?.name ?? npcId

  // 随机数量（范围内）
  const quantity = target.minQty + Math.floor(Math.random() * (target.maxQty - target.minQty + 1))

  // 奖励计算
  const moneyReward = Math.floor(target.unitPrice * quantity * template.rewardMultiplier)

  questCounter++
  const verb = QUEST_TYPE_VERBS[template.type]
  const description =
    template.type === 'delivery'
      ? `${npcName}需要${quantity}个${target.name}，请${verb}${npcName}。`
      : `${npcName}委托：${verb}${quantity}个${target.name}。`

  return {
    id: `quest_${Date.now()}_${questCounter}`,
    type: template.type,
    npcId,
    npcName,
    description,
    targetItemId: target.itemId,
    targetItemName: target.name,
    targetQuantity: quantity,
    collectedQuantity: 0,
    moneyReward,
    friendshipReward: template.friendshipReward,
    daysRemaining: 2,
    accepted: false
  }
}
