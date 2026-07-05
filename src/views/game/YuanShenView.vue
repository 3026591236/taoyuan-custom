<template>
  <div class="space-y-3">
    <Divider title label="🧘 元神修炼" />
    <div class="border border-accent/20 rounded-xs p-3 bg-panel/40">
      <p class="text-xs text-muted leading-relaxed mb-2">
        元神乃修行者之根本。修炼元神可永久提升体力/精力/防御，元神等级越高，灵力上限也越高。
      </p>
      <div class="grid grid-cols-2 gap-2 text-xs mb-2">
        <div class="stat-card"><span>元神等级</span><b>Lv.{{ cultivation.yuanShenLevel }}</b></div>
        <div class="stat-card"><span>经验</span><b>{{ cultivation.yuanShenExp }}/{{ (cultivation.yuanShenLevel + 1) * 500 }}</b></div>
      </div>
      <p class="text-[10px] text-success mb-2">当前加成：体力/精力/防御 +{{ Math.round(cultivation.yuanShenLevel * 5) }}%，灵力上限 +{{ cultivation.yuanShenLevel * 2 }}</p>
      <Button class="w-full justify-between" :disabled="!cultivation.unlocked || cultivation.aura < (100 + cultivation.yuanShenLevel * 50)" @click="cultivation.trainYuanShen">
        <span>修炼元神</span>
        <span class="text-muted text-xs">灵气 {{ 100 + cultivation.yuanShenLevel * 50 }}</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore } from '@/stores/useCultivationStore'

const cultivation = useCultivationStore()
</script>

<style scoped>
.stat-card { border: 1px solid rgba(200,164,92,.18); border-radius: 2px; padding: 8px; background: rgba(0,0,0,.12); display: flex; justify-content: space-between; gap: 8px; }
.stat-card b { color: var(--color-accent); font-weight: 400; }
</style>
