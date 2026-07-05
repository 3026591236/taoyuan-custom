<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h1 class="text-accent text-xl">限时活动</h1>
        <p class="text-xs text-muted mt-1">活动入口已独立开放，完成目标后可直接领取奖励。</p>
      </div>
      <span class="text-xs px-2 py-1 border border-accent/30 rounded-xs text-accent">进行中</span>
    </div>

    <section class="event-hero game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-lg text-accent font-bold">妖潮来袭</p>
          <p class="text-sm text-muted leading-relaxed mt-1">山外妖潮躁动，前往秘境/红尘历练累计击败怪物。击杀数达到目标后，可在这里或任务页「修行志」领取讨伐奖励。</p>
        </div>
        <div class="text-4xl">🐺</div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div class="event-stat"><span>活动状态</span><b>火热进行</b></div>
        <div class="event-stat"><span>今日目标</span><b>累计讨伐</b></div>
        <div class="event-stat"><span>当前进度</span><b>{{ progress }}/{{ target }}</b></div>
        <div class="event-stat"><span>奖励状态</span><b>{{ eventTask?.claimed ? '已领取' : eventTask?.done ? '可领取' : '未完成' }}</b></div>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between text-xs text-muted">
          <span>妖潮讨伐进度</span>
          <span>{{ percent }}%</span>
        </div>
        <div class="h-3 bg-bg border border-accent/20 rounded-xs overflow-hidden">
          <div class="h-full bg-accent transition-all" :style="{ width: percent + '%' }" />
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/40">
        <p class="text-sm text-accent mb-2">活动奖励</p>
        <div class="flex flex-wrap gap-2 text-xs text-muted">
          <span class="reward-chip">铜钱 +1500</span>
          <span class="reward-chip">灵气 +520</span>
          <span class="reward-chip">力道经验 +40</span>
          <span class="reward-chip">身法经验 +40</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button class="btn justify-center" @click="goCombat">前往秘境讨伐</button>
        <button class="btn justify-center !bg-accent !text-bg disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!canClaim" @click="claimEventReward">
          {{ eventTask?.claimed ? '奖励已领取' : eventTask?.done ? '领取活动奖励' : '完成后可领取' }}
        </button>
      </div>
    </section>

    <section class="game-panel space-y-2">
      <h2 class="text-accent">活动说明</h2>
      <ul class="text-xs text-muted list-disc list-inside space-y-1 leading-relaxed">
        <li>入口：地图 → 修仙之途 → 限时活动，也可从底部地图按钮进入。</li>
        <li>击败秘境、红尘历练等战斗怪物会累计活动进度。</li>
        <li>本期活动奖励与任务页「修行志」中的「限时活动：妖潮来袭」共用领取状态，避免重复领取。</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuestStore } from '@/stores/useQuestStore'
import { addLog, showFloat } from '@/composables/useGameLog'

const router = useRouter()
const questStore = useQuestStore()
const eventTask = computed(() => questStore.journeyTasks.find(t => t.id === 'v11_event_hunt'))
const progress = computed(() => Math.min(eventTask.value?.progress || 0, eventTask.value?.target || 20))
const target = computed(() => eventTask.value?.target || 20)
const percent = computed(() => Math.min(100, Math.floor((progress.value / target.value) * 100)))
const canClaim = computed(() => !!eventTask.value?.done && !eventTask.value?.claimed)

function goCombat() { router.push('/game/combat') }
function claimEventReward() {
  if (!eventTask.value) return
  const res = questStore.claimJourneyTask(eventTask.value.id)
  addLog(res.message)
  showFloat(res.message, res.success ? 'success' : 'danger')
}
</script>

<style scoped>
.event-hero { border-color: rgba(239, 68, 68, 0.35); background: linear-gradient(135deg, rgba(127, 29, 29, 0.18), rgba(24, 24, 27, 0.72)); }
.event-stat { border: 1px solid rgba(200, 164, 92, 0.22); background: rgba(0,0,0,0.18); padding: 8px; border-radius: 2px; display: flex; flex-direction: column; gap: 3px; }
.event-stat span { color: var(--muted); }
.event-stat b { color: var(--accent); font-weight: 600; }
.reward-chip { border: 1px solid rgba(200, 164, 92, 0.25); padding: 4px 8px; border-radius: 2px; background: rgba(200, 164, 92, 0.08); }
</style>
