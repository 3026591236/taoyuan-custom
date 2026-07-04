<template>
  <div class="space-y-3">
    <Divider title label="⚔️ 本命法宝" />
    <div class="border border-accent/20 rounded-xs p-3 bg-panel/40">
      <p class="text-xs text-muted leading-relaxed mb-2">
        以心血祭炼，炼制属于自己的本命法宝。战斗时自动释放威能，法宝等级越高，力量越强。
      </p>
      <div v-if="!cultivation.destinedArtifact" class="space-y-2">
        <div v-for="art in destinedArtifactOptions" :key="art.id" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs">
          <p class="text-accent text-sm mb-1">{{ art.emoji }} {{ art.name }}</p>
          <p class="text-muted leading-relaxed min-h-[2rem]">{{ art.desc }}</p>
          <p class="text-[10px] text-muted my-2">消耗：灵气2000 / 铜钱20000</p>
          <Button class="w-full justify-center" :disabled="!cultivation.unlocked" @click="cultivation.forgeDestinedArtifact(art.id)">
            炼制{{ art.name }}
          </Button>
        </div>
      </div>
      <div v-else class="space-y-2">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="stat-card"><span>法宝</span><b>{{ destinedArtifactData?.emoji }} {{ destinedArtifactData?.name }}</b></div>
          <div class="stat-card"><span>等级</span><b>Lv.{{ cultivation.destinedArtifactLevel }}</b></div>
        </div>
        <Button class="w-full justify-between" @click="cultivation.upgradeDestinedArtifact">
          <span>蕴养法宝</span>
          <span class="text-muted text-xs">{{ cultivation.destinedArtifactLevel * 5000 + 10000 }}文</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore } from '@/stores/useCultivationStore'

const cultivation = useCultivationStore()

const destinedArtifactOptions = [
  { id: 'qixing_sword', name: '七星剑', emoji: '🗡️', desc: '剑含北斗七星之威，战斗时对敌造成额外星辰伤害。' },
  { id: 'taiji_mirror', name: '太极镜', emoji: '🪞', desc: '阴阳调和之宝，战斗时减免所受伤害并提供护盾。' },
  { id: 'azure_lotus', name: '青莲灯', emoji: '🏮', desc: '佛门至宝，战斗时持续恢复体力和灵力。' },
]
const destinedArtifactData = computed(() =>
  destinedArtifactOptions.find(a => a.id === cultivation.destinedArtifact)
)
</script>

<style scoped>
.stat-card { border: 1px solid rgba(200,164,92,.18); border-radius: 2px; padding: 8px; background: rgba(0,0,0,.12); display: flex; justify-content: space-between; gap: 8px; }
.stat-card b { color: var(--color-accent); font-weight: 400; }
</style>
