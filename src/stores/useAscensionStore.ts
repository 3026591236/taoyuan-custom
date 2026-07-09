import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useCultivationStore } from './useCultivationStore'
import { usePlayerStore } from './usePlayerStore'
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

export const useAscensionStore = defineStore('ascension', () => {
  const ascended = ref(false)
  const ascensionQuestActive = ref(false)
  const ascensionQuestComplete = ref(false)
  const inImmortalWorld = ref(false)
  const immortalTitle = ref('')

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
    addLog('飞升成功！你踏入仙界，获得「初入仙门」称号。')
    return true
  }

  const enterImmortalWorld = () => { inImmortalWorld.value = true }
  const returnToWorld = () => { inImmortalWorld.value = false }

  const serialize = () => ({ ascended: ascended.value, ascensionQuestActive: ascensionQuestActive.value, ascensionQuestComplete: ascensionQuestComplete.value, inImmortalWorld: inImmortalWorld.value, immortalTitle: immortalTitle.value })
  const deserialize = (data: any) => {
    ascended.value = data?.ascended ?? false
    ascensionQuestActive.value = data?.ascensionQuestActive ?? false
    ascensionQuestComplete.value = data?.ascensionQuestComplete ?? false
    inImmortalWorld.value = data?.inImmortalWorld ?? false
    immortalTitle.value = data?.immortalTitle ?? ''
  }

  return { ascended, ascensionQuestActive, ascensionQuestComplete, inImmortalWorld, immortalTitle, canAscend, ascensionMaterialsReady, ascensionMaterials, ascensionMoneyCost, triggerAscensionQuest, performAscension, enterImmortalWorld, returnToWorld, serialize, deserialize }
})
