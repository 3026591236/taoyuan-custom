<template>
  <div class="space-y-3">
    <Divider title label="📜 制符" />
    <div v-if="!cultivation.talismanUnlocked" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">花费 15000 文学习以灵力绘符之道。各类符箓可临阵助战，各有妙用。</p>
      <Button class="w-full justify-center" :disabled="!cultivation.unlocked" @click="cultivation.unlockTalisman">学习制符（15000文）</Button>
    </div>
    <div v-else class="space-y-2">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="stat-card"><span>已制符箓</span><b>{{ cultivation.talismanCount }}枚</b></div>
        <div class="stat-card"><span>灵力</span><b>{{ cultivation.mana }}</b></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div v-for="tal in talismanOptions" :key="tal.type" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs text-center">
          <span class="text-xl">{{ tal.emoji }}</span>
          <p class="text-accent text-sm mb-1">{{ tal.name }}</p>
          <p class="text-muted leading-relaxed text-[10px] min-h-[1.5rem]">{{ tal.desc }}</p>
          <p class="text-[10px] text-muted mb-2">灵力30</p>
          <Button class="w-full justify-center" @click="cultivation.craftTalisman(tal.type)">绘制</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore } from '@/stores/useCultivationStore'

const cultivation = useCultivationStore()

const talismanOptions = [
  { type: 'fire_talisman', name: '炎符', emoji: '🔥', desc: '造成火属性伤害' },
  { type: 'ice_talisman', name: '冰符', emoji: '❄️', desc: '冻结敌人一回合' },
  { type: 'heal_talisman', name: '愈符', emoji: '💚', desc: '恢复30%体力' },
  { type: 'shield_talisman', name: '盾符', emoji: '🛡️', desc: '减免30%下次伤害' },
  { type: 'speed_talisman', name: '疾符', emoji: '💨', desc: '提高闪避率' },
  { type: 'thunder_talisman', name: '雷符', emoji: '⚡', desc: '雷属性AOE伤害' },
]
</script>

<style scoped>
.stat-card { border: 1px solid rgba(200,164,92,.18); border-radius: 2px; padding: 8px; background: rgba(0,0,0,.12); display: flex; justify-content: space-between; gap: 8px; }
.stat-card b { color: var(--color-accent); font-weight: 400; }
</style>
