import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { MUSEUM_ITEMS, MUSEUM_MILESTONES, MUSEUM_THEME_COLLECTIONS, MUSEUM_RESTORATIONS } from '@/data/museum'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'

export const useMuseumStore = defineStore('museum', () => {
  /** 已捐赠物品ID集合 */
  const donatedItems = ref<string[]>([])

  /** 已领取的里程碑count值集合 */
  const claimedMilestones = ref<number[]>([])
  const claimedThemes = ref<string[]>([])
  const restoredProjects = ref<string[]>([])
  const fame = ref(0)
  const lastIncomeDay = ref('')

  /** 已捐赠数量 */
  const donatedCount = computed(() => donatedItems.value.length)

  /** 总物品数 */
  const totalCount = computed(() => MUSEUM_ITEMS.length)
  const themeProgress = computed(() => MUSEUM_THEME_COLLECTIONS.map(t => ({ ...t, donated: t.itemIds.filter(id => isDonated(id)).length, total: t.itemIds.length, completed: t.itemIds.every(id => isDonated(id)), claimed: claimedThemes.value.includes(t.id) })))
  const restorationProjects = computed(() => MUSEUM_RESTORATIONS.map(r => ({ ...r, restored: restoredProjects.value.includes(r.id), unlocked: donatedCount.value >= r.requiredDonations })))
  const museumLevel = computed(() => Math.min(8, Math.floor((fame.value + donatedCount.value * 8 + restoredProjects.value.length * 25) / 120) + 1))
  const dailyIncome = computed(() => Math.floor(donatedCount.value * 18 + fame.value * 2.5 + restoredProjects.value.length * 120 + claimedThemes.value.length * 80))

  /** 是否已捐赠 */
  const isDonated = (itemId: string): boolean => {
    return donatedItems.value.includes(itemId)
  }

  /** 是否可捐赠（背包中有且未捐赠过） */
  const canDonate = (itemId: string): boolean => {
    if (isDonated(itemId)) return false
    if (!MUSEUM_ITEMS.find(m => m.id === itemId)) return false
    const inventoryStore = useInventoryStore()
    return inventoryStore.hasItem(itemId)
  }

  /** 获取背包中可捐赠的物品列表 */
  const donatableItems = computed(() => {
    const inventoryStore = useInventoryStore()
    return inventoryStore.items
      .filter(inv => {
        const museumItem = MUSEUM_ITEMS.find(m => m.id === inv.itemId)
        return museumItem && !isDonated(inv.itemId)
      })
      .map(inv => inv.itemId)
  })

  /** 捐赠物品 */
  const donateItem = (itemId: string): boolean => {
    if (!canDonate(itemId)) return false
    const inventoryStore = useInventoryStore()
    const removed = inventoryStore.removeItem(itemId, 1)
    if (!removed) return false
    donatedItems.value.push(itemId)
    fame.value += 3
    return true
  }

  /** 可领取的里程碑 */
  const claimableMilestones = computed(() => {
    return MUSEUM_MILESTONES.filter(m => donatedCount.value >= m.count && !claimedMilestones.value.includes(m.count))
  })

  /** 领取里程碑奖励 */
  const claimMilestone = (count: number): boolean => {
    const milestone = MUSEUM_MILESTONES.find(m => m.count === count)
    if (!milestone) return false
    if (donatedCount.value < count) return false
    if (claimedMilestones.value.includes(count)) return false

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()

    if (milestone.reward.money) {
      playerStore.earnMoney(milestone.reward.money)
    }
    if (milestone.reward.items) {
      for (const item of milestone.reward.items) {
        inventoryStore.addItem(item.itemId, item.quantity)
      }
    }
    claimedMilestones.value.push(count)
    return true
  }



  const claimThemeReward = (themeId: string): boolean => {
    const theme = MUSEUM_THEME_COLLECTIONS.find(t => t.id === themeId)
    if (!theme || claimedThemes.value.includes(themeId)) return false
    if (!theme.itemIds.every(id => isDonated(id))) return false
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    fame.value += theme.reward.fame
    if (theme.reward.money) playerStore.earnMoney(theme.reward.money)
    for (const item of theme.reward.items ?? []) inventoryStore.addItem(item.itemId, item.quantity)
    claimedThemes.value.push(themeId)
    return true
  }

  const canRestore = (projectId: string): boolean => {
    const project = MUSEUM_RESTORATIONS.find(r => r.id === projectId)
    if (!project || restoredProjects.value.includes(projectId) || donatedCount.value < project.requiredDonations) return false
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    if (playerStore.money < project.cost.money) return false
    return (project.cost.items ?? []).every(item => inventoryStore.getItemCount(item.itemId) >= item.quantity)
  }

  const restoreProject = (projectId: string): boolean => {
    const project = MUSEUM_RESTORATIONS.find(r => r.id === projectId)
    if (!project || !canRestore(projectId)) return false
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    if (!playerStore.spendMoney(project.cost.money)) return false
    for (const item of project.cost.items ?? []) inventoryStore.removeItem(item.itemId, item.quantity)
    fame.value += project.reward.fame
    if (project.reward.itemId) inventoryStore.addItem(project.reward.itemId, project.reward.quantity ?? 1)
    restoredProjects.value.push(projectId)
    return true
  }

  const dailyMuseumUpdate = (dayKey: string): number => {
    if (lastIncomeDay.value === dayKey || dailyIncome.value <= 0) return 0
    lastIncomeDay.value = dayKey
    const playerStore = usePlayerStore()
    const income = dailyIncome.value
    playerStore.earnMoney(income)
    return income
  }

  /** 序列化 */
  const serialize = () => ({
    donatedItems: [...donatedItems.value],
    claimedMilestones: [...claimedMilestones.value],
    claimedThemes: [...claimedThemes.value],
    restoredProjects: [...restoredProjects.value],
    fame: fame.value,
    lastIncomeDay: lastIncomeDay.value
  })

  /** 反序列化 */
  const deserialize = (data: ReturnType<typeof serialize>) => {
    donatedItems.value = data.donatedItems ?? []
    claimedMilestones.value = data.claimedMilestones ?? []
    claimedThemes.value = (data as any).claimedThemes ?? []
    restoredProjects.value = (data as any).restoredProjects ?? []
    fame.value = (data as any).fame ?? Math.floor(donatedItems.value.length * 3)
    lastIncomeDay.value = (data as any).lastIncomeDay ?? ''
  }

  return {
    donatedItems,
    claimedMilestones,
    claimedThemes,
    restoredProjects,
    fame,
    donatedCount,
    totalCount,
    themeProgress,
    restorationProjects,
    museumLevel,
    dailyIncome,
    isDonated,
    canDonate,
    donatableItems,
    donateItem,
    claimableMilestones,
    claimMilestone,
    claimThemeReward,
    canRestore,
    restoreProject,
    dailyMuseumUpdate,
    serialize,
    deserialize
  }
})
