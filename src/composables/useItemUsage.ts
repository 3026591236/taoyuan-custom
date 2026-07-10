import type { Quality } from '@/types'
import { getItemById } from '@/data'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useGameStore } from '@/stores/useGameStore'
import { useCultivationStore } from '@/stores/useCultivationStore'
import { useCookingStore } from '@/stores/useCookingStore'
import { useSkillStore } from '@/stores/useSkillStore'
import { addLog } from './useGameLog'
import { useGameClock } from './useGameClock'

export const CULTIVATION_PILL_IDS = new Set([
  'mana_recovery_pill', 'cultivation_boost_pill', 'minor_realm_pill', 'ascension_boost_pill', 'qi_gathering_pill', 'foundation_pill',
  'lianjing_pill', 'huaqi_pill', 'lianqi_pill', 'huashen_pill', 'lianshen_pill', 'life_extension_pill', 'marrow_wash_pill',
  'good_fortune_pill', 'returning_void_pill', 'refining_void_pill', 'merge_way_pill', 'soul_mending_pill', 'nirvana_soul_pill',
  'dragon_face_pill', 'spirit_mending_pill', 'rebirth_pill', 'snow_lotus_pill', 'ganoderma_pill', 'ice_soul_pill'
])

export const SPECIAL_USABLE_ITEM_IDS = new Set([
  'rain_totem', 'stamina_fruit', 'storage_talisman', 'cosmos_bag', 'wood_scripture', 'thunder_scripture', 'void_scripture',
  'stamina_pill', 'time_stasis_pill'
])

export const isQuickUsableItem = (itemId: string): boolean => SPECIAL_USABLE_ITEM_IDS.has(itemId) || CULTIVATION_PILL_IDS.has(itemId)

export const useItemUsage = () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()
  const cultivationStore = useCultivationStore()
  const cookingStore = useCookingStore()
  const skillStore = useSkillStore()

  const eatItem = (itemId: string, quality: Quality = 'normal'): boolean => {
    const def = getItemById(itemId)
    if (!def?.edible || !def.staminaRestore) return false
    const staminaFull = playerStore.stamina >= playerStore.maxStamina
    const hpFull = playerStore.hp >= playerStore.getMaxHp()
    if (staminaFull && hpFull) {
      addLog('体力和生命值都已满，不需要食用。')
      return false
    }
    if (itemId.startsWith('food_')) {
      const result = cookingStore.eat(itemId.slice(5), quality)
      addLog(result.message)
      return result.success
    }
    if (!inventoryStore.removeItem(itemId, 1, quality)) return false
    const alchemistBonus = skillStore.getSkill('foraging').perk10 === 'alchemist' ? 1.5 : 1.0
    const staminaRestore = Math.floor(def.staminaRestore * alchemistBonus)
    playerStore.restoreStamina(staminaRestore)
    let msg = `食用了${def.name}，恢复${staminaRestore}体力`
    if (def.healthRestore) {
      const healthRestore = Math.floor(def.healthRestore * alchemistBonus)
      playerStore.restoreHealth(healthRestore)
      msg += `、${healthRestore}生命值`
    }
    addLog(`${msg}。`)
    return true
  }

  const useItem = (itemId: string, quality: Quality = 'normal'): boolean => {
    if (CULTIVATION_PILL_IDS.has(itemId)) return cultivationStore.usePill(itemId as any)
    if (itemId === 'stamina_pill') {
      const gained = playerStore.restoreStaminaOvercap(100, 500)
      if (gained <= 0) { addLog('体力已经达到体力丹可提升的上限。'); return false }
      if (!inventoryStore.removeItem(itemId, 1, quality)) return false
      addLog(`服用了体力丹，体力+${gained}（最多可临时超过上限500点）。`)
      return true
    }
    if (itemId === 'time_stasis_pill') {
      if (!inventoryStore.removeItem(itemId, 1, quality)) return false
      useGameClock().freezeGameTime(3)
      addLog('服用了时间禁锢丹，游戏时间将在现实时间3小时内暂停流逝。')
      return true
    }
    if (itemId === 'rain_totem') {
      if (!inventoryStore.removeItem(itemId, 1, quality)) return false
      gameStore.setTomorrowWeather('rainy')
      addLog('你使用了雨图腾，明天将会下雨。')
      return true
    }
    if (itemId === 'stamina_fruit') {
      if (playerStore.staminaCapLevel >= 4) { addLog('体力上限已达到最高，无法再使用仙桃。'); return false }
      if (!inventoryStore.removeItem(itemId, 1, quality)) return false
      playerStore.upgradeMaxStamina()
      addLog(`食用了仙桃，体力上限永久提升至${playerStore.maxStamina}！`)
      return true
    }
    if (itemId === 'storage_talisman') {
      if (!inventoryStore.removeItem(itemId, 1, quality)) return false
      inventoryStore.expandCapacityExtra()
      addLog(`使用了纳物符，背包永久扩容至${inventoryStore.capacity}格！`)
      return true
    }
    if (itemId === 'cosmos_bag') {
      if (!inventoryStore.removeItem(itemId, 1, quality)) return false
      for (let i = 0; i < 4; i++) inventoryStore.expandCapacityExtra()
      addLog(`使用了乾坤袋，背包永久扩容至${inventoryStore.capacity}格！`)
      return true
    }
    if (itemId === 'wood_scripture' || itemId === 'thunder_scripture' || itemId === 'void_scripture') {
      const map: Record<string, string> = { wood_scripture: 'wood', thunder_scripture: 'thunder', void_scripture: 'void' }
      const result = cultivationStore.learnManual(map[itemId])
      if (!result.success) { addLog(result.message); return false }
      if (!inventoryStore.removeItem(itemId, 1, quality)) return false
      addLog(result.message)
      return true
    }
    return false
  }

  return { eatItem, useItem, isQuickUsableItem }
}
