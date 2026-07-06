<template>
  <div class="border-b border-accent/30 pb-2 md:pb-3 flex flex-col space-y-1">
    <!-- 第一行：日期时间天气 + 铜钱/灵石 -->
    <div class="flex items-center justify-between text-xs md:text-sm">
      <div class="flex items-center space-x-2 md:space-x-3">
        <span class="text-accent font-bold">我从种田开始修仙</span>
        <span class="text-muted text-xs max-w-16 truncate">{{ playerStore.playerName }}</span>
        <span class="hidden md:inline">第{{ gameStore.year }}年</span>
        <span>{{ SEASON_NAMES[gameStore.season] }} 第{{ gameStore.day }}天</span>
        <span class="text-muted hidden md:inline">({{ gameStore.weekdayName }})</span>
        <span :class="{ 'text-danger': gameStore.isLateNight }">{{ gameStore.timeDisplay }}</span>
        <span class="text-muted">{{ WEATHER_NAMES[gameStore.weather] }}</span>
      </div>
      <div class="text-accent shrink-0 flex items-center space-x-2">
        <span>
          <Coins :size="12" class="inline" />
          {{ playerStore.money }}文
        </span>
        <span title="灵石">
          <Sparkles :size="12" class="inline" />
          {{ spiritStoneCount }}灵石
        </span>
      </div>
    </div>

    <!-- 第二行：状态条 + 音频控制 -->
    <div class="flex items-center justify-between text-xs flex-wrap">
      <div class="flex items-center space-x-2 md:space-x-4 flex-wrap">
        <!-- 体力 -->
        <div class="flex items-center space-x-1">
          <span :class="{ 'text-danger stamina-critical': playerStore.isExhausted }">
            <Zap :size="12" class="inline" />
            {{ playerStore.stamina }}/{{ playerStore.maxStamina }}
          </span>
          <div class="w-14 md:w-20 h-2 bg-bg rounded-xs border border-accent/20">
            <div
              class="h-full rounded-xs transition-all duration-300"
              :class="staminaBarColor"
              :style="{ width: playerStore.staminaPercent + '%' }"
            />
          </div>
        </div>
        <!-- HP（矿洞或受伤时显示） -->
        <div v-if="showHpBar" class="flex items-center space-x-1">
          <span :class="{ 'text-danger stamina-critical': playerStore.getIsLowHp() }">
            <Heart :size="12" class="inline" />
            {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}
          </span>
          <div class="w-12 md:w-16 h-2 bg-bg rounded-xs border border-accent/20">
            <div
              class="h-full rounded-xs transition-all duration-300"
              :class="hpBarColor"
              :style="{ width: playerStore.getHpPercent() + '%' }"
            />
          </div>
        </div>
        <!-- 剩余时间 -->
        <div class="flex items-center space-x-1">
          <Clock :size="12" class="inline" />
          <div class="w-12 md:w-16 h-2 bg-bg rounded-xs border border-accent/20">
            <div class="h-full rounded-xs transition-all duration-300" :class="timeBarColor" :style="{ width: timePercent + '%' }" />
          </div>
          <div class="time-speed-control" title="时间速度：0.2/0.3/0.5/1/2/4/8倍">
            <button class="time-speed-btn" title="减慢时间" @click="slowDown">－</button>
            <span class="time-speed-label">{{ gameSpeedLabel }}</span>
            <button class="time-speed-btn" title="加快时间" @click="speedUp">＋</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useGameStore, SEASON_NAMES, WEATHER_NAMES } from '@/stores/useGameStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useGameClock } from '@/composables/useGameClock'
  import { DAY_START_HOUR, DAY_END_HOUR } from '@/data/timeConstants'
  import { Zap, Heart, Clock, Coins, Sparkles } from 'lucide-vue-next'

  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const spiritStoneCount = computed(() => inventoryStore.getItemCount('spirit_stone'))
  const { gameSpeedLabel, slowDown, speedUp } = useGameClock()

  const staminaBarColor = computed(() => {
    const pct = playerStore.staminaPercent
    if (pct <= 12) return 'bg-danger stamina-critical'
    if (pct <= 35) return 'bg-danger'
    if (pct <= 60) return 'bg-accent'
    return 'bg-success'
  })

  /** HP 条是否显示：在矿洞中或HP不满 */
  const showHpBar = computed(() => {
    return gameStore.currentLocationGroup === 'mine' || playerStore.hp < playerStore.getMaxHp()
  })

  const hpBarColor = computed(() => {
    const pct = playerStore.getHpPercent()
    if (pct <= 25) return 'bg-danger stamina-critical'
    if (pct <= 60) return 'bg-danger'
    return 'bg-success'
  })

  /** 剩余时间百分比 */
  const timePercent = computed(() => {
    const total = DAY_END_HOUR - DAY_START_HOUR // 20 hours
    const remaining = DAY_END_HOUR - gameStore.hour
    return Math.max(0, Math.round((remaining / total) * 100))
  })

  const timeBarColor = computed(() => {
    if (gameStore.isLateNight) return 'bg-danger'
    if (timePercent.value <= 25) return 'bg-danger'
    if (timePercent.value <= 50) return 'bg-accent'
    return 'bg-success'
  })
</script>

<style scoped>
  /* 体力条闪烁 */
  @keyframes staminaPulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.4;
    }
  }

  .stamina-critical {
    animation: staminaPulse 1s ease-in-out infinite;
  }

  .time-speed-control {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: 4px;
    color: var(--color-accent, #d4a017);
  }

  .time-speed-label {
    min-width: 26px;
    text-align: center;
    font-size: 11px;
    line-height: 1;
  }

  .time-speed-btn {
    width: 18px;
    height: 18px;
    border: 1px solid rgba(212, 160, 23, 0.35);
    border-radius: 2px;
    color: var(--color-accent, #d4a017);
    background: rgba(212, 160, 23, 0.08);
    line-height: 1;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .time-speed-btn:hover {
    background: rgba(212, 160, 23, 0.18);
  }

</style>
