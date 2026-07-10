import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/useGameStore'
import { PASSOUT_HOUR, MIDNIGHT_HOUR } from '@/data/timeConstants'
import { addLog } from './useGameLog'
import { handleEndDay } from './useEndDay'

// === 常量 ===
/** 星露谷速率：0.7 真实秒 = 1 游戏分钟 */
const REAL_MS_PER_GAME_MINUTE = 700
/** tick 间隔（ms），越小显示越平滑 */
const TICK_MS = 200

// === 模块级单例状态 ===
export const GAME_SPEED_OPTIONS = [0.2, 0.3, 0.5, 1, 2, 4, 8] as const
const SPEED_STORAGE_KEY = 'taoyuan_game_speed'
const TIME_FREEZE_UNTIL_KEY = 'taoyuan_time_freeze_until'
const readSavedSpeed = (): number => {
  const raw = Number(localStorage.getItem(SPEED_STORAGE_KEY) || 1)
  return GAME_SPEED_OPTIONS.includes(raw as any) ? raw : 1
}
const gameSpeed = ref(readSavedSpeed())
const isPaused = ref(true)
const timeFreezeUntil = ref(Number(localStorage.getItem(TIME_FREEZE_UNTIL_KEY) || 0) || 0)
let timerId: ReturnType<typeof setInterval> | null = null
/** 页面隐藏前时钟是否在运行（用于恢复） */
let wasRunningBeforeHidden = false

/** 每个 tick 推进的游戏小时数 */
const getHoursPerTick = (): number => {
  const minutesPerTick = (TICK_MS / REAL_MS_PER_GAME_MINUTE) * gameSpeed.value
  return minutesPerTick / 60
}

/** 时钟 tick */
const tick = () => {
  if (isPaused.value) return
  if (timeFreezeUntil.value > Date.now()) return

  const gameStore = useGameStore()
  const prevHour = gameStore.hour
  const hoursPerTick = getHoursPerTick()
  const newHour = prevHour + hoursPerTick

  // 到达昏倒时间 → 自动结算
  if (newHour >= PASSOUT_HOUR) {
    gameStore.hour = PASSOUT_HOUR
    isPaused.value = true
    addLog('已经凌晨2点了，你撑不住倒下了……')
    handleEndDay()
    // 新一天开始后恢复时钟（如果 handleEndDay 触发了弹窗，GameLayout 的 watcher 会自动暂停）
    isPaused.value = false
    return
  }

  gameStore.hour = newHour

  // 跨午夜提示（仅一次，与 advanceTime 共享标志）
  if (!gameStore.midnightWarned && prevHour < MIDNIGHT_HOUR && newHour >= MIDNIGHT_HOUR) {
    gameStore.midnightWarned = true
    addLog('已经过了午夜，你开始感到困倦……')
  }
}

export const useGameClock = () => {
  /** 启动实时时钟 */
  const startClock = () => {
    if (timerId) return
    isPaused.value = false
    timerId = setInterval(tick, TICK_MS)
  }

  /** 停止实时时钟（销毁 interval） */
  const stopClock = () => {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
    isPaused.value = true
  }

  /** 暂停时钟（interval 保留但 tick 跳过） */
  const pauseClock = () => {
    isPaused.value = true
  }

  /** 恢复时钟 */
  const resumeClock = () => {
    isPaused.value = false
  }

  const gameSpeedLabel = computed(() => `${gameSpeed.value}x`)
  const isTimeFrozen = computed(() => timeFreezeUntil.value > Date.now())
  const timeFreezeRemainingMs = computed(() => Math.max(0, timeFreezeUntil.value - Date.now()))

  const freezeGameTime = (realHours = 3) => {
    const until = Math.max(timeFreezeUntil.value, Date.now()) + Math.max(0, realHours) * 3600000
    timeFreezeUntil.value = until
    localStorage.setItem(TIME_FREEZE_UNTIL_KEY, String(until))
    return until
  }

  /** 设置速度倍率 */
  const setSpeed = (speed: number) => {
    const next = GAME_SPEED_OPTIONS.includes(speed as any) ? speed : 1
    gameSpeed.value = next
    localStorage.setItem(SPEED_STORAGE_KEY, String(next))
  }

  const adjustSpeed = (direction: 'slower' | 'faster') => {
    const index = Math.max(0, GAME_SPEED_OPTIONS.findIndex(s => s === gameSpeed.value))
    const nextIndex = direction === 'slower'
      ? Math.max(0, index - 1)
      : Math.min(GAME_SPEED_OPTIONS.length - 1, index + 1)
    setSpeed(GAME_SPEED_OPTIONS[nextIndex] ?? 1)
  }

  const slowDown = () => adjustSpeed('slower')
  const speedUp = () => adjustSpeed('faster')

  /** 循环切换速度 0.2→0.3→0.5→1→2→4→8→0.2 */
  const cycleSpeed = () => {
    const index = GAME_SPEED_OPTIONS.findIndex(s => s === gameSpeed.value)
    const next = GAME_SPEED_OPTIONS[(index + 1) % GAME_SPEED_OPTIONS.length] ?? 1
    setSpeed(next)
  }

  /** 切换暂停/恢复 */
  const togglePause = () => {
    isPaused.value = !isPaused.value
  }

  return {
    gameSpeed,
    gameSpeedLabel,
    gameSpeedOptions: GAME_SPEED_OPTIONS,
    isPaused,
    isTimeFrozen,
    timeFreezeUntil,
    timeFreezeRemainingMs,
    freezeGameTime,
    startClock,
    stopClock,
    pauseClock,
    resumeClock,
    setSpeed,
    slowDown,
    speedUp,
    cycleSpeed,
    togglePause
  }
}

// === 页面可见性处理（切标签页时暂停时钟，防止后台累积时间跳跃） ===
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    wasRunningBeforeHidden = !isPaused.value
    if (!isPaused.value) isPaused.value = true
  } else {
    if (wasRunningBeforeHidden) isPaused.value = false
    wasRunningBeforeHidden = false
  }
})
