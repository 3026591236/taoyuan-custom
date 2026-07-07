import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuestStore } from './useQuestStore'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useCultivationStore } from './useCultivationStore'
import type { AttributeKey } from './usePlayerStore'

type RetentionReward = {
  money?: number
  aura?: number
  spiritStone?: number
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

  const gameStore = useGameStore()
  const questStore = useQuestStore()
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const cultivationStore = useCultivationStore()

  const dayKey = computed(() => `${gameStore.year}-${gameStore.season}-${gameStore.day}`)

  const installDayIndex = computed(() => {
    if (!firstSeenDayKey.value) firstSeenDayKey.value = dayKey.value
    const seasonOrder: Record<string, number> = { spring: 0, summer: 1, fall: 2, winter: 3 }
    const parse = (key: string) => {
      const [year, season, day] = key.split('-')
      return (Number(year || 1) - 1) * 112 + (seasonOrder[season || 'spring'] || 0) * 28 + Number(day || 1)
    }
    return Math.max(1, Math.min(7, parse(dayKey.value) - parse(firstSeenDayKey.value) + 1))
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
    if (reward.attributeExp) { playerStore.addAttributeExpBatch(reward.attributeExp); lines.push('资质经验 +' + Object.values(reward.attributeExp).reduce((a, b) => a + (b || 0), 0)) }
    return lines
  }

  function claimActivityBox(score: number) {
    const box = activityBoxes.value.find(b => b.score === score)
    if (!box) return { success: false, message: '活跃宝箱不存在。' }
    if (!box.done) return { success: false, message: '今日活跃度还不够。' }
    const key = `${dayKey.value}:${box.score}`
    if (activityClaimed.value.includes(key)) return { success: false, message: '今天已经领取过这个宝箱。' }
    const lines = applyReward(box.reward)
    activityClaimed.value.push(key)
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

  const retentionBadge = computed(() => claimableActivityCount.value + claimableSevenDayCount.value + claimableYaochaoCount.value)

  const serialize = () => ({
    activityClaimed: activityClaimed.value,
    sevenDayClaimed: sevenDayClaimed.value,
    firstSeenDayKey: firstSeenDayKey.value,
    worldBossClaimed: worldBossClaimed.value
  })

  const deserialize = (data: any) => {
    activityClaimed.value = Array.isArray(data?.activityClaimed) ? data.activityClaimed : []
    sevenDayClaimed.value = Array.isArray(data?.sevenDayClaimed) ? data.sevenDayClaimed : []
    firstSeenDayKey.value = data?.firstSeenDayKey || ''
    worldBossClaimed.value = Array.isArray(data?.worldBossClaimed) ? data.worldBossClaimed : []
  }

  return {
    dayKey,
    installDayIndex,
    dailyTasks,
    dailyDoneCount,
    dailyClaimedCount,
    activityScore,
    activityBoxes,
    sevenDayGifts,
    yaochaoTask,
    yaochaoPersonalKills,
    yaochaoRewards,
    claimableActivityCount,
    claimableSevenDayCount,
    claimableYaochaoCount,
    retentionBadge,
    claimActivityBox,
    claimSevenDayGift,
    claimYaochaoReward,
    serialize,
    deserialize
  }
})
