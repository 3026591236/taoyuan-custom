import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addLog, showFloat } from '@/composables/useGameLog'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'

export type SpiritRoot = 'mixed' | 'wood' | 'water' | 'earth' | 'fire' | 'metal'
export type ArtifactKey = 'glimmerHoe' | 'spiritKettle' | 'spiritRain'
export type BeastId = 'fox' | 'crane' | 'phoenix'
export type CaveSlotType = 'alchemy' | 'farm' | 'meditation'

const ARTIFACT_NAMES: Record<ArtifactKey, string> = { glimmerHoe: '流光锄', spiritKettle: '引灵壶', spiritRain: '灵雨诀' }

export const BEAST_DATA: Record<BeastId, { name: string; emoji: string; desc: string; bonusType: string; bonusDesc: string; feedCrop: string; feedQty: number }> = {
  fox: { name: '灵狐', emoji: '🦊', desc: '机敏灵慧，善于感应灵脉走向', bonusType: 'aura', bonusDesc: '灵气获取+30%', feedCrop: 'dew_grass', feedQty: 5 },
  crane: { name: '仙鹤', emoji: '🦢', desc: '清雅高洁，修行时心境通透', bonusType: 'meditation', bonusDesc: '打坐修为+40%', feedCrop: 'spirit_rice', feedQty: 5 },
  phoenix: { name: '青鸾', emoji: '🦚', desc: '浴火而生，丹火纯青', bonusType: 'alchemy', bonusDesc: '炼丹品质提升', feedCrop: 'vermilion_fruit', feedQty: 3 }
}

export const CAVE_SLOT_DATA: Record<CaveSlotType, { name: string; desc: string }> = {
  alchemy: { name: '丹房', desc: '洞府内炼丹，灵气消耗-20%' },
  farm: { name: '灵圃', desc: '洞府内种灵植，灵气产出+50%' },
  meditation: { name: '静室', desc: '洞府内打坐，修为和灵力翻倍' }
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
  foundation_pill: { name: '筑基丹', materials: [{ itemId: 'vermilion_fruit', quantity: 2 }, { itemId: 'dew_grass', quantity: 3 }, { itemId: 'spirit_rice', quantity: 5 }], aura: 360, mana: 40, output: 1 }
} as const
export type PillId = keyof typeof ALCHEMY_RECIPES
export const getAlchemyRecipes = () => ALCHEMY_RECIPES

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
  { name: '金丹后期', maxCultivation: 100000, maxMana: 2000, breakthroughCost: 28000 }
]

const FIELD_TIERS = ['普通田', '黄阶灵田', '玄阶灵田', '地阶灵田', '天阶洞天']
export const SPIRIT_ROOT_NAMES: Record<SpiritRoot, string> = {
  mixed: '杂灵根', wood: '木灵根', water: '水灵根', earth: '土灵根', fire: '火灵根', metal: '金灵根'
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
  vermilion_fruit: 6
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
  const totalAuraHarvested = ref(0)
  const alchemyUnlocked = ref(false)
  const artifacts = ref<Record<ArtifactKey, boolean>>({ glimmerHoe: false, spiritKettle: false, spiritRain: false })
  const foundationPillBlessing = ref(0)

  // V0.3 洞府
  const caveTier = ref(0)
  const caveSlots = ref<CaveSlotType[]>([])
  // V0.3 灵兽
  const beast = ref<BeastId | null>(null)
  const beastBond = ref(0)
    const sect = ref<'sword' | 'alchemy' | 'talisman' | null>(null)
  const sectSkills = ref([0, 0, 0])
  const sectContribution = ref(0)

  const realm = computed(() => REALMS[realmIndex.value] ?? REALMS[0]!)
  const realmName = computed(() => realm.value.name)
  const maxCultivation = computed(() => realm.value.maxCultivation)
  const maxMana = computed(() => realm.value.maxMana + fieldTier.value * 10)
  const fieldTierName = computed(() => FIELD_TIERS[fieldTier.value] ?? FIELD_TIERS[0]!)
  const spiritRootName = computed(() => SPIRIT_ROOT_NAMES[spiritRoot.value])
  const canBreakthrough = computed(() => cultivation.value >= maxCultivation.value && aura.value >= Math.max(0, realm.value.breakthroughCost - foundationPillBlessing.value))
  const artifactName = (key: ArtifactKey) => ARTIFACT_NAMES[key]
  const caveTierData = computed(() => CAVE_TIERS[caveTier.value] ?? CAVE_TIERS[0]!)
  const caveTierName = computed(() => caveTierData.value.name)
  const caveMaxSlots = computed(() => caveTierData.value.slots)
  const caveAuraRegen = computed(() => caveTierData.value.auraRegen)
  const caveSlotNames = computed(() => caveSlots.value.map(t => CAVE_SLOT_DATA[t].name))
  const hasCaveSlot = (type: CaveSlotType) => caveSlots.value.includes(type)
  const beastData = computed(() => beast.value ? BEAST_DATA[beast.value] : null)
  const beastName = computed(() => beastData.value?.name ?? '无')
  const beastEmoji = computed(() => beastData.value?.emoji ?? '')
  const beastLevel = computed(() => Math.floor(beastBond.value / 100) + 1)

  const unlock = () => {
    if (unlocked.value) return false
    const player = usePlayerStore()
    if (!player.spendMoney(3000)) {
      showFloat('铜钱不足，需要3000文启蒙灵田。', 'danger')
      return false
    }
    unlocked.value = true
    fieldTier.value = Math.max(fieldTier.value, 1)
    aura.value += 60
    mana.value = maxMana.value
    addLog('你在田埂下挖出一缕温润灵脉，桃源田庄启蒙为黄阶灵田。')
    showFloat('灵田启蒙！', 'success')
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
    cultivation.value = Math.min(cultivation.value + gain, maxCultivation.value)
    mana.value = Math.min(mana.value + manaGain, maxMana.value)
    aura.value += auraGain
    const tr = game.advanceTime(1)
    addLog(`静坐调息一刻，消耗体力10，修为+${gain}，灵力+${manaGain}，灵气+${auraGain}。`)
    showFloat(`修为+${gain}`, 'accent')
    if (tr.message) addLog(tr.message)
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
    const gain = Math.floor(spend * (1.15 + fieldTier.value * 0.12 + (artifacts.value.spiritKettle ? 0.18 : 0)))
    aura.value -= spend
    cultivation.value = Math.min(cultivation.value + gain, maxCultivation.value)
    addLog(`消耗体力5，炼化灵气${spend}点，修为增长${gain}。`)
    showFloat(`修为+${gain}`, 'success')
    return true
  }

  const breakthrough = () => {
    if (!unlocked.value) return unlock()
    if (!canBreakthrough.value) {
      showFloat('修为或灵气不足，尚不能突破。', 'danger')
      return false
    }
    const old = realmName.value
    aura.value -= Math.max(0, realm.value.breakthroughCost - foundationPillBlessing.value)
    foundationPillBlessing.value = 0
    realmIndex.value = Math.min(realmIndex.value + 1, REALMS.length - 1)
    cultivation.value = 0
    mana.value = maxMana.value
    addLog(`灵田上空清气回旋，你从「${old}」突破至「${realmName.value}」！`)
    showFloat(`突破：${realmName.value}`, 'success')
    // 突破世界公告
    const player = usePlayerStore()
    try {
      const token = localStorage.getItem('account_token')
      if (token) {
        fetch('/api/breakthrough-announce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ playerName: player.playerName, from: old, to: realmName.value })
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
    if (!unlocked.value) return 0
    const base = getSpiritCropAura(cropId)
    if (base <= 0) return 0
    const directRatio = cropId === 'spirit_rice' || cropId === 'dew_grass' || cropId === 'vermilion_fruit' ? 0.6 : 1
    const caveFarmBonus = hasCaveSlot('farm') ? 0.5 : 0
    const foxBonus = beast.value === 'fox' ? 0.3 : 0
    const artifactBonus = artifacts.value.glimmerHoe ? 0.25 : 0
    const rainBonus = artifacts.value.spiritRain ? 0.2 : 0
    const gain = Math.max(1, Math.floor(base * qty * directRatio * (1 + fieldTier.value * 0.25 + artifactBonus + rainBonus + caveFarmBonus + foxBonus)))
    aura.value += gain
    totalAuraHarvested.value += gain
    addLog(`灵田收获蕴含灵机，获得灵气${gain}点。`)
    showFloat(`灵气+${gain}`, 'accent')
    return gain
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

  const craftPill = (pillId: PillId) => {
    if (!alchemyUnlocked.value && !unlockAlchemy()) return false
    const recipe = ALCHEMY_RECIPES[pillId]
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
    inventory.addItem(pillId, recipe.output)
    addLog(`炼成${recipe.name}×${recipe.output}。`)
    showFloat(`${recipe.name}+${recipe.output}`, 'success')
    return true
  }

  const usePill = (pillId: PillId) => {
    const inventory = useInventoryStore()
    if (!inventory.hasItem(pillId)) {
      showFloat('背包中没有这种丹药。', 'danger')
      return false
    }
    inventory.removeItem(pillId, 1)
    if (pillId === 'mana_recovery_pill') {
      const gain = 45 + fieldTier.value * 10
      mana.value = Math.min(maxMana.value, mana.value + gain)
      addLog(`服下一枚回灵丹，灵力恢复${gain}。`)
      showFloat(`灵力+${gain}`, 'success')
    } else if (pillId === 'qi_gathering_pill') {
      const gain = 160 + fieldTier.value * 45
      cultivation.value = Math.min(maxCultivation.value, cultivation.value + gain)
      addLog(`服下一枚聚气丹，修为增长${gain}。`)
      showFloat(`修为+${gain}`, 'success')
    } else {
      foundationPillBlessing.value += 900
      cultivation.value = Math.min(maxCultivation.value, cultivation.value + 300)
      addLog('服下一枚筑基丹，突破所需灵气降低900，并获得修为300。')
      showFloat('筑基丹生效', 'success')
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
    addLog(`洞府扩建为「${caveTierName.value}」，可用槽位${caveMaxSlots.value}个，每日灵气恢复+${caveAuraRegen.value}。`)
    showFloat(caveTierName.value, 'success')
    return true
  }

  const placeCaveSlot = (type: CaveSlotType) => {
    if (caveTier.value <= 0) { showFloat('请先开辟洞府。', 'danger'); return false }
    if (caveSlots.value.includes(type)) { showFloat('已安置此设施。', 'danger'); return false }
    if (caveSlots.value.length >= caveMaxSlots.value) { showFloat('洞府槽位已满，请先扩建。', 'danger'); return false }
    const player = usePlayerStore()
    const cost = { alchemy: 3000, farm: 2000, meditation: 4000 }[type] ?? 0
    if (!player.spendMoney(cost)) { showFloat(`铜钱不足，需要${cost}文。`, 'danger'); return false }
    caveSlots.value = [...caveSlots.value, type]
    addLog(`洞府内安置了「${CAVE_SLOT_DATA[type].name}」——${CAVE_SLOT_DATA[type].desc}`)
    showFloat(`${CAVE_SLOT_DATA[type].name}已安置`, 'success')
    return true
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
    if (inventory.getItemCount(data.feedCrop) < data.feedQty) {
      showFloat(`${data.name}需要${data.feedCrop === 'dew_grass' ? '凝露草' : data.feedCrop === 'spirit_rice' ? '蕴灵稻' : '朱果'}×${data.feedQty}。`, 'danger')
      return false
    }
    inventory.removeItem(data.feedCrop, data.feedQty)
    beastBond.value += 25
    addLog(`你喂食${data.emoji}${data.name}，羁绊加深。当前羁绊：${beastBond.value}`)
    showFloat(`羁绊+25`, 'success')
    return true
  }

    const serialize = () => ({ unlocked: unlocked.value, realmIndex: realmIndex.value, cultivation: cultivation.value, aura: aura.value, mana: mana.value, spiritRoot: spiritRoot.value, fieldTier: fieldTier.value, totalAuraHarvested: totalAuraHarvested.value, alchemyUnlocked: alchemyUnlocked.value, artifacts: artifacts.value, foundationPillBlessing: foundationPillBlessing.value, caveTier: caveTier.value, caveSlots: caveSlots.value, beast: beast.value, beastBond: beastBond.value, sect: sect.value, sectSkills: sectSkills.value, sectContribution: sectContribution.value })
  const deserialize = (data?: Partial<ReturnType<typeof serialize>>) => {
    if (!data) return
    unlocked.value = data.unlocked ?? false
    realmIndex.value = data.realmIndex ?? 0
    cultivation.value = data.cultivation ?? 0
    aura.value = data.aura ?? 0
    mana.value = data.mana ?? 30
    spiritRoot.value = (data.spiritRoot as SpiritRoot) ?? 'mixed'
    fieldTier.value = data.fieldTier ?? 0
    totalAuraHarvested.value = data.totalAuraHarvested ?? 0
    alchemyUnlocked.value = (data as any).alchemyUnlocked ?? false
    artifacts.value = { glimmerHoe: false, spiritKettle: false, spiritRain: false, ...((data as any).artifacts ?? {}) }
    foundationPillBlessing.value = (data as any).foundationPillBlessing ?? 0
    caveTier.value = (data as any).caveTier ?? 0
    caveSlots.value = (data as any).caveSlots ?? []
    beast.value = (data as any).beast ?? null
    beastBond.value = (data as any).beastBond ?? 0
    sect.value = (data as any).sect ?? null
    sectSkills.value = (data as any).sectSkills ?? [0, 0, 0]
    sectContribution.value = (data as any).sectContribution ?? 0
  }

  return { unlocked, realmIndex, cultivation, aura, mana, spiritRoot, fieldTier, totalAuraHarvested, alchemyUnlocked, artifacts, foundationPillBlessing, caveTier, caveSlots, beast, beastBond, sect, sectSkills, sectContribution, realmName, maxCultivation, maxMana, fieldTierName, spiritRootName, canBreakthrough, artifactName, caveTierName, caveMaxSlots, caveAuraRegen, caveSlotNames, hasCaveSlot, beastData, beastName, beastEmoji, beastLevel, unlock, meditate, refineAura, breakthrough, upgradeField, addAuraFromHarvest, unlockAlchemy, craftPill, usePill, unlockArtifact, openCave, upgradeCave, placeCaveSlot, encounterBeast, feedBeast, serialize, deserialize }
})
