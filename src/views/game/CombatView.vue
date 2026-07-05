<template>
  <div class="space-y-3">
    <Divider title label="⚔️ 红尘历练 · 登仙塔" />

    <div class="border border-accent/20 rounded-xs p-3 text-xs text-muted leading-relaxed">
      <p class="text-accent mb-1">V0.5 玩法说明</p>
      <p>先通过「红尘历练」获取修为和材料，也可挑战「登仙塔」逐层试炼、刷新最高层记录。凶兽与秘境会产出转生和炼器材料。</p>
    </div>

    <div v-if="!combatStore.currentZone" class="space-y-4">
      <section class="border border-accent/30 rounded-xs p-3 bg-accent/5">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-accent text-sm">🗼 登仙塔</h3>
          <span class="text-[10px] text-muted">最高 {{ combatStore.towerHighestFloor }} 层 / 下层 {{ combatStore.towerNextFloor }}</span>
        </div>
        <p class="text-xs text-muted leading-relaxed mb-2">逐层自动战斗，胜利后记录最高层。每层消耗灵力与体力，层数越高敌人越强，奖励也越丰厚；每 5 层精英，每 10 层镇塔首领。</p>
        <div class="grid grid-cols-3 gap-2 text-[10px] mb-2">
          <div class="stat-card"><span>下层</span><b>第{{ combatStore.towerNextFloor }}层</b></div>
          <div class="stat-card"><span>消耗</span><b>{{ combatStore.towerCost }}灵力</b></div>
          <div class="stat-card"><span>体力</span><b>{{ combatStore.towerStaminaCost }}</b></div>
        </div>
        <button class="btn w-full justify-center" :disabled="Boolean(combatStore.towerLockReason())" @click="combatStore.challengeTower()">挑战下一层</button>
        <p v-if="combatStore.towerLockReason()" class="text-[10px] text-danger mt-2">{{ combatStore.towerLockReason() }}</p>

        <div class="mt-3 border-t border-accent/20 pt-2">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs text-accent">🏆 实时爬塔榜</h4>
            <button class="text-[10px] text-muted hover:text-accent" :disabled="towerRankLoading" @click="loadTowerLeaderboard">刷新</button>
          </div>
          <div v-if="towerRankLoading" class="text-[10px] text-muted">榜单加载中...</div>
          <div v-else-if="towerRankError" class="text-[10px] text-danger">{{ towerRankError }}</div>
          <div v-else-if="towerLeaderboard.length === 0" class="text-[10px] text-muted">暂无玩家登塔记录，来拿第一个榜首吧。</div>
          <div v-else class="space-y-1">
            <div v-for="(row, index) in towerLeaderboard" :key="row.userId" class="tower-rank-row">
              <span class="tower-rank-no" :class="{ 'text-accent': index < 3 }">#{{ index + 1 }}</span>
              <span class="truncate">{{ row.playerName || row.username || '无名' }}</span>
              <span class="text-muted hidden sm:inline">{{ row.rebirthCount ? row.rebirthCount + '转' : '' }}{{ row.realmName }}</span>
              <b class="text-success">{{ row.floor }}层</b>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-accent text-sm">🌄 红尘历练</h3>
          <span class="text-[10px] text-muted">主线成长 / 转生解锁</span>
        </div>
        <ZoneCard v-for="zone in combatStore.trialZones" :key="zone.id" :zone="zone" />
      </section>

      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-accent text-sm">🐲 挑战凶兽</h3>
          <span class="text-[10px] text-muted">每日限次 / 转生核心材料</span>
        </div>
        <ZoneCard v-for="zone in combatStore.beastZones" :key="zone.id" :zone="zone" />
      </section>

      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-accent text-sm">🌀 秘境探索</h3>
          <span class="text-[10px] text-muted">材料补充 / 炼器掉落</span>
        </div>
        <ZoneCard v-for="zone in combatStore.realmZones" :key="zone.id" :zone="zone" />
      </section>
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center justify-between border border-accent/20 rounded-xs p-2 text-xs">
        <span class="text-accent">{{ combatStore.combatTitle }}</span>
        <span class="text-muted">{{ combatStore.combatRewardHint }}</span>
      </div>

      <div class="relative battle-arena">
        <div v-if="combatStore.showFlash" class="battle-flash"></div>
        <div v-for="d in combatStore.damageNumbers" :key="d.id" class="damage-number" :class="d.type === 'player' ? 'damage-player' : 'damage-monster'" :style="{ left: d.x + '%', top: d.y + '%' }">-{{ d.value }}</div>

        <div class="text-center p-3" v-if="combatStore.currentMonster">
          <div class="text-4xl mb-1" :class="{ 'monster-hit': combatStore.showFlash }">{{ combatStore.currentMonster.emoji }}</div>
          <div class="text-accent font-bold">{{ combatStore.currentMonster.name }}</div>
          <div class="w-full bg-bg/50 rounded-xs h-3 mt-1 overflow-hidden">
            <div class="hp-bar-monster h-full transition-all duration-300" :style="{ width: Math.max(0, combatStore.monsterHp / combatStore.currentMonster.hp * 100) + '%' }"></div>
          </div>
          <div class="text-[10px] text-muted">{{ combatStore.monsterHp }} / {{ combatStore.currentMonster.hp }}</div>
        </div>

        <div class="text-center text-muted text-xs my-1">⚔️ VS ⚔️</div>

        <div class="text-center p-3">
          <div class="text-2xl mb-1">🧘</div>
          <div class="text-accent font-bold">{{ playerStore.playerName }}</div>
          <div class="w-full bg-bg/50 rounded-xs h-3 mt-1 overflow-hidden">
            <div class="hp-bar-player h-full transition-all duration-300" :style="{ width: Math.max(0, combatStore.playerHp / combatStore.playerMaxHp * 100) + '%' }"></div>
          </div>
          <div class="text-[10px] text-muted">{{ combatStore.playerHp }} / {{ combatStore.playerMaxHp }}</div>
        </div>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 max-h-32 overflow-y-auto text-[10px] space-y-0.5">
        <div v-for="(log, i) in combatStore.combatLog.slice(-8)" :key="i" :class="log.includes('击败') || log.includes('掉落') ? 'text-accent' : log.includes('被') ? 'text-danger' : 'text-muted'">{{ log }}</div>
      </div>

      <div v-if="combatStore.combatResult === 'win'" class="space-y-2">
        <div class="text-center text-accent font-bold text-lg victory-text">🎉 胜利！</div>
        <div v-if="combatStore.drops.length" class="border border-accent/20 rounded-xs p-2">
          <p class="text-xs text-accent mb-1">掉落物品：</p>
          <div v-for="(d, i) in combatStore.drops" :key="i" class="text-xs text-muted">• {{ d.name }}×{{ d.qty }}</div>
          <button class="btn w-full justify-center mt-2" @click="combatStore.collectDrops">拾取全部</button>
        </div>
        <button v-if="combatStore.isTowerCombat" class="btn w-full justify-center" @click="combatStore.challengeTower()">继续挑战第{{ combatStore.towerNextFloor }}层</button>
        <button class="btn w-full justify-center" @click="combatStore.leaveCombat">返回秘境</button>
      </div>

      <div v-if="combatStore.combatResult === 'lose'" class="space-y-2">
        <div class="text-center text-danger font-bold text-lg">💀 败北...</div>
        <button class="btn w-full justify-center" @click="combatStore.leaveCombat">返回秘境</button>
      </div>

      <div v-if="combatStore.isFighting" class="text-center text-xs text-muted animate-pulse">战斗中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { defineComponent, h, onMounted, ref } from 'vue'
  import Divider from '@/components/game/Divider.vue'
  import { useCombatStore, type RealmZone } from '@/stores/useCombatStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'

  const combatStore = useCombatStore()
  const playerStore = usePlayerStore()
  const towerLeaderboard = ref<Array<{ userId: string; username: string; playerName: string; floor: number; realmName: string; rebirthCount: number }>>([])
  const towerRankLoading = ref(false)
  const towerRankError = ref('')

  const loadTowerLeaderboard = async () => {
    towerRankLoading.value = true
    towerRankError.value = ''
    try {
      const res = await fetch('/api/tower-leaderboard?limit=10')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '排行榜加载失败')
      towerLeaderboard.value = Array.isArray(data.leaderboard) ? data.leaderboard : []
    } catch (e: any) {
      towerRankError.value = e?.message || '排行榜加载失败'
    } finally {
      towerRankLoading.value = false
    }
  }

  onMounted(() => { void loadTowerLeaderboard() })

  const ZoneCard = defineComponent({
    props: { zone: { type: Object as () => RealmZone, required: true } },
    setup(props) {
      return () => {
        const zone = props.zone
        const locked = !combatStore.isZoneUnlocked(zone) || Boolean(combatStore.lockReason(zone))
        const reason = combatStore.lockReason(zone)
        return h('div', { class: ['border border-accent/20 rounded-xs p-3 space-y-2 mb-2', locked ? 'opacity-55' : ''] }, [
          h('div', { class: 'flex items-center justify-between gap-2' }, [
            h('div', {}, [
              h('span', { class: 'text-lg mr-1' }, zone.emoji),
              h('span', { class: 'text-accent font-bold' }, zone.name),
              h('span', { class: 'text-[10px] text-muted ml-2' }, zone.desc)
            ]),
            h('button', { class: 'btn text-xs shrink-0', disabled: locked, onClick: () => combatStore.enterZone(zone.id) }, `进入 (${zone.cost}灵力/${zone.staminaCost}体力)`)
          ]),
          h('div', { class: 'text-[10px] text-muted' }, `掉落：${zone.rewardHint}`),
          h('div', { class: 'text-[10px] text-muted' }, `敌人：${zone.monsters.map(m => m.emoji + m.name).join(' ')}`),
          zone.minRebirth ? h('div', { class: 'text-[10px] text-muted' }, `解锁：${zone.minRebirth}转 + 境界第${zone.minRealm + 1}阶`) : null,
          zone.dailyLimit ? h('div', { class: 'text-[10px] text-muted' }, `今日次数：${combatStore.getDailyCount(zone.id)} / ${zone.dailyLimit}`) : null,
          reason ? h('div', { class: 'text-[10px] text-danger' }, reason) : null
        ])
      }
    }
  })
</script>

<style scoped>
  .battle-arena { min-height: 200px; border: 1px solid rgba(var(--color-accent-rgb, 255,180,0), 0.15); border-radius: 4px; background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(30,20,10,0.5) 100%); position: relative; overflow: hidden; }
  .battle-flash { position: absolute; inset: 0; background: radial-gradient(circle, rgba(255,200,50,0.4) 0%, transparent 70%); animation: flash 0.2s ease-out; pointer-events: none; z-index: 10; }
  @keyframes flash { 0% { opacity: 1; } 100% { opacity: 0; } }
  .monster-hit { animation: shake 0.3s ease; }
  @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
  .damage-number { position: absolute; font-weight: bold; font-size: 16px; animation: float-damage 1s ease-out forwards; pointer-events: none; z-index: 20; text-shadow: 0 0 4px rgba(0,0,0,0.8); }
  .damage-player { color: #ffcc00; }
  .damage-monster { color: #ff4444; }
  @keyframes float-damage { 0% { opacity: 1; transform: translateY(0) scale(1.2); } 100% { opacity: 0; transform: translateY(-40px) scale(0.8); } }
  .hp-bar-monster { background: linear-gradient(90deg, #ff4444, #ff6644); border-radius: 2px; }
  .hp-bar-player { background: linear-gradient(90deg, #44ff44, #66ff88); border-radius: 2px; }
  .victory-text { animation: victory-glow 1s ease-in-out infinite alternate; }
  @keyframes victory-glow { 0% { text-shadow: 0 0 5px rgba(255,180,0,0.5); } 100% { text-shadow: 0 0 20px rgba(255,180,0,0.9), 0 0 40px rgba(255,180,0,0.4); } }

  .tower-rank-row { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) auto auto; gap: 0.5rem; align-items: center; font-size: 11px; padding: 0.35rem 0.45rem; border: 1px solid rgba(var(--color-accent-rgb, 255,180,0), 0.12); border-radius: 3px; background: rgba(0,0,0,0.18); }
  .tower-rank-no { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
</style>
