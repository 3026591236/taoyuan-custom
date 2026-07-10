import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addLog, showFloat } from '@/composables/useGameLog'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useSkillStore } from './useSkillStore'

export type SpiritRoot = 'mixed' | 'wood' | 'water' | 'earth' | 'fire' | 'metal' | 'celestial'
export type ArtifactKey = 'glimmerHoe' | 'spiritKettle' | 'spiritRain'
export type BeastId = 'fox' | 'crane' | 'phoenix'
export type CaveSlotType = 'alchemy' | 'farm' | 'meditation' | 'herbgarden' | 'spiritArray'
export type CultivationManualKey = 'wood' | 'thunder' | 'void'
export type CultivationLessonId = 'morning_breath' | 'circulate_qi' | 'thunder_contemplation'
export type CultivationPathId = 'balanced' | 'sword' | 'alchemy' | 'thunder'
export type DaoGearSlot = 'sword' | 'robe' | 'boots' | 'amulet'
export type DaoGearId = 'immortal_sword' | 'dharma_robe' | 'cloud_boots' | 'tribulation_amulet'
export interface DaoGearDef {
  id: DaoGearId
  slot: DaoGearSlot
  name: string
  desc: string
  material: { itemId: string; name: string; quantity: number }
  spiritStoneCost: number
  powerPerLevel: number
  tribulationPerLevel: number
  maxLevel: number
}
export interface CultivationPath {
  id: CultivationPathId
  name: string
  title: string
  desc: string
  focus: string
  bonusDesc: string
}
export const DAO_GEAR: DaoGearDef[] = [
  { id: 'immortal_sword', slot: 'sword', name: '灵剑', desc: '修士御敌护道的本命外兵，独立于农场/矿洞武器，强化秘境与登塔战力。', material: { itemId: 'artifact_shard', name: '法宝碎片', quantity: 2 }, spiritStoneCost: 12, powerPerLevel: 520, tribulationPerLevel: 0.006, maxLevel: 9 },
  { id: 'dharma_robe', slot: 'robe', name: '法衣', desc: '以魂晶和灵纹织就的护身法衣，稳固经脉、承受劫雷余波。', material: { itemId: 'soul_crystal', name: '魂晶', quantity: 2 }, spiritStoneCost: 10, powerPerLevel: 360, tribulationPerLevel: 0.01, maxLevel: 9 },
  { id: 'cloud_boots', slot: 'boots', name: '云靴', desc: '踏云追风的修仙靴履，提升身法与秘境周旋能力。', material: { itemId: 'storm_feather', name: '风羽', quantity: 1 }, spiritStoneCost: 14, powerPerLevel: 320, tribulationPerLevel: 0.008, maxLevel: 9 },
  { id: 'tribulation_amulet', slot: 'amulet', name: '护符', desc: '以雷精书写避劫符纹的护身符，专门提高跨境渡劫稳定性。', material: { itemId: 'thunder_essence', name: '雷精', quantity: 1 }, spiritStoneCost: 16, powerPerLevel: 280, tribulationPerLevel: 0.018, maxLevel: 9 }
]
export const CULTIVATION_PATHS: CultivationPath[] = [
  { id: 'balanced', name: '清修', title: '清静守一', desc: '守中不偏，重视稳定吐纳与心境平衡。', focus: '稳修', bonusDesc: '打坐、闭关与压制心魔更稳定' },
  { id: 'sword', name: '剑修', title: '剑心通明', desc: '以战养道，重视锋芒、战力和秘境历练。', focus: '战斗', bonusDesc: '战力、周天运转收益更高' },
  { id: 'alchemy', name: '丹修', title: '丹火温神', desc: '以丹养命，重视灵植、炼丹与资源循环。', focus: '炼丹', bonusDesc: '炼化灵气与灵膳收益更高' },
  { id: 'thunder', name: '雷修', title: '雷纹淬心', desc: '观雷淬体，重视渡劫准备与雷法心境。', focus: '渡劫', bonusDesc: '雷云观想、顿悟和渡劫稳定性更强' }
]
export interface CultivationLesson {
  id: CultivationLessonId
  name: string
  desc: string
  focus: string
  stamina: number
  auraCost?: number
  manaCost?: number
  itemCost?: { itemId: string; name: string; quantity: number }
  reward: { aura?: number; cultivation?: number; mana?: number; yuanShenExp?: number }
}
export const CULTIVATION_LESSONS: CultivationLesson[] = [
  { id: 'morning_breath', name: '纳气晨课', desc: '顺着田间地脉吐纳一周，收益温和稳定，适合每日开局。', focus: '稳修', stamina: 8, reward: { aura: 45, cultivation: 90, mana: 18 } },
  { id: 'circulate_qi', name: '周天运转', desc: '以灵气推动小周天，快速积累修为，但会消耗灵气与灵力。', focus: '冲修为', stamina: 10, auraCost: 80, manaCost: 20, reward: { cultivation: 260, mana: 8 } },
  { id: 'thunder_contemplation', name: '雷云观想', desc: '观想劫云雷纹，淬炼心神，适合大境界突破前准备。', focus: '渡劫', stamina: 12, manaCost: 35, itemCost: { itemId: 'thunder_essence', name: '雷精', quantity: 1 }, reward: { cultivation: 160, yuanShenExp: 120 } }
]
export const CULTIVATION_MANUALS: Record<CultivationManualKey, { name: string; desc: string; maxLevel: number; auraCost: number; cultivationCost: number; effects: string }> = {
  wood: { name: '青木长生诀', desc: '以木行生机温养经脉，适合初入仙途。', maxLevel: 9, auraCost: 180, cultivationCost: 120, effects: '修炼收益、气血底蕴提升' },
  thunder: { name: '九霄雷诀', desc: '引雷淬骨，越到渡劫越显锋芒。', maxLevel: 9, auraCost: 420, cultivationCost: 260, effects: '战力、渡劫成功率提升' },
  void: { name: '太虚归元功', desc: '凝神归元，守住灵台一点清明。', maxLevel: 9, auraCost: 820, cultivationCost: 520, effects: '灵力、元神与突破稳定性提升' }
}

const ARTIFACT_NAMES: Record<ArtifactKey, string> = { glimmerHoe: '流光锄', spiritKettle: '引灵壶', spiritRain: '灵雨诀' }

// V1.3.7: 秘境稀有事件
export interface RealmEvent {
  id: string
  name: string
  desc: string
  chance: number
  minRealm: number
  effect: 'insight' | 'aura' | 'item' | 'demon_clear' | 'artifact_hint'
  value: number
  itemReward?: { itemId: string; name: string; qty: number }
}

export const REALM_EVENTS: RealmEvent[] = [
  { id: 'spirit_vein', name: '灵脉发现', desc: '你在秘境深处发现了一条隐秘灵脉，灵气如泉涌出。', chance: 0.12, minRealm: 5, effect: 'aura', value: 200 },
  { id: 'ancient_cave', name: '古修遗府', desc: '一座上古修士的洞府现于眼前，内藏修行感悟。', chance: 0.08, minRealm: 10, effect: 'insight', value: 15 },
  { id: 'heart_demon_purge', name: '心魔净化', desc: '秘境中的灵泉洗涤了你的心魔。', chance: 0.06, minRealm: 8, effect: 'demon_clear', value: 12 },
  { id: 'spirit_herb', name: '野生灵药', desc: '路边发现一株野生灵药，小心采下。', chance: 0.15, minRealm: 0, effect: 'item', value: 0, itemReward: { itemId: 'dew_grass', name: '凝露草', qty: 2 } },
  { id: 'rare_spirit_herb', name: '稀有灵药', desc: '石缝中隐现一株珍稀灵药，灵气四溢。', chance: 0.07, minRealm: 12, effect: 'item', value: 0, itemReward: { itemId: 'ice_soul_lotus', name: '冰魄雪莲', qty: 1 } },
  { id: 'rare_seed_cache', name: '灵种遗藏', desc: '古修遗落的灵种匣被你发现，种子仍有生机。', chance: 0.05, minRealm: 12, effect: 'item', value: 0, itemReward: { itemId: 'seed_ice_soul_lotus', name: '冰魄雪莲种子', qty: 1 } },
  { id: 'ganoderma_spore', name: '灵芝孢子', desc: '秘境枯木间飘出紫色孢子，正可带回灵田培育。', chance: 0.05, minRealm: 14, effect: 'item', value: 0, itemReward: { itemId: 'seed_purple_ganoderma', name: '紫韵灵芝孢子', qty: 1 } },
  { id: 'treasure_hint', name: '灵宝感应', desc: '你感应到远处有灵宝的气息，顿悟了一丝天道。', chance: 0.05, minRealm: 16, effect: 'artifact_hint', value: 5 },
  { id: 'spirit_vein_deep', name: '深层灵脉', desc: '秘境深处涌出浓郁灵气，修为大进。', chance: 0.05, minRealm: 18, effect: 'aura', value: 500 },
  { id: 'ancient_insight', name: '先贤启示', desc: '幻象中一位先贤向你传授心法，顿悟大增。', chance: 0.04, minRealm: 14, effect: 'insight', value: 25 },
]


export type TalismanId = 'fire_talisman' | 'ice_talisman' | 'heal_talisman' | 'shield_talisman' | 'speed_talisman' | 'thunder_talisman'
export interface TalismanDef { id: TalismanId; name: string; effect: string; power: number; tribulation: number }
export const TALISMAN_DATA: TalismanDef[] = [
  { id: 'fire_talisman', name: '炎符', effect: '火行攻势，提升修仙战力。', power: 180, tribulation: 0 },
  { id: 'ice_talisman', name: '冰符', effect: '凝神定息，少量提升渡劫稳定。', power: 120, tribulation: 0.003 },
  { id: 'heal_talisman', name: '愈符', effect: '可消耗一枚恢复30%体力，也提供少量护身灵机。', power: 60, tribulation: 0.001 },
  { id: 'shield_talisman', name: '盾符', effect: '护身挡劫，提升渡劫稳定。', power: 100, tribulation: 0.004 },
  { id: 'speed_talisman', name: '疾符', effect: '身法避劫，提升渡劫稳定。', power: 100, tribulation: 0.003 },
  { id: 'thunder_talisman', name: '雷符', effect: '雷法攻势，兼具战力与渡劫感应。', power: 260, tribulation: 0.002 }
]
const isTalismanId = (id: string): id is TalismanId => TALISMAN_DATA.some(t => t.id === id)


export const BEAST_DATA: Record<BeastId, { name: string; emoji: string; desc: string; bonusType: string; bonusDesc: string; feedCrop: string; feedQty: number }> = {
  fox: { name: '灵狐', emoji: '🦊', desc: '机敏灵慧，善于感应灵脉走向', bonusType: 'aura', bonusDesc: '灵气获取+30%', feedCrop: 'dew_grass', feedQty: 5 },
  crane: { name: '仙鹤', emoji: '🦢', desc: '清雅高洁，修行时心境通透', bonusType: 'meditation', bonusDesc: '打坐修为+40%', feedCrop: 'spirit_rice', feedQty: 5 },
  phoenix: { name: '青鸾', emoji: '🦚', desc: '浴火而生，丹火纯青', bonusType: 'alchemy', bonusDesc: '炼丹品质提升', feedCrop: 'vermilion_fruit', feedQty: 3 }
}

export const CAVE_SLOT_DATA: Record<CaveSlotType, { name: string; desc: string }> = {
  alchemy: { name: '丹房', desc: '洞府内炼丹，灵气消耗-20%' },
  farm: { name: '灵圃', desc: '洞府内种灵植，灵气产出+50%' },
  meditation: { name: '静室', desc: '洞府内打坐，修为和灵力翻倍' },
  herbgarden: { name: '百草园', desc: '每日收获药材，可升级增加产量' },
  spiritArray: { name: '聚灵阵', desc: '每日凝聚五行元气' }
}

const CAVE_TIERS = [
  { name: '无', cost: 0, slots: 0, auraRegen: 0 },
  { name: '石洞', cost: 800, slots: 1, auraRegen: 3 },
  { name: '灵穴', cost: 2500, slots: 2, auraRegen: 6 },
  { name: '洞府', cost: 6000, slots: 3, auraRegen: 12 },
  { name: '仙府', cost: 15000, slots: 3, auraRegen: 20 }
]
const ALCHEMY_RECIPES = {
  mana_recovery_pill: { name: '回灵丹', materials: [{ itemId: 'dew_grass', quantity: 2 }], aura: 20, mana: 0, output: 1 },
  qi_gathering_pill: { name: '聚气丹', materials: [{ itemId: 'spirit_rice', quantity: 3 }, { itemId: 'dew_grass', quantity: 1 }], aura: 60, mana: 10, output: 1 },
  foundation_pill: { name: '筑基丹', materials: [{ itemId: 'vermilion_fruit', quantity: 2 }, { itemId: 'dew_grass', quantity: 3 }, { itemId: 'spirit_rice', quantity: 5 }], aura: 360, mana: 40, output: 1 },
  lianjing_pill: { name: '炼精丹', materials: [{ itemId: 'chuanxiong', quantity: 30 }, { itemId: 'baizhi', quantity: 30 }, { itemId: 'suoyang', quantity: 30 }], aura: 300, mana: 25, output: 1 },
  huaqi_pill: { name: '化气丹', materials: [{ itemId: 'chonglou', quantity: 40 }, { itemId: 'chenxiang', quantity: 40 }, { itemId: 'peilan', quantity: 40 }], aura: 400, mana: 35, output: 1 },
  lianqi_pill: { name: '炼气丹', materials: [{ itemId: 'chuanxiong', quantity: 50 }, { itemId: 'yuzhu', quantity: 50 }, { itemId: 'chishao', quantity: 50 }, { itemId: 'chonglou', quantity: 50 }, { itemId: 'shenqu', quantity: 50 }], aura: 500, mana: 50, output: 1 },
  huashen_pill: { name: '化神丹', materials: [{ itemId: 'chuanxiong', quantity: 60 }, { itemId: 'chonglou', quantity: 60 }, { itemId: 'baizhi', quantity: 60 }, { itemId: 'chishao', quantity: 60 }, { itemId: 'suoyang', quantity: 60 }], aura: 600, mana: 60, output: 1 },
  lianshen_pill: { name: '炼神丹', materials: [{ itemId: 'yuzhu', quantity: 70 }, { itemId: 'chishao', quantity: 70 }, { itemId: 'chonglou', quantity: 70 }, { itemId: 'suoyang', quantity: 70 }, { itemId: 'peilan', quantity: 70 }], aura: 700, mana: 70, output: 1 },
  life_extension_pill: { name: '延寿丹', materials: [{ itemId: 'longkui', quantity: 3 }, { itemId: 'shenqu', quantity: 5 }, { itemId: 'ziwan', quantity: 5 }], aura: 500, mana: 80, output: 1 },
  marrow_wash_pill: { name: '洗髓丹', materials: [{ itemId: 'longkui', quantity: 5 }, { itemId: 'chishao', quantity: 10 }, { itemId: 'chenxiang', quantity: 10 }, { itemId: 'ziwan', quantity: 10 }], aura: 800, mana: 100, output: 1 },
  good_fortune_pill: { name: '造化丹', materials: [{ itemId: 'longkui', quantity: 5 }, { itemId: 'chenxiang', quantity: 10 }, { itemId: 'ziwan', quantity: 10 }, { itemId: 'shenqu', quantity: 10 }], aura: 900, mana: 120, output: 1 },
  returning_void_pill: { name: '还虚丹', materials: [{ itemId: 'chuanxiong', quantity: 20 }, { itemId: 'yuzhu', quantity: 20 }, { itemId: 'chonglou', quantity: 20 }, { itemId: 'chenxiang', quantity: 20 }], aura: 450, mana: 45, output: 1 },
  refining_void_pill: { name: '炼虚丹', materials: [{ itemId: 'baizhi', quantity: 30 }, { itemId: 'chishao', quantity: 30 }, { itemId: 'ziwan', quantity: 30 }, { itemId: 'peilan', quantity: 30 }, { itemId: 'shenqu', quantity: 30 }], aura: 650, mana: 65, output: 1 },
  merge_way_pill: { name: '合道丹', materials: [{ itemId: 'longkui', quantity: 3 }, { itemId: 'ziwan', quantity: 15 }, { itemId: 'peilan', quantity: 15 }, { itemId: 'shenqu', quantity: 15 }], aura: 1000, mana: 100, output: 1 },
  soul_mending_pill: { name: '养魂丹', materials: [{ itemId: 'soul_crystal', quantity: 2 }, { itemId: 'yuzhu', quantity: 20 }, { itemId: 'ziwan', quantity: 12 }], aura: 720, mana: 90, output: 1 },
  nirvana_soul_pill: { name: '涅魂丹', materials: [{ itemId: 'thunder_essence', quantity: 2 }, { itemId: 'longkui', quantity: 2 }, { itemId: 'shenqu', quantity: 12 }, { itemId: 'soul_crystal', quantity: 3 }], aura: 1200, mana: 140, output: 1 },
  dragon_face_pill: { name: '龙颜丹', materials: [{ itemId: 'longkui', quantity: 3 }, { itemId: 'suoyang', quantity: 20 }, { itemId: 'chenxiang', quantity: 20 }], aura: 700, mana: 90, output: 1 },
  spirit_mending_pill: { name: '补灵丹', materials: [{ itemId: 'baizhi', quantity: 25 }, { itemId: 'yuzhu', quantity: 25 }, { itemId: 'ziwan', quantity: 25 }], aura: 550, mana: 55, output: 1 },
  rebirth_pill: { name: '轮回丹', materials: [{ itemId: 'longkui', quantity: 10 }, { itemId: 'shenqu', quantity: 15 }, { itemId: 'ziwan', quantity: 15 }, { itemId: 'suoyang', quantity: 10 }], aura: 3000, mana: 200, output: 1 },
  // V1.3.7: 灵植炼丹闭环 — 新增灵植丹方
  snow_lotus_pill: { name: '雪莲清心丹', materials: [{ itemId: 'ice_soul_lotus', quantity: 3 }, { itemId: 'dew_grass', quantity: 2 }], aura: 200, mana: 30, output: 1, minRealm: 10 },
  ganoderma_pill: { name: '灵芝培元丹', materials: [{ itemId: 'purple_ganoderma', quantity: 3 }, { itemId: 'spirit_rice', quantity: 5 }, { itemId: 'dew_grass', quantity: 2 }], aura: 400, mana: 60, output: 1, minRealm: 14 },
  ice_soul_pill: { name: '冰魄护魂丹', materials: [{ itemId: 'ice_soul_lotus', quantity: 5 }, { itemId: 'purple_ganoderma', quantity: 3 }, { itemId: 'soul_crystal', quantity: 2 }], aura: 800, mana: 100, output: 1, minRealm: 18 }
} as const
export type PillId = keyof typeof ALCHEMY_RECIPES
type MarketPillId = 'cultivation_boost_pill' | 'minor_realm_pill' | 'ascension_boost_pill'
type UsablePillId = PillId | MarketPillId
export type AlchemyQuality = 'normal' | 'fine' | 'perfect'
export const getAlchemyRecipes = () => ALCHEMY_RECIPES
export const HERB_DATA: Record<string, { name: string; emoji: string; rarity: number; desc: string }> = {
  chuanxiong: { name: '川芎', emoji: '🌿', rarity: 1, desc: '活血行气' },
  yuzhu: { name: '玉竹', emoji: '🌱', rarity: 1, desc: '养阴润燥' },
  baizhi: { name: '白芷', emoji: '🌸', rarity: 1, desc: '祛风散寒' },
  chishao: { name: '赤芍', emoji: '🌺', rarity: 2, desc: '清热凉血' },
  chenxiang: { name: '沉香', emoji: '🪵', rarity: 2, desc: '理气止痛' },
  chonglou: { name: '重楼', emoji: '🌵', rarity: 2, desc: '清热解毒' },
  suoyang: { name: '锁阳', emoji: '🔑', rarity: 3, desc: '补肾壮阳' },
  ziwan: { name: '紫菀', emoji: '💜', rarity: 3, desc: '润肺化痰' },
  peilan: { name: '佩兰', emoji: '🌼', rarity: 3, desc: '芳香化湿' },
  shenqu: { name: '神曲', emoji: '⭐', rarity: 4, desc: '消食化积' },
  longkui: { name: '龙葵', emoji: '🐉', rarity: 5, desc: '蕴含龙气' },
}

export interface SpiritStoneExchangeRecipe {
  id: string
  name: string
  itemId: string
  itemName: string
  quantity: number
  spiritStones: number
  desc: string
}

export interface RebirthMaterialCost { itemId: string; name: string; quantity: number }

export const SPIRIT_STONE_EXCHANGES: SpiritStoneExchangeRecipe[] = [
  { id: 'wood_spirit', name: '木灵珠折灵', itemId: 'wood_spirit', itemName: '木灵珠', quantity: 1, spiritStones: 3, desc: '将多余木行灵珠折换为灵石。' },
  { id: 'soul_crystal', name: '魂晶折灵', itemId: 'soul_crystal', itemName: '魂晶', quantity: 1, spiritStones: 5, desc: '阴魂晶核可析出较多灵石。' },
  { id: 'thunder_essence', name: '雷精折灵', itemId: 'thunder_essence', itemName: '雷精', quantity: 1, spiritStones: 8, desc: '雷力精粹折成稳定灵石。' },
  { id: 'nether_core', name: '冥核折灵', itemId: 'nether_core', itemName: '冥核', quantity: 1, spiritStones: 10, desc: '高阶冥核可换较多灵石。' },
  { id: 'forge_blueprint', name: '炼器图纸折灵', itemId: 'forge_blueprint', itemName: '炼器图纸', quantity: 1, spiritStones: 10, desc: '暂未用于淬炼的古法残图，可先折成灵石，后续再扩展词条玩法。' },
  { id: 'artifact_shard', name: '法宝碎片折灵', itemId: 'artifact_shard', itemName: '法宝碎片', quantity: 1, spiritStones: 12, desc: '碎片中的残余灵蕴可重炼为灵石。' },
  { id: 'star_iron', name: '星陨铁折灵', itemId: 'star_iron', itemName: '星陨铁', quantity: 1, spiritStones: 15, desc: '天外奇铁蕴含浓厚灵力。' },
  { id: 'true_spirit_record', name: '真灵秘录折灵', itemId: 'true_spirit_record', itemName: '真灵秘录', quantity: 1, spiritStones: 16, desc: '二转后会用于轮回凭证，前期多余时才建议折灵。' },
  { id: 'reincarnation_dust', name: '轮回尘折灵', itemId: 'reincarnation_dust', itemName: '轮回尘', quantity: 1, spiritStones: 18, desc: '二转后会用于稳定轮回，前期多余时才建议折灵。' },
  { id: 'lingyun_jade', name: '灵蕴玉折灵', itemId: 'lingyun_jade', itemName: '灵蕴玉', quantity: 1, spiritStones: 20, desc: '高转轮回材料价值较高，慎重折换。' },
  { id: 'moonlight_jade', name: '月华玉折灵', itemId: 'moonlight_jade', itemName: '月华玉', quantity: 1, spiritStones: 9, desc: '月华灵玉可折成稳定灵石。' },
  { id: 'sunfire_crystal', name: '日炎晶折灵', itemId: 'sunfire_crystal', itemName: '日炎晶', quantity: 1, spiritStones: 10, desc: '日火晶核可析出浓烈灵力。' },
  { id: 'mystic_iron', name: '玄铁折灵', itemId: 'mystic_iron', itemName: '玄铁', quantity: 1, spiritStones: 8, desc: '多余玄铁可先折灵，炼器前请留足库存。' },
  { id: 'cold_jade', name: '寒髓玉折灵', itemId: 'cold_jade', itemName: '寒髓玉', quantity: 1, spiritStones: 11, desc: '寒髓玉适合护符/丹药，也能换取灵石。' },
  { id: 'phoenix_plume', name: '凤羽折灵', itemId: 'phoenix_plume', itemName: '凤羽', quantity: 1, spiritStones: 14, desc: '赤金凤羽灵性充足，建议富余后再折灵。' },
  { id: 'dragon_scale', name: '龙鳞折灵', itemId: 'dragon_scale', itemName: '龙鳞', quantity: 1, spiritStones: 18, desc: '龙脉鳞片价值很高，高阶淬炼前慎重折换。' },
  { id: 'void_dust', name: '太虚尘折灵', itemId: 'void_dust', itemName: '太虚尘', quantity: 1, spiritStones: 22, desc: '太虚裂隙材料珍贵，可换大量灵石。' },
  { id: 'demon_core', name: '妖丹折灵', itemId: 'demon_core', itemName: '妖丹', quantity: 1, spiritStones: 16, desc: '妖丹可用于炼器或丹引，富余时折灵。' }
]

const REAL_DAILY_ACCUMULATION_CAP = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000
const REALM_MAJOR_ORDER = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘', '真仙', '玄仙']
const realmMajor = (name: string) => REALM_MAJOR_ORDER.find(key => name.startsWith(key)) ?? name





export type SpiritMealId = 'plain_spirit_porridge' | 'dew_rice_soup' | 'vermilion_elixir_soup' | 'three_treasure_spirit_meal'
export interface SpiritMealRecipe {
  id: SpiritMealId
  name: string
  desc: string
  materials: { itemId: string; quantity: number; name: string }[]
  stamina: number
  aura: number
  cultivation: number
  mana: number
  minFieldTier: number
}
export const SPIRIT_MEAL_RECIPES: SpiritMealRecipe[] = [
  { id: 'plain_spirit_porridge', name: '灵谷粥', desc: '以普通稻米引气入体，适合刚启蒙后的每日温养。', materials: [{ itemId: 'rice', quantity: 3, name: '水稻' }], stamina: 3, aura: 18, cultivation: 35, mana: 8, minFieldTier: 0 },
  { id: 'dew_rice_soup', name: '凝露灵粥', desc: '蕴灵稻配凝露草，灵气温和，能稳定增长修为。', materials: [{ itemId: 'spirit_rice', quantity: 2, name: '蕴灵稻' }, { itemId: 'dew_grass', quantity: 1, name: '凝露草' }], stamina: 5, aura: 55, cultivation: 120, mana: 18, minFieldTier: 0 },
  { id: 'vermilion_elixir_soup', name: '朱果丹羹', desc: '朱果入羹，药力绵长，适合突破前积蓄底蕴。', materials: [{ itemId: 'vermilion_fruit', quantity: 1, name: '朱果' }, { itemId: 'dew_grass', quantity: 2, name: '凝露草' }], stamina: 8, aura: 120, cultivation: 260, mana: 35, minFieldTier: 1 },
  { id: 'three_treasure_spirit_meal', name: '三宝灵膳', desc: '灵稻、凝露草、朱果三味合一，每日只宜少食。', materials: [{ itemId: 'spirit_rice', quantity: 5, name: '蕴灵稻' }, { itemId: 'dew_grass', quantity: 3, name: '凝露草' }, { itemId: 'vermilion_fruit', quantity: 2, name: '朱果' }], stamina: 12, aura: 260, cultivation: 620, mana: 70, minFieldTier: 2 }
]

export const REALMS = [
  { name: '凡人', maxCultivation: 100, maxMana: 30, breakthroughCost: 30 },
  { name: '炼气一层', maxCultivation: 220, maxMana: 45, breakthroughCost: 60 },
  { name: '炼气二层', maxCultivation: 420, maxMana: 65, breakthroughCost: 120 },
  { name: '炼气三层', maxCultivation: 760, maxMana: 90, breakthroughCost: 200 },
  { name: '炼气四层', maxCultivation: 1200, maxMana: 120, breakthroughCost: 350 },
  { name: '炼气五层', maxCultivation: 1800, maxMana: 155, breakthroughCost: 500 },
  { name: '炼气六层', maxCultivation: 2600, maxMana: 195, breakthroughCost: 750 },
  { name: '炼气七层', maxCultivation: 3700, maxMana: 240, breakthroughCost: 1100 },
  { name: '炼气八层', maxCultivation: 5200, maxMana: 290, breakthroughCost: 1600 },
  { name: '炼气九层', maxCultivation: 7200, maxMana: 350, breakthroughCost: 2400 },
  { name: '筑基初期', maxCultivation: 11000, maxMana: 460, breakthroughCost: 3500 },
  { name: '筑基中期', maxCultivation: 16000, maxMana: 580, breakthroughCost: 5000 },
  { name: '筑基后期', maxCultivation: 24000, maxMana: 720, breakthroughCost: 7500 },
  { name: '金丹初期', maxCultivation: 40000, maxMana: 1000, breakthroughCost: 12000 },
  { name: '金丹中期', maxCultivation: 65000, maxMana: 1400, breakthroughCost: 18000 },
  { name: '金丹后期', maxCultivation: 100000, maxMana: 2000, breakthroughCost: 28000 },
  { name: '元婴初期', maxCultivation: 160000, maxMana: 2800, breakthroughCost: 42000 },
  { name: '元婴中期', maxCultivation: 250000, maxMana: 3800, breakthroughCost: 60000 },
  { name: '元婴后期', maxCultivation: 400000, maxMana: 5200, breakthroughCost: 85000 },
  { name: '化神初期', maxCultivation: 650000, maxMana: 7200, breakthroughCost: 120000 },
  { name: '化神中期', maxCultivation: 1000000, maxMana: 10000, breakthroughCost: 170000 },
  { name: '化神后期', maxCultivation: 1600000, maxMana: 14000, breakthroughCost: 240000 },
  { name: '渡劫初期', maxCultivation: 2600000, maxMana: 20000, breakthroughCost: 340000 },
  { name: '渡劫中期', maxCultivation: 4200000, maxMana: 28000, breakthroughCost: 480000 },
  { name: '渡劫后期', maxCultivation: 6800000, maxMana: 40000, breakthroughCost: 680000 },
  { name: '大乘初期', maxCultivation: 11000000, maxMana: 58000, breakthroughCost: 960000 },
  { name: '大乘中期', maxCultivation: 18000000, maxMana: 82000, breakthroughCost: 1350000 },
  { name: '大乘后期', maxCultivation: 30000000, maxMana: 120000, breakthroughCost: 1900000 },
  { name: '真仙', maxCultivation: 50000000, maxMana: 180000, breakthroughCost: 2700000 },
  { name: '玄仙', maxCultivation: 99999999, maxMana: 300000, breakthroughCost: 9999999 }
]


export const FIELD_TIERS = ['普通田', '黄阶灵田', '玄阶灵田', '地阶灵田', '天阶洞天']
export const SPIRIT_ROOT_NAMES: Record<SpiritRoot, string> = {
  mixed: '杂灵根', wood: '木灵根', water: '水灵根', earth: '土灵根', fire: '火灵根', metal: '金灵根', celestial: '天灵根'
}
export const SPIRIT_CROP_AURA: Record<string, number> = {
  moonlight_rice: 8,
  phoenix_pepper: 10,
  snow_lotus: 12,
  fairy_chrysanthemum: 9,
  golden_melon: 6,
  jade_tea: 6,
  pearl_grain: 8,
  lotus_tea: 7,
  purple_bamboo: 7,
  golden_fruit: 8,
  celestial_rice: 14,
  saint_rice: 18,
  dragon_melon: 22,
  primordial_melon: 28,
  spirit_rice: 4,
  dew_grass: 3,
  vermilion_fruit: 6,
  cabbage: 1,
  radish: 1,
  potato: 1,
  strawberry: 2,
  rice: 2,
  wheat: 1,
  corn: 2,
  pumpkin: 2,
  eggplant: 1,
  tomato: 1,
  watermelon: 2,
  blueberry: 2,
  tea_leaf: 2,
  peach: 2,
  grape: 2
}

export const getSpiritCropAura = (cropId: string): number => SPIRIT_CROP_AURA[cropId] ?? 0

export const useCultivationStore = defineStore('cultivation', () => {
  const unlocked = ref(false)
  const realmIndex = ref(0)
  const cultivation = ref(0)
  const aura = ref(0)
  const mana = ref(30)
  const spiritRoot = ref<SpiritRoot>('mixed')
  const fieldTier = ref(0)
  const earthPulse = ref(0)
  const totalAuraHarvested = ref(0)
  const alchemyUnlocked = ref(false)
  const daoGear = ref<Record<DaoGearId, number>>({ immortal_sword: 0, dharma_robe: 0, cloud_boots: 0, tribulation_amulet: 0 })
  // V2.0.6~V2.0.7：修仙装备灵韧。低灵韧会削弱装备战力/渡劫稳定，维护消耗原材料、灵石与铜钱。
  const daoGearDurability = ref<Record<DaoGearId, number>>({ immortal_sword: 100, dharma_robe: 100, cloud_boots: 100, tribulation_amulet: 100 })
  const lastAlchemyQuality = ref<{ pillId: PillId; quality: AlchemyQuality; label: string; bonusText: string } | null>(null)
  const spiritMealLastDaily = ref<Record<SpiritMealId, string>>({ plain_spirit_porridge: '', dew_rice_soup: '', vermilion_elixir_soup: '', three_treasure_spirit_meal: '' })
  const artifacts = ref<Record<ArtifactKey, boolean>>({ glimmerHoe: false, spiritKettle: false, spiritRain: false })
  const foundationPillBlessing = ref(0)

  // V0.3 洞府
  const caveTier = ref(0)
  const caveSlots = ref<CaveSlotType[]>([])
  // V2.0.9：洞府灵脉稳定。扩建/维护提升，长期不维护会降低洞府恢复收益。
  const caveStability = ref(100)
  const caveMaintenanceKey = ref('')
  // V0.3 灵兽
  const beast = ref<BeastId | null>(null)
  const beastBond = ref(0)
  const beastTrainingDailyKey = ref('')
  const beastExpedition = ref<{ type: 'guard' | 'expedition'; daysLeft: number } | null>(null)
  const herbGardenLevel = ref(0)
  const herbLastDaily = ref()
  const herbs = ref<Record<string, number>>({})
  const spiritArrayLevel = ref(0)
  const spiritArrayLastDaily = ref()
  const spiritStoneRefineDailyKey = ref('')
  const spiritStoneRefineDailyCount = ref(0)
  const elements = ref<Record<string, number>>({})
  const yuanShenLevel = ref(0)
  const yuanShenExp = ref(0)
  /** 天劫失败留下的元神伤势：0=无，越高成功率越低 */
  const yuanShenInjury = ref(0)
  const lastTribulationResult = ref<'none' | 'success' | 'fail'>('none')
  const destinedArtifact = ref<string | null>(null)
  const destinedArtifactLevel = ref(0)
  const talismans = ref<Partial<Record<TalismanId | 'basic', number>>>({})
  const talismanCooldown = ref<Record<string, number>>({})
  const rebirthCount = ref(0)
  const rebirthBonus = ref(0)
  const lingYun = ref(0)
  const rebirthUnlocked = ref<Record<string, boolean>>({})

  const talismanRechargeRate = computed(() => 1 + Math.floor(realmIndex.value / 3))
  const talismanEffectMultiplier = computed(() => 1 + (sect.value === 'talisman' ? 0.25 : 0) + (cultivationPath.value === 'thunder' ? 0.1 : 0))
  const talismanPower = computed(() => {
    const raw = TALISMAN_DATA.reduce((sum, t) => sum + (talismans.value[t.id] || 0) * t.power, 0) * talismanEffectMultiplier.value
    return Math.floor(Math.min(18000, raw))
  })
  const talismanTribulationBonus = computed(() => {
    const raw = TALISMAN_DATA.reduce((sum, t) => sum + (talismans.value[t.id] || 0) * t.tribulation, 0) * talismanEffectMultiplier.value
    return Math.min(0.1, raw)
  })
  const yuanShenBonus = computed(() => yuanShenLevel.value * 0.05)
  const rebirthRealmName = computed(() => {
    if (rebirthCount.value === 0) return realmName.value
    return rebirthCount.value + '转' + realmName.value
  })

  const sect = ref<'sword' | 'alchemy' | 'talisman' | null>(null)
  const sectSkills = ref([0, 0, 0])
  const sectContribution = ref(0)
  const sectRank = ref(0)
  const sectMerit = ref(0)
  const sectDailyKey = ref('')
  const sectDailyDone = ref<string[]>([])

  // V1.3.9：宗门差异化实装。按宗门技能与职位给实际玩法加成。
  const sectSkillTotal = computed(() => sectSkills.value.reduce((sum, lv) => sum + (Number(lv) || 0), 0))
  const sectCombatAttackBonusRate = computed(() => sect.value === 'sword' ? Math.min(0.35, 0.04 * sectSkillTotal.value + 0.025 * (sectRank.value || 0)) : 0)
  const sectCombatDefenseBonusRate = computed(() => sect.value === 'talisman' ? Math.min(0.30, 0.035 * sectSkillTotal.value + 0.025 * (sectRank.value || 0)) : 0)
  const sectMaxHpBonusRate = computed(() => sect.value === 'talisman' ? Math.min(0.24, 0.025 * sectSkillTotal.value + 0.02 * (sectRank.value || 0)) : 0)
  const sectAlchemyExtraOutputChance = computed(() => sect.value === 'alchemy' ? Math.min(0.35, 0.04 * sectSkillTotal.value + 0.03 * (sectRank.value || 0)) : 0)
  const sectSpiritCropAuraBonusRate = computed(() => sect.value === 'alchemy' ? Math.min(0.30, 0.035 * sectSkillTotal.value + 0.02 * (sectRank.value || 0)) : 0)
  const sectDemonClearBonus = computed(() => sect.value === 'talisman' ? Math.min(10, sectSkillTotal.value + (sectRank.value || 0) * 2) : 0)
  const manuals = ref<Record<CultivationManualKey, number>>({ wood: 0, thunder: 0, void: 0 })
  const autoMeditateEnabled = ref(false)
  const autoMeditateCount = ref(0)
  const lessonDailyKey = ref('')
  const lessonDailyDone = ref<CultivationLessonId[]>([])
  const insight = ref(0)
  const heartDemon = ref(0)
  const cultivationPath = ref<CultivationPathId>('balanced')

  const currentCultivationPath = computed(() => CULTIVATION_PATHS.find(p => p.id === cultivationPath.value) ?? CULTIVATION_PATHS[0]!)
  const pathTitle = computed(() => currentCultivationPath.value.title)
  const realm = computed(() => REALMS[realmIndex.value] ?? REALMS[0]!)
  const realmName = computed(() => realm.value.name)
  const combatPower = computed(() => {
    const player = usePlayerStore()
    const inventory = useInventoryStore()
    const skills = useSkillStore()
    const artifactMap = artifacts.value as Record<string, any>
    let artifactPower = 0
    for (const v of Object.values(artifactMap)) {
      if (!v || typeof v !== 'object') continue
      artifactPower += Math.floor(Number(v.atk || 0) * 12 + Number(v.def || 0) * 10 + Number(v.aura || 0) * 4 + Number(v.cultivation || 0) * 6)
    }
    const oldArtifactPower = ['glimmerHoe', 'spiritKettle', 'spiritRain'].filter(k => artifactMap[k] === true).length * 80
    const weaponPower = Math.max(0, Number(inventory.getWeaponAttack?.() || 0)) * 16
    const ringPower = Math.floor((inventory.getRingEffectValue?.('attack_bonus') || 0) * 120 + (inventory.getRingEffectValue?.('defense_bonus') || 0) * 100 + (inventory.getRingEffectValue?.('max_hp_bonus') || 0) * 3)
    const realmPower = realmIndex.value * 1000 + rebirthCount.value * 50000
    const cultivationPower = Math.floor(cultivation.value * 1.2 + aura.value * 0.25 + mana.value * 2)
    const bodyPower = Math.floor(player.attributePower * 6 + player.getMaxHp() * 1.5 + skills.combatLevel * 180)
    const manualPower = (manuals.value.wood * 180) + (manuals.value.thunder * 320) + (manuals.value.void * 420)
    const sectSkillPower = sectSkills.value.reduce((sum, lv, idx) => sum + lv * (220 + idx * 120), 0)
    const sectIdentityPower = sect.value === 'sword' ? sectSkillPower * 0.35 : sect.value === 'talisman' ? sectSkillPower * 0.18 + (sectRank.value || 0) * 260 : sect.value === 'alchemy' ? (sectRank.value || 0) * 180 : 0
    const pathPower = cultivationPath.value === 'sword' ? (manuals.value.thunder * 180 + realmIndex.value * 55) : cultivationPath.value === 'thunder' ? (insight.value * 10 + manuals.value.thunder * 150) : cultivationPath.value === 'alchemy' ? (fieldTier.value * 160 + manuals.value.wood * 120) : Math.max(0, 100 - heartDemon.value) * 4
    const systemPower = fieldTier.value * 120 + caveTier.value * 180 + yuanShenLevel.value * 260 + destinedArtifactLevel.value * 360 + daoGearPower.value + talismanPower.value + beastBond.value * 12 + (beastExpedition.value?.type === 'guard' ? beastLevel.value * 180 : 0) + sectContribution.value * 0.2 + (sectMerit.value || 0) * 0.6 + sectSkillPower + sectIdentityPower + pathPower + manualPower
    return Math.max(0, Math.floor(realmPower + cultivationPower + bodyPower + weaponPower + ringPower + artifactPower + oldArtifactPower + systemPower))
  })
  const maxCultivation = computed(() => realm.value.maxCultivation)
  const maxMana = computed(() => realm.value.maxMana + fieldTier.value * 10 + yuanShenLevel.value * 2)
  const fieldTierName = computed(() => FIELD_TIERS[fieldTier.value] ?? FIELD_TIERS[0]!)
  const spiritRootName = computed(() => SPIRIT_ROOT_NAMES[spiritRoot.value])
  const breakthroughAuraCost = computed(() => Math.max(0, realm.value.breakthroughCost - foundationPillBlessing.value))
  const breakthroughCultivationMissing = computed(() => Math.max(0, maxCultivation.value - cultivation.value))
  const breakthroughAuraMissing = computed(() => Math.max(0, breakthroughAuraCost.value - aura.value))
  const breakthroughRequirementText = computed(() => {
    const parts: string[] = []
    if (breakthroughCultivationMissing.value > 0) parts.push(`修为还差${Math.ceil(breakthroughCultivationMissing.value)}`)
    if (breakthroughAuraMissing.value > 0) parts.push(`灵气还差${Math.ceil(breakthroughAuraMissing.value)}`)
    return parts.length ? parts.join('，') : '条件已满足'
  })
  const nextRealm = computed(() => REALMS[Math.min(realmIndex.value + 1, REALMS.length - 1)] ?? realm.value)
  const isMajorBreakthrough = computed(() => realmMajor(nextRealm.value.name) !== realmMajor(realm.value.name))
  const tribulationSuccessRate = computed(() => {
    if (!isMajorBreakthrough.value) return 1
    const base = 0.72
    const realmPenalty = Math.min(0.18, Math.floor(realmIndex.value / 5) * 0.03)
    const yuanShenBonusRate = Math.min(0.16, yuanShenLevel.value * 0.012)
    const fieldBonus = Math.min(0.08, fieldTier.value * 0.015)
    const pillBonus = Math.min(0.12, foundationPillBlessing.value / 30000)
    const manualBonus = Math.min(0.12, manuals.value.thunder * 0.01 + manuals.value.void * 0.008)
    const gearBonus = daoGearTribulationBonus.value
    const talismanBonus = talismanTribulationBonus.value
    const insightBonus = Math.min(0.1, insight.value * 0.0012)
    const pathBonus = cultivationPath.value === 'thunder' ? 0.05 : cultivationPath.value === 'balanced' ? 0.025 : 0
    const injuryPenalty = Math.min(0.22, yuanShenInjury.value * 0.05)
    const demonPenalty = Math.min(0.2, heartDemon.value * 0.002)
    return Math.max(0.35, Math.min(0.95, base - realmPenalty + yuanShenBonusRate + fieldBonus + pillBonus + manualBonus + gearBonus + talismanBonus + insightBonus + pathBonus - injuryPenalty - demonPenalty))
  })
  const tribulationSuccessPercent = computed(() => Math.round(tribulationSuccessRate.value * 100))
  const canBreakthrough = computed(() => cultivation.value >= maxCultivation.value && aura.value >= breakthroughAuraCost.value)
  const artifactName = (key: ArtifactKey) => ARTIFACT_NAMES[key]
  const caveTierData = computed(() => CAVE_TIERS[caveTier.value] ?? CAVE_TIERS[0]!)
  const caveTierName = computed(() => caveTierData.value.name)
  const caveMaxSlots = computed(() => caveTierData.value.slots)
  const caveAuraRegen = computed(() => Math.floor(caveTierData.value.auraRegen * caveStabilityRate.value))
  const caveSlotNames = computed(() => caveSlots.value.map(t => CAVE_SLOT_DATA[t].name))
  const hasCaveSlot = (type: CaveSlotType) => caveSlots.value.includes(type)
  const beastData = computed(() => beast.value ? BEAST_DATA[beast.value] : null)
  const beastName = computed(() => beastData.value?.name ?? '无')
  const beastEmoji = computed(() => beastData.value?.emoji ?? '')
  const daoGearDurabilityRate = (id: DaoGearId) => Math.max(0.35, Math.min(1, (daoGearDurability.value[id] ?? 100) / 100))
  const daoGearPower = computed(() => DAO_GEAR.reduce((sum, gear) => sum + Math.floor((daoGear.value[gear.id] || 0) * gear.powerPerLevel * daoGearDurabilityRate(gear.id)), 0))
  const daoGearTribulationBonus = computed(() => Math.min(0.16, DAO_GEAR.reduce((sum, gear) => sum + (daoGear.value[gear.id] || 0) * gear.tribulationPerLevel * daoGearDurabilityRate(gear.id), 0)))
  const daoGearMaintenanceCost = (id: DaoGearId) => {
    const gear = DAO_GEAR.find(g => g.id === id)
    const level = daoGear.value[id] || 0
    const durability = daoGearDurability.value[id] ?? 100
    if (!gear || level <= 0 || durability >= 100) return null
    const missing = 100 - durability
    return {
      material: gear.material,
      materialQty: Math.max(1, Math.ceil(missing / 35)),
      spiritStone: Math.max(1, Math.ceil(level * missing / 45)),
      money: Math.max(500, level * 900 + missing * 80)
    }
  }
  const caveStabilityRate = computed(() => caveTier.value <= 0 ? 1 : Math.max(0.45, Math.min(1.15, caveStability.value / 100)))
  const spiritStoneRefineLimit = computed(() => 3 + (hasCaveSlot('spiritArray') ? 1 : 0))
  const spiritStoneRefineCountToday = computed(() => spiritStoneRefineDailyKey.value === todayKey() ? spiritStoneRefineDailyCount.value : 0)
  const spiritStoneRefineRemaining = computed(() => Math.max(0, spiritStoneRefineLimit.value - spiritStoneRefineCountToday.value))
  const spiritStoneRefineCost = computed(() => 1000 + spiritStoneRefineCountToday.value * 500 + Math.floor(spiritStoneRefineCountToday.value * spiritStoneRefineCountToday.value * 150))
  const spiritStoneRefineAuraGain = computed(() => {
    const base = 10000
    const realmBonus = Math.min(2000, Math.floor(realmIndex.value / 3) * 200)
    const caveBonus = caveTier.value * 5 + (hasCaveSlot('spiritArray') ? 20 : 0)
    const diminishing = Math.max(0, spiritStoneRefineCountToday.value * 900)
    return Math.max(3000, base + realmBonus + caveBonus - diminishing)
  })
  const daoGearLevel = (id: DaoGearId) => daoGear.value[id] || 0
  const canForgeDaoGear = (id: DaoGearId) => {
    const gear = DAO_GEAR.find(g => g.id === id)
    if (!gear) return false
    if ((daoGear.value[gear.id] || 0) >= gear.maxLevel) return false
    const inventory = useInventoryStore()
    return inventory.getItemCount(gear.material.itemId) >= gear.material.quantity && inventory.getItemCount('spirit_stone') >= gear.spiritStoneCost
  }
  const forgeDaoGear = (id: DaoGearId) => {
    const gear = DAO_GEAR.find(g => g.id === id)
    if (!gear) return false
    const current = daoGear.value[gear.id] || 0
    if (current >= gear.maxLevel) {
      showFloat(`${gear.name}已淬炼圆满。`, 'danger')
      return false
    }
    const inventory = useInventoryStore()
    if (inventory.getItemCount(gear.material.itemId) < gear.material.quantity) {
      showFloat(`${gear.material.name}不足，需要${gear.material.quantity}个。`, 'danger')
      return false
    }
    if (inventory.getItemCount('spirit_stone') < gear.spiritStoneCost) {
      showFloat(`灵石不足，需要${gear.spiritStoneCost}枚。`, 'danger')
      return false
    }
    inventory.removeItem(gear.material.itemId, gear.material.quantity)
    inventory.removeItem('spirit_stone', gear.spiritStoneCost)
    daoGear.value = { ...daoGear.value, [gear.id]: current + 1 }
    daoGearDurability.value = { ...daoGearDurability.value, [gear.id]: 100 }
    addLog(`你消耗${gear.material.name}×${gear.material.quantity}、灵石×${gear.spiritStoneCost}，将${gear.name}淬炼至${current + 1}阶。`)
    showFloat(`${gear.name}+1`, 'accent')
    return true
  }

  const maintainDaoGear = (id: DaoGearId) => {
    const gear = DAO_GEAR.find(g => g.id === id)
    if (!gear) return false
    if ((daoGear.value[id] || 0) <= 0) { showFloat('请先凝练装备。', 'danger'); return false }
    if ((daoGearDurability.value[id] ?? 100) >= 100) { showFloat(`${gear.name}灵韧充盈。`, 'accent'); return false }
    const cost = daoGearMaintenanceCost(id)
    if (!cost) return false
    const inv = useInventoryStore()
    const player = usePlayerStore()
    if (inv.getItemCount(cost.material.itemId) < cost.materialQty) { showFloat(`${cost.material.name}不足，需要${cost.materialQty}。`, 'danger'); return false }
    if (inv.getItemCount('spirit_stone') < cost.spiritStone) { showFloat(`灵石不足，需要${cost.spiritStone}。`, 'danger'); return false }
    if (!player.spendMoney(cost.money)) { showFloat(`铜钱不足，需要${cost.money}文。`, 'danger'); return false }
    inv.removeItem(cost.material.itemId, cost.materialQty)
    inv.removeItem('spirit_stone', cost.spiritStone)
    daoGearDurability.value = { ...daoGearDurability.value, [id]: 100 }
    addLog(`你以${cost.material.name}×${cost.materialQty}、灵石×${cost.spiritStone}并支付${cost.money}文，请炼器师重养${gear.name}灵韧。`)
    showFloat(`${gear.name}灵韧恢复`, 'success')
    return true
  }

  const wearDaoGear = (amount = 2) => {
    const next = { ...daoGearDurability.value }
    for (const gear of DAO_GEAR) if ((daoGear.value[gear.id] || 0) > 0) next[gear.id] = Math.max(20, (next[gear.id] ?? 100) - amount)
    daoGearDurability.value = next
  }

  const beastLevel = computed(() => Math.floor(beastBond.value / 100) + 1)
  const beastStage = computed(() => {
    if (!beast.value) return '未结契'
    if (beastBond.value >= 500) return '灵契'
    if (beastBond.value >= 300) return '同心'
    if (beastBond.value >= 100) return '亲近'
    return '初识'
  })
  const beastAssistDesc = computed(() => {
    if (beast.value === 'fox') return `协战：战斗胜利额外感应灵气，羁绊越高收益越多。`
    if (beast.value === 'crane') return `协战：战斗胜利额外沉淀修为，并强化战斗攻击。`
    if (beast.value === 'phoenix') return `协战：战斗胜利温养灵力，凶兽战有概率带回雷精。`
    return '尚未结契灵兽。'
  })
  const beastDailyAvailable = computed(() => !!beast.value && beastTrainingDailyKey.value !== todayKey())
  const beastExpeditionName = computed(() => beastExpedition.value?.type === 'guard' ? '守卫洞府' : beastExpedition.value?.type === 'expedition' ? '灵兽远征' : '空闲')

  const unlock = () => {
    if (unlocked.value) return false
    const player = usePlayerStore()
    if (earthPulse.value < 100) {
      showFloat(`地脉感应不足，还需${100 - earthPulse.value}点。先从收获作物开始感应田间灵机。`, 'danger')
      return false
    }
    if (!player.spendMoney(1800)) {
      showFloat('铜钱不足，需要1800文整理地脉。', 'danger')
      return false
    }
    unlocked.value = true
    fieldTier.value = Math.max(fieldTier.value, 1)
    aura.value += 80
    mana.value = maxMana.value
    addLog('你长期耕作积累的地脉感应终于贯通，田埂下涌出一缕温润灵脉，田庄启蒙为黄阶灵田。')
    showFloat('地脉初醒，灵田启蒙！', 'success')
    return true
  }

  const setCultivationPath = (id: CultivationPathId) => {
    if (!CULTIVATION_PATHS.some(p => p.id === id)) return false
    cultivationPath.value = id
    addLog(`你调整修行心境为「${currentCultivationPath.value.name}」，心境称号：${currentCultivationPath.value.title}。`)
    showFloat(currentCultivationPath.value.title, 'accent')
    return true
  }

  const meditate = () => {
    if (!unlocked.value) return unlock()
    const player = usePlayerStore()
    if (!player.consumeStamina(10)) {
      showFloat('体力不足，打坐需要10点体力。', 'danger')
      return false
    }
    const game = useGameStore()
    let gain = 12 + fieldTier.value * 6 + (spiritRoot.value === 'mixed' ? 0 : 4)
    let manaGain = 12 + fieldTier.value * 4
    let auraGain = 5 + fieldTier.value * 3 + (spiritRoot.value === 'mixed' ? 0 : 2)
    // Cave meditation room bonus
    if (hasCaveSlot('meditation')) { gain = Math.floor(gain * 2); manaGain = Math.floor(manaGain * 2) }
    // Crane bonus
    if (beast.value === 'crane') { gain = Math.floor(gain * 1.4) }
    // Fox bonus
    if (beast.value === 'fox') { auraGain = Math.floor(auraGain * 1.3) }
    // Cave aura regen
    auraGain += caveAuraRegen.value
    const manualMultiplier = 1 + manuals.value.wood * 0.05 + manuals.value.void * 0.03
    if (cultivationPath.value === 'balanced') { gain = Math.floor(gain * 1.08); manaGain = Math.floor(manaGain * 1.08); auraGain = Math.floor(auraGain * 1.05) }
    if (cultivationPath.value === 'alchemy') auraGain = Math.floor(auraGain * 1.08)
    gain = Math.floor(gain * manualMultiplier)
    manaGain = Math.floor(manaGain * (1 + manuals.value.void * 0.05))
    auraGain = Math.floor(auraGain * (1 + manuals.value.wood * 0.03))
    const cultivationResult = addCultivation(game.dailyFateType === 'cultivation' ? Math.floor(gain * 1.1) : gain)
    mana.value = Math.min(mana.value + manaGain, maxMana.value)
    aura.value += auraGain
    const tr = game.advanceTime(1)
    addLog(`静坐调息一刻，消耗体力10，修为+${cultivationResult.actual}${game.dailyFateType === 'cultivation' ? '（今日机缘加成）' : ''}，灵力+${manaGain}，灵气+${auraGain}${cultivationResult.auraGain ? `，溢出修为化为灵气+${cultivationResult.auraGain}` : ''}。`)
    showFloat(`修为+${cultivationResult.actual}`, 'accent')
    if (tr.message) addLog(tr.message)
    return true
  }

  const setAutoMeditate = (enabled: boolean) => {
    if (enabled && !unlocked.value) {
      showFloat('需先启蒙灵田。', 'danger')
      return false
    }
    autoMeditateEnabled.value = enabled
    if (enabled) {
      addLog('已开启后台自动打坐调息：切换页面也会继续自动修炼。')
      showFloat('后台自动打坐已开启', 'success')
    } else {
      addLog('已关闭后台自动打坐调息。')
      showFloat('后台自动打坐已关闭', 'accent')
    }
    return true
  }

  const toggleAutoMeditate = () => setAutoMeditate(!autoMeditateEnabled.value)

  const runAutoMeditateTick = () => {
    if (!autoMeditateEnabled.value) return false
    const ok = meditate()
    if (!ok) {
      autoMeditateEnabled.value = false
      addLog('后台自动打坐调息已暂停：体力不足或当前无法继续打坐。')
      return false
    }
    autoMeditateCount.value += 1
    return true
  }

  const refineAura = () => {
    if (!unlocked.value) return unlock()
    const player = usePlayerStore()
    if (!player.consumeStamina(5)) {
      showFloat('体力不足，炼化需要5点体力。', 'danger')
      return false
    }
    if (aura.value <= 0) {
      showFloat('没有可炼化的灵气。', 'danger')
      return false
    }
    const spend = Math.min(aura.value, 80 + fieldTier.value * 30)
    const game = useGameStore()
    const baseGain = Math.floor(spend * (1.15 + fieldTier.value * 0.12 + (artifacts.value.spiritKettle ? 0.18 : 0) + (cultivationPath.value === 'alchemy' ? 0.16 : 0)))
    const gain = game.dailyFateType === 'cultivation' ? Math.floor(baseGain * 1.1) : baseGain
    aura.value -= spend
    const result = addCultivation(gain)
    wearDaoGear(1)
    addLog(`消耗体力5，炼化灵气${spend}点，修为增长${result.actual}${game.dailyFateType === 'cultivation' ? '（今日机缘加成）' : ''}${result.auraGain ? `，溢出修为化为灵气+${result.auraGain}` : ''}。`)
    showFloat(`修为+${result.actual}`, 'success')
    return true
  }

  const breakthrough = () => {
    lastTribulationResult.value = 'none'
    if (!unlocked.value) return unlock()
    if (!canBreakthrough.value) {
      showFloat(`尚不能突破：${breakthroughRequirementText.value}。`, 'danger')
      return false
    }
    const old = realmName.value
    const cost = breakthroughAuraCost.value
    const major = isMajorBreakthrough.value
    aura.value -= cost
    const insightUsed = insight.value
    const demonBefore = heartDemon.value
    foundationPillBlessing.value = 0

    if (major && Math.random() > tribulationSuccessRate.value) {
      lastTribulationResult.value = 'fail'
      const cultivationLoss = Math.max(1, Math.floor(maxCultivation.value * 0.18))
      cultivation.value = Math.max(0, cultivation.value - cultivationLoss)
      mana.value = Math.max(0, Math.floor(mana.value * 0.35))
      yuanShenInjury.value = Math.min(9, yuanShenInjury.value + 1)
      heartDemon.value = Math.min(100, heartDemon.value + 14 + Math.floor(realmIndex.value / 3))
      insight.value = Math.max(0, Math.floor(insight.value * 0.55))
      if (yuanShenLevel.value > 0 && Math.random() < 0.45) {
        yuanShenLevel.value--
        yuanShenExp.value = 0
        addLog(`天雷贯体，突破失败！元神受创，元神等级跌落到${yuanShenLevel.value}。`)
      } else {
        addLog(`天雷贯体，突破失败！修为受损${cultivationLoss}，灵力大损，元神伤势+1。`)
      }
      showFloat('渡劫失败，元神受创', 'danger')
      return false
    }

    if (major) lastTribulationResult.value = 'success'
    if (major) {
      insight.value = Math.max(0, Math.floor(insight.value * 0.25))
      heartDemon.value = Math.max(0, heartDemon.value - 18)
    } else {
      insight.value = Math.max(0, insight.value - 10)
      heartDemon.value = Math.max(0, heartDemon.value - 3)
    }
    realmIndex.value = Math.min(realmIndex.value + 1, REALMS.length - 1)
    cultivation.value = 0
    mana.value = maxMana.value
    yuanShenInjury.value = Math.max(0, yuanShenInjury.value - 1)
    addLog(`${major ? '雷云散去，天光垂落，' : '灵田上空清气回旋，'}你从「${old}」突破至「${realmName.value}」！${insightUsed > 0 ? ` 顿悟余韵护持本心（顿悟${insightUsed}）。` : ''}${demonBefore > 0 ? ` 心魔压力稍退（原${demonBefore}）。` : ''}`)
    showFloat(`${major ? '渡劫成功' : '突破'}：${realmName.value}`, 'success')
    const player = usePlayerStore()
    player.addBonusMaxStamina(1)
    addLog("境界提升，体力上限+1（当前" + player.maxStamina + "）")
    try {
      const token = localStorage.getItem('account_token')
      if (token) {
        if (major) fetch('/api/breakthrough-announce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ playerName: player.playerName, from: old, to: realmName.value, realmIndex: realmIndex.value })
        }).catch(() => {})
      }
    } catch {}
    return true
  }

  const upgradeField = () => {
    if (!unlocked.value) return unlock()
    if (fieldTier.value >= FIELD_TIERS.length - 1) {
      showFloat('灵田已达最高等阶。', 'danger')
      return false
    }
    const cost = [0, 300, 900, 2200, 5200][fieldTier.value] ?? 9999
    if (aura.value < cost) {
      showFloat(`灵气不足，需要${cost}点。`, 'danger')
      return false
    }
    aura.value -= cost
    fieldTier.value++
    mana.value = maxMana.value
    addLog(`你以灵气温养地脉，田庄提升为「${fieldTierName.value}」。`)
    showFloat(fieldTierName.value, 'success')
    return true
  }

  const addAuraFromHarvest = (cropId: string, qty = 1) => {
    const base = getSpiritCropAura(cropId)
    if (base <= 0) return 0
    const spiritCrop = cropId === 'spirit_rice' || cropId === 'dew_grass' || cropId === 'vermilion_fruit' || cropId === 'ice_soul_lotus' || cropId === 'purple_ganoderma'
    if (!unlocked.value) {
      const pulseGain = Math.max(1, Math.floor(base * qty * (spiritCrop ? 8 : 2)))
      const before = earthPulse.value
      earthPulse.value = Math.min(100, earthPulse.value + pulseGain)
      if (before < 100 && earthPulse.value >= 100) {
        addLog('连续耕作让你听见田垄下的灵脉回响，可以前往「修行」启蒙灵田了。')
        showFloat('地脉感应圆满', 'accent')
      } else if (spiritCrop || earthPulse.value % 20 < before % 20) {
        addLog(`收获作物时感到一丝地脉回应，地脉感应+${pulseGain}。`)
      }
      return 0
    }
    const directRatio = spiritCrop ? 0.85 : 0.18
    const caveFarmBonus = hasCaveSlot('farm') ? 0.5 : 0
    const foxBonus = beast.value === 'fox' ? 0.3 : 0
    const artifactBonus = artifacts.value.glimmerHoe ? 0.25 : 0
    const rainBonus = artifacts.value.spiritRain ? 0.2 : 0
    const gain = Math.max(1, Math.floor(base * qty * directRatio * (1 + fieldTier.value * 0.25 + artifactBonus + rainBonus + caveFarmBonus + foxBonus + (spiritCrop ? sectSpiritCropAuraBonusRate.value : 0))))
    aura.value += gain
    totalAuraHarvested.value += gain
    addLog(`${spiritCrop ? '灵植' : '作物'}收获牵动田间灵机，获得灵气${gain}点。`)
    showFloat(`灵气+${gain}`, 'accent')
    return gain
  }


  const meditateInSeclusion = () => {
    if (!unlocked.value) return unlock()
    const player = usePlayerStore()
    const staminaCost = isMajorBreakthrough.value ? 16 : 12
    if (!player.consumeStamina(staminaCost)) { showFloat(`体力不足，闭关需要${staminaCost}点。`, 'danger'); return false }
    if (mana.value < 30) { showFloat('灵力不足，闭关至少需要30点灵力。', 'danger'); return false }
    const manaCost = Math.min(mana.value, 30 + Math.floor(realmIndex.value * 1.5))
    mana.value -= manaCost
    const pathInsightBonus = cultivationPath.value === 'thunder' ? 8 : cultivationPath.value === 'balanced' ? 4 : 0
    const gain = Math.floor(8 + fieldTier.value * 4 + yuanShenLevel.value * 0.8 + manuals.value.void * 5 + manuals.value.thunder * 3 + pathInsightBonus + (isMajorBreakthrough.value ? 10 : 0))
    insight.value = Math.min(100, insight.value + gain)
    const pathDemonClear = cultivationPath.value === 'balanced' ? 4 : cultivationPath.value === 'thunder' ? 2 : 0
    const demonClear = Math.min(heartDemon.value, 5 + manuals.value.void + Math.floor(yuanShenLevel.value / 8) + pathDemonClear + sectDemonClearBonus.value)
    heartDemon.value = Math.max(0, heartDemon.value - demonClear)
    useGameStore().advanceTime(1)
    addLog(`闭关参悟一刻，消耗体力${staminaCost}、灵力${manaCost}，顿悟+${gain}${demonClear ? `，心魔-${demonClear}` : ''}。`)
    showFloat(`顿悟+${gain}`, 'accent')
    return true
  }
// V1.3.7: 秘境稀有事件触发
  const triggerRealmEvent = (): string | null => {
    const inventory = useInventoryStore()
    const eligible = REALM_EVENTS.filter(e => e.chance > 0 && realmIndex.value >= e.minRealm)
    for (const event of eligible) {
      if (Math.random() < event.chance) {
        switch (event.effect) {
          case 'insight':
            insight.value = Math.min(100, insight.value + event.value)
            addLog(`${event.name}：${event.desc} 顿悟+${event.value}。`)
            break
          case 'aura':
            aura.value += event.value
            addLog(`${event.name}：${event.desc} 灵气+${event.value}。`)
            break
          case 'demon_clear':
            heartDemon.value = Math.max(0, heartDemon.value - event.value)
            addLog(`${event.name}：${event.desc} 心魔-${event.value}。`)
            break
          case 'item':
            if (event.itemReward) {
              inventory.addItem(event.itemReward.itemId, event.itemReward.qty)
              addLog(`${event.name}：${event.desc} 获得${event.itemReward.name}×${event.itemReward.qty}。`)
            }
            break
          case 'artifact_hint':
            insight.value = Math.min(100, insight.value + event.value)
            addLog(`${event.name}：${event.desc} 顿悟+${event.value}。`)
            break
        }
        return event.name
      }
    }
    return null
  }

  const gameDayKey = () => {
    const game = useGameStore()
    return `${game.year}-${game.season}-${game.day}`
  }
  const resetLessonDailyIfNeeded = () => {
    const key = gameDayKey()
    if (lessonDailyKey.value !== key) {
      lessonDailyKey.value = key
      lessonDailyDone.value = []
    }
  }
  const lessonAvailable = (id: CultivationLessonId) => {
    resetLessonDailyIfNeeded()
    return !lessonDailyDone.value.includes(id)
  }
  const doCultivationLesson = (id: CultivationLessonId) => {
    if (!unlocked.value) return unlock()
    resetLessonDailyIfNeeded()
    const lesson = CULTIVATION_LESSONS.find(l => l.id === id)
    if (!lesson) return false
    if (!lessonAvailable(id)) { showFloat('这门修行课业今日已经完成。', 'danger'); return false }
    const player = usePlayerStore()
    const inventory = useInventoryStore()
    if (!player.consumeStamina(lesson.stamina)) { showFloat(`体力不足，需要${lesson.stamina}点。`, 'danger'); return false }
    if ((lesson.auraCost || 0) > aura.value) { showFloat(`灵气不足，需要${lesson.auraCost}点。`, 'danger'); return false }
    if ((lesson.manaCost || 0) > mana.value) { showFloat(`灵力不足，需要${lesson.manaCost}点。`, 'danger'); return false }
    if (lesson.itemCost && inventory.getItemCount(lesson.itemCost.itemId) < lesson.itemCost.quantity) { showFloat(`${lesson.itemCost.name}不足。`, 'danger'); return false }
    if (lesson.auraCost) aura.value -= lesson.auraCost
    if (lesson.manaCost) mana.value -= lesson.manaCost
    if (lesson.itemCost) inventory.removeItem(lesson.itemCost.itemId, lesson.itemCost.quantity)
    const pathLessonBonus = (cultivationPath.value === 'balanced' && lesson.id === 'morning_breath') ? 0.12 : (cultivationPath.value === 'sword' && lesson.id === 'circulate_qi') ? 0.14 : (cultivationPath.value === 'thunder' && lesson.id === 'thunder_contemplation') ? 0.16 : 0
    const tierBonus = 1 + fieldTier.value * 0.1 + manuals.value.wood * 0.025 + manuals.value.void * 0.02 + (cultivationPath.value === 'alchemy' ? 0.08 : 0)
    const auraGain = Math.floor((lesson.reward.aura || 0) * tierBonus)
    const cultivationGain = Math.floor((lesson.reward.cultivation || 0) * (1 + realmIndex.value * 0.015 + manuals.value.wood * 0.03 + manuals.value.thunder * 0.02 + pathLessonBonus))
    const manaGain = Math.floor((lesson.reward.mana || 0) * (1 + manuals.value.void * 0.04))
    const yuanShenGain = Math.floor((lesson.reward.yuanShenExp || 0) * (1 + manuals.value.void * 0.03 + manuals.value.thunder * 0.02))
    aura.value += auraGain
    addCultivation(cultivationGain)
    mana.value = Math.min(maxMana.value, mana.value + manaGain)
    if (yuanShenGain > 0) addYuanShenExp(yuanShenGain)
    lessonDailyDone.value.push(id)
    useGameStore().advanceTime(1)
    addLog(`完成修行课业「${lesson.name}」，灵气+${auraGain}，修为+${cultivationGain}，灵力+${manaGain}${yuanShenGain ? `，元神经验+${yuanShenGain}` : ''}。`)
    showFloat(`${lesson.name}完成`, 'success')
    return true
  }
  const spiritMealAvailable = (id: SpiritMealId) => spiritMealLastDaily.value[id] !== gameDayKey()
  const cookSpiritMeal = (id: SpiritMealId) => {
    if (!unlocked.value) return unlock()
    const recipe = SPIRIT_MEAL_RECIPES.find(r => r.id === id)
    if (!recipe) return false
    if (fieldTier.value < recipe.minFieldTier) {
      showFloat(`需要${FIELD_TIERS[recipe.minFieldTier] || '更高阶灵田'}。`, 'danger')
      return false
    }
    if (!spiritMealAvailable(id)) {
      showFloat('这道灵膳今日已经食用过了。', 'danger')
      return false
    }
    const inventory = useInventoryStore()
    for (const mat of recipe.materials) {
      if (inventory.getItemCount(mat.itemId) < mat.quantity) {
        showFloat(`${mat.name}不足。`, 'danger')
        return false
      }
    }
    const player = usePlayerStore()
    if (!player.consumeStamina(recipe.stamina)) {
      showFloat(`体力不足，需要${recipe.stamina}点。`, 'danger')
      return false
    }
    for (const mat of recipe.materials) inventory.removeItem(mat.itemId, mat.quantity)
    const tierBonus = 1 + fieldTier.value * 0.12 + (hasCaveSlot('herbgarden') ? 0.18 : 0)
    const auraGain = Math.floor(recipe.aura * tierBonus)
    const cultivationGain = Math.floor(recipe.cultivation * (1 + fieldTier.value * 0.08 + (beast.value === 'crane' ? 0.12 : 0)))
    const manaGain = Math.floor(recipe.mana * (1 + (hasCaveSlot('meditation') ? 0.15 : 0)))
    aura.value += auraGain
    addCultivation(cultivationGain)
    mana.value = Math.min(maxMana.value, mana.value + manaGain)
    spiritMealLastDaily.value[id] = gameDayKey()
    useGameStore().advanceTime(1)
    addLog(`烹成「${recipe.name}」，药食同源，灵气+${auraGain}，修为+${cultivationGain}，灵力+${manaGain}。`)
    showFloat(`${recipe.name}：修为+${cultivationGain}`, 'success')
    return true
  }

  const unlockAlchemy = () => {
    if (!unlocked.value) return unlock()
    if (alchemyUnlocked.value) return true
    const player = usePlayerStore()
    if (!player.spendMoney(5000)) {
      showFloat('铜钱不足，需要5000文安置炼丹炉。', 'danger')
      return false
    }
    alchemyUnlocked.value = true
    addLog('你在灵田旁安置了一座小炼丹炉，灵植终于有了真正用途。')
    showFloat('炼丹炉已开启', 'success')
    return true
  }


  const rollAlchemyQuality = (): { quality: AlchemyQuality; label: string; outputBonus: number; bonusRate: number } => {
    const caveBonus = hasCaveSlot('alchemy') ? 0.08 : 0
    const alchemySectBonus = sect.value === 'alchemy' ? Math.min(0.16, 0.02 * sectSkillTotal.value + 0.015 * (sectRank.value || 0)) : 0
    const pathBonus = cultivationPath.value === 'alchemy' ? 0.08 : 0
    const highRealmBonus = Math.min(0.08, Math.max(0, realmIndex.value - 10) * 0.004)
    const perfectChance = Math.min(0.24, 0.04 + caveBonus * 0.4 + alchemySectBonus + pathBonus * 0.5 + highRealmBonus)
    const fineChance = Math.min(0.55, 0.22 + caveBonus + alchemySectBonus + pathBonus + highRealmBonus)
    const roll = Math.random()
    if (roll < perfectChance) return { quality: 'perfect', label: '极品', outputBonus: 1, bonusRate: 0.30 }
    if (roll < perfectChance + fineChance) return { quality: 'fine', label: '上品', outputBonus: 0, bonusRate: 0.15 }
    return { quality: 'normal', label: '普通', outputBonus: 0, bonusRate: 0 }
  }

  const applyAlchemyQualityBonus = (pillId: PillId, quality: AlchemyQuality, bonusRate: number): string => {
    if (quality === 'normal' || bonusRate <= 0) return ''
    if (pillId === 'mana_recovery_pill') {
      const manaGain = quality === 'perfect' ? 18 : 8
      mana.value = Math.min(maxMana.value, mana.value + manaGain)
      return `炉火回灵，灵力+${manaGain}`
    }
    if (pillId === 'qi_gathering_pill' || pillId === 'lianjing_pill' || pillId === 'huaqi_pill' || pillId === 'lianqi_pill' || pillId === 'huashen_pill' || pillId === 'lianshen_pill' || pillId === 'ganoderma_pill') {
      const gain = Math.max(30, Math.floor((ALCHEMY_RECIPES[pillId].aura + ALCHEMY_RECIPES[pillId].mana * 3) * bonusRate))
      addCultivation(gain)
      return `丹香入体，修为+${gain}`
    }
    if (pillId === 'foundation_pill' || pillId === 'returning_void_pill' || pillId === 'refining_void_pill' || pillId === 'merge_way_pill') {
      const blessing = Math.max(120, Math.floor(ALCHEMY_RECIPES[pillId].aura * bonusRate))
      foundationPillBlessing.value += blessing
      return `药力凝实，突破灵气额外-${blessing}`
    }
    if (pillId === 'snow_lotus_pill' || pillId === 'ice_soul_pill') {
      const clear = Math.min(heartDemon.value, quality === 'perfect' ? 6 : 3)
      heartDemon.value = Math.max(0, heartDemon.value - clear)
      insight.value = Math.min(100, insight.value + (quality === 'perfect' ? 6 : 3))
      return `清心丹香，顿悟+${quality === 'perfect' ? 6 : 3}${clear ? `，心魔-${clear}` : ''}`
    }
    if (pillId === 'soul_mending_pill' || pillId === 'nirvana_soul_pill' || pillId === 'good_fortune_pill') {
      const exp = quality === 'perfect' ? 80 : 35
      addYuanShenExp(exp)
      return `魂香温养，元神经验+${exp}`
    }
    if (pillId === 'spirit_mending_pill') {
      const manaGain = quality === 'perfect' ? 12 : 6
      mana.value = Math.min(maxMana.value, mana.value + manaGain)
      return `补灵余韵，灵力+${manaGain}`
    }
    if (pillId === 'dragon_face_pill') {
      const exp = quality === 'perfect' ? 80 : 40
      usePlayerStore().addAttributeExpBatch({ physique: exp, perception: exp })
      return `龙颜余香，体魄/悟性经验+${exp}`
    }
    const auraGain = Math.max(20, Math.floor(ALCHEMY_RECIPES[pillId].aura * bonusRate * 0.5))
    aura.value += auraGain
    return `丹气回流，灵气+${auraGain}`
  }

  const craftPill = (pillId: PillId) => {
    if (!alchemyUnlocked.value && !unlockAlchemy()) return false
    const recipe = ALCHEMY_RECIPES[pillId]
    if ((recipe as any).minRealm && realmIndex.value < (recipe as any).minRealm) {
      showFloat(`此丹方需达到${REALMS[(recipe as any).minRealm]?.name || '更高境界'}方能炼制。`, 'danger')
      return
    }
    const inventory = useInventoryStore()
    for (const mat of recipe.materials) {
      if (inventory.getItemCount(mat.itemId) < mat.quantity) {
        showFloat('灵植材料不足。', 'danger')
        return false
      }
    }
    const auraCost = hasCaveSlot('alchemy') ? Math.floor(recipe.aura * 0.8) : recipe.aura
    if (aura.value < auraCost || mana.value < recipe.mana) {
      showFloat(`炼丹需要灵气${auraCost}、灵力${recipe.mana}。`, 'danger')
      return false
    }
    for (const mat of recipe.materials) inventory.removeItem(mat.itemId, mat.quantity)
    aura.value -= auraCost
    mana.value -= recipe.mana
    const quality = rollAlchemyQuality()
    const extraOutput = Math.random() < sectAlchemyExtraOutputChance.value ? 1 : 0
    const finalOutput = recipe.output + extraOutput + quality.outputBonus
    const bonusText = applyAlchemyQualityBonus(pillId, quality.quality, quality.bonusRate)
    lastAlchemyQuality.value = { pillId, quality: quality.quality, label: quality.label, bonusText }
    inventory.addItem(pillId, finalOutput)
    addLog(`炼成${quality.label}${recipe.name}×${finalOutput}${extraOutput ? '（丹宗加成，额外成丹）' : ''}${quality.outputBonus ? '（极品加成，额外成丹）' : ''}${bonusText ? `；${bonusText}` : ''}。`)
    showFloat(`${quality.label}${recipe.name}+${finalOutput}`, quality.quality === 'perfect' ? 'accent' : 'success')
    return true
  }

  const gainIdleCultivation = (minutes: number) => {
    if (!unlocked.value || minutes <= 0) return { aura: 0, cultivation: 0, yuanShen: 0 }
    const capped = Math.min(minutes, 12 * 60)
    const auraGain = Math.max(1, Math.floor(capped * (1.2 + fieldTier.value * 0.35 + caveAuraRegen.value * 0.08 + (hasCaveSlot('spiritArray') ? 0.8 : 0) + manuals.value.wood * 0.12)))
    const cultivationGain = Math.max(1, Math.floor(capped * (4 + realmIndex.value * 0.28 + fieldTier.value * 0.8 + (hasCaveSlot('meditation') ? 3 : 0) + (beast.value === 'crane' ? 2 : 0) + manuals.value.void * 0.25)))
    const yuanShenGain = Math.max(0, Math.floor(capped / 30) + (hasCaveSlot('meditation') ? Math.floor(capped / 60) : 0))
    aura.value += auraGain
    addCultivation(cultivationGain)
    if (yuanShenGain > 0) addYuanShenExp(yuanShenGain)
    return { aura: auraGain, cultivation: cultivationGain, yuanShen: yuanShenGain }
  }

  const recoverYuanShenInjury = (amount = 1) => {
    const before = yuanShenInjury.value
    yuanShenInjury.value = Math.max(0, yuanShenInjury.value - amount)
    return before - yuanShenInjury.value
  }

  const learnManual = (key?: string): { success: boolean; message: string } => {
    if (!unlocked.value) return { success: false, message: '启蒙灵田后才能研读功法。' }
    if (key !== 'wood' && key !== 'thunder' && key !== 'void') return { success: false, message: '功法秘籍无效。' }
    if (manuals.value[key] > 0) return { success: false, message: `你已经学会${CULTIVATION_MANUALS[key].name}。` }
    manuals.value[key] = 1
    showFloat(`习得${CULTIVATION_MANUALS[key].name}`, 'success')
    return { success: true, message: `研读秘籍，习得功法「${CULTIVATION_MANUALS[key].name}」！` }
  }

  const upgradeManual = (key: CultivationManualKey): { success: boolean; message: string } => {
    const def = CULTIVATION_MANUALS[key]
    const level = manuals.value[key] ?? 0
    if (level <= 0) return { success: false, message: `尚未习得${def.name}。` }
    if (level >= def.maxLevel) return { success: false, message: `${def.name}已修至圆满。` }
    const auraNeed = def.auraCost * level
    const cultivationNeed = def.cultivationCost * level
    if (aura.value < auraNeed || cultivation.value < cultivationNeed) return { success: false, message: `资源不足：需要灵气${auraNeed}、修为${cultivationNeed}。` }
    aura.value -= auraNeed
    cultivation.value -= cultivationNeed
    manuals.value[key] = level + 1
    addLog(`参悟${def.name}，功法提升至${manuals.value[key]}层。`)
    showFloat(`${def.name}+1`, 'success')
    return { success: true, message: `${def.name}提升至${manuals.value[key]}层。` }
  }

  const addCultivation = (amount: number, overflowAuraRate = 0.18): { actual: number; overflow: number; auraGain: number } => {
    const gain = Math.max(0, Math.floor(amount))
    const before = cultivation.value
    cultivation.value = Math.min(maxCultivation.value, cultivation.value + gain)
    const actual = cultivation.value - before
    const overflow = Math.max(0, gain - actual)
    const auraGain = overflow > 0 ? Math.max(1, Math.floor(overflow * overflowAuraRate)) : 0
    if (auraGain > 0) aura.value += auraGain
    return { actual, overflow, auraGain }
  }

  const advanceMinorRealms = (steps: number): { from: string; to: string; actual: number } => {
    const from = realmName.value
    const limit = 16 // 元婴初期及以上不可使用市集直升丹
    const oldIndex = realmIndex.value
    realmIndex.value = Math.min(limit - 1, realmIndex.value + Math.max(0, Math.floor(steps)))
    const actual = realmIndex.value - oldIndex
    if (actual > 0) {
      cultivation.value = 0
      mana.value = maxMana.value
      usePlayerStore().addBonusMaxStamina(actual)
    }
    return { from, to: realmName.value, actual }
  }

  const addYuanShenExp = (amount: number) => {
    yuanShenExp.value += amount
    let leveled = 0
    while (yuanShenExp.value >= (yuanShenLevel.value + 1) * 500) {
      yuanShenExp.value -= (yuanShenLevel.value + 1) * 500
      yuanShenLevel.value++
      leveled++
    }
    return leveled
  }

  const usePill = (pillId: UsablePillId) => {
    const inventory = useInventoryStore()
    if (!inventory.hasItem(pillId)) {
      showFloat('背包中没有这种丹药。', 'danger')
      return false
    }
    if (pillId === 'rebirth_pill') {
      showFloat('轮回丹是转生凭证，请在修行页「轮回殿」使用。', 'accent')
      addLog('轮回丹不可直接服用，需要在轮回殿配合灵气、铜钱与轮回材料完成转生。')
      return false
    }
    const player = usePlayerStore()
    if (pillId === 'mana_recovery_pill') {
      if (mana.value >= maxMana.value) {
        showFloat('灵力已满，回灵丹未消耗。', 'accent')
        addLog('灵力已满，回灵丹暂未服用。')
        return false
      }
      inventory.removeItem(pillId, 1)
      const gain = 45 + fieldTier.value * 10
      const before = mana.value
      mana.value = Math.min(maxMana.value, mana.value + gain)
      const actual = mana.value - before
      addLog(`服下一枚回灵丹，灵力恢复${actual}。`)
      showFloat(`灵力+${actual}`, 'success')
    } else if (pillId === 'cultivation_boost_pill') {
      if (realmIndex.value >= 16) { showFloat('元婴期及以上已无法服用修为丹。', 'danger'); return false }
      inventory.removeItem(pillId, 1)
      const gain = Math.max(1200, Math.floor(maxCultivation.value * 0.35))
      const result = addCultivation(gain)
      addLog(`服下一枚修为丹，修为增长${result.actual}${result.auraGain ? `，溢出药力化为灵气+${result.auraGain}` : ''}。`)
      showFloat(`修为+${result.actual}`, 'success')
    } else if (pillId === 'minor_realm_pill') {
      if (realmIndex.value >= 16) { showFloat('元婴期及以上已无法服用境界丹。', 'danger'); return false }
      inventory.removeItem(pillId, 1)
      const r = advanceMinorRealms(1)
      addLog(`服下一枚境界丹，从「${r.from}」晋升至「${r.to}」。`)
      showFloat(`境界提升：${r.to}`, 'success')
    } else if (pillId === 'ascension_boost_pill') {
      if (realmIndex.value >= 16) { showFloat('元婴期及以上已无法服用直升丹。', 'danger'); return false }
      inventory.removeItem(pillId, 1)
      const r = advanceMinorRealms(3)
      addLog(`服下一枚直升丹，从「${r.from}」晋升至「${r.to}」（提升${r.actual}重）。`)
      showFloat(`直升至：${r.to}`, 'success')
    } else if (pillId === 'qi_gathering_pill') {
      inventory.removeItem(pillId, 1)
      const gain = 160 + fieldTier.value * 45
      addCultivation(gain)
      addLog(`服下一枚聚气丹，修为增长${gain}。`)
      showFloat(`修为+${gain}`, 'success')
    } else if (pillId === 'foundation_pill') {
      inventory.removeItem(pillId, 1)
      foundationPillBlessing.value += 900
      addCultivation(300)
      addLog('服下一枚筑基丹，突破所需灵气降低900，并获得修为300。')
      showFloat('筑基丹生效', 'success')
    } else if (pillId === 'lianjing_pill') {
      inventory.removeItem(pillId, 1)
      addCultivation(500)
      addLog('服下一枚炼精丹，修为增长500。')
      showFloat('修为+500', 'success')
    } else if (pillId === 'huaqi_pill') {
      inventory.removeItem(pillId, 1)
      addCultivation(800)
      mana.value = Math.min(maxMana.value, mana.value + 30)
      addLog('服下一枚化气丹，修为+800，灵力+30。')
      showFloat('化气丹生效', 'success')
    } else if (pillId === 'lianqi_pill') {
      inventory.removeItem(pillId, 1)
      addCultivation(1200)
      aura.value += 60
      addLog('服下一枚炼气丹，修为+1200，灵气+60。')
      showFloat('炼气丹生效', 'success')
    } else if (pillId === 'huashen_pill') {
      inventory.removeItem(pillId, 1)
      addCultivation(2500)
      addLog('服下一枚化神丹，修为增长2500。')
      showFloat('修为+2500', 'success')
    } else if (pillId === 'lianshen_pill') {
      inventory.removeItem(pillId, 1)
      addCultivation(4000)
      addLog('服下一枚炼神丹，修为增长4000。')
      showFloat('修为+4000', 'success')
    } else if (pillId === 'life_extension_pill') {
      inventory.removeItem(pillId, 1)
      player.restoreStamina(player.maxStamina)
      addLog('服下一枚延寿丹，体力完全恢复。')
      showFloat('体力已恢复', 'success')
    } else if (pillId === 'marrow_wash_pill') {
      const roots: SpiritRoot[] = ['mixed', 'wood', 'water', 'earth', 'fire', 'metal', 'celestial']
      const idx = roots.indexOf(spiritRoot.value)
      if (idx >= roots.length - 1) {
        showFloat('已是天灵根，洗髓丹未消耗。', 'accent')
        addLog('你已是天灵根，洗髓丹暂未消耗。')
        return false
      }
      inventory.removeItem(pillId, 1)
      spiritRoot.value = roots[Math.max(0, idx) + 1] ?? 'wood'
      addLog(`服下一枚洗髓丹，灵根晋升为「${spiritRootName.value}」。`)
      showFloat(`灵根晋升：${spiritRootName.value}`, 'success')
    } else if (pillId === 'ganoderma_pill') {
      inventory.removeItem(pillId, 1)
      const cultivationGain = Math.max(1, Math.floor(maxCultivation.value * 0.15))
      const beforeCultivation = cultivation.value
      addCultivation(cultivationGain)
      const actualCultivation = cultivation.value - beforeCultivation
      aura.value += 300
      addLog(`服下一枚灵芝培元丹，修为增长${actualCultivation}，灵气+300。`)
      showFloat(`修为+${actualCultivation} 灵气+300`, 'success')
    } else if (pillId === 'good_fortune_pill') {
      inventory.removeItem(pillId, 1)
      const leveled = addYuanShenExp(900)
      addLog(`服下一枚造化丹，元神经验+900${leveled ? `，元神提升${leveled}级` : ''}。`)
      showFloat('元神经验+900', 'success')
    } else if (pillId === 'returning_void_pill') {
      inventory.removeItem(pillId, 1)
      foundationPillBlessing.value += 1500
      addLog('服下一枚还虚丹，下次突破灵气需求降低1500。')
      showFloat('突破灵气-1500', 'success')
    } else if (pillId === 'refining_void_pill') {
      inventory.removeItem(pillId, 1)
      foundationPillBlessing.value += 3000
      addLog('服下一枚炼虚丹，下次突破灵气需求降低3000。')
      showFloat('突破灵气-3000', 'success')
    } else if (pillId === 'merge_way_pill') {
      inventory.removeItem(pillId, 1)
      foundationPillBlessing.value += 5000
      addLog('服下一枚合道丹，下次突破灵气需求降低5000。')
      showFloat('突破灵气-5000', 'success')
    } else if (pillId === 'soul_mending_pill') {
      inventory.removeItem(pillId, 1)
      const healed = recoverYuanShenInjury(2)
      player.restoreHealth(Math.floor(player.getMaxHp() * 0.35))
      addLog(`服下一枚养魂丹，元神伤势恢复${healed}层，并治疗肉身伤势。`)
      showFloat(healed ? `元神伤势-${healed}` : '伤势已恢复', 'success')
    } else if (pillId === 'nirvana_soul_pill') {
      inventory.removeItem(pillId, 1)
      const healed = recoverYuanShenInjury(9)
      yuanShenLevel.value += 1
      player.restoreHealth(player.getMaxHp())
      addLog(`服下一枚涅魂丹，元神伤势清除${healed}层，元神等级+1，伤势完全恢复。`)
      showFloat('元神重凝，等级+1', 'success')
    } else if (pillId === 'dragon_face_pill') {
      inventory.removeItem(pillId, 1)
      player.addBonusMaxStamina(20)
      player.restoreStamina(20)
      addLog('服下一枚龙颜丹，体力上限+20。')
      showFloat('体力上限+20', 'success')
    } else if (pillId === 'spirit_mending_pill') {
      inventory.removeItem(pillId, 1)
      yuanShenLevel.value++
      mana.value = maxMana.value
      addLog('服下一枚补灵丹，元神稳固，灵力上限提升。')
      showFloat('元神等级+1', 'success')
    }
    return true
  }

  const unlockArtifact = (key: ArtifactKey) => {
    if (!unlocked.value) return unlock()
    if (artifacts.value[key]) return true
    const cost: Record<ArtifactKey, { aura: number; money: number }> = {
      glimmerHoe: { aura: 220, money: 2000 },
      spiritKettle: { aura: 320, money: 2600 },
      spiritRain: { aura: 520, money: 3600 }
    }
    const c = cost[key]
    const player = usePlayerStore()
    if (aura.value < c.aura || player.money < c.money) {
      showFloat(`${ARTIFACT_NAMES[key]}需要灵气${c.aura}、铜钱${c.money}。`, 'danger')
      return false
    }
    aura.value -= c.aura
    player.spendMoney(c.money)
    artifacts.value[key] = true
    const effect = key === 'glimmerHoe' ? '灵植收获灵气提高' : key === 'spiritKettle' ? '炼化灵气收益提高' : '灵植收获额外引灵'
    addLog(`法宝化完成：${ARTIFACT_NAMES[key]}。${effect}。`)
    showFloat(ARTIFACT_NAMES[key], 'success')
    return true
  }

  // === V0.3 洞府 ===
  const openCave = () => {
    if (!unlocked.value) return unlock()
    if (caveTier.value > 0) { showFloat('已有洞府。', 'danger'); return false }
    const player = usePlayerStore()
    if (!player.spendMoney(8000)) { showFloat('铜钱不足，需要8000文开辟洞府。', 'danger'); return false }
    if (aura.value < 200) { showFloat('灵气不足，需要200点。', 'danger'); return false }
    aura.value -= 200
    caveTier.value = 1
    caveSlots.value = []
    caveStability.value = 100
    caveMaintenanceKey.value = todayKey()
    addLog('你于山壁凿开石门，一处天然石洞现于眼前——洞府开辟！')
    showFloat('洞府开辟！', 'success')
    return true
  }

  const upgradeCave = () => {
    if (caveTier.value <= 0) return openCave()
    if (caveTier.value >= CAVE_TIERS.length - 1) { showFloat('洞府已达最高等阶。', 'danger'); return false }
    const next = CAVE_TIERS[caveTier.value + 1]!
    if (aura.value < next.cost) { showFloat(`灵气不足，需要${next.cost}点。`, 'danger'); return false }
    aura.value -= next.cost
    caveTier.value++
    caveStability.value = Math.min(115, caveStability.value + 20)
    addLog(`洞府扩建为「${caveTierName.value}」，可用槽位${caveMaxSlots.value}个，每日灵气恢复+${caveAuraRegen.value}。`)
    showFloat(caveTierName.value, 'success')
    return true
  }

  const placeCaveSlot = (type: CaveSlotType) => {
    if (caveTier.value <= 0) { showFloat('请先开辟洞府。', 'danger'); return false }
    if (caveSlots.value.includes(type)) { showFloat('已安置此设施。', 'danger'); return false }
    if (caveSlots.value.length >= caveMaxSlots.value) { showFloat('洞府槽位已满，请先扩建。', 'danger'); return false }
    const player = usePlayerStore()
    const cost = { alchemy: 3000, farm: 2000, meditation: 4000, herbgarden: 5000, spiritArray: 5000 }[type] ?? 0
    if (!player.spendMoney(cost)) { showFloat(`铜钱不足，需要${cost}文。`, 'danger'); return false }
    caveSlots.value = [...caveSlots.value, type]
    addLog(`洞府内安置了「${CAVE_SLOT_DATA[type].name}」——${CAVE_SLOT_DATA[type].desc}`)
    showFloat(`${CAVE_SLOT_DATA[type].name}已安置`, 'success')
    return true
  }

  const removeCaveSlot = (type: CaveSlotType) => {
    const index = caveSlots.value.indexOf(type)
    if (index < 0) { showFloat('该洞府设施尚未安置。', 'danger'); return false }
    caveSlots.value = caveSlots.value.filter(slot => slot !== type)
    addLog(`已取消安置「${CAVE_SLOT_DATA[type].name}」，洞府槽位空出。`)
    showFloat(`已取消${CAVE_SLOT_DATA[type].name}`, 'success')
    return true
  }

  const caveMaintenanceCost = computed(() => ({
    money: Math.max(1500, caveTier.value * 3500 + caveSlots.value.length * 900),
    aura: Math.max(80, caveTier.value * 120 + caveSlots.value.length * 35),
    spiritStone: Math.max(2, caveTier.value * 4 + caveSlots.value.length * 2)
  }))
  const caveNeedsMaintenance = computed(() => caveTier.value > 0 && caveStability.value < 100)
  const maintainCave = () => {
    if (caveTier.value <= 0) { showFloat('请先开辟洞府。', 'danger'); return false }
    if (caveStability.value >= 100) { showFloat('洞府灵脉稳定，无需维护。', 'accent'); return false }
    const cost = caveMaintenanceCost.value
    const inv = useInventoryStore()
    const player = usePlayerStore()
    if (aura.value < cost.aura) { showFloat(`灵气不足，需要${cost.aura}。`, 'danger'); return false }
    if (inv.getItemCount('spirit_stone') < cost.spiritStone) { showFloat(`灵石不足，需要${cost.spiritStone}。`, 'danger'); return false }
    if (!player.spendMoney(cost.money)) { showFloat(`铜钱不足，需要${cost.money}文。`, 'danger'); return false }
    aura.value -= cost.aura
    inv.removeItem('spirit_stone', cost.spiritStone)
    caveStability.value = 110
    caveMaintenanceKey.value = todayKey()
    addLog(`你整修洞府灵脉，消耗铜钱${cost.money}、灵气${cost.aura}、灵石×${cost.spiritStone}，洞府稳定恢复。`)
    showFloat('洞府灵脉稳定', 'success')
    return true
  }
  const dailyCaveMaintenanceUpdate = () => {
    if (caveTier.value <= 0) return ''
    const today = todayKey()
    if (caveMaintenanceKey.value === today) return ''
    const days = realDailyPendingDays(caveMaintenanceKey.value || today)
    if (days <= 0) { caveMaintenanceKey.value = today; return '' }
    const loss = Math.min(45, days * (4 + caveTier.value + caveSlots.value.length))
    caveStability.value = Math.max(45, caveStability.value - loss)
    caveMaintenanceKey.value = today
    if (caveStability.value < 80) return `洞府灵脉稳定降至${caveStability.value}，恢复收益下降，可在洞府维护。`
    return ''
  }

  // === V0.3 灵兽 ===
  const encounterBeast = () => {
    if (!unlocked.value) return unlock()
    if (beast.value) { showFloat('你已有灵兽伙伴。', 'danger'); return false }
    const cost = 30
    if (mana.value < cost) { showFloat('灵力不足，需要30点引灵。', 'danger'); return false }
    mana.value -= cost
    const game = useGameStore()
    const tr = game.advanceTime(1)
    // Random encounter
    const roll = Math.random()
    const chosen: BeastId = roll < 0.4 ? 'fox' : roll < 0.75 ? 'crane' : 'phoenix'
    beast.value = chosen
    beastBond.value = 10
    addLog(`你循灵气而行，在一处灵泉边遇到了${BEAST_DATA[chosen].emoji}${BEAST_DATA[chosen].name}！它似乎愿意跟随你修行。`)
    showFloat(`遇到${BEAST_DATA[chosen].name}！`, 'success')
    if (tr.message) addLog(tr.message)
    return true
  }

  const feedBeast = () => {
    if (!beast.value) { showFloat('你还没有灵兽伙伴。', 'danger'); return false }
    const data = BEAST_DATA[beast.value]
    const inventory = useInventoryStore()
    const feedName = data.feedCrop === 'dew_grass' ? '凝露草' : data.feedCrop === 'spirit_rice' ? '蕴灵稻' : '朱果'
    const beforeCount = inventory.getItemCount(data.feedCrop)
    if (beforeCount < data.feedQty) {
      showFloat(`${data.name}需要${feedName}×${data.feedQty}。`, 'danger')
      return false
    }
    const removed = inventory.removeItem(data.feedCrop, data.feedQty)
    const afterCount = inventory.getItemCount(data.feedCrop)
    if (!removed || beforeCount - afterCount < data.feedQty) {
      showFloat(`${feedName}扣除失败，请整理背包后重试。`, 'danger')
      addLog(`喂食${data.name}失败：${feedName}未正确扣除，未增加羁绊。`)
      return false
    }
    beastBond.value += 25
    addLog(`你喂食${data.emoji}${data.name}，消耗${feedName}×${data.feedQty}，羁绊加深。当前羁绊：${beastBond.value}`)
    showFloat(`${feedName}-${data.feedQty} 羁绊+25`, 'success')
    return true
  }

  const startBeastExpedition = (type: 'guard' | 'expedition') => {
    if (!beast.value) { showFloat('你还没有灵兽伙伴。', 'danger'); return false }
    if (beastBond.value < 300) { showFloat('灵兽羁绊达到同心后才能派遣。', 'danger'); return false }
    if (beastExpedition.value) { showFloat('灵兽已有任务。', 'danger'); return false }
    beastExpedition.value = { type, daysLeft: type === 'guard' ? 1 : 2 }
    addLog(`${beastEmoji.value}${beastName.value}开始${type === 'guard' ? '守卫洞府' : '外出远征'}。`)
    showFloat(type === 'guard' ? '守卫洞府' : '灵兽远征', 'success')
    return true
  }

  const dailyBeastExpeditionUpdate = () => {
    if (!beast.value || !beastExpedition.value) return ''
    beastExpedition.value.daysLeft--
    if (beastExpedition.value.daysLeft > 0) return ''
    const type = beastExpedition.value.type
    beastExpedition.value = null
    const inventory = useInventoryStore()
    const level = beastLevel.value
    if (type === 'guard') {
      aura.value += 120 + level * 30
      beastBond.value += 8
      return `${beastEmoji.value}${beastName.value}守卫洞府归来，灵气+${120 + level * 30}，羁绊+8。`
    }
    const stone = 8 + level * 2
    inventory.addItem('spirit_stone', stone)
    if (beast.value === 'phoenix' || Math.random() < 0.35) inventory.addItem('thunder_essence', 1)
    else if (beast.value === 'fox') inventory.addItem('soul_crystal', 1)
    else inventory.addItem('jade_slip', 1)
    beastBond.value += 12
    return `${beastEmoji.value}${beastName.value}远征归来，带回灵石×${stone}和修仙材料，羁绊+12。`
  }

  const trainBeastDaily = () => {
    if (!beast.value) { showFloat('你还没有灵兽伙伴。', 'danger'); return false }
    if (!beastDailyAvailable.value) { showFloat('今日已陪练过灵兽。', 'danger'); return false }
    const player = usePlayerStore()
    if (!player.consumeStamina(8)) { showFloat('体力不足，陪练需要8点体力。', 'danger'); return false }
    if (mana.value < 12) { showFloat('灵力不足，陪练需要12点灵力。', 'danger'); return false }
    mana.value -= 12
    const level = beastLevel.value
    const bondGain = 18 + Math.min(30, level * 2)
    beastBond.value += bondGain
    beastTrainingDailyKey.value = todayKey()
    if (beast.value === 'fox') {
      const gain = 45 + level * 6
      aura.value += gain
      addLog(`你陪${beastEmoji.value}${beastName.value}巡游灵田，羁绊+${bondGain}，灵气+${gain}。`)
      showFloat(`羁绊+${bondGain} 灵气+${gain}`, 'success')
    } else if (beast.value === 'crane') {
      const gain = 90 + level * 10
      addCultivation(gain)
      addLog(`你随${beastEmoji.value}${beastName.value}演练身法，羁绊+${bondGain}，修为+${gain}。`)
      showFloat(`羁绊+${bondGain} 修为+${gain}`, 'success')
    } else {
      const gain = 18 + level * 2
      mana.value = Math.min(maxMana.value, mana.value + gain)
      insight.value += 2
      addLog(`你与${beastEmoji.value}${beastName.value}引火温神，羁绊+${bondGain}，灵力+${gain}，顿悟+2。`)
      showFloat(`羁绊+${bondGain} 顿悟+2`, 'success')
    }
    return true
  }

  const todayKey = () => new Date().toISOString().slice(0, 10)
  const parseDay = (key?: string) => {
    if (!key) return null
    const [y, m, d] = key.split('-').map(Number)
    if (!y || !m || !d) return null
    return Date.UTC(y, m - 1, d)
  }
  const realDailyPendingDays = (last?: string) => {
    const today = todayKey()
    if (!last) return 1
    const lastMs = parseDay(last)
    const todayMs = parseDay(today)
    if (lastMs === null || todayMs === null) return 1
    return Math.max(0, Math.min(REAL_DAILY_ACCUMULATION_CAP, Math.floor((todayMs - lastMs) / MS_PER_DAY)))
  }
  const herbClaimDays = computed(() => hasCaveSlot('herbgarden') ? realDailyPendingDays(herbLastDaily.value) : 0)
  const herbDailyYield = computed(() => 12 + herbGardenLevel.value * 3)
  const spiritArrayClaimDays = computed(() => hasCaveSlot('spiritArray') ? realDailyPendingDays(spiritArrayLastDaily.value) : 0)
  const spiritArrayElementYield = computed(() => 5 + spiritArrayLevel.value * 2)
  const spiritArrayStoneYield = computed(() => 10 + spiritArrayLevel.value * 5)

  const claimDailyHerbs = () => {
    if (!hasCaveSlot('herbgarden')) { showFloat('请先在洞府安置百草园。', 'danger'); return false }
    const days = herbClaimDays.value
    if (days <= 0) { showFloat('今日药材已领取。', 'danger'); return false }
    const inventory = useInventoryStore()
    const qty = herbDailyYield.value * days
    const ids = Object.keys(HERB_DATA)
    for (let i = 0; i < qty; i++) {
      const id = ids[Math.floor(Math.random() * ids.length)]!
      herbs.value[id] = (herbs.value[id] ?? 0) + 1
      inventory.addItem(id, 1)
    }
    herbLastDaily.value = todayKey()
    addLog(`百草园按现实日期收获${days}天药材，共${qty}株。`)
    showFloat(`药材+${qty}`, 'success')
    return true
  }

  const upgradeHerbGarden = () => {
    if (!hasCaveSlot('herbgarden')) { showFloat('请先安置百草园。', 'danger'); return false }
    const cost = (herbGardenLevel.value + 1) * 2000
    const player = usePlayerStore()
    if (!player.spendMoney(cost)) { showFloat(`铜钱不足，需要${cost}文。`, 'danger'); return false }
    herbGardenLevel.value++
    showFloat('百草园升级', 'success')
    return true
  }

  const claimDailyElements = () => {
    if (!hasCaveSlot('spiritArray')) { showFloat('请先在洞府安置聚灵阵。', 'danger'); return false }
    const days = spiritArrayClaimDays.value
    if (days <= 0) { showFloat('今日五行元气已凝聚。', 'danger'); return false }
    const perElement = spiritArrayElementYield.value
    const stones = spiritArrayStoneYield.value * days
    const totalElement = perElement * days
    for (const key of ['wood', 'water', 'earth', 'fire', 'metal']) elements.value[key] = (elements.value[key] ?? 0) + totalElement
    useInventoryStore().addItem('spirit_stone', stones)
    spiritArrayLastDaily.value = todayKey()
    addLog(`聚灵阵按现实日期凝聚${days}天五行元气，每种+${totalElement}，并产出灵石${stones}枚。`)
    showFloat(`元气+${totalElement}/种 灵石+${stones}`, 'success')
    return true
  }

  const exchangeForSpiritStones = (id: string) => {
    const recipe = SPIRIT_STONE_EXCHANGES.find(r => r.id === id)
    if (!recipe) { showFloat('未知折灵配方。', 'danger'); return false }
    const inventory = useInventoryStore()
    if (inventory.getItemCount(recipe.itemId) < recipe.quantity) {
      showFloat(`${recipe.itemName}不足，需要${recipe.quantity}个。`, 'danger')
      return false
    }
    if (!inventory.removeItem(recipe.itemId, recipe.quantity)) return false
    inventory.addItem('spirit_stone', recipe.spiritStones)
    addLog(`灵石坊折换：${recipe.itemName}×${recipe.quantity} → 灵石×${recipe.spiritStones}。`)
    showFloat(`灵石+${recipe.spiritStones}`, 'success')
    return true
  }

  const refineSpiritStoneToAura = () => {
    if (!unlocked.value) return unlock()
    if (spiritStoneRefineDailyKey.value !== todayKey()) {
      spiritStoneRefineDailyKey.value = todayKey()
      spiritStoneRefineDailyCount.value = 0
    }
    if (spiritStoneRefineDailyCount.value >= spiritStoneRefineLimit.value) {
      showFloat('今日灵石炼气次数已用完。', 'danger')
      return false
    }
    const inventory = useInventoryStore()
    const cost = spiritStoneRefineCost.value
    if (inventory.getItemCount('spirit_stone') < cost) {
      showFloat(`灵石不足，需要${cost}枚。`, 'danger')
      return false
    }
    if (!inventory.removeItem('spirit_stone', cost)) return false
    const gain = spiritStoneRefineAuraGain.value
    aura.value += gain
    spiritStoneRefineDailyCount.value++
    addLog(`灵石坊炼气：消耗灵石×${cost}，转化为灵气+${gain}。今日第${spiritStoneRefineDailyCount.value}/${spiritStoneRefineLimit.value}次，后续成本会递增。`)
    showFloat(`灵气+${gain}`, 'success')
    return true
  }

  const forgeDestinedArtifact = (id: string) => {
    if (!unlocked.value) return unlock()
    if (destinedArtifact.value) { showFloat('已有本命法宝。', 'danger'); return false }
    const player = usePlayerStore()
    if (aura.value < 2000 || !player.spendMoney(20000)) { showFloat('炼制需要灵气2000、铜钱20000。', 'danger'); return false }
    aura.value -= 2000
    destinedArtifact.value = id
    destinedArtifactLevel.value = 1
    showFloat('本命法宝炼成', 'success')
    return true
  }

  const upgradeDestinedArtifact = () => {
    if (!destinedArtifact.value) { showFloat('请先炼制本命法宝。', 'danger'); return false }
    const cost = destinedArtifactLevel.value * 5000 + 10000
    const player = usePlayerStore()
    if (!player.spendMoney(cost)) { showFloat(`铜钱不足，需要${cost}文。`, 'danger'); return false }
    destinedArtifactLevel.value++
    showFloat('法宝等级提升', 'success')
    return true
  }

  const talismanUnlocked = computed(() => Object.keys(talismans.value).length > 0 || realmIndex.value >= 3)
  const talismanCount = computed(() => Object.values(talismans.value).reduce((sum, n) => sum + n, 0))
  const unlockTalisman = () => {
    const player = usePlayerStore()
    if (!player.spendMoney(15000)) { showFloat('铜钱不足，需要15000文。', 'danger'); return false }
    talismans.value.basic = talismans.value.basic ?? 0
    showFloat('制符已开启', 'success')
    return true
  }
  const craftTalisman = (type: TalismanId | string) => {
    if (!isTalismanId(type)) { showFloat('未知符箓。', 'danger'); return false }
    const cost = sect.value === 'talisman' ? 24 : 30
    if (mana.value < cost) { showFloat(`灵力不足，需要${cost}点。`, 'danger'); return false }
    mana.value -= cost
    talismans.value[type] = (talismans.value[type] ?? 0) + 1
    const def = TALISMAN_DATA.find(t => t.id === type)!
    addLog(`绘成一枚「${def.name}」，${def.effect}${sect.value === 'talisman' ? '符宗法脉使其效力更稳。' : ''}`)
    showFloat(`${def.name}+1`, 'success')
    return true
  }
  const useTalisman = (type: TalismanId | string) => {
    if (!isTalismanId(type)) return false
    if ((talismans.value[type] || 0) <= 0) { showFloat('没有可用符箓。', 'danger'); return false }
    if (type === 'heal_talisman') {
      const player = usePlayerStore()
      const amount = Math.max(1, Math.floor(player.maxStamina * 0.3))
      talismans.value[type] = (talismans.value[type] || 0) - 1
      player.restoreStamina(amount)
      addLog(`燃起一枚「愈符」，体力恢复${amount}点。`)
      showFloat(`体力+${amount}`, 'success')
      return true
    }
    showFloat('此符已作为护身符阵生效，无需主动使用。', 'accent')
    return false
  }

  const cultivateYuanShen = () => {
    const cost = 100 + yuanShenLevel.value * 50
    if (aura.value < cost) { showFloat(`灵气不足，需要${cost}点。`, 'danger'); return false }
    aura.value -= cost
    const leveled = addYuanShenExp(cost)
    showFloat(leveled ? `元神提升${leveled}级` : '元神修炼完成', 'success')
    return true
  }

  const trainYuanShen = cultivateYuanShen

  const rebirthCost = computed(() => ({ aura: 100000 * (rebirthCount.value + 1), money: 50000 * (rebirthCount.value + 1) }))
  const rebirthMaterials = computed<RebirthMaterialCost[]>(() => {
    const nextTurn = rebirthCount.value + 1
    const costs: RebirthMaterialCost[] = [{ itemId: 'rebirth_pill', name: '轮回丹', quantity: 1 }]
    const trueSpirit = Math.max(0, nextTurn - 1)
    const dust = Math.max(0, Math.floor(nextTurn / 2))
    const jade = Math.max(0, Math.floor((nextTurn - 1) / 3))
    if (trueSpirit > 0) costs.push({ itemId: 'true_spirit_record', name: '真灵秘录', quantity: trueSpirit })
    if (dust > 0) costs.push({ itemId: 'reincarnation_dust', name: '轮回尘', quantity: dust })
    if (jade > 0) costs.push({ itemId: 'lingyun_jade', name: '灵蕴玉', quantity: jade })
    return costs
  })
  const hasRebirthMaterials = computed(() => {
    const inventory = useInventoryStore()
    return rebirthMaterials.value.every(m => inventory.getItemCount(m.itemId) >= m.quantity)
  })
  const canRebirth = computed(() => realmIndex.value >= 20 && aura.value >= rebirthCost.value.aura && usePlayerStore().money >= rebirthCost.value.money && hasRebirthMaterials.value)
  const rebirth = () => {
    if (realmIndex.value < 20) { showFloat('需达到大乘初期后方可转生。', 'danger'); return false }
    if (aura.value < rebirthCost.value.aura) { showFloat(`灵气不足，需要${rebirthCost.value.aura}。`, 'danger'); return false }
    const player = usePlayerStore()
    if (player.money < rebirthCost.value.money) { showFloat(`铜钱不足，需要${rebirthCost.value.money}文。`, 'danger'); return false }
    const inventory = useInventoryStore()
    const missing = rebirthMaterials.value.find(m => inventory.getItemCount(m.itemId) < m.quantity)
    if (missing) { showFloat(`转生材料不足：${missing.name}×${missing.quantity}。`, 'danger'); return false }
    const consumedJade = rebirthMaterials.value.find(m => m.itemId === 'lingyun_jade')?.quantity || 0
    for (const m of rebirthMaterials.value) inventory.removeItem(m.itemId, m.quantity)
    aura.value -= rebirthCost.value.aura
    player.spendMoney(rebirthCost.value.money)
    rebirthCount.value++
    rebirthBonus.value += 10
    lingYun.value += 1 + consumedJade
    realmIndex.value = 0
    cultivation.value = 0
    beastBond.value = 0
    fieldTier.value = Math.min(fieldTier.value, 1)
    mana.value = maxMana.value
    addLog(`你以轮回丹为引，消耗轮回材料踏入第${rebirthCount.value}转。灵气产量+10%，灵蕴+${1 + consumedJade}。`)
    showFloat(`第${rebirthCount.value}转完成`, 'success')
    return true
  }

  const serialize = () => ({ unlocked: unlocked.value, realmIndex: realmIndex.value, cultivation: cultivation.value, aura: aura.value, mana: mana.value, spiritRoot: spiritRoot.value, fieldTier: fieldTier.value, earthPulse: earthPulse.value, totalAuraHarvested: totalAuraHarvested.value, alchemyUnlocked: alchemyUnlocked.value, daoGear: daoGear.value, daoGearDurability: daoGearDurability.value, insight: insight.value, heartDemon: heartDemon.value, cultivationPath: cultivationPath.value, lessonDailyKey: lessonDailyKey.value, lessonDailyDone: lessonDailyDone.value, spiritMealLastDaily: spiritMealLastDaily.value, artifacts: artifacts.value, foundationPillBlessing: foundationPillBlessing.value, caveTier: caveTier.value, caveSlots: caveSlots.value, caveStability: caveStability.value, caveMaintenanceKey: caveMaintenanceKey.value, herbGardenLevel: herbGardenLevel.value, herbLastDaily: herbLastDaily.value, herbs: herbs.value, spiritArrayLevel: spiritArrayLevel.value, spiritArrayLastDaily: spiritArrayLastDaily.value, spiritStoneRefineDailyKey: spiritStoneRefineDailyKey.value, spiritStoneRefineDailyCount: spiritStoneRefineDailyCount.value, elements: elements.value, yuanShenLevel: yuanShenLevel.value, yuanShenExp: yuanShenExp.value, yuanShenInjury: yuanShenInjury.value, destinedArtifact: destinedArtifact.value, destinedArtifactLevel: destinedArtifactLevel.value, talismans: talismans.value, talismanCooldown: talismanCooldown.value, rebirthCount: rebirthCount.value, rebirthBonus: rebirthBonus.value, lingYun: lingYun.value, rebirthUnlocked: rebirthUnlocked.value, beast: beast.value, beastBond: beastBond.value, beastTrainingDailyKey: beastTrainingDailyKey.value, beastExpedition: beastExpedition.value, sect: sect.value, sectSkills: sectSkills.value, sectContribution: sectContribution.value, sectRank: sectRank.value, sectMerit: sectMerit.value, sectDailyKey: sectDailyKey.value, sectDailyDone: sectDailyDone.value, manuals: manuals.value, autoMeditateEnabled: autoMeditateEnabled.value, autoMeditateCount: autoMeditateCount.value })
  const deserialize = (data?: Partial<ReturnType<typeof serialize>>) => {
    if (!data) return
    unlocked.value = data.unlocked ?? false
    realmIndex.value = data.realmIndex ?? 0
    cultivation.value = data.cultivation ?? 0
    aura.value = data.aura ?? 0
    mana.value = data.mana ?? 30
    spiritRoot.value = (data.spiritRoot as SpiritRoot) ?? 'mixed'
    fieldTier.value = data.fieldTier ?? 0
    earthPulse.value = data.earthPulse ?? (data.unlocked ? 100 : 0)
    totalAuraHarvested.value = data.totalAuraHarvested ?? 0
    alchemyUnlocked.value = (data as any).alchemyUnlocked ?? false
    {
      const oldGear = ((data as any).daoGear ?? {}) as Record<string, number>
      daoGear.value = {
        immortal_sword: Math.max(Number(oldGear.immortal_sword || 0), Number(oldGear.spirit_sword || 0)),
        dharma_robe: Math.max(Number(oldGear.dharma_robe || 0), Number(oldGear.spirit_robe || 0)),
        cloud_boots: Number(oldGear.cloud_boots || 0),
        tribulation_amulet: Math.max(Number(oldGear.tribulation_amulet || 0), Number(oldGear.thunder_talisman || 0))
      }
      const oldDur = ((data as any).daoGearDurability ?? {}) as Record<string, number>
      daoGearDurability.value = {
        immortal_sword: Number(oldDur.immortal_sword ?? 100),
        dharma_robe: Number(oldDur.dharma_robe ?? 100),
        cloud_boots: Number(oldDur.cloud_boots ?? 100),
        tribulation_amulet: Number(oldDur.tribulation_amulet ?? 100)
      }
    }
    insight.value = (data as any).insight ?? 0
    heartDemon.value = (data as any).heartDemon ?? 0
    spiritMealLastDaily.value = { plain_spirit_porridge: '', dew_rice_soup: '', vermilion_elixir_soup: '', three_treasure_spirit_meal: '', ...((data as any).spiritMealLastDaily ?? {}) }
    artifacts.value = { glimmerHoe: false, spiritKettle: false, spiritRain: false, ...((data as any).artifacts ?? {}) }
    foundationPillBlessing.value = (data as any).foundationPillBlessing ?? 0
    caveTier.value = (data as any).caveTier ?? 0
    caveSlots.value = (data as any).caveSlots ?? []
    caveStability.value = Number((data as any).caveStability ?? 100)
    caveMaintenanceKey.value = String((data as any).caveMaintenanceKey ?? todayKey())
    herbGardenLevel.value = (data as any).herbGardenLevel ?? 0
    herbLastDaily.value = (data as any).herbLastDaily ?? ''
    herbs.value = (data as any).herbs ?? {}
    spiritArrayLevel.value = (data as any).spiritArrayLevel ?? 0
    spiritArrayLastDaily.value = (data as any).spiritArrayLastDaily ?? ''
    spiritStoneRefineDailyKey.value = (data as any).spiritStoneRefineDailyKey ?? ''
    spiritStoneRefineDailyCount.value = (data as any).spiritStoneRefineDailyCount ?? 0
    elements.value = (data as any).elements ?? {}
    yuanShenLevel.value = (data as any).yuanShenLevel ?? 0
    yuanShenExp.value = (data as any).yuanShenExp ?? 0
    yuanShenInjury.value = (data as any).yuanShenInjury ?? 0
    destinedArtifact.value = (data as any).destinedArtifact ?? null
    destinedArtifactLevel.value = (data as any).destinedArtifactLevel ?? 0
    talismans.value = (data as any).talismans ?? {}
    talismanCooldown.value = (data as any).talismanCooldown ?? {}
    rebirthCount.value = (data as any).rebirthCount ?? 0
    rebirthBonus.value = (data as any).rebirthBonus ?? 0
    if (rebirthBonus.value > 0 && rebirthBonus.value < 1) rebirthBonus.value = Math.round(rebirthBonus.value * 100)
    lingYun.value = (data as any).lingYun ?? 0
    rebirthUnlocked.value = (data as any).rebirthUnlocked ?? {}
    beast.value = (data as any).beast ?? null
    beastBond.value = (data as any).beastBond ?? 0
    beastTrainingDailyKey.value = (data as any).beastTrainingDailyKey ?? ''
    beastExpedition.value = (data as any).beastExpedition ?? null
    sect.value = (data as any).sect ?? null
    sectSkills.value = (data as any).sectSkills ?? [0, 0, 0]
    sectContribution.value = (data as any).sectContribution ?? 0
    sectRank.value = (data as any).sectRank ?? 0
    sectMerit.value = (data as any).sectMerit ?? 0
    sectDailyKey.value = (data as any).sectDailyKey ?? ''
    sectDailyDone.value = (data as any).sectDailyDone ?? []
    manuals.value = { wood: 0, thunder: 0, void: 0, ...((data as any).manuals ?? {}) }
    autoMeditateEnabled.value = Boolean((data as any).autoMeditateEnabled ?? false)
    autoMeditateCount.value = Number((data as any).autoMeditateCount ?? 0)
  }

  return { unlocked, realmIndex, cultivation, aura, mana, spiritRoot, combatPower, daoGear, daoGearDurability, daoGearDurabilityRate, daoGearMaintenanceCost, maintainDaoGear, daoGearPower, daoGearTribulationBonus, daoGearLevel, canForgeDaoGear, forgeDaoGear, fieldTier, earthPulse, totalAuraHarvested, alchemyUnlocked, lastAlchemyQuality, insight, heartDemon, cultivationPath, currentCultivationPath, pathTitle, spiritMealLastDaily, artifacts, foundationPillBlessing, caveTier, caveSlots, caveStability, caveStabilityRate, caveMaintenanceCost, caveNeedsMaintenance, maintainCave, dailyCaveMaintenanceUpdate, herbGardenLevel, herbLastDaily, herbs, spiritArrayLevel, spiritArrayLastDaily, elements, yuanShenLevel, yuanShenExp, yuanShenInjury, lastTribulationResult, destinedArtifact, destinedArtifactLevel, talismans, talismanCooldown, rebirthCount, rebirthBonus, lingYun, rebirthUnlocked, talismanRechargeRate, talismanPower, talismanTribulationBonus, yuanShenBonus, rebirthRealmName, beast, beastBond, sect, sectSkills, sectContribution, sectRank, sectMerit, sectDailyKey, sectDailyDone, sectCombatAttackBonusRate, sectCombatDefenseBonusRate, sectMaxHpBonusRate, sectAlchemyExtraOutputChance, sectSpiritCropAuraBonusRate, sectDemonClearBonus, manuals, autoMeditateEnabled, autoMeditateCount, lessonDailyKey, lessonDailyDone, realmName, maxCultivation, maxMana, fieldTierName, spiritRootName, breakthroughAuraCost, breakthroughCultivationMissing, breakthroughAuraMissing, breakthroughRequirementText, nextRealm, isMajorBreakthrough, tribulationSuccessRate, tribulationSuccessPercent, canBreakthrough, artifactName, caveTierName, caveMaxSlots, caveAuraRegen, caveSlotNames, hasCaveSlot, beastData, beastName, beastEmoji, beastLevel, beastStage, beastAssistDesc, beastDailyAvailable, beastExpedition, beastExpeditionName, talismanUnlocked, talismanCount, herbClaimDays, herbDailyYield, spiritArrayClaimDays, spiritArrayElementYield, spiritArrayStoneYield, spiritStoneRefineLimit, spiritStoneRefineCountToday, spiritStoneRefineRemaining, spiritStoneRefineCost, spiritStoneRefineAuraGain, unlockTalisman, learnManual, upgradeManual, setCultivationPath, unlock, meditate, setAutoMeditate, toggleAutoMeditate, runAutoMeditateTick, refineAura, meditateInSeclusion, breakthrough, upgradeField, addAuraFromHarvest, gainIdleCultivation, lessonAvailable, doCultivationLesson, triggerRealmEvent, spiritMealAvailable, cookSpiritMeal, unlockAlchemy, craftPill, usePill, unlockArtifact, openCave, upgradeCave, placeCaveSlot, removeCaveSlot, encounterBeast, feedBeast, startBeastExpedition, dailyBeastExpeditionUpdate, trainBeastDaily, claimDailyHerbs, upgradeHerbGarden, claimDailyElements, exchangeForSpiritStones, refineSpiritStoneToAura, forgeDestinedArtifact, upgradeDestinedArtifact, craftTalisman, useTalisman, cultivateYuanShen, trainYuanShen, canRebirth, rebirthCost, rebirthMaterials, hasRebirthMaterials, rebirth, serialize, deserialize }
})
