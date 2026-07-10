import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Gender } from '@/types'
import {
  LATE_NIGHT_RECOVERY_MAX,
  LATE_NIGHT_RECOVERY_MIN,
  PASSOUT_STAMINA_RECOVERY,
  PASSOUT_MONEY_PENALTY_RATE,
  PASSOUT_MONEY_PENALTY_CAP
} from '@/data/timeConstants'
import { useSkillStore } from './useSkillStore'
import { useHomeStore } from './useHomeStore'
import { useInventoryStore } from './useInventoryStore'
import { useAchievementStore } from './useAchievementStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { useMiningStore } from './useMiningStore'
import { useGuildStore } from './useGuildStore'

/** 最大体力阶梯 (5档, 270 起 508 顶) */
const STAMINA_CAPS = [120, 160, 200, 250, 300]

/** HP 常量 */
const BASE_MAX_HP = 100
const HP_PER_COMBAT_LEVEL = 5
const FIGHTER_HP_BONUS = 25
const WARRIOR_HP_BONUS = 40

export type AttributeKey = 'physique' | 'strength' | 'agility' | 'perception'

export interface AttributeState {
  level: number
  exp: number
}

export const ATTRIBUTE_NAMES: Record<AttributeKey, string> = {
  physique: '根骨',
  strength: '力道',
  agility: '身法',
  perception: '悟性'
}

const ATTRIBUTE_KEYS: AttributeKey[] = ['physique', 'strength', 'agility', 'perception']
const ATTRIBUTE_BASE_LEVEL = 1
const ATTRIBUTE_MAX_LEVEL = 60
const ATTRIBUTE_EXP_BASE = 36
const ATTRIBUTE_EXP_STEP = 12

const createAttributes = (): Record<AttributeKey, AttributeState> => ({
  physique: { level: ATTRIBUTE_BASE_LEVEL, exp: 0 },
  strength: { level: ATTRIBUTE_BASE_LEVEL, exp: 0 },
  agility: { level: ATTRIBUTE_BASE_LEVEL, exp: 0 },
  perception: { level: ATTRIBUTE_BASE_LEVEL, exp: 0 }
})

export const usePlayerStore = defineStore('player', () => {
  const playerName = ref('未命名')
  const gender = ref<Gender>('male')
  /** 旧存档加载后需要设置身份（不持久化） */
  const needsIdentitySetup = ref(false)
  const money = ref(500)
  const stamina = ref(120)
  const maxStamina = ref(120)
  const staminaCapLevel = ref(0) // 0=120, 1=160, 2=200, 3=250, 4=300
  /** 额外体力上限加成（仙翁金丹等），不受仙桃阶梯覆盖 */
  const bonusMaxStamina = ref(0)
  /** 游戏时间缓慢恢复体力：累计小时，满15分钟恢复1点 */
  const staminaRegenProgress = ref(0)

  // HP 系统
  const hp = ref(BASE_MAX_HP)
  const baseMaxHp = ref(BASE_MAX_HP)

  // 角色资质：让种田、修行和战斗都能稳定沉淀到可见属性上。
  const attributes = ref<Record<AttributeKey, AttributeState>>(createAttributes())

  const isExhausted = computed(() => stamina.value <= 5)
  const staminaPercent = computed(() => Math.round((stamina.value / maxStamina.value) * 100))
  /** NPC 用来称呼玩家的称谓 */
  const honorific = computed(() => (gender.value === 'male' ? '小哥' : '姑娘'))

  const getAttributeExpRequired = (key: AttributeKey): number => {
    const level = attributes.value[key]?.level ?? ATTRIBUTE_BASE_LEVEL
    return ATTRIBUTE_EXP_BASE + (level - ATTRIBUTE_BASE_LEVEL) * ATTRIBUTE_EXP_STEP
  }

  const addAttributeExp = (key: AttributeKey, amount: number): { leveledUp: boolean; newLevel: number } => {
    const attr = attributes.value[key]
    if (!attr || amount <= 0) return { leveledUp: false, newLevel: ATTRIBUTE_BASE_LEVEL }
    if (attr.level >= ATTRIBUTE_MAX_LEVEL) return { leveledUp: false, newLevel: attr.level }

    attr.exp += amount
    let leveledUp = false
    while (attr.level < ATTRIBUTE_MAX_LEVEL) {
      const required = getAttributeExpRequired(key)
      if (attr.exp < required) break
      attr.exp -= required
      attr.level++
      leveledUp = true
    }
    if (attr.level >= ATTRIBUTE_MAX_LEVEL) attr.exp = 0
    return { leveledUp, newLevel: attr.level }
  }

  const addAttributeExpBatch = (gains: Partial<Record<AttributeKey, number>>): string[] => {
    const messages: string[] = []
    for (const key of ATTRIBUTE_KEYS) {
      const amount = gains[key] ?? 0
      if (amount <= 0) continue
      const result = addAttributeExp(key, amount)
      if (result.leveledUp) messages.push(`${ATTRIBUTE_NAMES[key]}提升到${result.newLevel}`)
    }
    return messages
  }

  const attributePower = computed(() =>
    ATTRIBUTE_KEYS.reduce((sum, key) => sum + (attributes.value[key]?.level ?? ATTRIBUTE_BASE_LEVEL), 0)
  )

  const attributeAttackBonus = computed(() =>
    Math.floor((attributes.value.strength.level - 1) * 2.4 + (attributes.value.perception.level - 1) * 1.0)
  )

  const attributeDefenseBonus = computed(() =>
    Math.min(0.45, (attributes.value.physique.level - 1) * 0.008 + (attributes.value.agility.level - 1) * 0.006)
  )

  const attributeMaxHpBonus = computed(() => (attributes.value.physique.level - 1) * 10)

  const attributeSpeedBonus = computed(() => Math.floor((attributes.value.agility.level - 1) * 0.8))

  const attributeCombatPower = computed(() =>
    attributePower.value * 12 + attributeAttackBonus.value * 8 + attributeMaxHpBonus.value + attributeSpeedBonus.value * 5 + Math.floor(attributeDefenseBonus.value * 1000)
  )

  /** 计算当前最大 HP（基础 + 战斗等级 + 专精加成 + 仙缘加成 + 公会加成 + 角色资质） */
  const getMaxHp = (): number => {
    const skillStore = useSkillStore()
    let bonus = skillStore.combatLevel * HP_PER_COMBAT_LEVEL + attributeMaxHpBonus.value
    const perk5 = skillStore.getSkill('combat').perk5
    const perk10 = skillStore.getSkill('combat').perk10
    if (perk5 === 'fighter') bonus += FIGHTER_HP_BONUS
    if (perk10 === 'warrior') bonus += WARRIOR_HP_BONUS
    const ringHpBonus = useInventoryStore().getRingEffectValue('max_hp_bonus')
    // 仙缘结缘：灵护（spirit_shield）HP 加成
    const spiritShield = useHiddenNpcStore().getBondBonusByType('spirit_shield')
    const spiritHpBonus = spiritShield?.type === 'spirit_shield' ? spiritShield.hpBonus : 0
    // 公会加成：生命护符永久 + 等级被动
    const guildHpBonus = useMiningStore().guildBonusMaxHp
    const guildLevelHpBonus = useGuildStore().getGuildHpBonus()
    return baseMaxHp.value + bonus + ringHpBonus + spiritHpBonus + guildHpBonus + guildLevelHpBonus
  }

  const getHpPercent = (): number => {
    return Math.round((hp.value / getMaxHp()) * 100)
  }

  const getIsLowHp = (): boolean => {
    return hp.value <= getMaxHp() * 0.25
  }

  /** 消耗体力（含仙缘灵护减免），返回是否成功 */
  const consumeStamina = (amount: number): boolean => {
    // 仙缘结缘：灵护（spirit_shield）体力消耗减免
    const spiritShield2 = useHiddenNpcStore().getBondBonusByType('spirit_shield')
    const spiritSave = spiritShield2?.type === 'spirit_shield' ? spiritShield2.staminaSave / 100 : 0
    const effectiveAmount = Math.max(1, Math.floor(amount * (1 - spiritSave)))
    if (stamina.value < effectiveAmount) return false
    stamina.value -= effectiveAmount
    // 很多体力行动本身不推进时钟；按行动量折算少量游戏时间恢复，避免体力只降不回。
    // 约每消耗 4 点体力视为经过 15 分钟，恢复 1 点，上限仍受 maxStamina 限制。
    recoverStaminaByGameTime(effectiveAmount / 16)
    return true
  }

  /** 恢复体力 */
  const restoreStamina = (amount: number) => {
    stamina.value = Math.min(stamina.value + amount, maxStamina.value)
  }

  /** 恢复体力并允许临时溢出（体力丹等），默认最多超过上限500点 */
  const restoreStaminaOvercap = (amount: number, overcap = 500): number => {
    const before = stamina.value
    const cap = maxStamina.value + Math.max(0, overcap)
    stamina.value = Math.min(stamina.value + Math.max(0, amount), cap)
    return stamina.value - before
  }

  /** 按游戏时间缓慢恢复体力：每15分钟恢复1点，满体力时清空累计 */
  const recoverStaminaByGameTime = (hours: number): number => {
    if (hours <= 0) return 0
    if (stamina.value >= maxStamina.value) {
      staminaRegenProgress.value = 0
      return 0
    }
    staminaRegenProgress.value += hours
    const recovered = Math.min(Math.floor(staminaRegenProgress.value / 0.25), maxStamina.value - stamina.value)
    if (recovered <= 0) return 0
    stamina.value += recovered
    staminaRegenProgress.value -= recovered * 0.25
    if (stamina.value >= maxStamina.value) staminaRegenProgress.value = 0
    return recovered
  }

  /** 受到伤害（扣 HP），返回实际伤害值 */
  const takeDamage = (amount: number): number => {
    const actual = Math.min(amount, hp.value)
    hp.value -= actual
    return actual
  }

  /** 恢复生命值 */
  const restoreHealth = (amount: number) => {
    hp.value = Math.min(hp.value + amount, getMaxHp())
  }

  /**
   * 每日重置
   * - 正常：满体力 + 满HP
   * - 晚睡：渐进恢复 (24时90%→25时60%) + 满HP
   * - 昏倒：50% 体力 + 满HP + 扣10%铜钱
   */
  const dailyReset = (mode: 'normal' | 'late' | 'passout', bedHour?: number): { moneyLost: number; recoveryPct: number } => {
    let moneyLost = 0
    let recoveryPct = 1
    switch (mode) {
      case 'normal':
        stamina.value = maxStamina.value
        break
      case 'late': {
        // 渐进式恢复：24时→90%, 25时→60%, 线性插值
        const homeStore = useHomeStore()
        const staminaBonus = homeStore.getStaminaRecoveryBonus()
        const t = Math.min(Math.max((bedHour ?? 24) - 24, 0), 1)
        recoveryPct = LATE_NIGHT_RECOVERY_MAX - t * (LATE_NIGHT_RECOVERY_MAX - LATE_NIGHT_RECOVERY_MIN) + staminaBonus
        stamina.value = Math.floor(maxStamina.value * Math.min(recoveryPct, 1))
        break
      }
      case 'passout': {
        const homeStore2 = useHomeStore()
        const staminaBonus2 = homeStore2.getStaminaRecoveryBonus()
        recoveryPct = PASSOUT_STAMINA_RECOVERY + staminaBonus2
        stamina.value = Math.floor(maxStamina.value * Math.min(recoveryPct, 1))
        moneyLost = Math.min(Math.floor(money.value * PASSOUT_MONEY_PENALTY_RATE), PASSOUT_MONEY_PENALTY_CAP)
        money.value -= moneyLost
        break
      }
    }
    // HP 每天都回满
    hp.value = getMaxHp()
    return { moneyLost, recoveryPct }
  }

  /** 提升体力上限 */
  const upgradeMaxStamina = (): boolean => {
    if (staminaCapLevel.value >= STAMINA_CAPS.length - 1) return false
    staminaCapLevel.value++
    maxStamina.value = STAMINA_CAPS[staminaCapLevel.value]! + bonusMaxStamina.value
    return true
  }

  /** 增加额外体力上限加成（仙翁金丹等） */
  const addBonusMaxStamina = (amount: number) => {
    bonusMaxStamina.value += amount
    maxStamina.value = STAMINA_CAPS[staminaCapLevel.value]! + bonusMaxStamina.value
  }

  /** 花费铜钱，返回是否成功 */
  const spendMoney = (amount: number): boolean => {
    if (money.value < amount) return false
    money.value -= amount
    return true
  }

  /** 获得铜钱 */
  const earnMoney = (amount: number) => {
    money.value += amount
    useAchievementStore().recordMoneyEarned(amount)
  }

  /** 设置玩家身份（新游戏或旧存档迁移时调用） */
  const setIdentity = (name: string, g: Gender) => {
    playerName.value = name
    gender.value = g
    needsIdentitySetup.value = false
  }

  const serialize = () => {
    return {
      playerName: playerName.value,
      gender: gender.value,
      money: money.value,
      stamina: stamina.value,
      maxStamina: maxStamina.value,
      staminaCapLevel: staminaCapLevel.value,
      bonusMaxStamina: bonusMaxStamina.value,
      staminaRegenProgress: staminaRegenProgress.value,
      hp: hp.value,
      baseMaxHp: baseMaxHp.value,
      attributes: attributes.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    const hasIdentity = (data as any).playerName != null
    playerName.value = (data as any).playerName ?? '未命名'
    gender.value = (data as any).gender ?? 'male'
    needsIdentitySetup.value = !hasIdentity
    money.value = data.money
    stamina.value = data.stamina
    maxStamina.value = data.maxStamina
    staminaCapLevel.value = data.staminaCapLevel
    bonusMaxStamina.value = (data as any).bonusMaxStamina ?? 0
    staminaRegenProgress.value = Math.max(0, Math.min((data as any).staminaRegenProgress ?? 0, 0.24))
    // 旧存档兼容：如果没有 bonusMaxStamina 字段，从 maxStamina 和 staminaCapLevel 推算
    if ((data as any).bonusMaxStamina == null) {
      const expectedBase = STAMINA_CAPS[staminaCapLevel.value] ?? 120
      const diff = maxStamina.value - expectedBase
      if (diff > 0) bonusMaxStamina.value = diff
    }
    // 确保 maxStamina 与 staminaCapLevel + bonusMaxStamina 一致（修复旧存档）
    const expectedMax = (STAMINA_CAPS[staminaCapLevel.value] ?? 120) + bonusMaxStamina.value
    if (maxStamina.value !== expectedMax) {
      maxStamina.value = expectedMax
    }
    hp.value = (data as any).hp ?? BASE_MAX_HP
    baseMaxHp.value = (data as any).baseMaxHp ?? BASE_MAX_HP
    const savedAttributes = (data as any).attributes ?? {}
    const nextAttributes = createAttributes()
    for (const key of ATTRIBUTE_KEYS) {
      const saved = savedAttributes[key]
      nextAttributes[key] = {
        level: Math.min(Math.max(saved?.level ?? ATTRIBUTE_BASE_LEVEL, ATTRIBUTE_BASE_LEVEL), ATTRIBUTE_MAX_LEVEL),
        exp: Math.max(saved?.exp ?? 0, 0)
      }
    }
    attributes.value = nextAttributes
  }

  return {
    playerName,
    gender,
    needsIdentitySetup,
    honorific,
    money,
    stamina,
    maxStamina,
    staminaCapLevel,
    bonusMaxStamina,
    staminaRegenProgress,
    hp,
    baseMaxHp,
    attributes,
    attributePower,
    attributeCombatPower,
    attributeAttackBonus,
    attributeDefenseBonus,
    attributeMaxHpBonus,
    attributeSpeedBonus,
    isExhausted,
    staminaPercent,
    getAttributeExpRequired,
    addAttributeExp,
    addAttributeExpBatch,
    getMaxHp,
    getHpPercent,
    getIsLowHp,
    consumeStamina,
    restoreStamina,
    restoreStaminaOvercap,
    recoverStaminaByGameTime,
    takeDamage,
    restoreHealth,
    dailyReset,
    upgradeMaxStamina,
    addBonusMaxStamina,
    spendMoney,
    earnMoney,
    setIdentity,
    serialize,
    deserialize
  }
})
