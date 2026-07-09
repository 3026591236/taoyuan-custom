<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-accent text-sm">仙界</h3>
      <button class="text-xs text-muted hover:text-accent" @click="returnToWorld">返回下界</button>
    </div>
    <div class="border border-accent/20 rounded-xs p-4 mb-4 text-center">
      <p class="text-2xl mb-1">☁️</p>
      <p class="text-accent text-lg">仙界 · {{ ascensionStore.immortalTitle || '初入仙门' }}</p>
      <p class="text-xs text-muted mt-1">飞升者方可踏入的全新天地</p>
    </div>
    <div class="grid grid-cols-2 gap-2 mb-4">
      <div v-for="area in areas" :key="area.name" class="border border-accent/15 rounded-xs p-3 text-center cursor-pointer hover:bg-accent/5" @click="locked(area.name)">
        <p class="text-lg">{{ area.icon }}</p><p class="text-xs text-accent">{{ area.name }}</p><p class="text-[10px] text-muted">{{ area.desc }}</p>
      </div>
    </div>
    <div class="border border-muted/20 rounded-xs p-3"><p class="text-xs text-muted">仙界体系初开，后续将开放仙灵圃、仙府、仙域试炼、仙市等全新玩法。</p></div>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAscensionStore } from '@/stores/useAscensionStore'
import { addLog } from '@/composables/useGameLog'
const router = useRouter(); const ascensionStore = useAscensionStore()
const areas = [{ icon: '🌿', name: '仙灵圃', desc: '仙界灵植' }, { icon: '🏯', name: '仙府', desc: '仙界洞府' }, { icon: '⚔️', name: '仙域试炼', desc: '仙界挑战' }, { icon: '🏪', name: '仙市', desc: '仙界交易' }]
const returnToWorld = () => { ascensionStore.returnToWorld(); router.push('/game/cultivation'); addLog('返回下界。') }
const locked = (name: string) => addLog(`${name}尚未开放，敬请期待。`)
</script>
