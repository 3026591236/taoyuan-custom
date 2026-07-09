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
    return cultivation.combatPower + merit.value * 3 + immortalJade.value * 12 + ruleFragments.value * 25 + (immortalBodyLevel.value + immortalBoneLevel.value + immortalSoulLevel.value) * 80
  })
  const bodyProfile = computed(() => [
    { name: '仙体', level: immortalBodyLevel.value, desc: '飞升后肉身蜕凡，角色外观出现仙光与云纹。' },
    { name: '仙骨', level: immortalBoneLevel.value, desc: '承载天雷与星辉，影响仙术破防表现。' },
    { name: '仙魂', level: immortalSoulLevel.value, desc: '凝聚功德香火，影响法则掌控与试炼稳定。' }
  ])
  const officeInfo = computed(() => IMMORTAL_OFFICES.find(o => o.id === immortalOffice.value) || IMMORTAL_OFFICES[0]!)

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

  const serialize = () => ({ ascended: ascended.value, ascensionQuestActive: ascensionQuestActive.value, ascensionQuestComplete: ascensionQuestComplete.value, inImmortalWorld: inImmortalWorld.value, immortalTitle: immortalTitle.value, immortalOffice: immortalOffice.value, merit: merit.value, immortalJade: immortalJade.value, ruleFragments: ruleFragments.value, immortalBodyLevel: immortalBodyLevel.value, immortalBoneLevel: immortalBoneLevel.value, immortalSoulLevel: immortalSoulLevel.value, trialWins: trialWins.value, lastArtId: lastArtId.value, lastBattleText: lastBattleText.value, visualPulse: visualPulse.value })
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
  }
  return { ascended, ascensionQuestActive, ascensionQuestComplete, inImmortalWorld, immortalTitle, immortalOffice, merit, immortalJade, ruleFragments, immortalBodyLevel, immortalBoneLevel, immortalSoulLevel, trialWins, lastArtId, lastBattleText, visualPulse, canAscend, ascensionMaterialsReady, ascensionMaterials, ascensionMoneyCost, immortalRank, immortalPower, bodyProfile, officeInfo, triggerAscensionQuest, performAscension, enterImmortalWorld, returnToWorld, chooseOffice, castImmortalArt, challengeTrial, serialize, deserialize }
})
