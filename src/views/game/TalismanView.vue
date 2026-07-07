<template>
  <div class="space-y-3">
    <Divider title label="📜 制符" />
    <div v-if="!cultivation.talismanUnlocked" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">花费 15000 文学习以灵力绘符之道。符箓会纳入护身符阵，直接提升战力和渡劫稳定；愈符还可主动恢复体力。</p>
      <Button class="w-full justify-center" :disabled="!cultivation.unlocked" @click="cultivation.unlockTalisman">学习制符（15000文）</Button>
    </div>
    <div v-else class="space-y-2">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="stat-card"><span>已制符箓</span><b>{{ cultivation.talismanCount }}枚</b></div>
        <div class="stat-card"><span>灵力</span><b>{{ cultivation.mana }}</b></div>
        <div class="stat-card"><span>符阵战力</span><b>+{{ cultivation.talismanPower }}</b></div>
        <div class="stat-card"><span>渡劫稳定</span><b>+{{ Math.round(cultivation.talismanTribulationBonus * 100) }}%</b></div>
      </div>
      <p class="text-[10px] text-muted leading-relaxed border border-accent/15 rounded-xs p-2">
        制成的符箓会自动组成护身符阵：炎符、雷符偏战力；冰符、盾符、疾符偏渡劫稳定；愈符可主动使用恢复体力。符宗弟子绘符消耗更低、符阵收益更高。
      </p>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div v-for="tal in talismanOptions" :key="tal.type" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs text-center space-y-1">
          <span class="text-xl">{{ tal.emoji }}</span>
          <p class="text-accent text-sm">{{ tal.name }}</p>
          <p class="text-muted leading-relaxed text-[10px] min-h-[2rem]">{{ tal.desc }}</p>
          <p class="text-[10px] text-muted">持有 {{ count(tal.type) }} · 灵力{{ manaCost }}</p>
          <Button class="w-full justify-center" @click="cultivation.craftTalisman(tal.type)">绘制</Button>
          <Button v-if="tal.type === 'heal_talisman'" class="w-full justify-center" :disabled="count(tal.type) <= 0" @click="cultivation.useTalisman(tal.type)">使用愈符</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore, type TalismanId } from '@/stores/useCultivationStore'

const cultivation = useCultivationStore()
const manaCost = computed(() => cultivation.sect === 'talisman' ? 24 : 30)

const talismanOptions: { type: TalismanId; name: string; emoji: string; desc: string }[] = [
  { type: 'fire_talisman', name: '炎符', emoji: '🔥', desc: '火行攻势，提升修仙战力' },
  { type: 'ice_talisman', name: '冰符', emoji: '❄️', desc: '凝神定息，提升渡劫稳定' },
  { type: 'heal_talisman', name: '愈符', emoji: '💚', desc: '主动使用后恢复30%体力' },
  { type: 'shield_talisman', name: '盾符', emoji: '🛡️', desc: '护身挡劫，提升渡劫稳定' },
  { type: 'speed_talisman', name: '疾符', emoji: '💨', desc: '身法避劫，提升渡劫稳定' },
  { type: 'thunder_talisman', name: '雷符', emoji: '⚡', desc: '雷法攻势，兼顾战力和渡劫' },
]
const count = (type: TalismanId) => cultivation.talismans[type] || 0
</script>

<style scoped>
.stat-card { border: 1px solid rgba(200,164,92,.18); border-radius: 2px; padding: 8px; background: rgba(0,0,0,.12); display: flex; justify-content: space-between; gap: 8px; }
.stat-card b { color: var(--color-accent); font-weight: 400; }
</style>
