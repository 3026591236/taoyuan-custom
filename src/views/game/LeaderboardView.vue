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

    <button class="btn w-full justify-center" @click="loadLeaderboard">刷新排行</button>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import Divider from '@/components/game/Divider.vue'

  const tabs = [
    { key: 'cultivation', label: '修为' },
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
    return `${entry.cultivation || 0}`
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

  onMounted(loadLeaderboard)
</script>
