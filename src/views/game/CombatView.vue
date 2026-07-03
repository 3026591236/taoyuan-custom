<template>
  <div class="space-y-3">
    <Divider title label="⚔️ 秘境探索" />

    <!-- 秘境选择 -->
    <div v-if="!combatStore.currentZone" class="space-y-2">
      <div v-for="zone in REALM_ZONES" :key="zone.id" class="border border-accent/20 rounded-xs p-3 space-y-2" :class="{ 'opacity-50': (cultivationStore.realmIndex || 0) < zone.minRealm }">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-lg mr-1">{{ zone.emoji }}</span>
            <span class="text-accent font-bold">{{ zone.name }}</span>
            <span class="text-[10px] text-muted ml-2">{{ zone.desc }}</span>
          </div>
          <button class="btn text-xs" @click="combatStore.enterZone(zone.id)" :disabled="(cultivationStore.realmIndex || 0) < zone.minRealm">
            探索 ({{ zone.cost }}灵力)
          </button>
        </div>
        <div class="text-[10px] text-muted">怪物：{{ zone.monsters.map(m => m.emoji + m.name).join(' ') }}</div>
        <div v-if="(cultivationStore.realmIndex || 0) < zone.minRealm" class="text-[10px] text-danger">需境界达标方可进入</div>
      </div>
    </div>

    <!-- 战斗界面 -->
    <div v-else class="space-y-3">
      <!-- 战斗特效层 -->
      <div class="relative battle-arena">
        <div v-if="combatStore.showFlash" class="battle-flash"></div>
        <!-- 伤害数字 -->
        <div v-for="d in combatStore.damageNumbers" :key="d.id" class="damage-number" :class="d.type === 'player' ? 'damage-player' : 'damage-monster'" :style="{ left: d.x + '%', top: d.y + '%' }">
          -{{ d.value }}
        </div>

        <!-- 怪物 -->
        <div class="text-center p-3" v-if="combatStore.currentMonster">
          <div class="text-4xl mb-1" :class="{ 'monster-hit': combatStore.showFlash }">{{ combatStore.currentMonster.emoji }}</div>
          <div class="text-accent font-bold">{{ combatStore.currentMonster.name }}</div>
          <div class="w-full bg-bg/50 rounded-xs h-3 mt-1 overflow-hidden">
            <div class="hp-bar-monster h-full transition-all duration-300" :style="{ width: (combatStore.monsterHp / combatStore.currentMonster.hp * 100) + '%' }"></div>
          </div>
          <div class="text-[10px] text-muted">{{ combatStore.monsterHp }} / {{ combatStore.currentMonster.hp }}</div>
        </div>

        <!-- VS -->
        <div class="text-center text-muted text-xs my-1">⚔️ VS ⚔️</div>

        <!-- 玩家 -->
        <div class="text-center p-3">
          <div class="text-2xl mb-1">🧘</div>
          <div class="text-accent font-bold">{{ playerStore.playerName }}</div>
          <div class="w-full bg-bg/50 rounded-xs h-3 mt-1 overflow-hidden">
            <div class="hp-bar-player h-full transition-all duration-300" :style="{ width: (combatStore.playerHp / combatStore.playerMaxHp * 100) + '%' }"></div>
          </div>
          <div class="text-[10px] text-muted">{{ combatStore.playerHp }} / {{ combatStore.playerMaxHp }}</div>
        </div>
      </div>

      <!-- 战斗日志 -->
      <div class="border border-accent/10 rounded-xs p-2 max-h-32 overflow-y-auto text-[10px] space-y-0.5">
        <div v-for="(log, i) in combatStore.combatLog.slice(-8)" :key="i" :class="log.includes('击败') ? 'text-accent' : log.includes('被') ? 'text-danger' : 'text-muted'">
          {{ log }}
        </div>
      </div>

      <!-- 战斗结果 -->
      <div v-if="combatStore.combatResult === 'win'" class="space-y-2">
        <div class="text-center text-accent font-bold text-lg victory-text">🎉 胜利！</div>
        <div v-if="combatStore.drops.length" class="border border-accent/20 rounded-xs p-2">
          <p class="text-xs text-accent mb-1">掉落物品：</p>
          <div v-for="(d, i) in combatStore.drops" :key="i" class="text-xs text-muted">• {{ d.name }}×{{ d.qty }}</div>
          <button class="btn w-full justify-center mt-2" @click="combatStore.collectDrops">拾取全部</button>
        </div>
        <button class="btn w-full justify-center" @click="combatStore.leaveCombat">返回秘境</button>
      </div>

      <div v-if="combatStore.combatResult === 'lose'" class="space-y-2">
        <div class="text-center text-danger font-bold text-lg">💀 败北...</div>
        <button class="btn w-full justify-center" @click="combatStore.leaveCombat">返回秘境</button>
      </div>

      <!-- 战斗中按钮 -->
      <div v-if="combatStore.isFighting" class="text-center text-xs text-muted animate-pulse">战斗中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  
  import Divider from '@/components/game/Divider.vue'
  import { useCombatStore, REALM_ZONES } from '@/stores/useCombatStore'
  import { useCultivationStore } from '@/stores/useCultivationStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'

  const combatStore = useCombatStore()
  const cultivationStore = useCultivationStore()
  const playerStore = usePlayerStore()
</script>

<style scoped>
  .battle-arena {
    min-height: 200px;
    border: 1px solid rgba(var(--color-accent-rgb, 255,180,0), 0.15);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(30,20,10,0.5) 100%);
    position: relative;
    overflow: hidden;
  }

  .battle-flash {
    position: absolute; inset: 0;
    background: radial-gradient(circle, rgba(255,200,50,0.4) 0%, transparent 70%);
    animation: flash 0.2s ease-out;
    pointer-events: none;
    z-index: 10;
  }

  @keyframes flash {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  .monster-hit {
    animation: shake 0.3s ease;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }

  .damage-number {
    position: absolute;
    font-weight: bold;
    font-size: 16px;
    animation: float-damage 1s ease-out forwards;
    pointer-events: none;
    z-index: 20;
    text-shadow: 0 0 4px rgba(0,0,0,0.8);
  }

  .damage-player {
    color: #ffcc00;
  }

  .damage-monster {
    color: #ff4444;
  }

  @keyframes float-damage {
    0% { opacity: 1; transform: translateY(0) scale(1.2); }
    100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
  }

  .hp-bar-monster {
    background: linear-gradient(90deg, #ff4444, #ff6644);
    border-radius: 2px;
  }

  .hp-bar-player {
    background: linear-gradient(90deg, #44ff44, #66ff88);
    border-radius: 2px;
  }

  .victory-text {
    animation: victory-glow 1s ease-in-out infinite alternate;
  }

  @keyframes victory-glow {
    0% { text-shadow: 0 0 5px rgba(255,180,0,0.5); }
    100% { text-shadow: 0 0 20px rgba(255,180,0,0.9), 0 0 40px rgba(255,180,0,0.4); }
  }
</style>
