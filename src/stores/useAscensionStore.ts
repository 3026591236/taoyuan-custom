import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useCultivationStore } from './useCultivationStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'
import { addLog } from '@/composables/useGameLog'

export const ASCENSION_REALM_INDEX = 27 // 大乘后期
export const IMMORTAL_REALM_INDEX = 28 // 真仙
export const ASCENSION_MONEY = 50000
export const ASCENSION_MATERIALS = [
  { itemId: 'spirit_stone', name: '灵石', quantity: 200 },
  { itemId: 'thunder_essence', name: '雷精', quantity: 5 },
  { itemId: 'immortal_dew', name: '仙露', quantity: 3 },
  { itemId: 'soul_crystal', name: '魂晶', quantity: 5 },
  { itemId: 'lingyun_jade', name: '灵蕴玉', quantity: 2 }
]

export type ImmortalArtId = 'starfall_sword' | 'purple_thunder_seal' | 'solar_flame' | 'cloud_body'
export type ImmortalTrialId = 'star_river' | 'thunder_palace' | 'sun_ruins'
export type ImmortalOfficeId = 'xuntian' | 'sinong' | 'lianbao' | 'wenming'
export type ImmortalDutyId = 'rain_edict' | 'demon_edict' | 'forge_edict' | 'fate_edict'
export type ImmortalCaveId = 'star_platform' | 'merit_pool' | 'law_tablet'
export type MortalEchoId = 'sect_blessing' | 'family_blessing' | 'farm_blessing'
export type ImmortalRivalId = 'sword_immortal' | 'thunder_general' | 'moon_fairy'
export type ImmortalMarketId = 'jade_seed' | 'star_sand' | 'edict_scroll' | 'law_core'
export type ImmortalRealmId = 'true_immortal' | 'earth_immortal' | 'sky_immortal' | 'gold_immortal'
export type ImmortalSeasonRewardId = 'arena_10' | 'arena_30' | 'arena_60'
export type ImmortalLineageId = 'sword_dao' | 'thunder_dao' | 'harvest_dao' | 'fate_dao'
export type ImmortalMandateId = 'heaven_river' | 'star_audit' | 'mortal_incense' | 'arena_invite'
export type ImmortalMandateChoiceId = 'merit' | 'law' | 'mortal' | 'battle'

export const IMMORTAL_ARTS: Array<{ id: ImmortalArtId; name: string; icon: string; element: string; desc: string; basePower: number; effect: string }> = [
  { id: 'starfall_sword', name: '星河落刃', icon: '🌌', element: '星辰法则', desc: '引星河为剑，普通剑气升格为群星坠落。', basePower: 120, effect: '星辉连斩' },
  { id: 'purple_thunder_seal', name: '紫霄雷印', icon: '⚡', element: '天罚法则', desc: '雷法不再只是雷精爆发，而是以仙印审判敌阵。', basePower: 150, effect: '天罚破防' },
  { id: 'solar_flame', name: '九曜焚天', icon: '☀️', element: '太阳真火', desc: '凡火蜕变为太阳真火，灼烧并净化妖邪。', basePower: 138, effect: '真火灼魂' },
  { id: 'cloud_body', name: '云篆护体', icon: '☁️', element: '云篆仙体', desc: '身外浮现云篆玄光，抵御仙域反噬。', basePower: 95, effect: '玄光护体' }
]

export const IMMORTAL_TRIALS: Array<{ id: ImmortalTrialId; name: string; icon: string; enemy: string; realm: string; desc: string; difficulty: number; rewardMerit: number; rewardJade: number; rewardRule: number; rewardItem?: { itemId: string; name: string; quantity: number } }> = [
  { id: 'star_river', name: '星河残阵', icon: '🌠', enemy: '陨星阵灵', realm: '真仙初试', desc: '以星辉破阵，检验飞升后仙术掌控。', difficulty: 900, rewardMerit: 18, rewardJade: 4, rewardRule: 2, rewardItem: { itemId: 'star_iron', name: '星陨铁', quantity: 1 } },
  { id: 'thunder_palace', name: '紫霄雷宫', icon: '🏛️', enemy: '雷宫执印', realm: '雷法试炼', desc: '承受天罚雷印反震，胜则雷法蜕变。', difficulty: 1250, rewardMerit: 24, rewardJade: 6, rewardRule: 3, rewardItem: { itemId: 'thunder_essence', name: '雷精', quantity: 1 } },
  { id: 'sun_ruins', name: '九曜墟', icon: '🔥', enemy: '日曜残魂', realm: '真火试炼', desc: '在太阳真火废墟中淬炼仙体。', difficulty: 1650, rewardMerit: 32, rewardJade: 8, rewardRule: 4, rewardItem: { itemId: 'immortal_dew', name: '仙露', quantity: 1 } }
]

export const IMMORTAL_OFFICES: Array<{ id: ImmortalOfficeId; name: string; icon: string; desc: string; buff: string }> = [
  { id: 'xuntian', name: '巡天仙使', icon: '🛰️', desc: '巡视仙域、镇压妖潮。', buff: '仙域试炼功德 +10%' },
  { id: 'sinong', name: '司农仙官', icon: '🌾', desc: '调理仙灵圃与下界灵田。', buff: '仙露与灵植收益更高' },
  { id: 'lianbao', name: '炼宝仙官', icon: '🛠️', desc: '掌管仙材、修补法宝。', buff: '法宝修复与炼器消耗更稳' },
  { id: 'wenming', name: '文命仙官', icon: '📜', desc: '记录功德、回应凡界香火。', buff: '声望、博物馆与宗门反馈更强' }
]

export const IMMORTAL_DUTIES: Array<{ id: ImmortalDutyId; office: ImmortalOfficeId; name: string; icon: string; desc: string; rewardMerit: number; rewardJade: number; rewardRule: number }> = [
  { id: 'rain_edict', office: 'sinong', name: '调雨润田', icon: '🌧️', desc: '向下界灵田布雨，回响种田线而不是新增重复农场。', rewardMerit: 16, rewardJade: 3, rewardRule: 1 },
  { id: 'demon_edict', office: 'xuntian', name: '巡天镇妖', icon: '🗡️', desc: '巡查仙凡裂隙，压制妖潮与秘境异动。', rewardMerit: 20, rewardJade: 4, rewardRule: 2 },
  { id: 'forge_edict', office: 'lianbao', name: '修补仙器', icon: '🛠️', desc: '用仙职处理法宝损耗，强化经济消耗闭环。', rewardMerit: 18, rewardJade: 5, rewardRule: 1 },
  { id: 'fate_edict', office: 'wenming', name: '校准凡缘', icon: '📜', desc: '整理凡界香火、家族与宗门因果。', rewardMerit: 22, rewardJade: 3, rewardRule: 2 }
]
export const IMMORTAL_CAVE_NODES: Array<{ id: ImmortalCaveId; name: string; icon: string; desc: string; jadeCost: number; ruleCost: number; powerPerLevel: number }> = [
  { id: 'star_platform', name: '观星台', icon: '🌌', desc: '提升仙术与仙擂问道战力。', jadeCost: 8, ruleCost: 3, powerPerLevel: 95 },
  { id: 'merit_pool', name: '功德池', icon: '🪷', desc: '积累功德香火，支撑凡界回响。', jadeCost: 6, ruleCost: 2, powerPerLevel: 70 },
  { id: 'law_tablet', name: '法则碑', icon: '🪧', desc: '稳固仙界法则，提升试炼和 PK 稳定。', jadeCost: 10, ruleCost: 4, powerPerLevel: 130 }
]
export const MORTAL_ECHOES: Array<{ id: MortalEchoId; name: string; icon: string; desc: string; meritCost: number; rewardText: string }> = [
  { id: 'sect_blessing', name: '赐福宗门', icon: '⛩️', desc: '向下界宗门降下仙谕。', meritCost: 24, rewardText: '宗门远征与日课获得仙界赐福。' },
  { id: 'family_blessing', name: '护佑家族', icon: '👨‍👩‍👧', desc: '回响配偶、子女与家族传承。', meritCost: 20, rewardText: '家族委托与子女成长获得仙缘。' },
  { id: 'farm_blessing', name: '点化灵田', icon: '🌾', desc: '让仙界影响原种田线。', meritCost: 18, rewardText: '灵田、仙露与高阶作物获得回响。' }
]
export const IMMORTAL_RIVALS: Array<{ id: ImmortalRivalId; name: string; icon: string; style: string; power: number; desc: string; rewardMerit: number; rewardJade: number; rewardRule: number }> = [
  { id: 'sword_immortal', name: '青冥剑仙', icon: '🗡️', style: '剑道连斩', power: 1100, desc: '仙擂初阶对手，擅长破云剑势。', rewardMerit: 20, rewardJade: 5, rewardRule: 2 },
  { id: 'thunder_general', name: '紫府雷将', icon: '⚡', style: '雷印压制', power: 1500, desc: '雷法强敌，考验仙骨与紫霄雷印。', rewardMerit: 28, rewardJade: 7, rewardRule: 3 },
  { id: 'moon_fairy', name: '广寒仙姬', icon: '🌙', style: '月华幻身', power: 1900, desc: '身法型对手，考验仙魂与法则碑。', rewardMerit: 36, rewardJade: 9, rewardRule: 4 }
]

export const IMMORTAL_MARKET: Array<{ id: ImmortalMarketId; name: string; icon: string; desc: string; costMerit: number; costJade: number; costRule: number; reward: string; itemId?: string; itemName?: string; itemQty?: number; bodyGain?: number; boneGain?: number; soulGain?: number }> = [
  { id: 'jade_seed', name: '仙灵种匣', icon: '🌱', desc: '司农仙官常购，可把仙界资源转化为凡界灵植后劲。', costMerit: 18, costJade: 6, costRule: 0, reward: '仙露+2', itemId: 'immortal_dew', itemName: '仙露', itemQty: 2 },
  { id: 'star_sand', name: '星砂炼材', icon: '✨', desc: '炼宝仙官用来修补法宝与洞天器纹。', costMerit: 12, costJade: 8, costRule: 1, reward: '星陨铁+1', itemId: 'star_iron', itemName: '星陨铁', itemQty: 1 },
  { id: 'edict_scroll', name: '仙谕文书', icon: '📜', desc: '文命仙官整理凡界香火，可强化仙魂。', costMerit: 36, costJade: 4, costRule: 2, reward: '仙魂+1', soulGain: 1 },
  { id: 'law_core', name: '小法则核', icon: '💠', desc: '少量法则凝核，用于稳定突破与 PK 波动。', costMerit: 24, costJade: 10, costRule: 6, reward: '仙骨+1 / 仙体+1', bodyGain: 1, boneGain: 1 }
]
export const IMMORTAL_REALMS: Array<{ id: ImmortalRealmId; name: string; icon: string; desc: string; meritCost: number; jadeCost: number; ruleCost: number; powerBonus: number; title: string }> = [
  { id: 'true_immortal', name: '真仙', icon: '☁️', desc: '初脱凡尘，掌仙术而未稳法则。', meritCost: 0, jadeCost: 0, ruleCost: 0, powerBonus: 0, title: '初入仙门' },
  { id: 'earth_immortal', name: '地仙', icon: '⛰️', desc: '洞天落成，仙力可回响下界山河。', meritCost: 120, jadeCost: 32, ruleCost: 14, powerBonus: 380, title: '洞天地仙' },
  { id: 'sky_immortal', name: '天仙', icon: '🌤️', desc: '仙职入册，可调度天庭事务与星河仙术。', meritCost: 260, jadeCost: 68, ruleCost: 32, powerBonus: 820, title: '云阙天仙' },
  { id: 'gold_immortal', name: '太乙金仙', icon: '🌟', desc: '功德成轮，仙擂与法则试炼进入第二循环。', meritCost: 520, jadeCost: 128, ruleCost: 72, powerBonus: 1500, title: '太乙金仙' }
]
export const IMMORTAL_SEASON_REWARDS: Array<{ id: ImmortalSeasonRewardId; needScore: number; name: string; icon: string; desc: string; merit: number; jade: number; rule: number }> = [
  { id: 'arena_10', needScore: 10, name: '问道小成', icon: '🥉', desc: '仙擂赛季首段奖励，鼓励参与 PK。', merit: 30, jade: 8, rule: 3 },
  { id: 'arena_30', needScore: 30, name: '连胜入榜', icon: '🥈', desc: '进入仙擂榜单，奖励洞天建设资源。', merit: 70, jade: 18, rule: 8 },
  { id: 'arena_60', needScore: 60, name: '云阙擂主', icon: '🥇', desc: '赛季擂主奖励，形成飞升后中期目标。', merit: 140, jade: 36, rule: 18 }
]

export const IMMORTAL_LINEAGES: Array<{ id: ImmortalLineageId; name: string; icon: string; desc: string; bonus: string }> = [
  { id: 'sword_dao', name: '星河剑统', icon: '🗡️', desc: '以星河落刃开道，偏向仙擂与试炼爆发。', bonus: 'PK胜利功德+6，星河落刃额外加势' },
  { id: 'thunder_dao', name: '紫霄雷统', icon: '⚡', desc: '执雷罚、正天规，偏向法则碎片与突破稳定。', bonus: '天命法则选择额外+2' },
  { id: 'harvest_dao', name: '司农仙统', icon: '🌾', desc: '以仙界调度反哺凡界，偏向仙市与凡界回响。', bonus: '凡界回响消耗降低，仙市兑换返还仙玉' },
  { id: 'fate_dao', name: '文命道统', icon: '📜', desc: '记录香火因果，偏向天命事件与功德累积。', bonus: '天命功德选择额外+8' }
]
export const IMMORTAL_MANDATES: Array<{ id: ImmortalMandateId; name: string; icon: string; desc: string; choices: Array<{ id: ImmortalMandateChoiceId; name: string; desc: string; merit: number; jade: number; rule: number; echo: number; streak: number }> }> = [
  { id: 'heaven_river', name: '天河决堤', icon: '🌊', desc: '天河水势倒灌云阙，是救灾积功德，还是截取法则稳洞天？', choices: [
    { id: 'merit', name: '救灾积德', desc: '安抚仙民，功德大增。', merit: 36, jade: 3, rule: 1, echo: 0, streak: 0 },
    { id: 'law', name: '截流悟法', desc: '观天河流向，凝聚水行法则。', merit: 12, jade: 4, rule: 5, echo: 0, streak: 0 },
    { id: 'mortal', name: '引水润凡', desc: '将余泽导入凡界灵田。', merit: 16, jade: 2, rule: 2, echo: 2, streak: 0 }
  ] },
  { id: 'star_audit', name: '星官问责', icon: '⭐', desc: '星官稽核仙职功过，选择偏向会影响仙界资源节奏。', choices: [
    { id: 'merit', name: '呈报功簿', desc: '清算功簿，功德入账。', merit: 28, jade: 5, rule: 1, echo: 0, streak: 0 },
    { id: 'law', name: '辩明天条', desc: '以法则自证，碎片增加。', merit: 10, jade: 4, rule: 6, echo: 0, streak: 0 },
    { id: 'battle', name: '请战证道', desc: '以仙擂表现回应质疑。', merit: 18, jade: 6, rule: 2, echo: 0, streak: 1 }
  ] },
  { id: 'mortal_incense', name: '凡界香火冲突', icon: '🕯️', desc: '宗门、家族、灵田争夺仙缘，需要选择回响方向。', choices: [
    { id: 'mortal', name: '均分香火', desc: '三线皆得回响。', merit: 18, jade: 3, rule: 2, echo: 3, streak: 0 },
    { id: 'merit', name: '立碑明德', desc: '聚香火成功德。', merit: 34, jade: 2, rule: 1, echo: 1, streak: 0 },
    { id: 'law', name: '斩断杂念', desc: '清理因果，凝聚法则。', merit: 8, jade: 3, rule: 5, echo: 0, streak: 0 }
  ] },
  { id: 'arena_invite', name: '云阙邀战', icon: '🥊', desc: '仙擂送来邀战帖，可借势提升赛季节奏。', choices: [
    { id: 'battle', name: '登台应战', desc: '积累连胜气势。', merit: 16, jade: 8, rule: 2, echo: 0, streak: 2 },
    { id: 'law', name: '观战悟道', desc: '不战而观法。', merit: 10, jade: 4, rule: 5, echo: 0, streak: 0 },
    { id: 'merit', name: '调停斗争', desc: '化解私斗换功德。', merit: 30, jade: 3, rule: 1, echo: 0, streak: 0 }
  ] }
]

export const useAscensionStore = defineStore('ascension', () => {
  const ascended = ref(false)
  const ascensionQuestActive = ref(false)
  const ascensionQuestComplete = ref(false)
  const inImmortalWorld = ref(false)
  const immortalTitle = ref('')
  const immortalOffice = ref<ImmortalOfficeId>('xuntian')
  const merit = ref(0)
  const immortalJade = ref(0)
  const ruleFragments = ref(0)
  const immortalBodyLevel = ref(1)
  const immortalBoneLevel = ref(1)
  const immortalSoulLevel = ref(1)
  const trialWins = ref<Record<ImmortalTrialId, number>>({ star_river: 0, thunder_palace: 0, sun_ruins: 0 })
  const lastArtId = ref<ImmortalArtId>('starfall_sword')
  const lastBattleText = ref('仙光初凝，尚未发动仙术。')
  const visualPulse = ref(0)
  const dutyDone = ref<Record<ImmortalDutyId, boolean>>({ rain_edict: false, demon_edict: false, forge_edict: false, fate_edict: false })
  const caveLevels = ref<Record<ImmortalCaveId, number>>({ star_platform: 0, merit_pool: 0, law_tablet: 0 })
  const echoBlessings = ref<Record<MortalEchoId, number>>({ sect_blessing: 0, family_blessing: 0, farm_blessing: 0 })
  const pkWins = ref(0)
  const pkLosses = ref(0)
  const pkStreak = ref(0)
  const immortalRealmStage = ref(0)
  const marketPurchases = ref<Record<ImmortalMarketId, number>>({ jade_seed: 0, star_sand: 0, edict_scroll: 0, law_core: 0 })
  const seasonClaimed = ref<Record<ImmortalSeasonRewardId, boolean>>({ arena_10: false, arena_30: false, arena_60: false })
  const immortalLineage = ref<ImmortalLineageId>('sword_dao')
  const mandateProgress = ref(0)
  const mandateDone = ref<Record<ImmortalMandateId, number>>({ heaven_river: 0, star_audit: 0, mortal_incense: 0, arena_invite: 0 })

  const canAscend = computed(() => {
    const cultivation = useCultivationStore()
    return !ascended.value && cultivation.realmIndex >= ASCENSION_REALM_INDEX
  })
  const ascensionMaterialsReady = computed(() => {
    const playerStore = usePlayerStore()
    if (playerStore.money < ASCENSION_MONEY) return false
    return ASCENSION_MATERIALS.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity)
  })
  const ascensionMaterials = computed(() => ASCENSION_MATERIALS)
  const ascensionMoneyCost = computed(() => ASCENSION_MONEY)
  const immortalRank = computed(() => {
    const score = merit.value + immortalJade.value * 3 + ruleFragments.value * 5
    if (score >= 360) return '太乙仙班'
    if (score >= 180) return '上清仙籍'
    if (score >= 80) return '云阙仙籍'
    return '初录仙籍'
  })
  const immortalPower = computed(() => {
    const cultivation = useCultivationStore()
    return cultivation.combatPower + merit.value * 3 + immortalJade.value * 12 + ruleFragments.value * 25 + (immortalBodyLevel.value + immortalBoneLevel.value + immortalSoulLevel.value) * 80 + cavePower.value + immortalRealmPowerBonus.value
  })
  const bodyProfile = computed(() => [
    { name: '仙体', level: immortalBodyLevel.value, desc: '飞升后肉身蜕凡，角色外观出现仙光与云纹。' },
    { name: '仙骨', level: immortalBoneLevel.value, desc: '承载天雷与星辉，影响仙术破防表现。' },
    { name: '仙魂', level: immortalSoulLevel.value, desc: '凝聚功德香火，影响法则掌控与试炼稳定。' }
  ])
  const officeInfo = computed(() => IMMORTAL_OFFICES.find(o => o.id === immortalOffice.value) || IMMORTAL_OFFICES[0]!)
  const cavePower = computed(() => IMMORTAL_CAVE_NODES.reduce((sum, node) => sum + (caveLevels.value[node.id] ?? 0) * node.powerPerLevel, 0))
  const pkRecord = computed(() => `${pkWins.value}胜 / ${pkLosses.value}负 · 连胜${pkStreak.value}`)
  const immortalRealmInfo = computed(() => IMMORTAL_REALMS[Math.min(immortalRealmStage.value, IMMORTAL_REALMS.length - 1)] || IMMORTAL_REALMS[0]!)
  const nextImmortalRealm = computed(() => IMMORTAL_REALMS[immortalRealmStage.value + 1] || null)
  const immortalRealmPowerBonus = computed(() => immortalRealmInfo.value.powerBonus)
  const seasonScore = computed(() => pkWins.value * 10 + Math.max(0, pkStreak.value) * 3 + mandateProgress.value)
  const lineageInfo = computed(() => IMMORTAL_LINEAGES.find(l => l.id === immortalLineage.value) || IMMORTAL_LINEAGES[0]!)

  const triggerAscensionQuest = () => {
    if (ascended.value || ascensionQuestActive.value) return
    ascensionQuestActive.value = true
    addLog('天劫已过，飞升之机已至！前往飞升台准备飞升仙界。')
  }
  const performAscension = (): boolean => {
    if (!canAscend.value || !ascensionMaterialsReady.value) return false
    const playerStore = usePlayerStore()
    const cultivation = useCultivationStore()
    playerStore.spendMoney(ASCENSION_MONEY)
    for (const mat of ASCENSION_MATERIALS) removeCombinedItem(mat.itemId, mat.quantity)
    if (cultivation.realmIndex < IMMORTAL_REALM_INDEX) cultivation.realmIndex = IMMORTAL_REALM_INDEX
    ascended.value = true
    ascensionQuestActive.value = false
    ascensionQuestComplete.value = true
    immortalTitle.value = '初入仙门'
    inImmortalWorld.value = true
    merit.value += 30
    immortalJade.value += 6
    ruleFragments.value += 3
    lastBattleText.value = '金阙开门，凡身褪尘：仙体、仙骨、仙魂已显化。'
    visualPulse.value++
    addLog('飞升成功！你踏入仙界，获得「初入仙门」称号，人物仙光与仙术特效已变化。')
    return true
  }
  const enterImmortalWorld = () => { inImmortalWorld.value = true }
  const returnToWorld = () => { inImmortalWorld.value = false }
  const chooseOffice = (id: ImmortalOfficeId) => {
    immortalOffice.value = id
    const office = IMMORTAL_OFFICES.find(o => o.id === id)
    addLog(`仙籍调整为「${office?.name ?? '仙官'}」：${office?.buff ?? '仙界事务收益变化'}。`)
  }
  const castImmortalArt = (id: ImmortalArtId) => {
    const art = IMMORTAL_ARTS.find(a => a.id === id) || IMMORTAL_ARTS[0]!
    lastArtId.value = art.id
    visualPulse.value++
    lastBattleText.value = `${art.icon} ${art.name}发动：${art.effect}，${art.element}在云海中显化。`
    addLog(lastBattleText.value)
  }
  const challengeTrial = (id: ImmortalTrialId): boolean => {
    if (!ascended.value) return false
    const trial = IMMORTAL_TRIALS.find(t => t.id === id)
    if (!trial) return false
    const inventoryStore = useInventoryStore()
    const art = IMMORTAL_ARTS.find(a => a.id === lastArtId.value) || IMMORTAL_ARTS[0]!
    const officeBonus = immortalOffice.value === 'xuntian' ? 1.1 : 1
    const power = immortalPower.value + art.basePower + Math.floor(Math.random() * 180)
    visualPulse.value++
    if (power < trial.difficulty) {
      lastBattleText.value = `${trial.icon} ${trial.enemy}挡下了${art.name}，仙域法则反震。提升仙体或积累功德后再战。`
      addLog(lastBattleText.value)
      return false
    }
    const meritGain = Math.round(trial.rewardMerit * officeBonus)
    merit.value += meritGain
    immortalJade.value += trial.rewardJade
    ruleFragments.value += trial.rewardRule
    trialWins.value[id] = (trialWins.value[id] ?? 0) + 1
    if (trial.rewardItem) inventoryStore.addItem(trial.rewardItem.itemId, trial.rewardItem.quantity)
    if (merit.value >= immortalBodyLevel.value * 70) immortalBodyLevel.value += 1
    if (ruleFragments.value >= immortalBoneLevel.value * 12) immortalBoneLevel.value += 1
    if (immortalJade.value >= immortalSoulLevel.value * 18) immortalSoulLevel.value += 1
    lastBattleText.value = `${trial.icon} ${art.name}击破「${trial.enemy}」！获得功德+${meritGain}、仙玉+${trial.rewardJade}、法则碎片+${trial.rewardRule}${trial.rewardItem ? `、${trial.rewardItem.name}+${trial.rewardItem.quantity}` : ''}。`
    addLog(lastBattleText.value)
    return true
  }

  const completeDuty = (id: ImmortalDutyId): boolean => {
    if (!ascended.value || dutyDone.value[id]) return false
    const duty = IMMORTAL_DUTIES.find(d => d.id === id)
    if (!duty) return false
    const officeMatch = duty.office === immortalOffice.value ? 1.25 : 1
    const meritGain = Math.round(duty.rewardMerit * officeMatch)
    merit.value += meritGain
    immortalJade.value += duty.rewardJade
    ruleFragments.value += duty.rewardRule
    dutyDone.value[id] = true
    visualPulse.value++
    lastBattleText.value = `${duty.icon} 完成仙职事务「${duty.name}」：功德+${meritGain}、仙玉+${duty.rewardJade}、法则碎片+${duty.rewardRule}。`
    addLog(lastBattleText.value)
    return true
  }
  const upgradeCaveNode = (id: ImmortalCaveId): boolean => {
    const node = IMMORTAL_CAVE_NODES.find(n => n.id === id)
    if (!node) return false
    const level = caveLevels.value[id] ?? 0
    const jadeCost = node.jadeCost + level * 3
    const ruleCost = node.ruleCost + level
    if (immortalJade.value < jadeCost || ruleFragments.value < ruleCost) { addLog(`${node.name}升级需要仙玉${jadeCost}、法则碎片${ruleCost}。`); return false }
    immortalJade.value -= jadeCost
    ruleFragments.value -= ruleCost
    caveLevels.value[id] = level + 1
    visualPulse.value++
    lastBattleText.value = `${node.icon} 洞天「${node.name}」升至 Lv.${level + 1}，仙战力 +${node.powerPerLevel}。`
    addLog(lastBattleText.value)
    return true
  }
  const sendMortalEcho = (id: MortalEchoId): boolean => {
    const echo = MORTAL_ECHOES.find(e => e.id === id)
    if (!echo) return false
    if (merit.value < echo.meritCost) { addLog(`${echo.name}需要功德${echo.meritCost}。`); return false }
    merit.value -= Math.max(1, echo.meritCost - (immortalLineage.value === 'harvest_dao' ? 5 : 0))
    echoBlessings.value[id] = (echoBlessings.value[id] ?? 0) + 1
    visualPulse.value++
    lastBattleText.value = `${echo.icon} ${echo.name}已降下：${echo.rewardText}`
    addLog(lastBattleText.value)
    return true
  }
  const challengeRival = (id: ImmortalRivalId): boolean => {
    if (!ascended.value) return false
    const rival = IMMORTAL_RIVALS.find(r => r.id === id)
    if (!rival) return false
    const art = IMMORTAL_ARTS.find(a => a.id === lastArtId.value) || IMMORTAL_ARTS[0]!
    const power = immortalPower.value + cavePower.value + art.basePower + pkStreak.value * 35 + Math.floor(Math.random() * 220)
    visualPulse.value++
    if (power < rival.power) {
      pkLosses.value += 1
      pkStreak.value = 0
      lastBattleText.value = `${rival.icon} 仙擂问道败给「${rival.name}」：${rival.style}压制了${art.name}，建议升级洞天或切换仙术。`
      addLog(lastBattleText.value)
      return false
    }
    pkWins.value += 1
    pkStreak.value += 1
    const streakBonus = Math.min(10, pkStreak.value)
    merit.value += rival.rewardMerit + streakBonus + (immortalLineage.value === 'sword_dao' ? 6 : 0)
    immortalJade.value += rival.rewardJade
    ruleFragments.value += rival.rewardRule
    lastBattleText.value = `${rival.icon} 仙擂胜利！${art.name}破开「${rival.name}」的${rival.style}，功德+${rival.rewardMerit + streakBonus + (immortalLineage.value === 'sword_dao' ? 6 : 0)}、仙玉+${rival.rewardJade}、法则+${rival.rewardRule}。`
    addLog(lastBattleText.value)
    return true
  }

  const buyImmortalMarket = (id: ImmortalMarketId): boolean => {
    if (!ascended.value) return false
    const goods = IMMORTAL_MARKET.find(g => g.id === id)
    if (!goods) return false
    if (merit.value < goods.costMerit || immortalJade.value < goods.costJade || ruleFragments.value < goods.costRule) {
      addLog(`${goods.name}需要功德${goods.costMerit}、仙玉${goods.costJade}、法则碎片${goods.costRule}。`)
      return false
    }
    const inventoryStore = useInventoryStore()
    merit.value -= goods.costMerit
    immortalJade.value -= goods.costJade
    ruleFragments.value -= goods.costRule
    if (goods.itemId && goods.itemQty) inventoryStore.addItem(goods.itemId, goods.itemQty)
    if (goods.bodyGain) immortalBodyLevel.value += goods.bodyGain
    if (goods.boneGain) immortalBoneLevel.value += goods.boneGain
    if (goods.soulGain) immortalSoulLevel.value += goods.soulGain
    marketPurchases.value[id] = (marketPurchases.value[id] ?? 0) + 1
    visualPulse.value++
    lastBattleText.value = `${goods.icon} 仙市购得「${goods.name}」：${goods.reward}。仙界资源转化为长期成长。`
    addLog(lastBattleText.value)
    return true
  }
  const breakthroughImmortalRealm = (): boolean => {
    const next = nextImmortalRealm.value
    if (!ascended.value || !next) return false
    if (merit.value < next.meritCost || immortalJade.value < next.jadeCost || ruleFragments.value < next.ruleCost) {
      addLog(`${next.name}突破需要功德${next.meritCost}、仙玉${next.jadeCost}、法则碎片${next.ruleCost}。`)
      return false
    }
    merit.value -= next.meritCost
    immortalJade.value -= next.jadeCost
    ruleFragments.value -= next.ruleCost
    immortalRealmStage.value += 1
    immortalTitle.value = next.title
    visualPulse.value++
    lastBattleText.value = `${next.icon} 仙阶突破至「${next.name}」：${next.desc} 仙战力底蕴 +${next.powerBonus}。`
    addLog(lastBattleText.value)
    return true
  }
  const claimSeasonReward = (id: ImmortalSeasonRewardId): boolean => {
    const reward = IMMORTAL_SEASON_REWARDS.find(r => r.id === id)
    if (!reward || seasonClaimed.value[id]) return false
    if (seasonScore.value < reward.needScore) { addLog(`${reward.name}需要仙擂赛季积分${reward.needScore}。`); return false }
    seasonClaimed.value[id] = true
    merit.value += reward.merit
    immortalJade.value += reward.jade
    ruleFragments.value += reward.rule
    visualPulse.value++
    lastBattleText.value = `${reward.icon} 领取仙擂赛季奖励「${reward.name}」：功德+${reward.merit}、仙玉+${reward.jade}、法则碎片+${reward.rule}。`
    addLog(lastBattleText.value)
    return true
  }

  const chooseLineage = (id: ImmortalLineageId) => {
    if (!IMMORTAL_LINEAGES.some(l => l.id === id)) return false
    immortalLineage.value = id
    const info = lineageInfo.value
    visualPulse.value++
    lastBattleText.value = `${info.icon} 道统调整为「${info.name}」：${info.bonus}。`
    addLog(lastBattleText.value)
    return true
  }
  const resolveMandate = (mandateId: ImmortalMandateId, choiceId: ImmortalMandateChoiceId): boolean => {
    if (!ascended.value) return false
    const mandate = IMMORTAL_MANDATES.find(m => m.id === mandateId)
    const choice = mandate?.choices.find(c => c.id === choiceId)
    if (!mandate || !choice) return false
    const meritBonus = choice.id === 'merit' && immortalLineage.value === 'fate_dao' ? 8 : 0
    const ruleBonus = choice.id === 'law' && immortalLineage.value === 'thunder_dao' ? 2 : 0
    merit.value += choice.merit + meritBonus
    immortalJade.value += choice.jade
    ruleFragments.value += choice.rule + ruleBonus
    if (choice.streak) pkStreak.value += choice.streak
    if (choice.echo) {
      echoBlessings.value.sect_blessing = (echoBlessings.value.sect_blessing || 0) + choice.echo
      echoBlessings.value.family_blessing = (echoBlessings.value.family_blessing || 0) + choice.echo
      echoBlessings.value.farm_blessing = (echoBlessings.value.farm_blessing || 0) + choice.echo
    }
    mandateProgress.value += 6 + choice.echo * 2 + choice.streak * 3
    mandateDone.value[mandateId] = (mandateDone.value[mandateId] || 0) + 1
    visualPulse.value++
    lastBattleText.value = `${mandate.icon} 天命「${mandate.name}」选择「${choice.name}」：功德+${choice.merit + meritBonus}、仙玉+${choice.jade}、法则+${choice.rule + ruleBonus}${choice.echo ? `，凡界回响+${choice.echo}` : ''}${choice.streak ? `，仙擂气势+${choice.streak}` : ''}。`
    addLog(lastBattleText.value)
    return true
  }

  const serialize = () => ({ ascended: ascended.value, ascensionQuestActive: ascensionQuestActive.value, ascensionQuestComplete: ascensionQuestComplete.value, inImmortalWorld: inImmortalWorld.value, immortalTitle: immortalTitle.value, immortalOffice: immortalOffice.value, merit: merit.value, immortalJade: immortalJade.value, ruleFragments: ruleFragments.value, immortalBodyLevel: immortalBodyLevel.value, immortalBoneLevel: immortalBoneLevel.value, immortalSoulLevel: immortalSoulLevel.value, trialWins: trialWins.value, lastArtId: lastArtId.value, lastBattleText: lastBattleText.value, visualPulse: visualPulse.value, dutyDone: dutyDone.value, caveLevels: caveLevels.value, echoBlessings: echoBlessings.value, pkWins: pkWins.value, pkLosses: pkLosses.value, pkStreak: pkStreak.value, immortalRealmStage: immortalRealmStage.value, marketPurchases: marketPurchases.value, seasonClaimed: seasonClaimed.value, immortalLineage: immortalLineage.value, mandateProgress: mandateProgress.value, mandateDone: mandateDone.value })
  const deserialize = (data: any) => {
    ascended.value = data?.ascended ?? false
    ascensionQuestActive.value = data?.ascensionQuestActive ?? false
    ascensionQuestComplete.value = data?.ascensionQuestComplete ?? false
    inImmortalWorld.value = data?.inImmortalWorld ?? false
    immortalTitle.value = data?.immortalTitle ?? ''
    immortalOffice.value = data?.immortalOffice ?? 'xuntian'
    merit.value = Number(data?.merit ?? 0)
    immortalJade.value = Number(data?.immortalJade ?? 0)
    ruleFragments.value = Number(data?.ruleFragments ?? 0)
    immortalBodyLevel.value = Number(data?.immortalBodyLevel ?? (ascended.value ? 1 : 0)) || (ascended.value ? 1 : 0)
    immortalBoneLevel.value = Number(data?.immortalBoneLevel ?? (ascended.value ? 1 : 0)) || (ascended.value ? 1 : 0)
    immortalSoulLevel.value = Number(data?.immortalSoulLevel ?? (ascended.value ? 1 : 0)) || (ascended.value ? 1 : 0)
    trialWins.value = { star_river: 0, thunder_palace: 0, sun_ruins: 0, ...(data?.trialWins ?? {}) }
    lastArtId.value = data?.lastArtId ?? 'starfall_sword'
    lastBattleText.value = data?.lastBattleText ?? '仙光初凝，尚未发动仙术。'
    visualPulse.value = Number(data?.visualPulse ?? 0)
    dutyDone.value = { rain_edict: false, demon_edict: false, forge_edict: false, fate_edict: false, ...(data?.dutyDone ?? {}) }
    caveLevels.value = { star_platform: 0, merit_pool: 0, law_tablet: 0, ...(data?.caveLevels ?? {}) }
    echoBlessings.value = { sect_blessing: 0, family_blessing: 0, farm_blessing: 0, ...(data?.echoBlessings ?? {}) }
    pkWins.value = Number(data?.pkWins ?? 0)
    pkLosses.value = Number(data?.pkLosses ?? 0)
    pkStreak.value = Number(data?.pkStreak ?? 0)
    immortalRealmStage.value = Math.max(0, Math.min(IMMORTAL_REALMS.length - 1, Number(data?.immortalRealmStage ?? 0)))
    marketPurchases.value = { jade_seed: 0, star_sand: 0, edict_scroll: 0, law_core: 0, ...(data?.marketPurchases ?? {}) }
    seasonClaimed.value = { arena_10: false, arena_30: false, arena_60: false, ...(data?.seasonClaimed ?? {}) }
    immortalLineage.value = data?.immortalLineage ?? 'sword_dao'
    mandateProgress.value = Number(data?.mandateProgress ?? 0)
    mandateDone.value = { heaven_river: 0, star_audit: 0, mortal_incense: 0, arena_invite: 0, ...(data?.mandateDone ?? {}) }
  }
  return { IMMORTAL_DUTIES, IMMORTAL_CAVE_NODES, MORTAL_ECHOES, IMMORTAL_RIVALS, IMMORTAL_MARKET, IMMORTAL_REALMS, IMMORTAL_SEASON_REWARDS, IMMORTAL_LINEAGES, IMMORTAL_MANDATES, ascended, ascensionQuestActive, ascensionQuestComplete, inImmortalWorld, immortalTitle, immortalOffice, merit, immortalJade, ruleFragments, immortalBodyLevel, immortalBoneLevel, immortalSoulLevel, trialWins, lastArtId, lastBattleText, visualPulse, dutyDone, caveLevels, echoBlessings, pkWins, pkLosses, pkStreak, immortalRealmStage, marketPurchases, seasonClaimed, immortalLineage, mandateProgress, mandateDone, cavePower, pkRecord, immortalRealmInfo, nextImmortalRealm, immortalRealmPowerBonus, seasonScore, lineageInfo, canAscend, ascensionMaterialsReady, ascensionMaterials, ascensionMoneyCost, immortalRank, immortalPower, bodyProfile, officeInfo, triggerAscensionQuest, performAscension, enterImmortalWorld, returnToWorld, chooseOffice, castImmortalArt, challengeTrial, completeDuty, upgradeCaveNode, sendMortalEcho, challengeRival, buyImmortalMarket, breakthroughImmortalRealm, claimSeasonReward, chooseLineage, resolveMandate, serialize, deserialize }
})
