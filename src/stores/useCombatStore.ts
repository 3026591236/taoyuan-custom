// 桃源乡 V0.5 - 红尘历练 / 挑战凶兽 / 秘境探索
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { addLog } from '@/composables/useGameLog'
import { useCultivationStore } from './useCultivationStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useGameStore } from './useGameStore'
import { useAchievementStore } from './useAchievementStore'

export type ZoneKind = 'trial' | 'beast' | 'realm' | 'tower'

export interface Monster {
  id: string
  name: string
  emoji: string
  sprite: string
  hp: number
  atk: number
  def: number
  drops: { itemId: string; name: string; qty: number; chance: number }[]
  exp: number
  aura: number
}


export interface RealmChoiceOption {
  id: string
  label: string
  desc: string
  effect: () => string
}

export interface RealmChoiceEvent {
  id: string
  title: string
  desc: string
  options: RealmChoiceOption[]
}

export interface RealmZone {
  id: string
  name: string
  emoji: string
  desc: string
  kind: ZoneKind
  minRealm: number
  minRebirth?: number
  cost: number
  staminaCost: number
  dailyLimit?: number
  rewardHint: string
  monsters: Monster[]
}

export const REALM_ZONES: RealmZone[] = [
  {
    id: 'taoyuan_path', kind: 'trial', name: '桃源山径', emoji: '🌿', desc: '桃源乡外的灵雾山径，适合初入修行者磨炼。', minRealm: 0, cost: 10, staminaCost: 4,
    rewardHint: '修为、灵气、低阶材料',
    monsters: [
      { id: 'spirit_wolf', name: '灵狼', emoji: '🐺', sprite: 'wolf', hp: 80, atk: 12, def: 3, exp: 24, aura: 8, drops: [{ itemId: 'spirit_stone', name: '灵石', qty: 2, chance: 0.75 }, { itemId: 'fox_fur', name: '狐皮', qty: 1, chance: 0.25 }] },
      { id: 'tree_spirit', name: '树精', emoji: '🌳', sprite: 'treant', hp: 120, atk: 8, def: 8, exp: 32, aura: 12, drops: [{ itemId: 'wood_spirit', name: '木灵珠', qty: 1, chance: 0.35 }, { itemId: 'spirit_stone', name: '灵石', qty: 3, chance: 0.65 }] }
    ]
  },
  {
    id: 'qingqiu_forest', kind: 'trial', name: '青丘旧林', emoji: '🦊', desc: '狐火长明的古林，偶有妖狐遗宝现世。', minRealm: 10, minRebirth: 1, cost: 24, staminaCost: 6,
    rewardHint: '狐皮、真灵秘录、法宝碎片',
    monsters: [
      { id: 'spirit_fox', name: '青丘灵狐', emoji: '🦊', sprite: 'fox', hp: 210, atk: 28, def: 10, exp: 70, aura: 24, drops: [{ itemId: 'fox_fur', name: '狐皮', qty: 2, chance: 0.55 }, { itemId: 'true_spirit_record', name: '真灵秘录', qty: 1, chance: 0.18 }] },
      { id: 'forest_king', name: '林中王者·灵熊', emoji: '🐻', sprite: 'bear', hp: 280, atk: 30, def: 16, exp: 88, aura: 30, drops: [{ itemId: 'bear_gall', name: '熊胆', qty: 1, chance: 0.45 }, { itemId: 'artifact_shard', name: '法宝碎片', qty: 1, chance: 0.16 }] }
    ]
  },
  {
    id: 'yunmeng_marsh', kind: 'trial', name: '云梦泽', emoji: '🌫️', desc: '水泽迷雾缠绕，水行灵物与幽魂并存。', minRealm: 14, minRebirth: 3, cost: 38, staminaCost: 8,
    rewardHint: '魂晶、水泽材料、轮回材料',
    monsters: [
      { id: 'marsh_spirit', name: '泽中水魄', emoji: '💧', sprite: 'wisp', hp: 380, atk: 44, def: 16, exp: 120, aura: 42, drops: [{ itemId: 'soul_crystal', name: '魂晶', qty: 1, chance: 0.45 }, { itemId: 'reincarnation_dust', name: '轮回尘', qty: 1, chance: 0.16 }] },
      { id: 'nether_spider', name: '冥蛛', emoji: '🕷️', sprite: 'spider', hp: 420, atk: 48, def: 18, exp: 135, aura: 48, drops: [{ itemId: 'spider_silk', name: '蛛丝', qty: 2, chance: 0.5 }, { itemId: 'true_spirit_record', name: '真灵秘录', qty: 1, chance: 0.22 }] }
    ]
  },
  {
    id: 'kunlun_border', kind: 'trial', name: '昆仑外境', emoji: '🏔️', desc: '昆仑外山，雷火交汇，非多次轮回者难以久留。', minRealm: 18, minRebirth: 8, cost: 55, staminaCost: 10,
    rewardHint: '雷精、风羽、装备升星材料',
    monsters: [
      { id: 'thunder_wolf', name: '雷狼', emoji: '⚡', sprite: 'thunder_wolf', hp: 520, atk: 62, def: 22, exp: 180, aura: 65, drops: [{ itemId: 'thunder_essence', name: '雷精', qty: 1, chance: 0.42 }, { itemId: 'star_iron', name: '星陨铁', qty: 1, chance: 0.18 }] },
      { id: 'storm_eagle', name: '风暴鹰', emoji: '🦅', sprite: 'eagle', hp: 470, atk: 72, def: 18, exp: 190, aura: 72, drops: [{ itemId: 'storm_feather', name: '风羽', qty: 1, chance: 0.4 }, { itemId: 'artifact_shard', name: '法宝碎片', qty: 2, chance: 0.18 }] }
    ]
  },
  {
    id: 'spirit_forest', kind: 'realm', name: '灵兽森林', emoji: '🌲', desc: '灵气充沛的古老森林，低阶灵兽出没。', minRealm: 0, cost: 15, staminaCost: 5,
    rewardHint: '灵石、木灵珠、基础炼器材料',
    monsters: [
      { id: 'venom_snake', name: '毒蛇', emoji: '🐍', sprite: 'snake', hp: 90, atk: 18, def: 2, exp: 25, aura: 8, drops: [{ itemId: 'iron_ore', name: '铁矿石', qty: 1, chance: 0.4 }, { itemId: 'spirit_stone', name: '灵石', qty: 3, chance: 0.7 }] },
      { id: 'forest_kion2', name: '林中王者·灵熊', emoji: '🐻', sprite: 'bear', hp: 220, atk: 24, def: 10, exp: 60, aura: 20, drops: [{ itemId: 'bear_gall', name: '熊胆', qty: 1, chance: 0.5 }, { itemId: 'spirit_stone', name: '灵石', qty: 8, chance: 0.9 }] }
    ]
  },
  {
    id: 'dark_cave', kind: 'realm', name: '幽冥洞窟', emoji: '🕳️', desc: '阴气森森的地下洞窟，鬼魅横行。', minRealm: 10, cost: 30, staminaCost: 7,
    rewardHint: '魂晶、冥核、炼器图纸',
    monsters: [
      { id: 'ghost', name: '游魂', emoji: '👻', sprite: 'ghost', hp: 150, atk: 25, def: 5, exp: 50, aura: 15, drops: [{ itemId: 'soul_crystal', name: '魂晶', qty: 1, chance: 0.4 }, { itemId: 'spirit_stone', name: '灵石', qty: 6, chance: 0.7 }] },
      { id: 'cave_lord', name: '洞窟之主·冥将', emoji: '👹', sprite: 'demon_general', hp: 400, atk: 40, def: 18, exp: 120, aura: 40, drops: [{ itemId: 'nether_core', name: '冥核', qty: 1, chance: 0.3 }, { itemId: 'forge_blueprint', name: '炼器图纸', qty: 1, chance: 0.2 }] }
    ]
  },
  {
    id: 'taotie', kind: 'beast', name: '凶兽·饕餮', emoji: '🐲', desc: '吞噬灵气的上古凶兽，每日可挑战一次。', minRealm: 16, minRebirth: 1, cost: 60, staminaCost: 12, dailyLimit: 1,
    rewardHint: '真灵秘录、轮回尘、灵蕴',
    monsters: [
      { id: 'taotie_boss', name: '饕餮', emoji: '🐲', sprite: 'taotie', hp: 900, atk: 78, def: 32, exp: 260, aura: 120, drops: [{ itemId: 'true_spirit_record', name: '真灵秘录', qty: 1, chance: 0.75 }, { itemId: 'reincarnation_dust', name: '轮回尘', qty: 1, chance: 0.45 }, { itemId: 'lingyun_jade', name: '灵蕴玉', qty: 1, chance: 0.18 }] }
    ]
  },
  {
    id: 'qiongqi', kind: 'beast', name: '凶兽·穷奇', emoji: '🦁', desc: '喜斗好杀的凶兽，适合中期转生者挑战。', minRealm: 20, minRebirth: 5, cost: 90, staminaCost: 15, dailyLimit: 1,
    rewardHint: '高级轮回材料、法宝碎片、星陨铁',
    monsters: [
      { id: 'qiongqi_boss', name: '穷奇', emoji: '🦁', sprite: 'qiongqi', hp: 1500, atk: 110, def: 45, exp: 420, aura: 180, drops: [{ itemId: 'true_spirit_record', name: '真灵秘录', qty: 2, chance: 0.75 }, { itemId: 'artifact_shard', name: '法宝碎片', qty: 2, chance: 0.45 }, { itemId: 'star_iron', name: '星陨铁', qty: 1, chance: 0.35 }] }
    ]
  },
  {
    id: 'hundun', kind: 'beast', name: '凶兽·混沌', emoji: '🌑', desc: '混沌雾海中沉睡的凶兽，挑战失败也会损耗大量体力。', minRealm: 24, minRebirth: 10, cost: 140, staminaCost: 18, dailyLimit: 1,
    rewardHint: '灵蕴玉、轮回尘、装备升星核心',
    monsters: [
      { id: 'hundun_boss', name: '混沌', emoji: '🌑', sprite: 'hundun', hp: 2400, atk: 150, def: 70, exp: 680, aura: 260, drops: [{ itemId: 'lingyun_jade', name: '灵蕴玉', qty: 1, chance: 0.55 }, { itemId: 'reincarnation_dust', name: '轮回尘', qty: 2, chance: 0.55 }, { itemId: 'star_iron', name: '星陨铁', qty: 2, chance: 0.35 }] }
    ]
  }
]

const todayKey = () => new Date().toISOString().slice(0, 10)

export const useCombatStore = defineStore('combat', () => {
  const currentZone = ref<string | null>(null)
  const currentMonster = ref<Monster | null>(null)
  const monsterHp = ref(0)
  const playerHp = ref(0)
  const combatLog = ref<string[]>([])
  const isFighting = ref(false)
  const combatResult = ref<'win' | 'lose' | null>(null)
  const drops = ref<{ itemId: string; name: string; qty: number }[]>([])
  const showFlash = ref(false)
  const damageNumbers = ref<{ id: number; value: number; type: 'player' | 'monster'; x: number; y: number }[]>([])
  const dailyRuns = ref<Record<string, { date: string; count: number }>>({})
  const towerHighestFloor = ref(0)
  const towerCurrentFloor = ref(0)
  const towerMilestoneClaimed = ref<number[]>([])
  const pendingRealmChoice = ref<RealmChoiceEvent | null>(null)
  let dmgId = 0

  const activeZone = computed(() => REALM_ZONES.find(z => z.id === currentZone.value) || null)
  const isTowerCombat = computed(() => currentZone.value === 'ascension_tower')
  const towerNextFloor = computed(() => towerHighestFloor.value + 1)
  const towerCost = computed(() => 12 + Math.ceil(towerNextFloor.value * 2.5))
  const towerStaminaCost = computed(() => 4 + Math.ceil(towerNextFloor.value / 8))
  const combatTitle = computed(() => isTowerCombat.value ? `🗼 登仙塔 · 第${towerCurrentFloor.value}层` : `${activeZone.value?.emoji || ''} ${activeZone.value?.name || '战场'}`)
  const combatRewardHint = computed(() => isTowerCombat.value ? '逐层试炼 / 首通记录 / 每5层宝箱 / 每10层镇塔大奖' : (activeZone.value?.rewardHint || ''))
  const towerMilestoneRewards = computed(() => {
    const rewards: { floor: number; title: string; desc: string; claimed: boolean; reached: boolean }[] = []
    for (let floor = 5; floor <= Math.max(50, Math.ceil((towerHighestFloor.value + 10) / 5) * 5); floor += 5) {
      const boss = floor % 10 === 0
      rewards.push({
        floor,
        title: boss ? `第${floor}层镇塔宝箱` : `第${floor}层精英宝箱`,
        desc: boss ? '大量灵石、法宝碎片、灵蕴玉概率奖励' : '灵石、魂晶、少量法宝碎片',
        claimed: towerMilestoneClaimed.value.includes(floor),
        reached: towerHighestFloor.value >= floor
      })
    }
    return rewards
  })
  const nextTowerMilestone = computed(() => towerMilestoneRewards.value.find(r => !r.claimed) || null)
  const towerClaimableMilestones = computed(() => towerMilestoneRewards.value.filter(r => r.reached && !r.claimed))
  const trialZones = computed(() => REALM_ZONES.filter(z => z.kind === 'trial'))
  const beastZones = computed(() => REALM_ZONES.filter(z => z.kind === 'beast'))
  const realmZones = computed(() => REALM_ZONES.filter(z => z.kind === 'realm'))

  const playerAtk = computed(() => {
    const c = useCultivationStore()
    const p = usePlayerStore()
    const base = 12 + (c.realmIndex || 0) * 9 + Math.floor((c.cultivation || 0) / 45) + (c.rebirthCount || 0) * 18
    const beastBonus = c.beast === 'crane' ? Math.floor(base * 0.2) : 0
    const artifactBonus = (c.destinedArtifactLevel || 0) * 8
    return Math.floor((base + beastBonus + artifactBonus + p.attributeAttackBonus) * (1 + (c.sectCombatAttackBonusRate || 0)))
  })

  const playerDef = computed(() => {
    const c = useCultivationStore()
    const p = usePlayerStore()
    return Math.floor((6 + (c.realmIndex || 0) * 4 + Math.floor((c.aura || 0) / 25) + (c.rebirthCount || 0) * 10 + (c.yuanShenLevel || 0) * 3 + p.attributeSpeedBonus) * (1 + (c.sectCombatDefenseBonusRate || 0)))
  })

  const playerMaxHp = computed(() => {
    const c = useCultivationStore()
    const p = usePlayerStore()
    return Math.floor((120 + (c.realmIndex || 0) * 34 + (c.cultivation || 0) + (c.rebirthCount || 0) * 120 + (c.yuanShenLevel || 0) * 30 + p.attributeMaxHpBonus) * (1 + (c.sectMaxHpBonusRate || 0)))
  })

  const getDailyCount = (zoneId: string) => {
    const item = dailyRuns.value[zoneId]
    return item?.date === todayKey() ? item.count : 0
  }

  const isZoneUnlocked = (zone: RealmZone) => {
    const c = useCultivationStore()
    return (c.realmIndex || 0) >= zone.minRealm && (c.rebirthCount || 0) >= (zone.minRebirth || 0)
  }

  const lockReason = (zone: RealmZone) => {
    const c = useCultivationStore()
    if ((c.realmIndex || 0) < zone.minRealm) return `境界不足，需要第${zone.minRealm + 1}阶以上`
    if ((c.rebirthCount || 0) < (zone.minRebirth || 0)) return `转生不足，需要${zone.minRebirth}转`
    if (zone.dailyLimit && getDailyCount(zone.id) >= zone.dailyLimit) return `今日挑战次数已用完（${zone.dailyLimit}/${zone.dailyLimit}）`
    return ''
  }

  const towerFloorMonster = (floor: number): Monster => {
    const tier = Math.max(1, floor)
    const boss = tier % 10 === 0
    const elite = !boss && tier % 5 === 0
    const names = boss
      ? [{ emoji: '🐉', name: '镇塔龙魂', sprite: 'tower_dragon' }, { emoji: '👁️', name: '问道心魔', sprite: 'tower_mind_demon' }, { emoji: '🗿', name: '古塔守将', sprite: 'tower_guardian' }]
      : elite
        ? [{ emoji: '🦅', name: '凌霄妖禽', sprite: 'tower_bird' }, { emoji: '⚡', name: '雷纹傀儡', sprite: 'tower_puppet' }, { emoji: '🔥', name: '赤焰塔灵', sprite: 'tower_flame' }]
        : [{ emoji: '👺', name: '塔中妖影', sprite: 'tower_shadow' }, { emoji: '🧿', name: '巡塔灵魄', sprite: 'tower_spirit' }, { emoji: '🦂', name: '玄砂毒蝎', sprite: 'tower_scorpion' }, { emoji: '🐺', name: '噬月灵狼', sprite: 'tower_moon_wolf' }]
    const pick = names[(tier + Math.floor(Math.random() * names.length)) % names.length]!
    const scale = boss ? 1.9 : elite ? 1.35 : 1
    const realmBoost = Math.floor(tier / 10) * 18
    return {
      id: `tower_${tier}`,
      name: `${pick.name}·${tier}层`,
      emoji: pick.emoji,
      sprite: pick.sprite || '',
      hp: Math.floor((95 + tier * 34 + Math.pow(tier, 1.35) * 6) * scale),
      atk: Math.floor((14 + tier * 4.2 + realmBoost) * scale),
      def: Math.floor((4 + tier * 1.9 + Math.floor(tier / 6) * 3) * scale),
      exp: Math.floor((38 + tier * 18) * (boss ? 1.8 : elite ? 1.35 : 1)),
      aura: Math.floor((14 + tier * 8) * (boss ? 1.8 : elite ? 1.35 : 1)),
      drops: [
        { itemId: 'spirit_stone', name: '灵石', qty: 4 + Math.ceil(tier / 2), chance: 0.9 },
        { itemId: 'soul_crystal', name: '魂晶', qty: 1 + Math.floor(tier / 20), chance: Math.min(0.18 + tier * 0.006, 0.55) },
        { itemId: 'artifact_shard', name: '法宝碎片', qty: 1, chance: boss ? 0.42 : elite ? 0.22 : 0.08 },
        { itemId: 'lingyun_jade', name: '灵蕴玉', qty: 1, chance: boss ? 0.18 : 0.03 }
      ]
    }
  }

  const towerLockReason = () => {
    const c = useCultivationStore()
    if (!c.unlocked) return '尚未踏入修行，先在修行页感应地脉。'
    if ((c.realmIndex || 0) < 1) return '境界不足，需要炼气一层后开启登仙塔。'
    return ''
  }

  const challengeTower = (floor = towerNextFloor.value) => {
    const c = useCultivationStore()
    const p = usePlayerStore()
    const reason = towerLockReason()
    if (reason) { addLog(reason); return }
    const targetFloor = Math.max(1, Math.min(Math.floor(floor || towerNextFloor.value), towerHighestFloor.value + 1))
    const manaCost = 12 + Math.ceil(targetFloor * 2.5)
    const staminaCost = 4 + Math.ceil(targetFloor / 8)
    if ((c.mana || 0) < manaCost) { addLog(`灵力不足，登塔需要${manaCost}点。`); return }
    if (!p.consumeStamina(staminaCost)) { addLog(`体力不足，登塔需要${staminaCost}点。`); return }
    c.mana = (c.mana || 0) - manaCost
    currentZone.value = 'ascension_tower'
    towerCurrentFloor.value = targetFloor
    combatLog.value = []
    combatResult.value = null
    drops.value = []
    startFight(towerFloorMonster(targetFloor))
  }

  const enterZone = (zoneId: string) => {
    const c = useCultivationStore()
    const p = usePlayerStore()
    const zone = REALM_ZONES.find(z => z.id === zoneId)
    if (!zone) return
    const reason = lockReason(zone)
    if (reason) { addLog(reason); return }
    if ((c.mana || 0) < zone.cost) { addLog('灵力不足'); return }
    if (!p.consumeStamina(zone.staminaCost)) { addLog('体力不足'); return }
    c.mana = (c.mana || 0) - zone.cost
    currentZone.value = zoneId
    combatLog.value = []
    combatResult.value = null
    drops.value = []
    if (zone.dailyLimit) {
      const key = todayKey()
      const old = dailyRuns.value[zone.id]
      dailyRuns.value[zone.id] = { date: key, count: old?.date === key ? old.count + 1 : 1 }
    }
    const m = zone.monsters[Math.floor(Math.random() * zone.monsters.length)]!
    startFight(m)
  }

  const startFight = (monster: Monster) => {
    currentMonster.value = monster
    monsterHp.value = monster.hp
    playerHp.value = playerMaxHp.value
    isFighting.value = true
    combatResult.value = null
    drops.value = []
    combatLog.value = [isTowerCombat.value ? `踏入登仙塔第${towerCurrentFloor.value}层，遭遇 ${monster.emoji}${monster.name}！` : `进入${activeZone.value?.emoji || ''}${activeZone.value?.name || '战场'}，遭遇 ${monster.emoji}${monster.name}！`]
    void doAutoFight()
  }

  const doAutoFight = async () => {
    while (isFighting.value && monsterHp.value > 0 && playerHp.value > 0) {
      const crit = Math.random() < 0.08
      const pDmg = Math.max(1, Math.floor((playerAtk.value - (currentMonster.value?.def || 0)) * (crit ? 1.8 : 1)))
      monsterHp.value -= pDmg
      showFlash.value = true
      damageNumbers.value.push({ id: ++dmgId, value: pDmg, type: 'player', x: 60 + Math.random() * 20, y: 30 })
      combatLog.value.push(`你${crit ? '暴击' : '攻击'}造成 ${pDmg} 伤害`)
      setTimeout(() => { showFlash.value = false }, 200)
      setTimeout(() => { damageNumbers.value = damageNumbers.value.slice(-12) }, 1000)
      if (monsterHp.value <= 0) { monsterHp.value = 0; onWin(); return }
      await new Promise(r => setTimeout(r, 420))

      const mDmg = Math.max(1, (currentMonster.value?.atk || 0) - playerDef.value)
      playerHp.value -= mDmg
      damageNumbers.value.push({ id: ++dmgId, value: mDmg, type: 'monster', x: 40 + Math.random() * 20, y: 60 })
      combatLog.value.push(`${currentMonster.value?.emoji}${currentMonster.value?.name} 攻击造成 ${mDmg} 伤害`)
      if (playerHp.value <= 0) { playerHp.value = 0; onLose(); return }
      await new Promise(r => setTimeout(r, 420))
    }
  }

  const onWin = () => {
    isFighting.value = false
    combatResult.value = 'win'
    const c = useCultivationStore()
    const m = currentMonster.value!
    const zone = activeZone.value
    const rebirthBoost = 1 + (c.rebirthCount || 0) * 0.03
    const gameStore = useGameStore()
    const fateBoost = isTowerCombat.value && gameStore.dailyFateType === 'tower' ? 1.18 : (!isTowerCombat.value && gameStore.dailyFateType === 'combat' ? 1.12 : 1)
    const exp = Math.floor(m.exp * rebirthBoost * fateBoost)
    const aura = Math.floor(m.aura * rebirthBoost * fateBoost)
    c.cultivation = (c.cultivation || 0) + exp
    c.aura = (c.aura || 0) + aura
    useAchievementStore().recordMonsterKill()
    const p = usePlayerStore()
    const attributeUps = p.addAttributeExpBatch({
      strength: Math.max(4, Math.floor(m.exp / 10)),
      agility: Math.max(2, Math.floor(m.aura / 12)),
      perception: zone?.kind === 'trial' || isTowerCombat.value ? 2 : 0
    })
    addLog(`击败 ${m.emoji}${m.name}！获得 ${exp} 修为，${aura} 灵气${attributeUps.length ? `，${attributeUps.join('，')}` : ''}`)
    if (isTowerCombat.value) {
      const oldHighest = towerHighestFloor.value
      towerHighestFloor.value = Math.max(towerHighestFloor.value, towerCurrentFloor.value)
      if (towerHighestFloor.value > oldHighest) {
        addLog(`登仙塔最高层刷新：第${towerHighestFloor.value}层！`)
        if (Math.floor(towerHighestFloor.value / 5) > Math.floor(oldHighest / 5)) addLog('新的登塔阶段宝箱已可领取！')
      }
    }
    if (zone?.kind === 'beast') {
      c.lingYun = (c.lingYun || 0) + 1
      addLog('镇压凶兽，灵蕴+1')
    }
    for (const d of m.drops) {
      if (Math.random() < d.chance) {
        drops.value.push({ itemId: d.itemId, name: d.name, qty: d.qty })
        addLog(`掉落 ${d.name}×${d.qty}`)
      }
    }
    // V1.3.7: 秘境稀有事件
    if (zone?.kind === 'realm' || zone?.kind === 'beast') {
      const eventName = c.triggerRealmEvent()
      if (eventName) addLog(`✨ 秘境奇遇：${eventName}`)
      maybeTriggerRealmChoice()
    }
  }


  const maybeTriggerRealmChoice = () => {
    const zone = activeZone.value
    if (!zone || isTowerCombat.value || (zone.kind !== 'realm' && zone.kind !== 'beast')) return
    if (pendingRealmChoice.value || Math.random() > (zone.kind === 'beast' ? 0.42 : 0.34)) return
    const c = useCultivationStore()
    const inv = useInventoryStore()
    const player = usePlayerStore()
    const realmScale = Math.max(1, Math.floor((c.realmIndex || 0) / 4) + 1)
    const beastScale = zone.kind === 'beast' ? 2 : 1
    const events: RealmChoiceEvent[] = [
      {
        id: 'ancient_residence',
        title: '古修遗府',
        desc: '石门半掩，墙上刻着残缺功法。你只能趁灵雾散尽前选择一处搜寻。',
        options: [
          { id: 'study', label: '参悟石刻', desc: `获得顿悟与修为，适合准备突破。`, effect: () => { const insight = 8 + realmScale * 3; const exp = 35 * realmScale * beastScale; c.insight = Math.min(100, (c.insight || 0) + insight); c.cultivation = (c.cultivation || 0) + exp; return `参悟古修石刻，顿悟+${insight}，修为+${exp}` } },
          { id: 'search', label: '搜寻遗宝', desc: `获得灵石和法宝碎片，适合补材料。`, effect: () => { const stones = 8 * realmScale * beastScale; const shards = zone.kind === 'beast' ? 2 : 1; inv.addItem('spirit_stone', stones); inv.addItem('artifact_shard', shards); return `搜出遗府残宝，灵石×${stones}、法宝碎片×${shards}` } }
        ]
      },
      {
        id: 'spirit_spring',
        title: '灵脉泉眼',
        desc: '泉眼喷薄灵机，一半可纳入经脉，一半可灌入灵田。',
        options: [
          { id: 'absorb', label: '纳入经脉', desc: '直接获得灵气与灵力恢复。', effect: () => { const aura = 45 * realmScale * beastScale; c.aura = (c.aura || 0) + aura; c.mana = Math.min(c.maxMana || c.mana || 0, (c.mana || 0) + 25 + realmScale * 5); return `吸纳泉眼灵机，灵气+${aura}，灵力已恢复` } },
          { id: 'field', label: '灌注灵田', desc: '获得灵植种子，强化种田-修仙循环。', effect: () => { inv.addItem('seed_spirit_rice', 2 + realmScale); inv.addItem('seed_dew_grass', 1 + Math.floor(realmScale / 2)); if ((c.realmIndex || 0) >= 12) inv.addItem('seed_ice_soul_lotus', 1); return `引泉灌田，获得蕴灵稻种子×${2 + realmScale}、凝露草种子×${1 + Math.floor(realmScale / 2)}${(c.realmIndex || 0) >= 12 ? '、冰魄雪莲种子×1' : ''}` } }
        ]
      },
      {
        id: 'beast_lair',
        title: '妖兽巢穴',
        desc: '战斗余波震开巢穴暗门，里面仍有妖气盘踞。',
        options: [
          { id: 'pursue', label: '乘胜追击', desc: '消耗少量体力，换取更多战利品。', effect: () => { const cost = Math.min(player.stamina || 0, 4 + beastScale * 2); if (cost > 0) player.consumeStamina(cost); const stones = 10 * realmScale * beastScale; inv.addItem('spirit_stone', stones); inv.addItem(zone.kind === 'beast' ? 'true_spirit_record' : 'soul_crystal', 1); return `深入巢穴追击，体力-${cost}，灵石×${stones}、${zone.kind === 'beast' ? '真灵秘录' : '魂晶'}×1` } },
          { id: 'steady', label: '稳妥撤退', desc: '压制心魔并恢复状态。', effect: () => { const clear = Math.min(c.heartDemon || 0, 6 + realmScale * 2); c.heartDemon = Math.max(0, (c.heartDemon || 0) - clear); c.mana = Math.min(c.maxMana || c.mana || 0, (c.mana || 0) + 15 + realmScale * 4); return `稳住道心撤出，心魔-${clear}，灵力恢复` } }
        ]
      }
    ]
    const picked = events[Math.floor(Math.random() * events.length)]
    if (!picked) return
    pendingRealmChoice.value = picked
    addLog(`✨ 秘境抉择：${picked.title}`)
  }

  const chooseRealmOption = (optionId: string) => {
    const event = pendingRealmChoice.value
    if (!event) return { success: false, message: '当前没有可处理的秘境抉择。' }
    const option = event.options.find(o => o.id === optionId)
    if (!option) return { success: false, message: '无效的秘境选择。' }
    const message = option.effect()
    addLog(`秘境抉择·${event.title}：${message}`)
    pendingRealmChoice.value = null
    return { success: true, message }
  }

  const onLose = () => {
    isFighting.value = false
    combatResult.value = 'lose'
    addLog(`被 ${currentMonster.value?.emoji}${currentMonster.value?.name} 击败...`)
  }

  const leaveCombat = () => {
    isFighting.value = false
    currentZone.value = null
    currentMonster.value = null
    pendingRealmChoice.value = null
    towerCurrentFloor.value = 0
    combatLog.value = []
    combatResult.value = null
    drops.value = []
  }

  const claimTowerMilestone = (floor: number): { success: boolean; message: string } => {
    const target = Math.floor(Number(floor) || 0)
    if (target <= 0 || target % 5 !== 0) return { success: false, message: '无效的登塔宝箱。' }
    if (towerHighestFloor.value < target) return { success: false, message: `尚未到达第${target}层。` }
    if (towerMilestoneClaimed.value.includes(target)) return { success: false, message: '这个宝箱已经领取过了。' }
    const inv = useInventoryStore()
    const boss = target % 10 === 0
    const spiritStones = boss ? 18 + target * 2 : 8 + target
    const soulCrystals = boss ? Math.max(2, Math.floor(target / 10)) : Math.max(1, Math.floor(target / 15))
    inv.addItem('spirit_stone', spiritStones)
    inv.addItem('soul_crystal', soulCrystals)
    if (boss) {
      inv.addItem('artifact_shard', 1 + Math.floor(target / 30))
      if (target >= 20) inv.addItem('lingyun_jade', 1)
    } else if (target >= 15) {
      inv.addItem('artifact_shard', 1)
    }
    towerMilestoneClaimed.value.push(target)
    const msg = boss ? `领取第${target}层镇塔宝箱：灵石×${spiritStones}、魂晶×${soulCrystals}、法宝碎片等奖励。` : `领取第${target}层精英宝箱：灵石×${spiritStones}、魂晶×${soulCrystals}。`
    addLog(msg)
    return { success: true, message: msg }
  }

  const collectDrops = () => {
    const inv = useInventoryStore()
    let okCount = 0
    for (const d of drops.value) {
      if (inv.addItem(d.itemId, d.qty)) okCount++
    }
    drops.value = []
    addLog(okCount ? '拾取了所有掉落物' : '背包已满或物品未登记，部分掉落未能拾取')
  }

  const serialize = () => ({ dailyRuns: dailyRuns.value, towerHighestFloor: towerHighestFloor.value, towerMilestoneClaimed: towerMilestoneClaimed.value })
  const deserialize = (data: unknown) => {
    if (!data || typeof data !== 'object') return
    dailyRuns.value = (data as any).dailyRuns || {}
    towerHighestFloor.value = Number((data as any).towerHighestFloor || 0)
    towerMilestoneClaimed.value = Array.isArray((data as any).towerMilestoneClaimed) ? (data as any).towerMilestoneClaimed.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : []
  }

  return {
    currentZone, activeZone, currentMonster, monsterHp, playerHp, playerMaxHp, playerAtk, playerDef,
    combatLog, isFighting, combatResult, drops, pendingRealmChoice, showFlash, damageNumbers, dailyRuns,
    isTowerCombat, towerHighestFloor, towerCurrentFloor, towerNextFloor, towerCost, towerStaminaCost, towerMilestoneRewards, nextTowerMilestone, towerClaimableMilestones, combatTitle, combatRewardHint, towerLockReason,
    trialZones, beastZones, realmZones, getDailyCount, isZoneUnlocked, lockReason,
    enterZone, challengeTower, startFight, leaveCombat, collectDrops, chooseRealmOption, claimTowerMilestone, serialize, deserialize,
    REALM_ZONES
  }
})
