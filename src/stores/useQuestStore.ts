import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { QuestInstance, Season, MainQuestState, MainQuestObjective } from '@/types'
import { generateQuest, generateSpecialOrder as _generateSpecialOrder } from '@/data/quests'
import { getStoryQuestById, getNextStoryQuest, getFirstStoryQuest, STORY_QUESTS } from '@/data/storyQuests'
import { getNpcById } from '@/data/npcs'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useNpcStore } from './useNpcStore'
import { useAchievementStore } from './useAchievementStore'
import { useSkillStore } from './useSkillStore'
import { useShopStore } from './useShopStore'
import { useAnimalStore } from './useAnimalStore'
import { useCultivationStore } from './useCultivationStore'
import { useGameStore } from './useGameStore'
import { useCombatStore } from './useCombatStore'
import type { AttributeKey } from './usePlayerStore'

export const useQuestStore = defineStore('quest', () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const npcStore = useNpcStore()
  const achievementStore = useAchievementStore()

  /** 告示栏上的可接取任务 */
  const boardQuests = ref<QuestInstance[]>([])

  /** 已接取的进行中任务 */
  const activeQuests = ref<QuestInstance[]>([])

  /** 累计完成任务数 */
  const completedQuestCount = ref<number>(0)

  /** 当前可接取的特殊订单 */
  const specialOrder = ref<QuestInstance | null>(null)

  /** 最大同时接取任务数 */
  const MAX_ACTIVE_QUESTS = 3


  // ============================================================
  // 修行志：把种田、地脉、灵田、修仙与战斗串成可领取目标
  // ============================================================

  type JourneyTaskType = 'guide' | 'daily' | 'sevenDay'
  type JourneyMetric =
    | 'cropHarvest'
    | 'earthPulse'
    | 'fieldTier'
    | 'cultivationUnlocked'
    | 'realmIndex'
    | 'moneyEarned'
    | 'monsterKills'
    | 'mineFloor'
    | 'completedCommissions'
    | 'craftedPills'
    | 'attributePower'
    | 'manualLevels'
    | 'towerFloor'
    | 'fishCaught'
    | 'recipesCooked'
    | 'discoveredItems'
    | 'breedingsDone'
    | 'hybridsDiscovered'

  interface JourneyReward {
    money?: number
    aura?: number
    attributeExp?: Partial<Record<AttributeKey, number>>
  }

  interface JourneyTaskDef {
    id: string
    type: JourneyTaskType
    day?: number
    title: string
    desc: string
    metric: JourneyMetric
    target: number
    reward: JourneyReward
  }

  const journeyClaimed = ref<string[]>([])
  const journeyDailyKey = ref('')
  const journeyDailyBaselines = ref<Partial<Record<JourneyMetric, number>>>({})

  const JOURNEY_TASKS: JourneyTaskDef[] = [
    { id: 'guide_first_harvest', type: 'guide', title: '春种第一获', desc: '收获任意作物，感受田庄第一份回报。', metric: 'cropHarvest', target: 1, reward: { money: 180, attributeExp: { physique: 14 } } },
    { id: 'guide_pulse_20', type: 'guide', title: '地脉初闻', desc: '通过收获作物累计20点地脉感应。', metric: 'earthPulse', target: 20, reward: { money: 260, attributeExp: { perception: 16 } } },
    { id: 'guide_pulse_100', type: 'guide', title: '田间灵机', desc: '累计100点地脉感应，为启蒙灵田做准备。', metric: 'earthPulse', target: 100, reward: { money: 420, attributeExp: { physique: 16, perception: 16 } } },
    { id: 'guide_unlock_cultivation', type: 'guide', title: '启蒙灵田', desc: '完成灵田启蒙，让种田正式连向修仙。', metric: 'cultivationUnlocked', target: 1, reward: { aura: 90, attributeExp: { perception: 20 } } },
    { id: 'guide_field_tier_1', type: 'guide', title: '黄阶灵田', desc: '把灵田提升到黄阶，开启更稳定的灵气产出。', metric: 'fieldTier', target: 1, reward: { aura: 130, attributeExp: { physique: 20 } } },
    { id: 'guide_realm_lianqi', type: 'guide', title: '炼气入门', desc: '突破到炼气一层，迈出修仙第一步。', metric: 'realmIndex', target: 1, reward: { aura: 180, attributeExp: { perception: 24 } } },
    { id: 'guide_first_battle', type: 'guide', title: '初战妖兽', desc: '前往地图 → 修仙之途 → 秘境，完成任意一次红尘历练、秘境探索或登仙塔战斗并获胜。', metric: 'monsterKills', target: 1, reward: { money: 360, attributeExp: { strength: 18, agility: 18 } } },
    { id: 'daily_harvest_5', type: 'daily', title: '今日勤耕', desc: '累计收获5次作物，稳定积累地脉与资质。', metric: 'cropHarvest', target: 5, reward: { money: 260, attributeExp: { physique: 14 } } },
    { id: 'daily_commission_1', type: 'daily', title: '乡里委托', desc: '完成1个委托，让田庄和村落流动起来。', metric: 'completedCommissions', target: 1, reward: { money: 320, attributeExp: { perception: 14 } } },
    { id: 'daily_battle_3', type: 'daily', title: '磨砺身手', desc: '累计击败3只怪物，提升战斗资质。', metric: 'monsterKills', target: 3, reward: { money: 280, attributeExp: { strength: 16, agility: 16 } } },
    { id: 'daily_fish_2', type: 'daily', title: '今日垂钓', desc: '钓到2条鱼，补上轻松休闲的每日收益。', metric: 'fishCaught', target: 2, reward: { money: 300, attributeExp: { agility: 14, perception: 10 } } },
    { id: 'daily_mine_floor', type: 'daily', title: '今日探矿', desc: '矿洞最高层数推进1层，给挖矿一个明确小目标。', metric: 'mineFloor', target: 1, reward: { money: 360, attributeExp: { strength: 16, physique: 12 } } },
    { id: 'daily_cook_1', type: 'daily', title: '今日开灶', desc: '制作1道料理，让烹饪成为每日强化的一环。', metric: 'recipesCooked', target: 1, reward: { money: 240, attributeExp: { perception: 14, physique: 10 } } },
    { id: 'seven_day_1', type: 'sevenDay', day: 1, title: '第一日：安身立田', desc: '收获3次作物，建立最初的田庄节奏。', metric: 'cropHarvest', target: 3, reward: { money: 360, attributeExp: { physique: 20 } } },
    { id: 'seven_day_2', type: 'sevenDay', day: 2, title: '第二日：感应地脉', desc: '累计40点地脉感应，理解种田与修仙的关系。', metric: 'earthPulse', target: 40, reward: { money: 380, attributeExp: { perception: 24 } } },
    { id: 'seven_day_3', type: 'sevenDay', day: 3, title: '第三日：灵田启蒙', desc: '完成灵田启蒙，普通农事开始转化灵气。', metric: 'cultivationUnlocked', target: 1, reward: { aura: 160, attributeExp: { perception: 28 } } },
    { id: 'seven_day_4', type: 'sevenDay', day: 4, title: '第四日：炼气修行', desc: '突破到炼气一层，形成第一段修仙目标。', metric: 'realmIndex', target: 1, reward: { aura: 190, attributeExp: { physique: 26 } } },
    { id: 'seven_day_5', type: 'sevenDay', day: 5, title: '第五日：外出磨砺', desc: '击败5只怪物，补上战斗成长线。', metric: 'monsterKills', target: 5, reward: { money: 520, attributeExp: { strength: 30, agility: 30 } } },
    { id: 'seven_day_6', type: 'sevenDay', day: 6, title: '第六日：经营有成', desc: '累计赚取3000文，为灵田、法宝和洞府准备资源。', metric: 'moneyEarned', target: 3000, reward: { money: 720, attributeExp: { perception: 28 } } },
    { id: 'seven_day_7', type: 'sevenDay', day: 7, title: '第七日：小有所成', desc: '角色资质总评达到24，感受日常行为带来的角色成长。', metric: 'attributePower', target: 24, reward: { aura: 260, money: 900, attributeExp: { physique: 30, strength: 30, agility: 30, perception: 30 } } },
    { id: 'v11_story_realm_2', type: 'guide', title: '仙途主线：灵田异变', desc: '境界达到炼气二层，触发灵田异变剧情，明确继续修仙的主线目标。', metric: 'realmIndex', target: 2, reward: { aura: 220, money: 500, attributeExp: { perception: 24 } } },
    { id: 'v11_story_realm_10', type: 'guide', title: '仙途主线：宗门来客', desc: '境界达到筑基，宗门执事来访，开启宗门因果与飞升线索。', metric: 'realmIndex', target: 10, reward: { aura: 520, money: 1200, attributeExp: { physique: 28, perception: 28 } } },
    { id: 'v11_equipment_set', type: 'guide', title: '装备套装：青木雏形', desc: '功法总层数达到3层，形成第一套法宝/装备追求，后续可扩展套装词条。', metric: 'manualLevels', target: 3, reward: { aura: 300, money: 900, attributeExp: { strength: 28, physique: 28 } } },
    { id: 'v11_dungeon_floor_5', type: 'guide', title: '深层秘境：五层首通', desc: '登仙塔达到5层，完成第一个深层秘境首通目标。', metric: 'towerFloor', target: 5, reward: { aura: 360, money: 1000, attributeExp: { strength: 32, agility: 32 } } },
    { id: 'v11_social_help', type: 'guide', title: '玩家互动：仙盟互助', desc: '累计完成3个委托，解锁仙盟互助/寄售玩法的雏形奖励。', metric: 'completedCommissions', target: 3, reward: { aura: 180, money: 888, attributeExp: { perception: 24 } } },
    { id: 'v11_event_hunt', type: 'guide', title: '限时活动：妖潮来袭', desc: '累计击败20只怪物，领取限时讨伐活动奖励。', metric: 'monsterKills', target: 20, reward: { aura: 520, money: 1500, attributeExp: { strength: 40, agility: 40 } } },
    { id: 'v11_return_bonus', type: 'guide', title: '回访福利：仙缘再临', desc: '进入游戏即可领取一次V1.1回访福利，让老玩家回来就有收获。', metric: 'cultivationUnlocked', target: 0, reward: { aura: 188, money: 666, attributeExp: { physique: 18, strength: 18, agility: 18, perception: 18 } } },
    { id: 'v12_farm_50', type: 'guide', title: '农事专精：五十收成', desc: '累计收获50次作物，田庄经营从新手进入稳定期。', metric: 'cropHarvest', target: 50, reward: { money: 1200, aura: 160, attributeExp: { physique: 36, perception: 20 } } },
    { id: 'v12_fish_20', type: 'guide', title: '溪畔钓客：二十尾', desc: '累计钓到20条鱼，让钓鱼成为稳定赚钱和放松玩法。', metric: 'fishCaught', target: 20, reward: { money: 1100, attributeExp: { agility: 32, perception: 24 } } },
    { id: 'v12_mine_10', type: 'guide', title: '矿洞远行：十层见光', desc: '矿洞推进到10层，形成装备、矿石与战力循环。', metric: 'mineFloor', target: 10, reward: { money: 1200, attributeExp: { strength: 36, physique: 24 } } },
    { id: 'v12_cook_10', type: 'guide', title: '灶火初成：十道料理', desc: '累计制作10道料理，把食物增益接入种田、挖矿和战斗。', metric: 'recipesCooked', target: 10, reward: { money: 900, aura: 120, attributeExp: { physique: 26, perception: 26 } } },
    { id: 'v12_collect_40', type: 'guide', title: '图鉴收藏：四十发现', desc: '发现40种物品，推动采集、钓鱼、挖矿、怪物掉落和商店探索。', metric: 'discoveredItems', target: 40, reward: { money: 1300, attributeExp: { perception: 42 } } },
    { id: 'v12_breed_3', type: 'guide', title: '灵兽培育：三次配育', desc: '完成3次灵兽/动物培育，让养成线有明确阶段奖励。', metric: 'breedingsDone', target: 3, reward: { money: 1000, aura: 160, attributeExp: { physique: 24, perception: 24 } } },
    { id: 'v12_hybrid_1', type: 'guide', title: '异种初现：发现杂交', desc: '发现1种杂交产物，鼓励尝试培育组合与收集。', metric: 'hybridsDiscovered', target: 1, reward: { money: 1500, aura: 220, attributeExp: { perception: 36, agility: 18 } } },
    { id: 'v12_manual_6', type: 'guide', title: '功法精进：六层合参', desc: '功法总层数达到6层，形成修为、灵气、渡劫成功率的成长追求。', metric: 'manualLevels', target: 6, reward: { aura: 520, money: 1600, attributeExp: { perception: 38, physique: 26 } } },
    { id: 'v12_tower_10', type: 'guide', title: '登仙试炼：十层留名', desc: '登仙塔达到10层，让战斗、装备、功法强度有更清晰的验证场。', metric: 'towerFloor', target: 10, reward: { aura: 620, money: 2000, attributeExp: { strength: 44, agility: 36 } } },
    { id: 'v12_commission_10', type: 'guide', title: '桃源声望：十次委托', desc: '累计完成10个委托，推动NPC、订单、生产和市场循环。', metric: 'completedCommissions', target: 10, reward: { aura: 280, money: 1800, attributeExp: { perception: 36, physique: 24 } } },
  ]

  const getJourneyDayKey = (): string => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
  }

  const getJourneyRawProgress = (metric: JourneyMetric): number => {
    const cultivationStore = useCultivationStore()
    switch (metric) {
      case 'cropHarvest': return achievementStore.stats.totalCropsHarvested
      case 'earthPulse': return cultivationStore.earthPulse
      case 'fieldTier': return cultivationStore.fieldTier
      case 'cultivationUnlocked': return cultivationStore.unlocked ? 1 : 0
      case 'realmIndex': return cultivationStore.realmIndex
      case 'moneyEarned': return achievementStore.stats.totalMoneyEarned
      case 'monsterKills': return achievementStore.stats.totalMonstersKilled
      case 'mineFloor': return achievementStore.stats.highestMineFloor
      case 'completedCommissions': return completedQuestCount.value
      case 'craftedPills': return achievementStore.stats.totalRecipesCooked
      case 'attributePower': return playerStore.attributePower
      case 'manualLevels': return Object.values(cultivationStore.manuals).reduce((sum, level) => sum + (Number(level) || 0), 0)
      case 'towerFloor': return useCombatStore().towerHighestFloor
      case 'fishCaught': return achievementStore.stats.totalFishCaught
      case 'recipesCooked': return achievementStore.stats.totalRecipesCooked
      case 'discoveredItems': return achievementStore.discoveredItems.length
      case 'breedingsDone': return achievementStore.stats.totalBreedingsDone
      case 'hybridsDiscovered': return achievementStore.stats.totalHybridsDiscovered
      default: return 0
    }
  }

  const ensureJourneyDailyState = () => {
    const key = getJourneyDayKey()
    if (journeyDailyKey.value !== key) {
      journeyDailyKey.value = key
      journeyDailyBaselines.value = {}
      JOURNEY_TASKS.filter(task => task.type === 'daily').forEach(task => {
        journeyDailyBaselines.value[task.metric] = getJourneyRawProgress(task.metric)
      })
    }
  }

  const getJourneyProgress = (task: JourneyTaskDef): number => {
    if (task.type !== 'daily') return getJourneyRawProgress(task.metric)
    ensureJourneyDailyState()
    const baseline = journeyDailyBaselines.value[task.metric] ?? getJourneyRawProgress(task.metric)
    return Math.max(0, getJourneyRawProgress(task.metric) - baseline)
  }

  const getJourneyClaimKey = (task: JourneyTaskDef): string => {
    return task.type === 'daily' ? `${getJourneyDayKey()}:${task.id}` : task.id
  }

  const journeyTasks = computed(() => JOURNEY_TASKS.map(task => {
    const progress = getJourneyProgress(task)
    const claimed = journeyClaimed.value.includes(getJourneyClaimKey(task))
    return { ...task, progress, done: progress >= task.target, claimed }
  }))

  const journeySummary = computed(() => {
    const tasks = journeyTasks.value
    const done = tasks.filter(t => t.done).length
    const claimed = tasks.filter(t => t.claimed).length
    const claimable = tasks.filter(t => t.done && !t.claimed).length
    return { total: tasks.length, done, claimed, claimable }
  })

  const nextJourneyTask = computed(() => {
    const tasks = journeyTasks.value
    return tasks.find(t => t.done && !t.claimed) || tasks.find(t => t.type === 'guide' && !t.claimed) || tasks.find(t => t.type === 'daily' && !t.claimed) || tasks.find(t => t.type === 'sevenDay' && !t.claimed) || null
  })

  const activeJourneyTasks = computed(() => journeyTasks.value.filter(t => !t.claimed).slice(0, 5))

  const claimJourneyTask = (taskId: string): { success: boolean; message: string } => {
    const task = journeyTasks.value.find(t => t.id === taskId)
    if (!task) return { success: false, message: '修行志目标不存在。' }
    if (!task.done) return { success: false, message: '目标尚未完成。' }
    if (task.claimed) return { success: false, message: '奖励已经领取过了。' }

    const gameStore = useGameStore()
    const moneyReward = task.reward.money ? Math.floor(task.reward.money * (gameStore.dailyFateType === 'wealth' ? 1.15 : 1)) : 0
    if (moneyReward) playerStore.earnMoney(moneyReward)
    if (task.reward.attributeExp) playerStore.addAttributeExpBatch(task.reward.attributeExp)
    if (task.reward.aura) {
      const cultivationStore = useCultivationStore()
      cultivationStore.aura += task.reward.aura
    }
    journeyClaimed.value.push(getJourneyClaimKey(task))

    const rewardText = [
      moneyReward ? `${moneyReward}文` : '',
      task.reward.aura ? `灵气${task.reward.aura}` : '',
      task.reward.attributeExp ? '资质经验' : ''
    ].filter(Boolean).join('、')
    return { success: true, message: `【修行志】完成「${task.title}」，获得${rewardText || '奖励'}。` }
  }

  /** 每日生成新任务到告示栏 */
  const generateDailyQuests = (season: Season, day: number) => {
    boardQuests.value = [] // 清空旧的告示栏
    const count = 1 + Math.floor(Math.random() * 2) // 1-2个
    for (let i = 0; i < count; i++) {
      const quest = generateQuest(season, day)
      if (quest) {
        boardQuests.value.push(quest)
      }
    }
  }

  /** 按梯度生成特殊订单 (tier: 1-4 对应 第7/14/21/28天) */
  const generateSpecialOrder = (season: Season, tier: number) => {
    const order = _generateSpecialOrder(season, tier)
    specialOrder.value = order
  }

  /** 接取任务 */
  const acceptQuest = (questId: string): { success: boolean; message: string } => {
    if (activeQuests.value.length >= MAX_ACTIVE_QUESTS) {
      return { success: false, message: `最多同时接取${MAX_ACTIVE_QUESTS}个任务。` }
    }
    const idx = boardQuests.value.findIndex(q => q.id === questId)
    if (idx === -1) return { success: false, message: '任务不存在。' }

    const quest = boardQuests.value[idx]!
    quest.accepted = true

    // 非送货类委托：检查背包中已有的物品数量
    if (quest.type !== 'delivery') {
      quest.collectedQuantity = Math.min(inventoryStore.getItemCount(quest.targetItemId), quest.targetQuantity)
    }

    activeQuests.value.push(quest)
    boardQuests.value.splice(idx, 1)
    return { success: true, message: `接取了任务：${quest.description}` }
  }

  /** 接取特殊订单 */
  const acceptSpecialOrder = (): { success: boolean; message: string } => {
    if (!specialOrder.value) return { success: false, message: '没有可接取的特殊订单。' }
    if (activeQuests.value.length >= MAX_ACTIVE_QUESTS) {
      return { success: false, message: `最多同时接取${MAX_ACTIVE_QUESTS}个任务。` }
    }

    const order = specialOrder.value
    order.accepted = true
    order.collectedQuantity = Math.min(inventoryStore.getItemCount(order.targetItemId), order.targetQuantity)

    activeQuests.value.push(order)
    specialOrder.value = null
    return { success: true, message: `接取了特殊订单：${order.description}` }
  }

  /** 提交完成的任务 */
  const submitQuest = (questId: string): { success: boolean; message: string } => {
    const idx = activeQuests.value.findIndex(q => q.id === questId)
    if (idx === -1) return { success: false, message: '任务不存在。' }

    const quest = activeQuests.value[idx]!

    // 送货类委托：提交时从背包扣除物品
    if (quest.type === 'delivery') {
      if (!inventoryStore.hasItem(quest.targetItemId, quest.targetQuantity)) {
        return { success: false, message: `背包中${quest.targetItemName}不足。` }
      }
      inventoryStore.removeItem(quest.targetItemId, quest.targetQuantity)
    } else {
      // 钓鱼/挖矿/采集类按收集进度完成；特殊订单需要真实提交背包物品
      const bagCount = inventoryStore.getItemCount(quest.targetItemId)
      const effectiveProgress = Math.max(quest.collectedQuantity, bagCount)
      if (effectiveProgress < quest.targetQuantity) {
        return { success: false, message: `${quest.targetItemName}收集进度不足（${effectiveProgress}/${quest.targetQuantity}）。` }
      }
      if (quest.type === 'special_order') {
        if (bagCount < quest.targetQuantity) {
          return { success: false, message: `背包中${quest.targetItemName}不足，特殊订单需要实际交付物品。` }
        }
        inventoryStore.removeItem(quest.targetItemId, quest.targetQuantity)
      }
    }

    // 发放铜钱奖励
    playerStore.earnMoney(quest.moneyReward)
    npcStore.adjustFriendship(quest.npcId, quest.friendshipReward)

    // 发放物品奖励
    if (quest.itemReward) {
      for (const item of quest.itemReward) {
        inventoryStore.addItem(item.itemId, item.quantity)
      }
    }

    // 记录完成
    completedQuestCount.value++

    // 从活跃列表移除
    activeQuests.value.splice(idx, 1)

    let message = `完成了${quest.orderTag ? quest.orderTag : quest.npcName + '的委托'}！获得${quest.moneyReward}文，${quest.npcName}好感+${quest.friendshipReward}。`
    if (quest.itemReward && quest.itemReward.length > 0) {
      const itemNames = quest.itemReward.map(i => `${i.quantity}个物品`).join('、')
      message += ` 额外获得${itemNames}。`
    }

    return { success: true, message }
  }

  /** 当玩家获得某物品时，更新进行中任务的进度（钓鱼/挖矿/采集类） */
  const onItemObtained = (itemId: string, quantity: number = 1) => {
    for (const quest of activeQuests.value) {
      if (quest.type === 'delivery') continue // 送货类不自动追踪
      if (quest.targetItemId === itemId && quest.collectedQuantity < quest.targetQuantity) {
        quest.collectedQuantity = Math.min(quest.collectedQuantity + quantity, quest.targetQuantity)
      }
    }

    // 同步刷新主线任务中 deliverItem 目标的进度
    if (mainQuest.value?.accepted) {
      const def = getStoryQuestById(mainQuest.value.questId)
      if (def) {
        for (let i = 0; i < def.objectives.length; i++) {
          const obj = def.objectives[i]!
          if (obj.type === 'deliverItem' && obj.itemId === itemId && !mainQuest.value.objectiveProgress[i]) {
            mainQuest.value.objectiveProgress[i] = evaluateObjective(obj)
          }
        }
      }
    }
  }

  /** 每日更新：天数递减，过期移除 */
  const dailyUpdate = () => {
    // 活跃委托剩余天数递减
    const expired: QuestInstance[] = []
    activeQuests.value = activeQuests.value.filter(q => {
      q.daysRemaining--
      if (q.daysRemaining <= 0) {
        expired.push(q)
        return false
      }
      return true
    })

    // 特殊订单过期（未接取也会过期）
    if (specialOrder.value) {
      specialOrder.value.daysRemaining--
      if (specialOrder.value.daysRemaining <= 0) {
        specialOrder.value = null
      }
    }

    return expired
  }

  /** 检查是否有任务关注某物品 */
  const hasActiveQuestFor = (itemId: string): boolean => {
    return activeQuests.value.some(q => q.targetItemId === itemId)
  }

  // ============================================================
  // 主线任务
  // ============================================================

  /** 当前主线任务状态 */
  const mainQuest = ref<MainQuestState | null>(null)

  /** 已完成的主线任务ID列表 */
  const completedMainQuests = ref<string[]>([])

  /** 好感等级层级顺序 */
  const LEVEL_ORDER = ['stranger', 'acquaintance', 'friendly', 'bestFriend'] as const
  const meetsLevel = (current: string, required: string): boolean => {
    return LEVEL_ORDER.indexOf(current as (typeof LEVEL_ORDER)[number]) >= LEVEL_ORDER.indexOf(required as (typeof LEVEL_ORDER)[number])
  }

  /** 评估单个目标是否达成 */
  const evaluateObjective = (obj: MainQuestObjective): boolean => {
    const skillStore = useSkillStore()
    const shopStore = useShopStore()
    const animalStore = useAnimalStore()

    switch (obj.type) {
      case 'earnMoney':
        return achievementStore.stats.totalMoneyEarned >= (obj.target ?? 0)
      case 'reachMineFloor':
        return achievementStore.stats.highestMineFloor >= (obj.target ?? 0)
      case 'reachSkullFloor':
        return achievementStore.stats.skullCavernBestFloor >= (obj.target ?? 0)
      case 'skillLevel':
        if (obj.skillType) {
          return skillStore.getSkill(obj.skillType as 'farming' | 'foraging' | 'fishing' | 'mining' | 'combat').level >= (obj.target ?? 0)
        }
        // 无指定技能类型 = 任意技能达标
        return skillStore.skills.some(s => s.level >= (obj.target ?? 0))
      case 'allSkillsLevel':
        return skillStore.skills.every(s => s.level >= (obj.target ?? 0))
      case 'harvestCrops':
        return achievementStore.stats.totalCropsHarvested >= (obj.target ?? 0)
      case 'catchFish':
        return achievementStore.stats.totalFishCaught >= (obj.target ?? 0)
      case 'cookRecipes':
        return achievementStore.stats.totalRecipesCooked >= (obj.target ?? 0)
      case 'killMonsters':
        return achievementStore.stats.totalMonstersKilled >= (obj.target ?? 0)
      case 'discoverItems':
        return achievementStore.discoveredItems.length >= (obj.target ?? 0)
      case 'npcFriendship': {
        if (obj.npcId === '_any') {
          // 任意NPC达到指定好感
          return npcStore.npcStates.some(n => meetsLevel(npcStore.getFriendshipLevel(n.npcId), obj.friendshipLevel ?? 'acquaintance'))
        }
        const level = npcStore.getFriendshipLevel(obj.npcId ?? '')
        return meetsLevel(level, obj.friendshipLevel ?? 'acquaintance')
      }
      case 'npcAllFriendly':
        return npcStore.npcStates.every(n => meetsLevel(npcStore.getFriendshipLevel(n.npcId), obj.friendshipLevel ?? 'friendly'))
      case 'completeBundles':
        return achievementStore.completedBundles.length >= (obj.target ?? 0)
      case 'completeQuests':
        return completedQuestCount.value >= (obj.target ?? 0)
      case 'shipItems':
        return shopStore.shippedItems.length >= (obj.target ?? 0)
      case 'ownAnimals':
        return animalStore.animals.length >= (obj.target ?? 0)
      case 'married':
        return npcStore.getSpouse() !== null
      case 'hasChild':
        return npcStore.children.length > 0
      case 'deliverItem':
        // deliverItem 只检查背包有足够物品（提交时才扣除）
        return inventoryStore.hasItem(obj.itemId ?? '', obj.itemQuantity ?? 1)
      default:
        return false
    }
  }

  /** 初始化主线任务：如果没有当前任务，设置下一个可接取的 */
  const initMainQuest = () => {
    if (mainQuest.value) return // 已有当前任务
    if (completedMainQuests.value.length >= STORY_QUESTS.length) return // 全部完成

    // 找到下一个未完成的主线任务
    const nextQuest =
      completedMainQuests.value.length === 0
        ? getFirstStoryQuest()
        : getNextStoryQuest(completedMainQuests.value[completedMainQuests.value.length - 1]!)

    if (nextQuest) {
      mainQuest.value = {
        questId: nextQuest.id,
        accepted: false,
        objectiveProgress: nextQuest.objectives.map(() => false)
      }
    }
  }

  /** 接取主线任务 */
  const acceptMainQuest = (): { success: boolean; message: string } => {
    if (!mainQuest.value) return { success: false, message: '没有可接取的主线任务。' }
    if (mainQuest.value.accepted) return { success: false, message: '主线任务已接取。' }

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return { success: false, message: '主线任务数据异常。' }

    mainQuest.value.accepted = true

    // 接取时立即评估一次进度
    for (let i = 0; i < def.objectives.length; i++) {
      mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
    }

    const npcDef = getNpcById(def.npcId)
    const npcName = npcDef?.name ?? def.npcId
    return { success: true, message: `接取了主线任务：${def.title}（${npcName}）` }
  }

  /** 每日更新主线任务进度 */
  const updateMainQuestProgress = () => {
    if (!mainQuest.value || !mainQuest.value.accepted) return

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return

    for (let i = 0; i < def.objectives.length; i++) {
      if (!mainQuest.value.objectiveProgress[i]) {
        mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
      }
    }
  }

  /** 检查主线任务是否可提交（实时评估未完成的目标） */
  const canSubmitMainQuest = (): boolean => {
    if (!mainQuest.value || !mainQuest.value.accepted) return false

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return false

    // 实时刷新未完成目标的进度，使 UI 同步显示最新状态
    for (let i = 0; i < def.objectives.length; i++) {
      if (!mainQuest.value.objectiveProgress[i]) {
        mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
      }
    }

    return mainQuest.value.objectiveProgress.every(p => p)
  }

  /** 提交主线任务 */
  const submitMainQuest = (): { success: boolean; message: string } => {
    if (!mainQuest.value || !mainQuest.value.accepted) {
      return { success: false, message: '没有可提交的主线任务。' }
    }

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return { success: false, message: '主线任务数据异常。' }

    // 最终验证所有目标
    for (let i = 0; i < def.objectives.length; i++) {
      mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
    }
    if (!mainQuest.value.objectiveProgress.every(p => p)) {
      return { success: false, message: '主线任务目标尚未全部完成。' }
    }

    // deliverItem 类型扣除背包物品
    for (const obj of def.objectives) {
      if (obj.type === 'deliverItem' && obj.itemId && obj.itemQuantity) {
        if (!inventoryStore.removeItem(obj.itemId, obj.itemQuantity)) {
          return { success: false, message: `背包中物品不足，无法提交。` }
        }
      }
    }

    // 发放铜钱奖励
    playerStore.earnMoney(def.moneyReward)

    // 发放好感奖励
    if (def.friendshipReward) {
      for (const fr of def.friendshipReward) {
        npcStore.adjustFriendship(fr.npcId, fr.amount)
      }
    }

    // 发放物品奖励
    if (def.itemReward) {
      for (const item of def.itemReward) {
        inventoryStore.addItem(item.itemId, item.quantity)
      }
    }

    // 记录完成
    completedMainQuests.value.push(mainQuest.value.questId)
    mainQuest.value = null

    // 自动初始化下一个主线任务
    initMainQuest()

    const npcDef = getNpcById(def.npcId)
    const npcName = npcDef?.name ?? def.npcId
    let message = `【主线完成】${def.title}！${npcName}：获得${def.moneyReward}文。`
    if (def.itemReward && def.itemReward.length > 0) {
      message += ` 额外获得物品奖励。`
    }
    if (!mainQuest.value) {
      if (completedMainQuests.value.length >= STORY_QUESTS.length) {
        message += ` 恭喜！你已完成桃源乡全部主线任务！`
      }
    }

    return { success: true, message }
  }

  // ============================================================
  // 序列化
  // ============================================================

  const serialize = () => {
    return {
      boardQuests: boardQuests.value,
      activeQuests: activeQuests.value,
      completedQuestCount: completedQuestCount.value,
      specialOrder: specialOrder.value,
      mainQuest: mainQuest.value,
      completedMainQuests: completedMainQuests.value,
      journeyClaimed: journeyClaimed.value,
      journeyDailyKey: journeyDailyKey.value,
      journeyDailyBaselines: journeyDailyBaselines.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    boardQuests.value = data.boardQuests ?? []
    activeQuests.value = data.activeQuests ?? []
    completedQuestCount.value = data.completedQuestCount ?? 0
    specialOrder.value = ((data as Record<string, unknown>).specialOrder as QuestInstance | null) ?? null
    mainQuest.value = ((data as Record<string, unknown>).mainQuest as MainQuestState | null) ?? null
    completedMainQuests.value = ((data as Record<string, unknown>).completedMainQuests as string[] | undefined) ?? []
    journeyClaimed.value = ((data as Record<string, unknown>).journeyClaimed as string[] | undefined) ?? []
    journeyDailyKey.value = ((data as Record<string, unknown>).journeyDailyKey as string | undefined) ?? ''
    journeyDailyBaselines.value = ((data as Record<string, unknown>).journeyDailyBaselines as Partial<Record<JourneyMetric, number>> | undefined) ?? {}
    // 加载后初始化主线任务（兼容旧存档）
    initMainQuest()
  }

  return {
    boardQuests,
    activeQuests,
    completedQuestCount,
    specialOrder,
    mainQuest,
    completedMainQuests,
    journeyClaimed,
    journeyDailyKey,
    journeyDailyBaselines,
    journeyTasks,
    journeySummary,
    nextJourneyTask,
    activeJourneyTasks,
    MAX_ACTIVE_QUESTS,
    generateDailyQuests,
    generateSpecialOrder,
    acceptQuest,
    acceptSpecialOrder,
    submitQuest,
    onItemObtained,
    dailyUpdate,
    hasActiveQuestFor,
    initMainQuest,
    acceptMainQuest,
    updateMainQuestProgress,
    canSubmitMainQuest,
    submitMainQuest,
    claimJourneyTask,
    serialize,
    deserialize
  }
})
