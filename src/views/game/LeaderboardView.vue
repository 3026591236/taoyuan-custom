<template>
  <div class="space-y-3">
    <Divider title label="排行榜" />

    <div class="flex gap-2">
      <button v-for="tab in tabs" :key="tab.key" class="btn flex-1 justify-center text-xs" :class="{ '!bg-accent !text-bg': activeTab === tab.key }" @click="switchTab(tab.key)">
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="text-xs text-muted text-center py-4">加载中...</div>
    <div v-else-if="entries.length === 0" class="text-xs text-muted text-center py-4">暂无数据。需要玩家登录账号并保存云存档后才会出现。</div>
    <div v-else class="space-y-1">
      <div v-for="(entry, idx) in entries" :key="idx" class="border border-accent/15 rounded-xs p-2 flex items-center gap-2" :class="idx < 3 ? 'bg-accent/5' : ''">
        <span class="text-lg w-8 text-center shrink-0" :class="idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''">{{ idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1 }}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm text-accent truncate">{{ entry.playerName }}</span>
            <span class="text-[10px] text-muted">{{ entry.realmName }}</span>
          </div>
          <div class="text-[10px] text-muted">第{{ entry.year }}年 {{ entry.season }} 第{{ entry.day }}天</div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-sm text-accent">{{ formatValue(entry) }}</div>
          <div class="text-[10px] text-muted">{{ activeTabLabel }}</div>
        </div>
      </div>
    </div>

    <div v-if="myRankHint" class="border border-accent/15 rounded-xs p-2 text-xs text-accent/80 text-center">📈 {{ myRankHint }}</div>
    <button class="btn w-full justify-center" @click="loadLeaderboard">刷新排行</button>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import Divider from '@/components/game/Divider.vue'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useCultivationStore } from '@/stores/useCultivationStore'

  const tabs = [
    { key: 'cultivation', label: '境界' },
    { key: 'power', label: '战力' },
    { key: 'money', label: '铜钱' },
    { key: 'aura', label: '灵气' }
  ]
  const activeTab = ref('cultivation')
  const entries = ref<any[]>([])
  const loading = ref(false)

  const activeTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label ?? '')

  const switchTab = (key: string) => {
    activeTab.value = key
    loadLeaderboard()
  }

  const formatValue = (entry: any) => {
    if (activeTab.value === 'money') return `${(entry.money || 0).toLocaleString()}文`
    if (activeTab.value === 'aura') return `${entry.aura || 0}`
    if (activeTab.value === 'power') return `${(entry.combatPower || 0).toLocaleString()}`
    return `${entry.realmName || '凡人'} · ${entry.cultivation || 0}`
  }

  const loadLeaderboard = async () => {
    loading.value = true
    try {
      const res = await fetch(`/api/leaderboard?by=${activeTab.value}`)
      const data = await res.json().catch(() => ({}))
      entries.value = data.leaderboard || []
    } catch {
      entries.value = []
    } finally {
      loading.value = false
    }
  }

  const player = usePlayerStore()
  const cultivation = useCultivationStore()

  // 距离上一名提示
  const myRankHint = computed(() => {
    if (entries.value.length === 0) return ''
    const myName = player.playerName
    const myIdx = entries.value.findIndex((e: any) => e.playerName === myName)
    if (myIdx < 0) {
      // Not on board — show distance to last place
      const last = entries.value[entries.value.length - 1]
      if (!last) return ''
      if (activeTab.value === 'power') return `距上榜还需战力 ${(last.combatPower || 0) - (cultivation.combatPower || 0) > 0 ? (last.combatPower || 0) - (cultivation.combatPower || 0) : 0}`
      if (activeTab.value === 'money') return `距上榜还需铜钱 ${Math.max(0, (last.money || 0) - (player.money || 0))}`
      if (activeTab.value === 'aura') return `距上榜还需灵气 ${Math.max(0, (last.aura || 0) - (cultivation.aura || 0))}`
      return '努力上榜吧！'
    }
    if (myIdx === 0) return '🏆 你是榜首！'
    const above = entries.value[myIdx - 1]
    if (!above) return ''
    if (activeTab.value === 'power') return `距上一名差战力 ${(above.combatPower || 0) - (cultivation.combatPower || 0)}`
    if (activeTab.value === 'money') return `距上一名差铜钱 ${Math.max(0, (above.money || 0) - (player.money || 0))}`
    if (activeTab.value === 'aura') return `距上一名差灵气 ${Math.max(0, (above.aura || 0) - (cultivation.aura || 0))}`
    return `距上一名差${above.cultivation - (cultivation.cultivation || 0)}修为`
  })

  onMounted(loadLeaderboard)
</script>
