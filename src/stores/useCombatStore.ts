// 桃源乡 V0.5 - 战斗Store
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { addLog } from '@/composables/useGameLog'
import { useCultivationStore } from './useCultivationStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'

export interface Monster {
  id: string; name: string; emoji: string; hp: number; atk: number; def: number
  drops: { itemId: string; name: string; qty: number; chance: number }[]
  exp: number; aura: number
}

export interface RealmZone {
  id: string; name: string; emoji: string; desc: string; minRealm: number; cost: number
  monsters: Monster[]
}

export const REALM_ZONES: RealmZone[] = [
  {
    id: 'spirit_forest', name: '灵兽森林', emoji: '🌲', desc: '灵气充沛的古老森林，低阶灵兽出没', minRealm: 0, cost: 15,
    monsters: [
      { id: 'spirit_wolf', name: '灵狼', emoji: '🐺', hp: 80, atk: 12, def: 3, exp: 20, aura: 5, drops: [{ itemId: 'iron_ore', name: '铁矿石', qty: 1, chance: 0.5 }, { itemId: 'spirit_stone', name: '灵石', qty: 2, chance: 0.8 }] },
      { id: 'venom_snake', name: '毒蛇', emoji: '🐍', hp: 60, atk: 18, def: 2, exp: 25, aura: 8, drops: [{ itemId: 'iron_ore', name: '铁矿石', qty: 1, chance: 0.4 }, { itemId: 'spirit_stone', name: '灵石', qty: 3, chance: 0.7 }] },
      { id: 'tree_spirit', name: '树精', emoji: '🌳', hp: 120, atk: 8, def: 8, exp: 30, aura: 10, drops: [{ itemId: 'wood_spirit', name: '木灵珠', qty: 1, chance: 0.3 }, { itemId: 'spirit_stone', name: '灵石', qty: 5, chance: 0.6 }] },
      { id: 'spirit_fox2', name: '赤狐', emoji: '🦊', hp: 100, atk: 15, def: 5, exp: 35, aura: 12, drops: [{ itemId: 'fox_fur', name: '狐皮', qty: 1, chance: 0.4 }, { itemId: 'spirit_stone', name: '灵石', qty: 4, chance: 0.7 }] },
      { id: 'forest_king', name: '林中王者·灵熊', emoji: '🐻', hp: 200, atk: 22, def: 10, exp: 60, aura: 20, drops: [{ itemId: 'bear_gall', name: '熊胆', qty: 1, chance: 0.5 }, { itemId: 'spirit_stone', name: '灵石', qty: 8, chance: 0.9 }] },
    ]
  },
  {
    id: 'dark_cave', name: '幽冥洞窟', emoji: '🕳️', desc: '阴气森森的地下洞窟，鬼魅横行', minRealm: 10, cost: 30,
    monsters: [
      { id: 'ghost', name: '游魂', emoji: '👻', hp: 150, atk: 25, def: 5, exp: 50, aura: 15, drops: [{ itemId: 'soul_crystal', name: '魂晶', qty: 1, chance: 0.4 }, { itemId: 'spirit_stone', name: '灵石', qty: 6, chance: 0.7 }] },
      { id: 'skeleton', name: '白骨将', emoji: '💀', hp: 200, atk: 30, def: 12, exp: 60, aura: 20, drops: [{ itemId: 'bone_fragment', name: '骨碎片', qty: 1, chance: 0.5 }, { itemId: 'iron_ore', name: '铁矿石', qty: 2, chance: 0.6 }] },
      { id: 'shadow_bat', name: '暗影蝠', emoji: '🦇', hp: 130, atk: 35, def: 4, exp: 55, aura: 18, drops: [{ itemId: 'bat_wing', name: '蝠翼', qty: 1, chance: 0.4 }, { itemId: 'spirit_stone', name: '灵石', qty: 8, chance: 0.6 }] },
      { id: 'nether_spider', name: '冥蛛', emoji: '🕷️', hp: 180, atk: 28, def: 8, exp: 65, aura: 22, drops: [{ itemId: 'spider_silk', name: '蛛丝', qty: 2, chance: 0.5 }, { itemId: 'spirit_stone', name: '灵石', qty: 10, chance: 0.7 }] },
      { id: 'cave_lord', name: '洞窟之主·冥将', emoji: '👹', hp: 400, atk: 40, def: 18, exp: 120, aura: 40, drops: [{ itemId: 'nether_core', name: '冥核', qty: 1, chance: 0.3 }, { itemId: 'spirit_stone', name: '灵石', qty: 15, chance: 0.9 }, { itemId: 'forge_blueprint', name: '炼器图纸', qty: 1, chance: 0.2 }] },
    ]
  },
  {
    id: 'thunder_realm', name: '天劫雷域', emoji: '⚡', desc: '雷劫汇聚之地，只有金丹以上修士方可踏足', minRealm: 14, cost: 50,
    monsters: [
      { id: 'thunder_wolf', name: '雷狼', emoji: '⚡', hp: 350, atk: 50, def: 15, exp: 100, aura: 30, drops: [{ itemId: 'thunder_essence', name: '雷精', qty: 1, chance: 0.4 }, { itemId: 'spirit_stone', name: '灵石', qty: 12, chance: 0.7 }] },
      { id: 'storm_eagle', name: '风暴鹰', emoji: '🦅', hp: 300, atk: 60, def: 10, exp: 110, aura: 35, drops: [{ itemId: 'storm_feather', name: '风羽', qty: 1, chance: 0.3 }, { itemId: 'spirit_stone', name: '灵石', qty: 15, chance: 0.6 }] },
      { id: 'lightning_snake', name: '电蟒', emoji: '🐍', hp: 450, atk: 45, def: 20, exp: 120, aura: 38, drops: [{ itemId: 'lightning_scale', name: '电鳞', qty: 1, chance: 0.35 }, { itemId: 'spirit_stone', name: '灵石', qty: 18, chance: 0.7 }] },
      { id: 'thunder_god', name: '雷神将', emoji: '🌩️', hp: 800, atk: 70, def: 25, exp: 200, aura: 60, drops: [{ itemId: 'thunder_heart', name: '雷心', qty: 1, chance: 0.25 }, { itemId: 'spirit_stone', name: '灵石', qty: 25, chance: 0.9 }, { itemId: 'forge_blueprint', name: '炼器图纸', qty: 1, chance: 0.3 }] },
    ]
  }
]

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
  let dmgId = 0

  const playerAtk = computed(() => {
    const c = useCultivationStore()
    const base = 10 + (c.realmIndex || 0) * 8 + Math.floor((c.cultivation || 0) / 50)
    const beastBonus = c.beast === 'crane' ? Math.floor(base * 0.2) : 0
    return base + beastBonus
  })

  const playerDef = computed(() => {
    const c = useCultivationStore()
    return 5 + (c.realmIndex || 0) * 4 + Math.floor((c.aura || 0) / 20)
  })

  const playerMaxHp = computed(() => {
    const c = useCultivationStore()
    return 100 + (c.realmIndex || 0) * 30 + (c.cultivation || 0)
  })

  const enterZone = (zoneId: string) => {
    const c = useCultivationStore()
    const p = usePlayerStore()
    const zone = REALM_ZONES.find(z => z.id === zoneId)
    if (!zone) return
    if ((c.realmIndex || 0) < zone.minRealm) { addLog(`境界不足，需要${zone.name === '灵兽森林' ? '炼气' : zone.name === '幽冥洞窟' ? '筑基' : '金丹'}以上`); return }
    if ((c.mana || 0) < zone.cost) { addLog('灵力不足'); return }
    if (!p.consumeStamina(5)) { addLog('体力不足'); return }
    c.mana = (c.mana || 0) - zone.cost
    currentZone.value = zoneId
    combatLog.value = []
    combatResult.value = null
    drops.value = []
    // Random monster
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
    combatLog.value = [`遭遇 ${monster.emoji}${monster.name}！`]
    // Auto fight with delays
    doAutoFight()
  }

  const doAutoFight = async () => {
    while (isFighting.value && monsterHp.value > 0 && playerHp.value > 0) {
      // Player attacks
      const pDmg = Math.max(1, playerAtk.value - (currentMonster.value?.def || 0))
      monsterHp.value -= pDmg
      showFlash.value = true
      damageNumbers.value.push({ id: ++dmgId, value: pDmg, type: 'player', x: 60 + Math.random() * 20, y: 30 })
      combatLog.value.push(`你攻击造成 ${pDmg} 伤害`)
      setTimeout(() => { showFlash.value = false }, 200)
      setTimeout(() => { damageNumbers.value = damageNumbers.value.filter(d => d.id !== dmgId - 10) }, 1000)

      if (monsterHp.value <= 0) { monsterHp.value = 0; onWin(); return }

      await new Promise(r => setTimeout(r, 500))

      // Monster attacks
      const mDmg = Math.max(1, (currentMonster.value?.atk || 0) - playerDef.value)
      playerHp.value -= mDmg
      damageNumbers.value.push({ id: ++dmgId, value: mDmg, type: 'monster', x: 40 + Math.random() * 20, y: 60 })
      combatLog.value.push(`${currentMonster.value?.emoji}${currentMonster.value?.name} 攻击造成 ${mDmg} 伤害`)

      if (playerHp.value <= 0) { playerHp.value = 0; onLose(); return }

      await new Promise(r => setTimeout(r, 500))
    }
  }

  const onWin = () => {
    isFighting.value = false
    combatResult.value = 'win'
    const c = useCultivationStore()
    const m = currentMonster.value!
    c.cultivation = (c.cultivation || 0) + m.exp
    c.aura = (c.aura || 0) + m.aura
    addLog(`击败 ${m.emoji}${m.name}！获得 ${m.exp} 修为，${m.aura} 灵气`)
    // Process drops
    for (const d of m.drops) {
      if (Math.random() < d.chance) {
        drops.value.push({ itemId: d.itemId, name: d.name, qty: d.qty })
        addLog(`掉落 ${d.name}×${d.qty}`)
      }
    }
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
    combatLog.value = []
    combatResult.value = null
    drops.value = []
  }

  const collectDrops = () => {
    const inv = useInventoryStore()
    for (const d of drops.value) {
      inv.addItem(d.itemId, d.qty)
    }
    drops.value = []
    addLog('拾取了所有掉落物')
  }

  return {
    currentZone, currentMonster, monsterHp, playerHp, playerMaxHp, playerAtk, playerDef,
    combatLog, isFighting, combatResult, drops, showFlash, damageNumbers,
    enterZone, startFight, leaveCombat, collectDrops,
    REALM_ZONES
  }
})
