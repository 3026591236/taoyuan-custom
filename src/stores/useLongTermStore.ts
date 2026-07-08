import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './useGameStore'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useCultivationStore } from './useCultivationStore'

type Reward = { money?: number; aura?: number; spiritStone?: number; cultivation?: number; items?: { itemId: string; name: string; quantity: number }[] }
type BossTier = { score: number; title: string; desc: string; reward: Reward }
type SeasonTask = { id: string; title: string; desc: string; target: number; reward: Reward }
type AdventureChoice = { id: string; label: string; result: string; reward: Reward; flag?: string }
type Adventure = { id: string; arc: string; stage: number; title: string; desc: string; choices: AdventureChoice[]; hidden?: { requireFlag: string; title: string; desc: string; reward: Reward } }
type GearAffix = { slot: string; name: string; level: number; desc: string; rarity?: '普通' | '稀有' | '绝品'; setId?: 'demon' | 'spirit' | 'sea'; locked?: boolean }
type SectProjectId = 'spirit_array' | 'craft_hall' | 'sword_platform'
type FarmGoalId = 'field_scale' | 'greenhouse_supply' | 'automation' | 'spirit_crop_chain'

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
  { id: 'fox_return_1', arc: '灵狐报恩', stage: 1, title: '灵狐报恩·旧林白影', desc: '山路白狐衔来一枚玉简，似乎在引你去旧林深处。', choices: [
    { id: 'follow', label: '随灵狐入林', result: '你帮灵狐解开旧阵，获赠魂晶；旧林深处的狐火记住了你的气息。', flag: 'fox_trust', reward: { aura: 260, items: [{ itemId: 'soul_crystal', name: '魂晶', quantity: 1 }] } },
    { id: 'feed', label: '赠灵果结缘', result: '灵狐记住了你的善意，留下灵石与月华玉。', flag: 'fox_kind', reward: { spiritStone: 8, items: [{ itemId: 'moonlight_jade', name: '月华玉', quantity: 1 }] } }
  ]},
  { id: 'fox_return_2', arc: '灵狐报恩', stage: 2, title: '灵狐报恩·残阵回响', desc: '旧林阵眼残光未灭，若曾与白狐结缘，或许能看见隐藏阵路。', choices: [
    { id: 'array', label: '修补狐火残阵', result: '狐火引来灵气，宗门聚灵阵图纸更加完整。', flag: 'array_mended', reward: { aura: 480, items: [{ itemId: 'spirit_ink', name: '灵墨', quantity: 2 }] } },
    { id: 'hunt', label: '追踪林中妖影', result: '你斩除妖影，获得镇魔材料。', flag: 'fox_hunter', reward: { cultivation: 420, items: [{ itemId: 'demon_core', name: '妖丹', quantity: 1 }] } }
  ], hidden: { requireFlag: 'fox_trust', title: '隐藏结局·狐火护阵', desc: '白狐主动现身守阵，额外赠予月华玉。', reward: { aura: 300, items: [{ itemId: 'moonlight_jade', name: '月华玉', quantity: 1 }] } }},
  { id: 'sea_caravan_1', arc: '瀚海商队', stage: 1, title: '瀚海商队·沙兽围困', desc: '远行商队遭沙兽围困，愿以奇货相谢。', choices: [
    { id: 'guard', label: '护送商队', result: '商队安全抵达，赠你灵石与凤羽。', flag: 'sea_guard', reward: { money: 2800, spiritStone: 10, items: [{ itemId: 'phoenix_plume', name: '凤羽', quantity: 1 }] } },
    { id: 'trade', label: '议价换货', result: '你换来稀有灵墨，可用于符阵与宗门建设。', flag: 'sea_trade', reward: { money: 1600, items: [{ itemId: 'spirit_ink', name: '灵墨', quantity: 3 }] } }
  ]},
  { id: 'ancient_cave_1', arc: '古修遗府', stage: 1, title: '古修遗府·半开石门', desc: '洞府石门半开，里面传来微弱剑鸣。', choices: [
    { id: 'sword', label: '取剑痕拓片', result: '你悟得一缕剑意，获得星陨铁。', flag: 'cave_sword', reward: { cultivation: 360, items: [{ itemId: 'star_iron', name: '星陨铁', quantity: 1 }] } },
    { id: 'array', label: '修补残阵', result: '残阵回馈灵气，护符材料入手。', flag: 'cave_array', reward: { aura: 420, items: [{ itemId: 'thunder_essence', name: '雷精', quantity: 1 }] } }
  ], hidden: { requireFlag: 'sea_guard', title: '隐藏结局·瀚海古图', desc: '商队给出的古图指向遗府暗室，你额外找到凤羽。', reward: { spiritStone: 8, items: [{ itemId: 'phoenix_plume', name: '凤羽', quantity: 1 }] } }}
]
const SECT_PROJECTS: { id: SectProjectId; name: string; desc: string; effect: string; emoji: string }[] = [
  { id: 'spirit_array', name: '聚灵阵', emoji: '🌀', desc: '宗门合力修筑聚灵阵，稳定提升修行与灵气循环。', effect: '修行/灵气收益方向' },
  { id: 'craft_hall', name: '百工堂', emoji: '🏗️', desc: '扩建百工堂，支援炼器、洗练与农具维护。', effect: '炼器/洗练/自动化方向' },
  { id: 'sword_platform', name: '试剑台', emoji: '⚔️', desc: '搭建试剑台，宗门弟子共同演武镇魔。', effect: '战斗/镇魔/宗门演武方向' }
]

const FARM_GOALS: { id: FarmGoalId; title: string; desc: string; target: number; reward: Reward }[] = [
  { id: 'field_scale', title: '灵田规模', desc: '开垦并维护足够地块，形成中期稳定产能。', target: 16, reward: { money: 3600, spiritStone: 10, items: [{ itemId: 'seed_spirit_rice', name: '蕴灵稻种子', quantity: 4 }] } },
  { id: 'greenhouse_supply', title: '温室供给', desc: '修复温室并保持温室地块运转，提供跨季供应。', target: 6, reward: { money: 4200, spiritStone: 12, items: [{ itemId: 'seed_dew_grass', name: '凝露草种子', quantity: 4 }] } },
  { id: 'automation', title: '自动化农庄', desc: '布置洒水器、稻草人、避雷针等设施，减少重复操作。', target: 5, reward: { money: 5200, spiritStone: 16, items: [{ itemId: 'spirit_ink', name: '灵墨', quantity: 2 }] } },
  { id: 'spirit_crop_chain', title: '灵植供应链', desc: '通过灵植库存支撑宗门订单、炼丹与镇魔材料循环。', target: 20, reward: { money: 6800, spiritStone: 22, aura: 520, items: [{ itemId: 'moonlight_jade', name: '月华玉', quantity: 1 }] } }
]

const AFFIX_POOL: Record<string, { name: string; desc: string; rarity: '普通' | '稀有' | '绝品'; setId?: 'demon' | 'spirit' | 'sea' }[]> = {
  sword: [
    { name: '破魔', desc: '秘境/镇魔贡献收益提高', rarity: '普通', setId: 'demon' },
    { name: '剑魄', desc: '战力与修为收益提高', rarity: '稀有', setId: 'spirit' },
    { name: '天罚剑鸣', desc: '镇魔、登塔与雷精收益显著提高', rarity: '绝品', setId: 'demon' }
  ],
  robe: [
    { name: '护体', desc: '渡劫稳定与防御提高', rarity: '普通', setId: 'spirit' },
    { name: '聚灵', desc: '灵气收益提高', rarity: '稀有', setId: 'spirit' },
    { name: '玄霜法纹', desc: '心魔与高阶挑战容错提高', rarity: '绝品', setId: 'sea' }
  ],
  boots: [
    { name: '踏风', desc: '钓鱼/采集/瀚海周目标更快', rarity: '普通', setId: 'sea' },
    { name: '追影', desc: '战斗行动更加利落', rarity: '稀有', setId: 'demon' },
    { name: '瀚海行踪', desc: '瀚海、商队和探索奖励提高', rarity: '绝品', setId: 'sea' }
  ],
  amulet: [
    { name: '镇心', desc: '心魔与回流惩罚降低', rarity: '普通', setId: 'spirit' },
    { name: '引雷', desc: '雷精相关收益提高', rarity: '稀有', setId: 'demon' },
    { name: '月华归元', desc: '回流、奇遇与月度任务收益提高', rarity: '绝品', setId: 'spirit' }
  ]
}

const SET_BONUS: Record<string, { name: string; desc: string }> = {
  demon: { name: '镇魔套装', desc: '2件：镇魔/秘境追求增强；4件：周期贡献更稳定。' },
  spirit: { name: '聚灵套装', desc: '2件：灵气/修行追求增强；4件：月度成长更顺滑。' },
  sea: { name: '瀚海套装', desc: '2件：商队/探索追求增强；4件：隐藏奇遇更容易成型。' }
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
  const gearPity = ref<Record<string, number>>({})
  const affixCodex = ref<string[]>([])
  const adventureFlags = ref<Record<string, boolean>>({})
  const adventureEndings = ref<string[]>([])
  const sectProjects = ref<Record<SectProjectId, number>>({ spirit_array: 1, craft_hall: 1, sword_platform: 1 })
  const farmGoalClaimed = ref<FarmGoalId[]>([])

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
  const affixPowerBonus = computed(() => Object.values(gearAffixes.value).flat().reduce((s, a) => s + a.level + (a.rarity === '绝品' ? 3 : a.rarity === '稀有' ? 2 : 1), 0))
  const gearSetBonuses = computed(() => {
    const counts: Record<string, number> = {}
    Object.values(gearAffixes.value).flat().forEach(a => { if (a.setId) counts[a.setId] = (counts[a.setId] || 0) + 1 })
    return Object.entries(counts).map(([id, count]) => ({ id, count, name: SET_BONUS[id]?.name || id, desc: SET_BONUS[id]?.desc || '', active: count >= 2 }))
  })
  const rareAffixCodex = computed(() => Object.values(AFFIX_POOL).flat().filter(a => a.rarity !== '普通').map(a => ({ ...a, discovered: affixCodex.value.includes(a.name) })))
  const adventureStory = computed(() => ({ flags: adventureFlags.value, endings: adventureEndings.value, completed: adventureDone.value.length, current: currentAdventure.value }))
  const sectProjectCards = computed(() => SECT_PROJECTS.map(p => ({ ...p, level: sectProjects.value[p.id] || 1, need: 90 + (sectProjects.value[p.id] || 1) * 60 })))
  const sectProjectBonusText = computed(() => `聚灵阵Lv.${sectProjects.value.spirit_array || 1} / 百工堂Lv.${sectProjects.value.craft_hall || 1} / 试剑台Lv.${sectProjects.value.sword_platform || 1}`)

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

  function contributeSectProject(id: SectProjectId, kind: 'money'|'spirit'|'material') {
    const project = SECT_PROJECTS.find(p => p.id === id)
    if (!project) return { success:false, message:'工程不存在' }
    let gain = 0
    if (kind === 'money') { if (player().money < 1600) return { success:false, message:'铜钱不足' }; player().money -= 1600; gain = 35 }
    if (kind === 'spirit') { if (inv().getItemCount('spirit_stone') < 10) return { success:false, message:'灵石不足' }; inv().removeItem('spirit_stone', 10); gain = 55 }
    if (kind === 'material') { if (inv().getItemCount('spirit_ink') < 1) return { success:false, message:'需要灵墨×1' }; inv().removeItem('spirit_ink', 1); gain = 75 }
    sectBuildContributed.value += gain
    addMonthlyProgress('sect_160', gain)
    const current = sectProjects.value[id] || 1
    const need = 90 + current * 60
    sectBuildExp.value += Math.floor(gain / 2)
    if (gain >= need || sectBuildExp.value >= need) {
      if (sectBuildExp.value >= need) sectBuildExp.value -= need
      sectProjects.value[id] = current + 1
      return { success:true, message:`${project.name}升至Lv.${sectProjects.value[id]}，${project.effect}增强` }
    }
    return { success:true, message:`${project.name}建设+${gain}，继续投入可升级工程` }
  }
  function farmGoalCards(stats: Record<string, number>) {
    return FARM_GOALS.map(g => ({ ...g, progress: Math.max(0, Number(stats[g.id] || 0) || 0), done: (Number(stats[g.id] || 0) || 0) >= g.target, claimed: farmGoalClaimed.value.includes(g.id) }))
  }
  function claimFarmGoal(id: FarmGoalId, stats: Record<string, number>) {
    const goal = farmGoalCards(stats).find(g => g.id === id)
    if (!goal) return { success:false, message:'经营目标不存在' }
    if (!goal.done) return { success:false, message:'经营目标尚未完成' }
    if (goal.claimed) return { success:false, message:'已领取' }
    addReward(goal.reward)
    farmGoalClaimed.value.push(id)
    return { success:true, message:`领取${goal.title}：${rewardText(goal.reward)}` }
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
    addReward(choice.reward)
    if (choice.flag) adventureFlags.value[choice.flag] = true
    let extra = ''
    if (adv.hidden && adventureFlags.value[adv.hidden.requireFlag] && !adventureEndings.value.includes(adv.hidden.title)) {
      addReward(adv.hidden.reward)
      adventureEndings.value.push(adv.hidden.title)
      extra = `；触发${adv.hidden.title}：${adv.hidden.desc}`
    }
    adventureDone.value.push(adv.id); adventureChoices.value[adv.id] = choiceId; adventureIndex.value += 1; addMonthlyProgress('adventure_4', 1)
    return { success:true, message:`${adv.title}：${choice.result}${extra}` }
  }
  function claimSeasonTask(id: string) {
    const task = SEASON_TASKS.find(t => t.id === id)
    if (!task) return { success:false, message:'月令不存在' }
    if ((monthlyProgress.value[id] || 0) < task.target) return { success:false, message:'月令进度不足' }
    if (monthlyClaimed.value.includes(id)) return { success:false, message:'已领取' }
    addReward(task.reward); monthlyClaimed.value.push(id)
    return { success:true, message:`领取${task.title}：${rewardText(task.reward)}` }
  }
  function toggleAffixLock(slot: string) {
    const affix = gearAffixes.value[slot]?.[0]
    if (!affix) return { success:false, message:'暂无可锁定词条' }
    affix.locked = !affix.locked
    return { success:true, message:`${affix.name}已${affix.locked ? '锁定' : '解锁'}` }
  }
  function rollAffix(slot: string, forceRare = false) {
    const pool = AFFIX_POOL[slot] ?? AFFIX_POOL.sword ?? []
    const rarePool = pool.filter(a => a.rarity !== '普通')
    const pickPool = forceRare && rarePool.length > 0 ? rarePool : pool
    const a = pickPool[Math.floor(Math.random() * pickPool.length)]
    if (!a) return null
    const level = a.rarity === '绝品' ? 3 : 1 + Math.floor(Math.random() * 3)
    return { slot, name: a.name, desc: a.desc, level, rarity: a.rarity, setId: a.setId, locked: false } as GearAffix
  }
  function rerollGearAffix(slot: string) {
    const current = gearAffixes.value[slot]?.[0]
    const locked = !!current?.locked
    const cost = locked ? 20 : 12
    if (inv().getItemCount('spirit_stone') < cost) return { success:false, message:`洗练需要灵石×${cost}` }
    inv().removeItem('spirit_stone', cost)
    if (locked && current) return { success:true, message:`${current.name}已锁定，本次仅消耗灵石维持词条（后续可扩展副词条）。` }
    const pity = (gearPity.value[slot] || 0) + 1
    const forceRare = pity >= 8
    const next = rollAffix(slot, forceRare)
    if (!next) return { success:false, message:'暂无可洗练词条' }
    gearAffixes.value[slot] = [next]
    if (next.rarity !== '普通') { gearPity.value[slot] = 0; if (!affixCodex.value.includes(next.name)) affixCodex.value.push(next.name) }
    else gearPity.value[slot] = pity
    return { success:true, message:`洗练获得${next.rarity || '普通'}词条 ${next.name} Lv.${next.level}：${next.desc}${forceRare ? '（保底触发）' : ''}` }
  }
  const serialize = () => ({ worldBossPersonal: worldBossPersonal.value, worldBossClaimed: worldBossClaimed.value, sectBuildLevel: sectBuildLevel.value, sectBuildExp: sectBuildExp.value, sectBuildContributed: sectBuildContributed.value, monthlyKey: monthlyKey.value, monthlyProgress: monthlyProgress.value, monthlyClaimed: monthlyClaimed.value, lastSeenDayKey: lastSeenDayKey.value, returnGiftClaimedKey: returnGiftClaimedKey.value, adventureIndex: adventureIndex.value, adventureDone: adventureDone.value, adventureChoices: adventureChoices.value, gearAffixes: gearAffixes.value, gearPity: gearPity.value, affixCodex: affixCodex.value, adventureFlags: adventureFlags.value, adventureEndings: adventureEndings.value, sectProjects: sectProjects.value, farmGoalClaimed: farmGoalClaimed.value })
  const deserialize = (data: any = {}) => { worldBossPersonal.value = Number(data.worldBossPersonal || 0); worldBossClaimed.value = Array.isArray(data.worldBossClaimed) ? data.worldBossClaimed : []; sectBuildLevel.value = Number(data.sectBuildLevel || 1); sectBuildExp.value = Number(data.sectBuildExp || 0); sectBuildContributed.value = Number(data.sectBuildContributed || 0); monthlyKey.value = String(data.monthlyKey || ''); monthlyProgress.value = data.monthlyProgress || {}; monthlyClaimed.value = Array.isArray(data.monthlyClaimed) ? data.monthlyClaimed : []; lastSeenDayKey.value = String(data.lastSeenDayKey || ''); returnGiftClaimedKey.value = String(data.returnGiftClaimedKey || ''); adventureIndex.value = Number(data.adventureIndex || 0); adventureDone.value = Array.isArray(data.adventureDone) ? data.adventureDone : []; adventureChoices.value = data.adventureChoices || {}; gearAffixes.value = data.gearAffixes || {}; gearPity.value = data.gearPity || {}; affixCodex.value = Array.isArray(data.affixCodex) ? data.affixCodex : []; adventureFlags.value = data.adventureFlags || {}; adventureEndings.value = Array.isArray(data.adventureEndings) ? data.adventureEndings : []; sectProjects.value = { spirit_array: 1, craft_hall: 1, sword_platform: 1, ...(data.sectProjects || {}) }; farmGoalClaimed.value = Array.isArray(data.farmGoalClaimed) ? data.farmGoalClaimed : [] }
  return { worldBossPersonal, worldBossClaimed, sectBuildLevel, sectBuildExp, sectBuildContributed, monthlyKey, monthlyProgress, monthlyClaimed, lastSeenDayKey, returnGiftClaimedKey, adventureIndex, adventureDone, adventureChoices, gearAffixes, gearPity, affixCodex, adventureFlags, adventureEndings, gearSetBonuses, rareAffixCodex, adventureStory, sectProjects, farmGoalClaimed, dayKey, monthKeyNow, daysAway, canClaimReturnGift, currentAdventure, worldBossTiers, seasonTasks, sectBuildNeed, sectBuildBonusText, sectProjectCards, sectProjectBonusText, affixPowerBonus, rewardText, addReward, addMonthlyProgress, recordDailyClaim, recordCombatContribution, claimWorldBossTier, contributeSectBuild, contributeSectProject, farmGoalCards, claimFarmGoal, claimReturnGift, touchLoginDay, finishAdventure, claimSeasonTask, toggleAffixLock, rerollGearAffix, serialize, deserialize }
})
