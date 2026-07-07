import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuestStore } from './useQuestStore'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useCultivationStore } from './useCultivationStore'
import { useAchievementStore } from './useAchievementStore'
import { useMuseumStore } from './useMuseumStore'
import { useGuildStore } from './useGuildStore'
import { useHanhaiStore } from './useHanhaiStore'
import type { AttributeKey } from './usePlayerStore'

type RetentionReward = {
  money?: number
  aura?: number
  spiritStone?: number
  items?: { itemId: string; name: string; quantity: number }[]
  attributeExp?: Partial<Record<AttributeKey, number>>
}

type ActivityBox = {
  score: number
  title: string
  desc: string
  reward: RetentionReward
}

type SevenDayGift = {
  day: number
  title: string
  desc: string
  reward: RetentionReward
}

type StreakGift = {
  day: number
  title: string
  desc: string
  reward: RetentionReward
}

type WeeklyMetric = 'dailyClaimed' | 'monsterKills' | 'recipesCooked' | 'museumDonations' | 'guildContribution' | 'hanhaiTradePoints' | 'breedingsDone' | 'fishCaught'

type WeeklyTask = {
  id: string
  title: string
  desc: string
  metric: WeeklyMetric
  target: number
  reward: RetentionReward
}

const ACTIVITY_BOXES: ActivityBox[] = [
  { score: 20, title: '晨耕小匣', desc: '完成一两件日课就能领取。', reward: { money: 260, spiritStone: 1 } },
  { score: 40, title: '修行补给', desc: '补上灵气与根骨沉淀。', reward: { money: 420, aura: 80, attributeExp: { physique: 12 } } },
  { score: 60, title: '秘境行囊', desc: '鼓励继续战斗、钓鱼、探矿。', reward: { money: 620, spiritStone: 2, attributeExp: { strength: 12, agility: 12 } } },
  { score: 80, title: '宗门嘉奖', desc: '一天活跃已成习惯。', reward: { money: 880, aura: 160, spiritStone: 3, attributeExp: { perception: 16 } } },
  { score: 100, title: '满勤仙缘', desc: '今日桃源事毕，给长期成长一份重奖。', reward: { money: 1280, aura: 260, spiritStone: 5, attributeExp: { physique: 18, strength: 18, agility: 18, perception: 18 } } }
]

const SEVEN_DAY_GIFTS: SevenDayGift[] = [
  { day: 1, title: '第1日：安家种田', desc: '铜钱与灵石，帮你快速补种子和基础修仙材料。', reward: { money: 800, spiritStone: 3, attributeExp: { physique: 12 } } },
  { day: 2, title: '第2日：灵气入门', desc: '补一口灵气，让灵田与修行线更早成型。', reward: { money: 900, aura: 180, spiritStone: 4, attributeExp: { perception: 14 } } },
  { day: 3, title: '第3日：秘境试锋', desc: '给战斗流一点启动资源。', reward: { money: 1100, spiritStone: 6, attributeExp: { strength: 20, agility: 16 } } },
  { day: 4, title: '第4日：宗门馈赠', desc: '稳定养成资源，适合兑换功法或淬炼装备。', reward: { money: 1300, aura: 260, spiritStone: 8, attributeExp: { perception: 20 } } },
  { day: 5, title: '第5日：灵兽亲和', desc: '提升体魄与身法，为灵兽、秘境和登塔做准备。', reward: { money: 1500, spiritStone: 10, attributeExp: { physique: 24, agility: 24 } } },
  { day: 6, title: '第6日：法宝蕴养', desc: '中期修仙材料补给，推动法宝和修仙装备成长。', reward: { money: 1888, aura: 360, spiritStone: 12, attributeExp: { strength: 26, perception: 26 } } },
  { day: 7, title: '第7日：桃源仙缘', desc: '七日留存大奖，给新玩家一个明确阶段终点。', reward: { money: 2888, aura: 520, spiritStone: 20, attributeExp: { physique: 36, strength: 36, agility: 36, perception: 36 } } }
]

const STREAK_GIFTS: StreakGift[] = [
  { day: 3, title: '三日满勤：灵田回响', desc: '连续3天达到100活跃，奖励稳定修行补给。', reward: { money: 1800, aura: 320, spiritStone: 8, items: [{ itemId: 'moonlight_jade', name: '月华玉', quantity: 1 }], attributeExp: { perception: 24 } } },
  { day: 5, title: '五日满勤：宗门加持', desc: '连续5天满勤，补给炼器与公会成长材料。', reward: { money: 3200, aura: 520, spiritStone: 15, items: [{ itemId: 'mystic_iron', name: '玄铁', quantity: 2 }, { itemId: 'spirit_ink', name: '灵墨', quantity: 2 }], attributeExp: { strength: 26, physique: 26 } } },
  { day: 7, title: '七日满勤：仙缘不断', desc: '连续7天满勤大奖，给长期回访一个明确周目标。', reward: { money: 5200, aura: 900, spiritStone: 28, items: [{ itemId: 'phoenix_plume', name: '凤羽', quantity: 1 }, { itemId: 'demon_core', name: '妖丹', quantity: 1 }, { itemId: 'cold_jade', name: '寒髓玉', quantity: 1 }], attributeExp: { physique: 40, strength: 40, agility: 40, perception: 40 } } }
]

const WEEKLY_TASKS: WeeklyTask[] = [
  { id: 'weekly_daily_20', title: '周令·勤修二十课', desc: '本周领取20个每日目标奖励。', metric: 'dailyClaimed', target: 20, reward: { money: 2600, aura: 360, spiritStone: 8, attributeExp: { perception: 28 } } },
  { id: 'weekly_battle_30', title: '周令·秘境三十战', desc: '本周击败30只怪物，带动秘境、登塔与公会目标。', metric: 'monsterKills', target: 30, reward: { money: 3200, aura: 520, spiritStone: 12, items: [{ itemId: 'demon_core', name: '妖丹', quantity: 1 }], attributeExp: { strength: 36, agility: 28 } } },
  { id: 'weekly_cook_8', title: '周令·灶火八味', desc: '本周制作8道料理，让食物增益进入日常循环。', metric: 'recipesCooked', target: 8, reward: { money: 2200, aura: 240, spiritStone: 6, items: [{ itemId: 'immortal_dew', name: '仙露', quantity: 1 }], attributeExp: { physique: 28, perception: 28 } } },
  { id: 'weekly_museum_3', title: '周令·博物三藏', desc: '本周捐赠3件藏品，让挖矿、钓鱼、采集都有收藏目标。', metric: 'museumDonations', target: 3, reward: { money: 2800, spiritStone: 10, items: [{ itemId: 'jade_slip', name: '玉简', quantity: 1 }], attributeExp: { perception: 42 } } },
  { id: 'weekly_guild_80', title: '周令·公会声望', desc: '本周获得80点公会贡献，推动怪物掉落回收。', metric: 'guildContribution', target: 80, reward: { money: 3000, aura: 400, spiritStone: 10, items: [{ itemId: 'spirit_ink', name: '灵墨', quantity: 2 }], attributeExp: { strength: 28, perception: 28 } } },
  { id: 'weekly_hanhai_160', title: '周令·瀚海商誉', desc: '本周获得160点瀚海商誉，鼓励经营商路与兑换。', metric: 'hanhaiTradePoints', target: 160, reward: { money: 3600, aura: 420, spiritStone: 12, items: [{ itemId: 'cloud_silk', name: '云纹丝', quantity: 2 }], attributeExp: { agility: 30, perception: 30 } } },
  { id: 'weekly_breed_4', title: '周令·育种四试', desc: '本周完成4次育种或配育，推动品系收集。', metric: 'breedingsDone', target: 4, reward: { money: 2600, aura: 320, spiritStone: 8, items: [{ itemId: 'moonlight_jade', name: '月华玉', quantity: 1 }], attributeExp: { physique: 28, perception: 28 } } },
  { id: 'weekly_fish_20', title: '周令·溪畔二十尾', desc: '本周钓到20条鱼，补足休闲玩法收益。', metric: 'fishCaught', target: 20, reward: { money: 2400, spiritStone: 8, items: [{ itemId: 'cold_jade', name: '寒髓玉', quantity: 1 }], attributeExp: { agility: 32, perception: 24 } } }
]

const YAOCHAO_REWARDS: ActivityBox[] = [
  { score: 5, title: '个人讨伐·初阵', desc: '击败5只怪物。', reward: { money: 500, spiritStone: 3, attributeExp: { strength: 12 } } },
  { score: 15, title: '个人讨伐·破阵', desc: '击败15只怪物。', reward: { money: 1100, aura: 120, spiritStone: 6, attributeExp: { strength: 18, agility: 18 } } },
  { score: 30, title: '个人讨伐·镇潮', desc: '击败30只怪物。', reward: { money: 2200, aura: 260, spiritStone: 12, attributeExp: { physique: 22, strength: 28, agility: 22 } } }
]

export const useRetentionStore = defineStore('retention', () => {
  const activityClaimed = ref<string[]>([])
  const sevenDayClaimed = ref<number[]>([])
  const firstSeenDayKey = ref('')
  const worldBossClaimed = ref<string[]>([])
  const fullActivityStreak = ref(0)
  const lastFullActivityDayKey = ref('')
  const streakClaimed = ref<number[]>([])
  const weeklyClaimed = ref<string[]>([])
  const weeklyBaselineKey = ref('')
  const weeklyBaselines = ref<Partial<Record<WeeklyMetric, number>>>({})

  const gameStore = useGameStore()
  const questStore = useQuestStore()
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const cultivationStore = useCultivationStore()
  const achievementStore = useAchievementStore()
  const museumStore = useMuseumStore()
  const guildStore = useGuildStore()
  const hanhaiStore = useHanhaiStore()

  const dayKey = computed(() => `${gameStore.year}-${gameStore.season}-${gameStore.day}`)
  const seasonOrder: Record<string, number> = { spring: 0, summer: 1, autumn: 2, fall: 2, winter: 3 }
  const parseDayKey = (key: string) => {
    const [year, season, day] = key.split('-')
    return (Number(year || 1) - 1) * 112 + (seasonOrder[season || 'spring'] || 0) * 28 + Number(day || 1)
  }

  const weekKey = computed(() => `Y${Math.floor((parseDayKey(dayKey.value) - 1) / 112) + 1}-W${Math.floor(((parseDayKey(dayKey.value) - 1) % 112) / 7) + 1}`)

  const installDayIndex = computed(() => {
    if (!firstSeenDayKey.value) firstSeenDayKey.value = dayKey.value
    return Math.max(1, Math.min(7, parseDayKey(dayKey.value) - parseDayKey(firstSeenDayKey.value) + 1))
  })

  const dailyTasks = computed(() => questStore.journeyTasks.filter(t => t.type === 'daily'))
  const dailyDoneCount = computed(() => dailyTasks.value.filter(t => t.done).length)
  const dailyClaimedCount = computed(() => dailyTasks.value.filter(t => t.claimed).length)
  const activityScore = computed(() => Math.min(100, dailyDoneCount.value * 15 + dailyClaimedCount.value * 5))
  const activityBoxes = computed(() => ACTIVITY_BOXES.map(box => ({
    ...box,
    done: activityScore.value >= box.score,
    claimed: activityClaimed.value.includes(`${dayKey.value}:${box.score}`)
  })))
  const claimableActivityCount = computed(() => activityBoxes.value.filter(b => b.done && !b.claimed).length)

  const sevenDayGifts = computed(() => SEVEN_DAY_GIFTS.map(gift => ({
    ...gift,
    unlocked: installDayIndex.value >= gift.day,
    claimed: sevenDayClaimed.value.includes(gift.day)
  })))
  const claimableSevenDayCount = computed(() => sevenDayGifts.value.filter(g => g.unlocked && !g.claimed).length)

  const visibleFullActivityStreak = computed(() => {
    if (!lastFullActivityDayKey.value) return 0
    const diff = parseDayKey(dayKey.value) - parseDayKey(lastFullActivityDayKey.value)
    return diff <= 1 ? fullActivityStreak.value : 0
  })
  const streakGifts = computed(() => STREAK_GIFTS.map(gift => ({
    ...gift,
    unlocked: visibleFullActivityStreak.value >= gift.day,
    claimed: streakClaimed.value.includes(gift.day)
  })))
  const claimableStreakCount = computed(() => streakGifts.value.filter(g => g.unlocked && !g.claimed).length)

  const getWeeklyRawProgress = (metric: WeeklyMetric): number => {
    switch (metric) {
      case 'dailyClaimed': return questStore.journeyTasks.filter(t => t.type === 'daily' && t.claimed).length
      case 'monsterKills': return achievementStore.stats.totalMonstersKilled
      case 'recipesCooked': return achievementStore.stats.totalRecipesCooked
      case 'museumDonations': return museumStore.donatedCount
      case 'guildContribution': return guildStore.contributionPoints
      case 'hanhaiTradePoints': return hanhaiStore.tradePoints
      case 'breedingsDone': return achievementStore.stats.totalBreedingsDone
      case 'fishCaught': return achievementStore.stats.totalFishCaught
      default: return 0
    }
  }

  const ensureWeeklyState = () => {
    if (weeklyBaselineKey.value !== weekKey.value) {
      weeklyBaselineKey.value = weekKey.value
      weeklyClaimed.value = []
      weeklyBaselines.value = {}
      WEEKLY_TASKS.forEach(task => { weeklyBaselines.value[task.metric] = getWeeklyRawProgress(task.metric) })
    }
  }

  const weeklyTasks = computed(() => {
    ensureWeeklyState()
    return WEEKLY_TASKS.map(task => {
      const baseline = weeklyBaselines.value[task.metric] ?? getWeeklyRawProgress(task.metric)
      const progress = Math.max(0, getWeeklyRawProgress(task.metric) - baseline)
      const claimed = weeklyClaimed.value.includes(task.id)
      return { ...task, progress, done: progress >= task.target, claimed }
    })
  })
  const weeklyDoneCount = computed(() => weeklyTasks.value.filter(t => t.done).length)
  const claimableWeeklyCount = computed(() => weeklyTasks.value.filter(t => t.done && !t.claimed).length)

  const yaochaoTask = computed(() => questStore.journeyTasks.find(t => t.id === 'v11_event_hunt'))
  const yaochaoPersonalKills = computed(() => yaochaoTask.value?.progress || 0)
  const yaochaoRewards = computed(() => YAOCHAO_REWARDS.map(r => ({
    ...r,
    done: yaochaoPersonalKills.value >= r.score,
    claimed: worldBossClaimed.value.includes(`${dayKey.value}:${r.score}`)
  })))
  const claimableYaochaoCount = computed(() => yaochaoRewards.value.filter(r => r.done && !r.claimed).length)

  function applyReward(reward: RetentionReward): string[] {
    const lines: string[] = []
    if (reward.money) { playerStore.earnMoney(reward.money); lines.push(`铜钱 +${reward.money}`) }
    if (reward.aura) { cultivationStore.aura += reward.aura; lines.push(`灵气 +${reward.aura}`) }
    if (reward.spiritStone) { inventoryStore.addItem('spirit_stone', reward.spiritStone); lines.push(`灵石 ×${reward.spiritStone}`) }
    if (reward.items) {
      reward.items.forEach(item => inventoryStore.addItem(item.itemId, item.quantity))
      lines.push(...reward.items.map(item => `${item.name} ×${item.quantity}`))
    }
    if (reward.attributeExp) { playerStore.addAttributeExpBatch(reward.attributeExp); lines.push('资质经验 +' + Object.values(reward.attributeExp).reduce((a, b) => a + (b || 0), 0)) }
    return lines
  }

  function markFullActivityStreak() {
    if (lastFullActivityDayKey.value === dayKey.value) return
    const diff = lastFullActivityDayKey.value ? parseDayKey(dayKey.value) - parseDayKey(lastFullActivityDayKey.value) : 0
    if (diff === 1) {
      fullActivityStreak.value += 1
    } else {
      fullActivityStreak.value = 1
      streakClaimed.value = []
    }
    lastFullActivityDayKey.value = dayKey.value
  }

  function claimActivityBox(score: number) {
    const box = activityBoxes.value.find(b => b.score === score)
    if (!box) return { success: false, message: '活跃宝箱不存在。' }
    if (!box.done) return { success: false, message: '今日活跃度还不够。' }
    const key = `${dayKey.value}:${box.score}`
    if (activityClaimed.value.includes(key)) return { success: false, message: '今天已经领取过这个宝箱。' }
    const lines = applyReward(box.reward)
    activityClaimed.value.push(key)
    if (box.score >= 100) markFullActivityStreak()
    return { success: true, message: `领取「${box.title}」：${lines.join('、')}。` }
  }

  function claimSevenDayGift(day: number) {
    const gift = sevenDayGifts.value.find(g => g.day === day)
    if (!gift) return { success: false, message: '七日豪礼不存在。' }
    if (!gift.unlocked) return { success: false, message: '还没有解锁这一天的豪礼。' }
    if (sevenDayClaimed.value.includes(day)) return { success: false, message: '这份七日豪礼已经领取过。' }
    const lines = applyReward(gift.reward)
    sevenDayClaimed.value.push(day)
    return { success: true, message: `领取「${gift.title}」：${lines.join('、')}。` }
  }

  function claimStreakGift(day: number) {
    const gift = streakGifts.value.find(g => g.day === day)
    if (!gift) return { success: false, message: '连续满勤奖励不存在。' }
    if (!gift.unlocked) return { success: false, message: '连续满勤天数还不够。' }
    if (streakClaimed.value.includes(day)) return { success: false, message: '这档连续满勤奖励已经领取过。' }
    const lines = applyReward(gift.reward)
    streakClaimed.value.push(day)
    return { success: true, message: `领取「${gift.title}」：${lines.join('、')}。` }
  }

  function claimWeeklyTask(taskId: string) {
    const task = weeklyTasks.value.find(t => t.id === taskId)
    if (!task) return { success: false, message: '周修行令不存在。' }
    if (!task.done) return { success: false, message: '本周进度还不够。' }
    if (task.claimed) return { success: false, message: '这项周修行令已经领取过。' }
    const lines = applyReward(task.reward)
    weeklyClaimed.value.push(task.id)
    return { success: true, message: `领取「${task.title}」：${lines.join('、')}。` }
  }

  function claimYaochaoReward(score: number) {
    const reward = yaochaoRewards.value.find(r => r.score === score)
    if (!reward) return { success: false, message: '妖潮奖励不存在。' }
    if (!reward.done) return { success: false, message: '个人讨伐数还不够。' }
    const key = `${dayKey.value}:${reward.score}`
    if (worldBossClaimed.value.includes(key)) return { success: false, message: '今天已经领取过这档妖潮奖励。' }
    const lines = applyReward(reward.reward)
    worldBossClaimed.value.push(key)
    return { success: true, message: `领取「${reward.title}」：${lines.join('、')}。` }
  }

  const retentionBadge = computed(() => claimableActivityCount.value + claimableSevenDayCount.value + claimableStreakCount.value + claimableWeeklyCount.value + claimableYaochaoCount.value)

  const serialize = () => ({
    activityClaimed: activityClaimed.value,
    sevenDayClaimed: sevenDayClaimed.value,
    firstSeenDayKey: firstSeenDayKey.value,
    worldBossClaimed: worldBossClaimed.value,
    fullActivityStreak: fullActivityStreak.value,
    lastFullActivityDayKey: lastFullActivityDayKey.value,
    streakClaimed: streakClaimed.value,
    weeklyClaimed: weeklyClaimed.value,
    weeklyBaselineKey: weeklyBaselineKey.value,
    weeklyBaselines: weeklyBaselines.value
  })

  const deserialize = (data: any) => {
    activityClaimed.value = Array.isArray(data?.activityClaimed) ? data.activityClaimed : []
    sevenDayClaimed.value = Array.isArray(data?.sevenDayClaimed) ? data.sevenDayClaimed : []
    firstSeenDayKey.value = data?.firstSeenDayKey || ''
    worldBossClaimed.value = Array.isArray(data?.worldBossClaimed) ? data.worldBossClaimed : []
    fullActivityStreak.value = Number(data?.fullActivityStreak || 0)
    lastFullActivityDayKey.value = data?.lastFullActivityDayKey || ''
    streakClaimed.value = Array.isArray(data?.streakClaimed) ? data.streakClaimed : []
    weeklyClaimed.value = Array.isArray(data?.weeklyClaimed) ? data.weeklyClaimed : []
    weeklyBaselineKey.value = data?.weeklyBaselineKey || ''
    weeklyBaselines.value = data?.weeklyBaselines || {}
  }

  return {
    dayKey,
    weekKey,
    installDayIndex,
    dailyTasks,
    dailyDoneCount,
    dailyClaimedCount,
    activityScore,
    activityBoxes,
    sevenDayGifts,
    visibleFullActivityStreak,
    streakGifts,
    weeklyTasks,
    weeklyDoneCount,
    yaochaoTask,
    yaochaoPersonalKills,
    yaochaoRewards,
    claimableActivityCount,
    claimableSevenDayCount,
    claimableStreakCount,
    claimableWeeklyCount,
    claimableYaochaoCount,
    retentionBadge,
    claimActivityBox,
    claimSevenDayGift,
    claimStreakGift,
    claimWeeklyTask,
    claimYaochaoReward,
    serialize,
    deserialize
  }
})
