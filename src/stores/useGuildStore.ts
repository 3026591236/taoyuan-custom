import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { MONSTER_GOALS, GUILD_SHOP_ITEMS, GUILD_DONATIONS, GUILD_LEVELS, GUILD_BONUS_PER_LEVEL } from '@/data/guild'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useGameStore } from './useGameStore'
import { addLog } from '@/composables/useGameLog'

export const useGuildStore = defineStore('guild', () => {
  /** 按怪物ID记录击杀数 */
  const monsterKills = ref<Record<string, number>>({})

  /** 已领取奖励的讨伐目标monsterId集合 */
  const claimedGoals = ref<string[]>([])

  /** 已遭遇过的怪物ID集合（用于图鉴） */
  const encounteredMonsters = ref<string[]>([])

  /** 贡献点（可消费货币） */
  const contributionPoints = ref(0)

  /** 公会经验（隐性） */
  const guildExp = ref(0)

  /** 公会等级（显性） */
  const guildLevel = ref(0)

  /** 每日限购追踪：{ itemId: 今日已购次数 } */
  const dailyPurchases = ref<Record<string, number>>({})

  /** 上次重置日限购的天编号 */
  const lastResetDay = ref(-1)

  /** 每周限购追踪：{ itemId: 本周已购次数 } */
  const weeklyPurchases = ref<Record<string, number>>({})

  /** 上次重置周限购的周编号 */
  const lastResetWeek = ref(-1)

  /** 永久总购买数追踪：{ itemId: 累计已购次数 } */
  const totalPurchases = ref<Record<string, number>>({})
  const weeklyExpeditionClaimed = ref<string[]>([])
  type GuildProjectId = 'monster_watch' | 'supply_line' | 'sect_drill'
  const guildProjects = ref<Record<GuildProjectId, number>>({ monster_watch: 0, supply_line: 0, sect_drill: 0 })
  type SectOfficeId = 'outer_hall' | 'alchemy_hall' | 'patrol_hall'
  const sectOffices = ref<Record<SectOfficeId, number>>({ outer_hall: 0, alchemy_hall: 0, patrol_hall: 0 })
  const GUILD_PROJECTS: { id: GuildProjectId; name: string; desc: string; itemId: string; itemName: string; quantity: number; exp: number; max: number }[] = [
    { id: 'monster_watch', name: '妖踪巡哨', desc: '提交灵骨布置巡哨，提升公会讨伐组织度。', itemId: 'spirit_bone', itemName: '灵骨', quantity: 1, exp: 55, max: 10 },
    { id: 'supply_line', name: '远征补给线', desc: '提交云纹丝修整护具，支撑宗门/公会远征。', itemId: 'cloud_silk', itemName: '云纹丝', quantity: 1, exp: 70, max: 8 },
    { id: 'sect_drill', name: '宗门合练', desc: '消耗灵石组织合练，给战斗与公会周常一个长期消耗点。', itemId: 'spirit_stone', itemName: '灵石', quantity: 10, exp: 65, max: 12 }
  ]
  const SECT_OFFICES: { id: SectOfficeId; name: string; desc: string; itemId: string; itemName: string; quantity: number; cost: number; max: number }[] = [
    { id: 'outer_hall', name: '外门执事堂', desc: '整理宗门杂务，提升捐献与周常收益。', itemId: 'spirit_ink', itemName: '灵墨', quantity: 1, cost: 1600, max: 8 },
    { id: 'alchemy_hall', name: '丹药供奉堂', desc: '建立丹药供奉，给宗门与家族长期补给。', itemId: 'herb', itemName: '草药', quantity: 8, cost: 2200, max: 8 },
    { id: 'patrol_hall', name: '巡山戒律堂', desc: '组织巡山与戒律，强化妖潮、秘境和宗门安全。', itemId: 'mystic_iron', itemName: '玄铁', quantity: 1, cost: 3600, max: 6 }
  ]

  const WEEKLY_EXPEDITIONS = [
    { id: 'raid', name: '公会周常·秘境讨伐', desc: '本周累计击杀20只怪物。', target: 20, rewardPoints: 90 },
    { id: 'donate', name: '公会周常·物资筹备', desc: '公会等级达到2或贡献点达到300。', target: 1, rewardPoints: 70 },
    { id: 'escort', name: '公会周常·护送协作', desc: '贡献点达到500后领取护送协作奖励。', target: 1, rewardPoints: 120 }
  ]

  /** 记录击杀 */
  const recordKill = (monsterId: string) => {
    monsterKills.value[monsterId] = (monsterKills.value[monsterId] ?? 0) + 1
    if (!encounteredMonsters.value.includes(monsterId)) {
      encounteredMonsters.value.push(monsterId)
    }
  }

  /** 记录遭遇（进入战斗时调用，不管是否击杀） */
  const recordEncounter = (monsterId: string) => {
    if (!encounteredMonsters.value.includes(monsterId)) {
      encounteredMonsters.value.push(monsterId)
    }
  }

  /** 获取某怪物击杀数 */
  const getKillCount = (monsterId: string): number => {
    return monsterKills.value[monsterId] ?? 0
  }

  /** 是否已遭遇某怪物 */
  const isEncountered = (monsterId: string): boolean => {
    return encounteredMonsters.value.includes(monsterId)
  }

  /** 已完成的讨伐目标数 */
  const completedGoalCount = computed(() => {
    return MONSTER_GOALS.filter(g => (monsterKills.value[g.monsterId] ?? 0) >= g.killTarget).length
  })

  /** 可领取奖励的目标 */
  const claimableGoals = computed(() => {
    return MONSTER_GOALS.filter(g => (monsterKills.value[g.monsterId] ?? 0) >= g.killTarget && !claimedGoals.value.includes(g.monsterId))
  })

  /** 领取讨伐奖励 */
  const claimGoal = (monsterId: string): boolean => {
    const goal = MONSTER_GOALS.find(g => g.monsterId === monsterId)
    if (!goal) return false
    if ((monsterKills.value[monsterId] ?? 0) < goal.killTarget) return false
    if (claimedGoals.value.includes(monsterId)) return false

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()

    if (goal.reward.money) {
      playerStore.earnMoney(goal.reward.money)
    }
    if (goal.reward.items) {
      for (const item of goal.reward.items) {
        inventoryStore.addItem(item.itemId, item.quantity)
      }
    }
    // 讨伐奖励只给贡献点，不增加公会经验（只有捐献增加经验）
    const bonusPoints = Math.floor((goal.reward.money ?? 0) / 20) + goal.killTarget
    contributionPoints.value += bonusPoints
    claimedGoals.value.push(monsterId)
    addLog(`领取讨伐奖励，额外获得 ${bonusPoints} 贡献点。`)
    return true
  }

  // ==================== 公会等级 ====================

  /** 计算当前游戏天编号 */
  const getCurrentDay = (): number => {
    const gameStore = useGameStore()
    const seasonIndex = ['spring', 'summer', 'autumn', 'winter'].indexOf(gameStore.season)
    return (gameStore.year - 1) * 112 + seasonIndex * 28 + gameStore.day
  }

  /** 确保每日限购已重置 */
  const ensureDailyReset = () => {
    const day = getCurrentDay()
    if (day !== lastResetDay.value) {
      dailyPurchases.value = {}
      lastResetDay.value = day
    }
  }

  /** 计算当前游戏周编号 */
  const getCurrentWeek = (): number => {
    return Math.floor((getCurrentDay() - 1) / 7)
  }

  /** 确保每周限购已重置 */
  const ensureWeeklyReset = () => {
    const week = getCurrentWeek()
    if (week !== lastResetWeek.value) {
      weeklyPurchases.value = {}
      weeklyExpeditionClaimed.value = []
      lastResetWeek.value = week
    }
  }

  /** 检查升级 */
  const checkLevelUp = () => {
    while (guildLevel.value < GUILD_LEVELS.length) {
      const next = GUILD_LEVELS[guildLevel.value]
      if (!next || guildExp.value < next.expRequired) break
      guildLevel.value++
      addLog(`冒险家公会等级提升到 ${guildLevel.value} 级！`)
    }
  }

  /** 捐献物品 */
  const donateItem = (itemId: string, quantity: number): { success: boolean; pointsGained: number } => {
    const donation = GUILD_DONATIONS.find(d => d.itemId === itemId)
    if (!donation) return { success: false, pointsGained: 0 }
    const inventoryStore = useInventoryStore()
    const available = inventoryStore.getItemCount(itemId)
    const actual = Math.min(quantity, available)
    if (actual <= 0) return { success: false, pointsGained: 0 }
    inventoryStore.removeItem(itemId, actual)
    const points = donation.points * actual
    contributionPoints.value += points
    guildExp.value += points
    checkLevelUp()
    return { success: true, pointsGained: points }
  }

  /** 获取今日剩余购买次数 */
  const getDailyRemaining = (itemId: string, dailyLimit: number): number => {
    ensureDailyReset()
    return dailyLimit - (dailyPurchases.value[itemId] ?? 0)
  }

  /** 获取本周剩余购买次数 */
  const getWeeklyRemaining = (itemId: string, weeklyLimit: number): number => {
    ensureWeeklyReset()
    return weeklyLimit - (weeklyPurchases.value[itemId] ?? 0)
  }

  /** 获取永久剩余购买次数 */
  const getTotalRemaining = (itemId: string, totalLimit: number): number => {
    return totalLimit - (totalPurchases.value[itemId] ?? 0)
  }

  /** 获取公会等级被动攻击加成 */
  const getGuildAttackBonus = (): number => {
    return guildLevel.value * GUILD_BONUS_PER_LEVEL.attack
  }

  /** 获取公会等级被动HP加成 */
  const getGuildHpBonus = (): number => {
    return guildLevel.value * GUILD_BONUS_PER_LEVEL.maxHp
  }

  const guildProjectCards = computed(() => GUILD_PROJECTS.map(p => ({ ...p, level: guildProjects.value[p.id] ?? 0, completed: (guildProjects.value[p.id] ?? 0) >= p.max })))
  const guildProjectBonusText = computed(() => `协作工程：攻击+${guildProjects.value.monster_watch * 2}，生命+${guildProjects.value.supply_line * 8}，周常贡献+${guildProjects.value.sect_drill * 2}%`)
  const sectOfficeCards = computed(() => SECT_OFFICES.map(o => ({ ...o, level: sectOffices.value[o.id] ?? 0, completed: (sectOffices.value[o.id] ?? 0) >= o.max })))
  const sectOfficeBonusText = computed(() => `宗门经营：捐献收益+${sectOffices.value.outer_hall * 2}%，丹药补给+${sectOffices.value.alchemy_hall}级，巡山战备+${sectOffices.value.patrol_hall}级`)
  const upgradeSectOffice = (id: SectOfficeId): { success: boolean; message: string } => {
    const office = SECT_OFFICES.find(o => o.id === id)
    if (!office) return { success: false, message: '宗门机构不存在。' }
    if ((sectOffices.value[id] ?? 0) >= office.max) return { success: false, message: '该机构已满级。' }
    const inv = useInventoryStore()
    const player = usePlayerStore()
    if (inv.getItemCount(office.itemId) < office.quantity) return { success: false, message: `${office.itemName}不足，需要${office.quantity}。` }
    if (!player.spendMoney(office.cost)) return { success: false, message: `铜钱不足，需要${office.cost}文。` }
    inv.removeItem(office.itemId, office.quantity)
    sectOffices.value[id] = (sectOffices.value[id] ?? 0) + 1
    guildExp.value += office.cost / 40
    contributionPoints.value += 20 + (sectOffices.value[id] ?? 0) * 3
    return { success: true, message: `${office.name}提升到${sectOffices.value[id]}级，宗门经营加深。` }
  }
  const contributeGuildProject = (id: GuildProjectId): { success: boolean; message: string } => {
    const project = GUILD_PROJECTS.find(p => p.id === id)
    if (!project) return { success: false, message: '工程不存在。' }
    if ((guildProjects.value[id] ?? 0) >= project.max) return { success: false, message: '工程已满级。' }
    const inv = useInventoryStore()
    if (inv.getItemCount(project.itemId) < project.quantity) return { success: false, message: `${project.itemName}不足，需要${project.quantity}。` }
    inv.removeItem(project.itemId, project.quantity)
    guildProjects.value[id] = (guildProjects.value[id] ?? 0) + 1
    contributionPoints.value += Math.floor(project.exp * 0.7)
    guildExp.value += project.exp
    checkLevelUp()
    addLog(`参与${project.name}，公会经验+${project.exp}。`)
    return { success: true, message: `${project.name}进度+1。` }
  }

  const weeklyExpeditions = computed(() => {
    ensureWeeklyReset()
    const totalKills = Object.values(monsterKills.value).reduce((s, n) => s + (Number(n) || 0), 0)
    return WEEKLY_EXPEDITIONS.map(e => {
      const progress = e.id === 'raid' ? totalKills : e.id === 'donate' ? (guildLevel.value >= 2 || contributionPoints.value >= 300 ? 1 : 0) : (contributionPoints.value >= 500 ? 1 : 0)
      return { ...e, progress, done: progress >= e.target, claimed: weeklyExpeditionClaimed.value.includes(e.id) }
    })
  })

  const claimWeeklyExpedition = (id: string): { success: boolean; message: string } => {
    ensureWeeklyReset()
    const task = weeklyExpeditions.value.find(t => t.id === id)
    if (!task) return { success: false, message: '周常不存在。' }
    if (!task.done) return { success: false, message: '周常目标尚未完成。' }
    if (task.claimed) return { success: false, message: '本周已领取。' }
    const inventory = useInventoryStore()
    const projectBonus = 1 + (guildProjects.value.sect_drill || 0) * 0.02
    const points = Math.floor(task.rewardPoints * projectBonus)
    contributionPoints.value += points
    guildExp.value += Math.floor(points * 0.8)
    inventory.addItem('spirit_stone', Math.max(3, Math.floor(task.rewardPoints / 20)))
    weeklyExpeditionClaimed.value.push(id)
    checkLevelUp()
    addLog(`完成${task.name}，贡献点+${points}。`)
    return { success: true, message: `${task.name}奖励已领取。` }
  }

  // ==================== 商店 ====================

  /** 公会商店：检查物品是否已解锁 */
  const isShopItemUnlocked = (itemId: string): boolean => {
    const item = GUILD_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item) return false
    if (!item.unlockGuildLevel) return true
    return guildLevel.value >= item.unlockGuildLevel
  }

  /** 公会商店：购买物品 */
  const buyShopItem = (itemId: string): boolean => {
    const item = GUILD_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item) return false
    if (!isShopItemUnlocked(itemId)) return false

    // 每日限购检查
    if (item.dailyLimit) {
      ensureDailyReset()
      if ((dailyPurchases.value[itemId] ?? 0) >= item.dailyLimit) return false
    }

    // 每周限购检查
    if (item.weeklyLimit) {
      ensureWeeklyReset()
      if ((weeklyPurchases.value[itemId] ?? 0) >= item.weeklyLimit) return false
    }

    // 永久总限购检查
    if (item.totalLimit) {
      if ((totalPurchases.value[itemId] ?? 0) >= item.totalLimit) return false
    }

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()

    // 检查材料是否足够
    if (item.materials) {
      for (const mat of item.materials) {
        if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
      }
    }

    // 永久品用贡献点，消耗品用铜钱
    if (item.contributionCost) {
      if (contributionPoints.value < item.contributionCost) return false
      contributionPoints.value -= item.contributionCost
    } else {
      if (playerStore.money < item.price) return false
      playerStore.spendMoney(item.price)
    }

    // 扣除材料
    if (item.materials) {
      for (const mat of item.materials) {
        inventoryStore.removeItem(mat.itemId, mat.quantity)
      }
    }

    // 根据装备类型添加到对应栏位
    let addSuccess = true
    if (item.equipType === 'weapon') {
      addSuccess = inventoryStore.addWeapon(item.itemId, null)
    } else if (item.equipType === 'ring') {
      addSuccess = inventoryStore.addRing(item.itemId)
    } else if (item.equipType === 'hat') {
      addSuccess = inventoryStore.addHat(item.itemId)
    } else if (item.equipType === 'shoe') {
      addSuccess = inventoryStore.addShoe(item.itemId)
    } else {
      addSuccess = inventoryStore.addItem(item.itemId, 1)
    }

    if (!addSuccess) {
      // 退还贡献点/铜钱
      if (item.contributionCost) contributionPoints.value += item.contributionCost
      else playerStore.earnMoney(item.price)
      // 退还材料
      if (item.materials) {
        for (const mat of item.materials) {
          inventoryStore.addItem(mat.itemId, mat.quantity)
        }
      }
      return false
    }

    // 记录限购
    if (item.dailyLimit) {
      dailyPurchases.value[itemId] = (dailyPurchases.value[itemId] ?? 0) + 1
    }
    if (item.weeklyLimit) {
      weeklyPurchases.value[itemId] = (weeklyPurchases.value[itemId] ?? 0) + 1
    }
    if (item.totalLimit) {
      totalPurchases.value[itemId] = (totalPurchases.value[itemId] ?? 0) + 1
    }
    addLog(`在公会商店购买了「${item.name}」。`)
    return true
  }

  /** 序列化 */
  const serialize = () => ({
    monsterKills: { ...monsterKills.value },
    claimedGoals: [...claimedGoals.value],
    encounteredMonsters: [...encounteredMonsters.value],
    contributionPoints: contributionPoints.value,
    guildExp: guildExp.value,
    guildLevel: guildLevel.value,
    dailyPurchases: { ...dailyPurchases.value },
    lastResetDay: lastResetDay.value,
    weeklyPurchases: { ...weeklyPurchases.value },
    lastResetWeek: lastResetWeek.value,
    totalPurchases: { ...totalPurchases.value },
    weeklyExpeditionClaimed: [...weeklyExpeditionClaimed.value], guildProjects: { ...guildProjects.value }, sectOffices: { ...sectOffices.value }
  })

  /** 反序列化 */
  const deserialize = (data: ReturnType<typeof serialize>) => {
    monsterKills.value = data.monsterKills ?? {}
    claimedGoals.value = data.claimedGoals ?? []
    encounteredMonsters.value = data.encounteredMonsters ?? []
    dailyPurchases.value = ((data as Record<string, unknown>).dailyPurchases as Record<string, number>) ?? {}
    lastResetDay.value = ((data as Record<string, unknown>).lastResetDay as number) ?? -1
    weeklyPurchases.value = ((data as Record<string, unknown>).weeklyPurchases as Record<string, number>) ?? {}
    lastResetWeek.value = ((data as Record<string, unknown>).lastResetWeek as number) ?? -1
    totalPurchases.value = ((data as Record<string, unknown>).totalPurchases as Record<string, number>) ?? {}
    weeklyExpeditionClaimed.value = ((data as Record<string, unknown>).weeklyExpeditionClaimed as string[]) ?? []
    guildProjects.value = { monster_watch: 0, supply_line: 0, sect_drill: 0, ...(((data as any).guildProjects) ?? {}) }
    sectOffices.value = { outer_hall: 0, alchemy_hall: 0, patrol_hall: 0, ...(((data as any).sectOffices) ?? {}) }

    // 旧存档迁移：如果没有贡献点字段但有已领取的讨伐目标，补发贡献点（不补经验，经验只来自捐献）
    const isOldSave = !('contributionPoints' in data)
    if (isOldSave && claimedGoals.value.length > 0) {
      let migratedPoints = 0
      for (const monsterId of claimedGoals.value) {
        const goal = MONSTER_GOALS.find(g => g.monsterId === monsterId)
        if (goal) {
          migratedPoints += Math.floor((goal.reward.money ?? 0) / 20) + goal.killTarget
        }
      }
      contributionPoints.value = migratedPoints
      guildExp.value = 0
      guildLevel.value = 0
    } else {
      contributionPoints.value = ((data as Record<string, unknown>).contributionPoints as number) ?? 0
      guildExp.value = ((data as Record<string, unknown>).guildExp as number) ?? 0
      guildLevel.value = ((data as Record<string, unknown>).guildLevel as number) ?? 0
    }
  }

  return {
    monsterKills,
    claimedGoals,
    encounteredMonsters,
    contributionPoints,
    guildExp,
    guildLevel,
    guildProjects,
    guildProjectCards,
    guildProjectBonusText,
    contributeGuildProject,
    sectOfficeCards,
    sectOfficeBonusText,
    upgradeSectOffice,
    recordKill,
    recordEncounter,
    getKillCount,
    isEncountered,
    completedGoalCount,
    claimableGoals,
    claimGoal,
    donateItem,
    getDailyRemaining,
    getWeeklyRemaining,
    getTotalRemaining,
    getGuildAttackBonus,
    getGuildHpBonus,
    isShopItemUnlocked,
    buyShopItem,
    weeklyExpeditions,
    claimWeeklyExpedition,
    serialize,
    deserialize
  }
})
