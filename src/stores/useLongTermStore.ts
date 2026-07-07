import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './useGameStore'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useCultivationStore } from './useCultivationStore'

type Reward = { money?: number; aura?: number; spiritStone?: number; cultivation?: number; items?: { itemId: string; name: string; quantity: number }[] }
type BossTier = { score: number; title: string; desc: string; reward: Reward }
type SeasonTask = { id: string; title: string; desc: string; target: number; reward: Reward }
type Adventure = { id: string; title: string; desc: string; choices: { id: string; label: string; result: string; reward: Reward }[] }
type GearAffix = { slot: string; name: string; level: number; desc: string }

const BOSS_TIERS: BossTier[] = [
  { score: 20, title: '镇魔先锋', desc: '个人贡献达到20点。', reward: { money: 1200, spiritStone: 6, aura: 180 } },
  { score: 60, title: '伏魔主力', desc: '个人贡献达到60点。', reward: { money: 2600, spiritStone: 14, aura: 420, items: [{ itemId: 'demon_core', name: '妖丹', quantity: 1 }] } },
  { score: 120, title: '镇魔功臣', desc: '个人贡献达到120点。', reward: { money: 5200, spiritStone: 26, aura: 900, items: [{ itemId: 'soul_crystal', name: '魂晶', quantity: 2 }, { itemId: 'thunder_essence', name: '雷精', quantity: 1 }] } }
]

const SEASON_TASKS: SeasonTask[] = [
  { id: 'daily_12', title: '月令·勤修', desc: '本月累计领取12个每日活跃奖励。', target: 12, reward: { money: 2200, spiritStone: 10, aura: 360 } },
  { id: 'combat_40', title: '月令·伏魔', desc: '本月累计镇魔贡献达到40。', target: 40, reward: { money: 3600, spiritStone: 16, aura: 520, items: [{ itemId: 'demon_core', name: '妖丹', quantity: 1 }] } },
  { id: 'sect_160', title: '月令·兴宗', desc: '本月累计宗门建设贡献达到160。', target: 160, reward: { money: 4200, spiritStone: 18, items: [{ itemId: 'spirit_ink', name: '灵墨', quantity: 2 }] } },
  { id: 'adventure_4', title: '月令·奇遇', desc: '本月完成4次奇遇抉择。', target: 4, reward: { money: 5000, spiritStone: 22, aura: 680, items: [{ itemId: 'moonlight_jade', name: '月华玉', quantity: 1 }] } }
]

const ADVENTURES: Adventure[] = [
  { id: 'fox_return', title: '灵狐报恩', desc: '山路白狐衔来一枚玉简，似乎在引你去旧林深处。', choices: [
    { id: 'follow', label: '随灵狐入林', result: '你帮灵狐解开旧阵，获赠魂晶与灵气。', reward: { aura: 260, items: [{ itemId: 'soul_crystal', name: '魂晶', quantity: 1 }] } },
    { id: 'feed', label: '赠灵果结缘', result: '灵狐记住了你的善意，留下灵石与月华玉。', reward: { spiritStone: 8, items: [{ itemId: 'moonlight_jade', name: '月华玉', quantity: 1 }] } }
  ]},
  { id: 'ancient_cave', title: '古修遗府', desc: '洞府石门半开，里面传来微弱剑鸣。', choices: [
    { id: 'sword', label: '取剑痕拓片', result: '你悟得一缕剑意，获得星陨铁。', reward: { cultivation: 360, items: [{ itemId: 'star_iron', name: '星陨铁', quantity: 1 }] } },
    { id: 'array', label: '修补残阵', result: '残阵回馈灵气，护符材料入手。', reward: { aura: 420, items: [{ itemId: 'thunder_essence', name: '雷精', quantity: 1 }] } }
  ]},
  { id: 'sea_caravan', title: '瀚海商队', desc: '远行商队遭沙兽围困，愿以奇货相谢。', choices: [
    { id: 'guard', label: '护送商队', result: '商队安全抵达，赠你灵石与凤羽。', reward: { money: 2800, spiritStone: 10, items: [{ itemId: 'phoenix_plume', name: '凤羽', quantity: 1 }] } },
    { id: 'trade', label: '议价换货', result: '你换来稀有灵墨，可用于符阵与宗门建设。', reward: { money: 1600, items: [{ itemId: 'spirit_ink', name: '灵墨', quantity: 3 }] } }
  ]}
]

const AFFIX_POOL: Record<string, { name: string; desc: string }[]> = {
  sword: [{ name: '破魔', desc: '秘境/镇魔贡献收益提高' }, { name: '剑魄', desc: '战力与修为收益提高' }],
  robe: [{ name: '护体', desc: '渡劫稳定与防御提高' }, { name: '聚灵', desc: '灵气收益提高' }],
  boots: [{ name: '踏风', desc: '钓鱼/采集/瀚海周目标更快' }, { name: '追影', desc: '战斗行动更加利落' }],
  amulet: [{ name: '镇心', desc: '心魔与回流惩罚降低' }, { name: '引雷', desc: '雷精相关收益提高' }]
}

export const useLongTermStore = defineStore('longTerm', () => {
  const worldBossPersonal = ref(0)
  const worldBossClaimed = ref<number[]>([])
  const sectBuildLevel = ref(1)
  const sectBuildExp = ref(0)
  const sectBuildContributed = ref(0)
  const monthlyKey = ref('')
  const monthlyProgress = ref<Record<string, number>>({})
  const monthlyClaimed = ref<string[]>([])
  const lastSeenDayKey = ref('')
  const returnGiftClaimedKey = ref('')
  const adventureIndex = ref(0)
  const adventureDone = ref<string[]>([])
  const adventureChoices = ref<Record<string, string>>({})
  const gearAffixes = ref<Record<string, GearAffix[]>>({})

  const game = () => useGameStore()
  const inv = () => useInventoryStore()
  const player = () => usePlayerStore()
  const cultivation = () => useCultivationStore()
  const dayKey = computed(() => `${game().year}-${game().season}-${game().day}`)
  const monthKeyNow = computed(() => `${game().year}-${Math.ceil(game().day / 28)}`)
  const daysAway = computed(() => {
    if (!lastSeenDayKey.value) return 0
    const [, , d] = lastSeenDayKey.value.split('-')
    return Math.max(0, Number(game().day || 1) - Number(d || game().day || 1))
  })
  const canClaimReturnGift = computed(() => daysAway.value >= 3 && returnGiftClaimedKey.value !== dayKey.value)
  const currentAdventure = computed(() => ADVENTURES[adventureIndex.value % ADVENTURES.length] ?? ADVENTURES[0]!)
  const worldBossTiers = computed(() => BOSS_TIERS.map(t => ({ ...t, progress: worldBossPersonal.value, done: worldBossPersonal.value >= t.score, claimed: worldBossClaimed.value.includes(t.score) })))
  const seasonTasks = computed(() => {
    resetMonthIfNeeded()
    return SEASON_TASKS.map(t => ({ ...t, progress: monthlyProgress.value[t.id] || 0, done: (monthlyProgress.value[t.id] || 0) >= t.target, claimed: monthlyClaimed.value.includes(t.id) }))
  })
  const sectBuildNeed = computed(() => 120 + sectBuildLevel.value * 80)
  const sectBuildBonusText = computed(() => `宗门建设Lv.${sectBuildLevel.value}：修炼/镇魔/炼器收益+${Math.min(30, sectBuildLevel.value * 3)}%`)
  const affixPowerBonus = computed(() => Object.values(gearAffixes.value).flat().reduce((s, a) => s + a.level, 0))

  function resetMonthIfNeeded() {
    if (monthlyKey.value !== monthKeyNow.value) {
      monthlyKey.value = monthKeyNow.value
      monthlyProgress.value = {}
      monthlyClaimed.value = []
    }
  }
  function addReward(reward: Reward) {
    if (reward.money) player().money += reward.money
    if (reward.aura) cultivation().aura += reward.aura
    if (reward.cultivation) cultivation().cultivation += reward.cultivation
    if (reward.spiritStone) inv().addItem('spirit_stone', reward.spiritStone)
    for (const item of reward.items || []) inv().addItem(item.itemId, item.quantity)
  }
  function rewardText(reward: Reward): string {
    const parts: string[] = []
    if (reward.money) parts.push(`铜钱+${reward.money}`)
    if (reward.aura) parts.push(`灵气+${reward.aura}`)
    if (reward.cultivation) parts.push(`修为+${reward.cultivation}`)
    if (reward.spiritStone) parts.push(`灵石×${reward.spiritStone}`)
    for (const item of reward.items || []) parts.push(`${item.name}×${item.quantity}`)
    return parts.join(' / ')
  }
  function addMonthlyProgress(id: string, n = 1) { resetMonthIfNeeded(); monthlyProgress.value[id] = (monthlyProgress.value[id] || 0) + n }
  function recordDailyClaim() { addMonthlyProgress('daily_12', 1) }
  function recordCombatContribution(n = 1) { worldBossPersonal.value += n; addMonthlyProgress('combat_40', n) }
  function claimWorldBossTier(score: number) {
    const tier = BOSS_TIERS.find(t => t.score === score)
    if (!tier) return { success: false, message: '奖励不存在' }
    if (worldBossPersonal.value < score) return { success: false, message: '镇魔贡献不足' }
    if (worldBossClaimed.value.includes(score)) return { success: false, message: '已领取' }
    addReward(tier.reward); worldBossClaimed.value.push(score)
    return { success: true, message: `领取${tier.title}：${rewardText(tier.reward)}` }
  }
  function contributeSectBuild(kind: 'money'|'spirit'|'material') {
    let gain = 0
    if (kind === 'money') { if (player().money < 1200) return { success:false, message:'铜钱不足' }; player().money -= 1200; gain = 30 }
    if (kind === 'spirit') { if (inv().getItemCount('spirit_stone') < 8) return { success:false, message:'灵石不足' }; inv().removeItem('spirit_stone', 8); gain = 50 }
    if (kind === 'material') { if (inv().getItemCount('spirit_ink') < 1) return { success:false, message:'需要灵墨×1' }; inv().removeItem('spirit_ink', 1); gain = 70 }
    sectBuildExp.value += gain; sectBuildContributed.value += gain; addMonthlyProgress('sect_160', gain)
    while (sectBuildExp.value >= sectBuildNeed.value) { sectBuildExp.value -= sectBuildNeed.value; sectBuildLevel.value += 1 }
    return { success:true, message:`宗门建设+${gain}，当前Lv.${sectBuildLevel.value}` }
  }
  function claimReturnGift() {
    if (!canClaimReturnGift.value) return { success:false, message:'暂未触发回流礼包' }
    const reward: Reward = { money: 2600 + daysAway.value * 260, spiritStone: Math.min(28, 8 + daysAway.value * 2), aura: 420 + daysAway.value * 60, items: [{ itemId:'moonlight_jade', name:'月华玉', quantity:1 }] }
    addReward(reward); returnGiftClaimedKey.value = dayKey.value; lastSeenDayKey.value = dayKey.value
    return { success:true, message:`闭关归来礼包：${rewardText(reward)}` }
  }
  function touchLoginDay() { if (!lastSeenDayKey.value) lastSeenDayKey.value = dayKey.value }
  function finishAdventure(choiceId: string) {
    const adv = currentAdventure.value
    if (!adv) return { success:false, message:'暂无奇遇' }
    if (adventureDone.value.includes(adv.id)) return { success:false, message:'本轮奇遇已完成' }
    const choice = adv.choices.find(c => c.id === choiceId)
    if (!choice) return { success:false, message:'选择不存在' }
    addReward(choice.reward); adventureDone.value.push(adv.id); adventureChoices.value[adv.id] = choiceId; adventureIndex.value += 1; addMonthlyProgress('adventure_4', 1)
    return { success:true, message:`${adv.title}：${choice.result}` }
  }
  function claimSeasonTask(id: string) {
    const task = SEASON_TASKS.find(t => t.id === id)
    if (!task) return { success:false, message:'月令不存在' }
    if ((monthlyProgress.value[id] || 0) < task.target) return { success:false, message:'月令进度不足' }
    if (monthlyClaimed.value.includes(id)) return { success:false, message:'已领取' }
    addReward(task.reward); monthlyClaimed.value.push(id)
    return { success:true, message:`领取${task.title}：${rewardText(task.reward)}` }
  }
  function rerollGearAffix(slot: string) {
    const pool = AFFIX_POOL[slot] ?? AFFIX_POOL.sword ?? []
    if (inv().getItemCount('spirit_stone') < 12) return { success:false, message:'洗练需要灵石×12' }
    inv().removeItem('spirit_stone', 12)
    const a = pool[Math.floor(Math.random() * pool.length)]
    if (!a) return { success:false, message:'暂无可洗练词条' }
    const level = 1 + Math.floor(Math.random() * 3)
    gearAffixes.value[slot] = [{ slot, name: a.name, desc: a.desc, level }]
    return { success:true, message:`洗练获得 ${a.name} Lv.${level}：${a.desc}` }
  }
  const serialize = () => ({ worldBossPersonal: worldBossPersonal.value, worldBossClaimed: worldBossClaimed.value, sectBuildLevel: sectBuildLevel.value, sectBuildExp: sectBuildExp.value, sectBuildContributed: sectBuildContributed.value, monthlyKey: monthlyKey.value, monthlyProgress: monthlyProgress.value, monthlyClaimed: monthlyClaimed.value, lastSeenDayKey: lastSeenDayKey.value, returnGiftClaimedKey: returnGiftClaimedKey.value, adventureIndex: adventureIndex.value, adventureDone: adventureDone.value, adventureChoices: adventureChoices.value, gearAffixes: gearAffixes.value })
  const deserialize = (data: any = {}) => { worldBossPersonal.value = Number(data.worldBossPersonal || 0); worldBossClaimed.value = Array.isArray(data.worldBossClaimed) ? data.worldBossClaimed : []; sectBuildLevel.value = Number(data.sectBuildLevel || 1); sectBuildExp.value = Number(data.sectBuildExp || 0); sectBuildContributed.value = Number(data.sectBuildContributed || 0); monthlyKey.value = String(data.monthlyKey || ''); monthlyProgress.value = data.monthlyProgress || {}; monthlyClaimed.value = Array.isArray(data.monthlyClaimed) ? data.monthlyClaimed : []; lastSeenDayKey.value = String(data.lastSeenDayKey || ''); returnGiftClaimedKey.value = String(data.returnGiftClaimedKey || ''); adventureIndex.value = Number(data.adventureIndex || 0); adventureDone.value = Array.isArray(data.adventureDone) ? data.adventureDone : []; adventureChoices.value = data.adventureChoices || {}; gearAffixes.value = data.gearAffixes || {} }
  return { worldBossPersonal, worldBossClaimed, sectBuildLevel, sectBuildExp, sectBuildContributed, monthlyKey, monthlyProgress, monthlyClaimed, lastSeenDayKey, returnGiftClaimedKey, adventureIndex, adventureDone, adventureChoices, gearAffixes, dayKey, monthKeyNow, daysAway, canClaimReturnGift, currentAdventure, worldBossTiers, seasonTasks, sectBuildNeed, sectBuildBonusText, affixPowerBonus, rewardText, addReward, addMonthlyProgress, recordDailyClaim, recordCombatContribution, claimWorldBossTier, contributeSectBuild, claimReturnGift, touchLoginDay, finishAdventure, claimSeasonTask, rerollGearAffix, serialize, deserialize }
})
