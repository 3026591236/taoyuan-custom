<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h1 class="text-accent text-xl">活动中心</h1>
        <p class="text-xs text-muted mt-1">每日活跃、七日豪礼与妖潮讨伐已整合，先把每天上线后的目标串起来。</p>
      </div>
      <span class="text-xs px-2 py-1 border border-accent/30 rounded-xs text-accent">V1.5.2 留存三件套</span>
    </div>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">今日活跃度</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">完成修行志里的每日目标即可累积活跃度。宝箱每天刷新，形成「上线有事做、做完有奖励」的固定节奏。</p>
        </div>
        <div class="text-right">
          <p class="text-2xl text-accent font-bold">{{ retention.activityScore }}</p>
          <p class="text-[10px] text-muted">/100 活跃</p>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between text-xs text-muted">
          <span>今日完成 {{ retention.dailyDoneCount }}/{{ retention.dailyTasks.length }} 项，已领取 {{ retention.dailyClaimedCount }} 项</span>
          <span>{{ retention.activityScore }}%</span>
        </div>
        <div class="h-3 bg-bg border border-accent/20 rounded-xs overflow-hidden">
          <div class="h-full bg-accent transition-all" :style="{ width: retention.activityScore + '%' }" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div v-for="box in retention.activityBoxes" :key="box.score" class="reward-card" :class="box.claimed ? 'claimed' : box.done ? 'ready' : ''">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm text-accent">{{ box.score }}活跃</p>
              <p class="text-xs font-bold mt-1">{{ box.title }}</p>
              <p class="text-[10px] text-muted mt-1 leading-relaxed">{{ box.desc }}</p>
            </div>
            <span>{{ box.claimed ? '✅' : box.done ? '🎁' : '🔒' }}</span>
          </div>
          <p class="text-[10px] text-muted mt-2">{{ rewardText(box.reward) }}</p>
          <button class="mini-btn mt-2" :disabled="!box.done || box.claimed" @click="claimActivity(box.score)">
            {{ box.claimed ? '已领取' : box.done ? '领取' : '未达成' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button class="btn justify-center" @click="goQuest">查看每日目标</button>
        <button class="btn justify-center" @click="goCombat">去秘境/登塔提升活跃</button>
      </div>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">七日豪礼</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">新角色前七个游戏日逐步解锁，给新手一个明确的第7日目标。</p>
        </div>
        <div class="text-right">
          <p class="text-2xl">📅</p>
          <p class="text-[10px] text-muted">当前第 {{ retention.installDayIndex }} 日</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-7 gap-2">
        <div v-for="gift in retention.sevenDayGifts" :key="gift.day" class="reward-card" :class="gift.claimed ? 'claimed' : gift.unlocked ? 'ready' : ''">
          <p class="text-sm text-accent">第{{ gift.day }}日</p>
          <p class="text-xs font-bold mt-1">{{ gift.title.replace(/^第\d日：/, '') }}</p>
          <p class="text-[10px] text-muted mt-1 leading-relaxed">{{ gift.desc }}</p>
          <p class="text-[10px] text-muted mt-2">{{ rewardText(gift.reward) }}</p>
          <button class="mini-btn mt-2" :disabled="!gift.unlocked || gift.claimed" @click="claimSeven(gift.day)">
            {{ gift.claimed ? '已领' : gift.unlocked ? '领取' : '未解锁' }}
          </button>
        </div>
      </div>
    </section>

    <section class="event-hero game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-lg text-accent font-bold">世界妖潮</p>
          <p class="text-sm text-muted leading-relaxed mt-1">山外妖潮躁动，全服玩家的秘境/登塔进度会汇入讨伐进度。个人击败怪物也有每日阶段奖励。</p>
        </div>
        <div class="text-4xl">🐺</div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div class="event-stat"><span>全服状态</span><b>{{ worldBoss.statusText }}</b></div>
        <div class="event-stat"><span>全服贡献</span><b>{{ worldBoss.progress }}/{{ worldBoss.target }}</b></div>
        <div class="event-stat"><span>参与人数</span><b>{{ worldBoss.participants }}</b></div>
        <div class="event-stat"><span>个人讨伐</span><b>{{ retention.yaochaoPersonalKills }}</b></div>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between text-xs text-muted">
          <span>全服镇妖进度</span>
          <span>{{ worldBossPercent }}%</span>
        </div>
        <div class="h-3 bg-bg border border-accent/20 rounded-xs overflow-hidden">
          <div class="h-full bg-red-500 transition-all" :style="{ width: worldBossPercent + '%' }" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div v-for="reward in retention.yaochaoRewards" :key="reward.score" class="reward-card" :class="reward.claimed ? 'claimed' : reward.done ? 'ready' : ''">
          <p class="text-sm text-accent">{{ reward.title }}</p>
          <p class="text-[10px] text-muted mt-1">{{ reward.desc }}</p>
          <p class="text-[10px] text-muted mt-2">{{ rewardText(reward.reward) }}</p>
          <button class="mini-btn mt-2" :disabled="!reward.done || reward.claimed" @click="claimYaochao(reward.score)">
            {{ reward.claimed ? '已领' : reward.done ? '领取' : '讨伐不足' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button class="btn justify-center" @click="goCombat">前往秘境讨伐</button>
        <button class="btn justify-center" @click="loadWorldBoss">刷新全服进度</button>
      </div>
    </section>

    <section class="game-panel space-y-2">
      <h2 class="text-accent">活动说明</h2>
      <ul class="text-xs text-muted list-disc list-inside space-y-1 leading-relaxed">
        <li>每日活跃度基于修行志每日目标，活跃宝箱每天按游戏日刷新。</li>
        <li>七日豪礼按当前存档的游戏日推进，新老存档都会从首次进入新版活动中心开始计算。</li>
        <li>世界妖潮第一版先聚合线上存档进度，个人奖励按本地讨伐进度发放；后续可继续扩展为实时世界Boss和全服结算邮件。</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useRetentionStore } from '@/stores/useRetentionStore'
import { useSaveStore } from '@/stores/useSaveStore'
import { addLog, showFloat } from '@/composables/useGameLog'

const router = useRouter()
const retention = useRetentionStore()
const saveStore = useSaveStore()

const worldBoss = reactive({ progress: 0, target: 300, participants: 0, statusText: '统计中' })
const worldBossPercent = computed(() => Math.min(100, Math.floor((worldBoss.progress / Math.max(1, worldBoss.target)) * 100)))

function rewardText(reward: any): string {
  const parts: string[] = []
  if (reward.money) parts.push(`铜钱+${reward.money}`)
  if (reward.aura) parts.push(`灵气+${reward.aura}`)
  if (reward.spiritStone) parts.push(`灵石×${reward.spiritStone}`)
  if (reward.attributeExp) parts.push('资质经验+' + Object.values(reward.attributeExp).reduce((a: number, b: any) => a + (Number(b) || 0), 0))
  return parts.join(' / ')
}

function persist() {
  const slot = saveStore.activeSlot >= 0 ? saveStore.activeSlot : saveStore.assignNewSlot()
  if (slot >= 0) saveStore.saveToSlot(slot)
}

function handleClaim(res: { success: boolean; message: string }) {
  addLog(res.message)
  showFloat(res.message, res.success ? 'success' : 'danger')
  if (res.success) persist()
}

function claimActivity(score: number) { handleClaim(retention.claimActivityBox(score)) }
function claimSeven(day: number) { handleClaim(retention.claimSevenDayGift(day)) }
function claimYaochao(score: number) { handleClaim(retention.claimYaochaoReward(score)) }
function goCombat() { router.push('/game/combat') }
function goQuest() { router.push('/game/quest') }

async function loadWorldBoss() {
  try {
    const res = await fetch('/api/events/world-boss')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'load failed')
    worldBoss.progress = Number(data.progress || 0)
    worldBoss.target = Number(data.target || 300)
    worldBoss.participants = Number(data.participants || 0)
    worldBoss.statusText = data.statusText || (worldBoss.progress >= worldBoss.target ? '已镇压' : '进行中')
  } catch {
    worldBoss.statusText = '本地进行中'
    worldBoss.progress = retention.yaochaoPersonalKills
    worldBoss.target = 30
    worldBoss.participants = 1
  }
}

onMounted(loadWorldBoss)
</script>

<style scoped>
.event-hero { border-color: rgba(239, 68, 68, 0.35); background: linear-gradient(135deg, rgba(127, 29, 29, 0.18), rgba(24, 24, 27, 0.72)); }
.event-stat { border: 1px solid rgba(200, 164, 92, 0.22); background: rgba(0,0,0,0.18); padding: 8px; border-radius: 2px; display: flex; flex-direction: column; gap: 3px; }
.event-stat span { color: var(--muted); }
.event-stat b { color: var(--accent); font-weight: 600; }
.reward-card { border: 1px solid rgba(200, 164, 92, 0.18); background: rgba(0,0,0,0.16); padding: 10px; border-radius: 2px; }
.reward-card.ready { border-color: rgba(34, 197, 94, 0.45); background: rgba(34, 197, 94, 0.08); }
.reward-card.claimed { opacity: 0.68; border-color: rgba(200, 164, 92, 0.1); }
.mini-btn { width: 100%; border: 1px solid rgba(200, 164, 92, 0.35); color: var(--accent); padding: 4px 8px; border-radius: 2px; font-size: 11px; }
.mini-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.mini-btn:not(:disabled) { background: var(--accent); color: var(--bg); }
</style>
