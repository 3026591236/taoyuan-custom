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

        <div class="battle-stage" v-if="combatStore.currentMonster">
          <div class="battle-side player-side" :class="{ 'fighter-hit': combatStore.showFlash }">
            <div class="battle-name text-success">{{ playerStore.playerName }}</div>
            <div class="battle-pixel-card" :class="[`avatar-${playerStore.gender}`, cultivationStore.unlocked ? `avatar-realm-${Math.min(cultivationStore.realmIndex, 4)}` : 'avatar-mortal']">
              <div v-if="cultivationStore.unlocked" class="pixel-avatar-aura"></div>
              <div class="kenney-sprite player-sprite" :style="playerSpriteStyle()"></div>
              <div class="pixel-avatar css-avatar-fallback">
                <span class="px-hair px"></span>
                <span class="px-bun px"></span>
                <span class="px-face px"></span>
                <span class="px-eye px eye-l"></span>
                <span class="px-eye px eye-r"></span>
                <span class="px-robe px"></span>
                <span class="px-belt px"></span>
                <span class="px-sleeve px sleeve-l"></span>
                <span class="px-sleeve px sleeve-r"></span>
                <span class="px-leg px leg-l"></span>
                <span class="px-leg px leg-r"></span>
                <span class="px-tool px"></span>
              </div>
              <div class="pixel-avatar-shadow"></div>
            </div>
            <div class="w-full bg-bg/50 rounded-xs h-3 mt-2 overflow-hidden">
              <div class="hp-bar-player h-full transition-all duration-300" :style="{ width: Math.max(0, combatStore.playerHp / combatStore.playerMaxHp * 100) + '%' }"></div>
            </div>
            <div class="text-[10px] text-muted">{{ combatStore.playerHp }} / {{ combatStore.playerMaxHp }}</div>
          </div>

          <div class="battle-vs">
            <span>⚔️</span>
            <b>VS</b>
            <span>⚔️</span>
          </div>

          <div class="battle-side monster-side" :class="{ 'monster-hit': combatStore.showFlash }">
            <div class="battle-name text-accent">{{ combatStore.currentMonster.name }}</div>
            <div class="monster-pixel-card" :class="{ 'tower-monster': combatStore.isTowerCombat }">
              <div class="monster-aura"></div>
              <div class="kenney-sprite monster-sprite" :style="monsterSpriteStyle()"></div>
              <div class="monster-pixel-body css-monster-fallback">
                <span class="monster-emoji">{{ combatStore.currentMonster.emoji }}</span>
                <span class="monster-eye eye-l"></span>
                <span class="monster-eye eye-r"></span>
                <span class="monster-claw claw-l"></span>
                <span class="monster-claw claw-r"></span>
              </div>
              <div class="monster-shadow"></div>
            </div>
            <div class="w-full bg-bg/50 rounded-xs h-3 mt-2 overflow-hidden">
              <div class="hp-bar-monster h-full transition-all duration-300" :style="{ width: Math.max(0, combatStore.monsterHp / combatStore.currentMonster.hp * 100) + '%' }"></div>
            </div>
            <div class="text-[10px] text-muted">{{ combatStore.monsterHp }} / {{ combatStore.currentMonster.hp }}</div>
          </div>
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
  import { useCultivationStore } from '@/stores/useCultivationStore'
  import kenneyRoguelikeCharacters from '@/assets/kenney/roguelike-characters/roguelikeChar_transparent.png'

  const combatStore = useCombatStore()
  const playerStore = usePlayerStore()
  const cultivationStore = useCultivationStore()
  const towerLeaderboard = ref<Array<{ userId: string; username: string; playerName: string; floor: number; realmName: string; rebirthCount: number }>>([])
  const towerRankLoading = ref(false)
  const towerRankError = ref('')

  const spriteStyle = (col: number, row: number) => ({
    backgroundImage: `url(${kenneyRoguelikeCharacters})`,
    backgroundPosition: `-${1 + col * 17}px -${1 + row * 17}px`
  })

  const playerSpriteStyle = () => {
    const realmBonus = cultivationStore.unlocked ? Math.min(2, Math.floor(cultivationStore.realmIndex / 8)) : 0
    const baseCol = playerStore.gender === 'female' ? 1 : 0
    return spriteStyle(baseCol + realmBonus, 0)
  }

  const monsterSpriteStyle = () => {
    const name = combatStore.currentMonster?.name || ''
    if (combatStore.isTowerCombat) return spriteStyle(name.includes('首领') || name.includes('镇塔') ? 9 : 8, 1)
    if (name.includes('龙') || name.includes('蛟') || name.includes('王') || name.includes('boss')) return spriteStyle(11, 1)
    if (name.includes('狼') || name.includes('虎') || name.includes('熊') || name.includes('兽')) return spriteStyle(6, 1)
    if (name.includes('妖') || name.includes('魔') || name.includes('鬼')) return spriteStyle(10, 1)
    return spriteStyle(7, 1)
  }

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


  .kenney-sprite { position: absolute; left: 50%; top: 34px; width: 16px; height: 16px; background-repeat: no-repeat; image-rendering: pixelated; transform: translateX(-50%) scale(4); transform-origin: center; z-index: 3; filter: drop-shadow(1px 2px 0 rgba(0,0,0,.5)); }
  .player-sprite { top: 42px; }
  .monster-sprite { top: 46px; transform: translateX(-50%) scale(4.2); }
  .css-avatar-fallback, .css-monster-fallback { opacity: 0; pointer-events: none; }

  .battle-stage { min-height: 240px; display: grid; grid-template-columns: minmax(0, 1fr) 54px minmax(0, 1fr); gap: 0.75rem; align-items: end; padding: 1rem 0.75rem 0.75rem; }
  .battle-side { min-width: 0; text-align: center; position: relative; }
  .battle-name { min-height: 1.25rem; font-weight: 700; font-size: 12px; margin-bottom: 0.35rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .battle-vs { align-self: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.15rem; color: rgba(241, 211, 139, .8); text-shadow: 0 0 8px rgba(255, 180, 0, .25); font-size: 13px; }
  .battle-vs b { font-size: 11px; letter-spacing: .08em; }
  .battle-pixel-card, .monster-pixel-card { position: relative; width: 86px; height: 124px; margin: 0 auto; border: 2px solid rgba(var(--color-accent-rgb, 255,180,0), .28); background: linear-gradient(180deg, rgba(44,36,30,.95), rgba(22,18,16,.98)), repeating-linear-gradient(90deg, transparent 0 7px, rgba(255,255,255,.04) 7px 8px); image-rendering: pixelated; overflow: hidden; box-shadow: inset 0 0 0 2px rgba(0,0,0,.25), 0 8px 0 rgba(0,0,0,.15); }
  .battle-pixel-card::before, .monster-pixel-card::before { content: ''; position: absolute; left: 8px; right: 8px; bottom: 12px; height: 6px; background: repeating-linear-gradient(90deg, rgba(87,58,32,.9) 0 6px, rgba(47,35,24,.9) 6px 12px); }
  .battle-pixel-card::after, .monster-pixel-card::after { content: ''; position: absolute; left: 6px; right: 6px; top: 6px; bottom: 6px; border: 1px solid rgba(224,178,94,.18); pointer-events: none; }
  .pixel-avatar-aura { position: absolute; inset: 10px 7px 18px; border: 2px double rgba(120,245,220,.38); background: radial-gradient(circle at center, rgba(255,255,255,.06), transparent 58%); box-shadow: 0 0 10px rgba(120,245,220,.22), inset 0 0 12px rgba(120,245,220,.12); }
  .avatar-realm-1 .pixel-avatar-aura { border-color: rgba(95,207,122,.45); box-shadow: 0 0 10px rgba(95,207,122,.22); }
  .avatar-realm-2 .pixel-avatar-aura { border-color: rgba(83,178,245,.48); box-shadow: 0 0 12px rgba(83,178,245,.28); }
  .avatar-realm-3 .pixel-avatar-aura { border-color: rgba(191,119,255,.52); box-shadow: 0 0 14px rgba(191,119,255,.32); }
  .avatar-realm-4 .pixel-avatar-aura { border-color: rgba(245,198,92,.58); box-shadow: 0 0 16px rgba(245,198,92,.35); }
  .pixel-avatar { position: absolute; left: 23px; top: 8px; width: 40px; height: 92px; transform: scale(1.2); transform-origin: top center; filter: drop-shadow(2px 3px 0 rgba(0,0,0,.45)); }
  .px { position: absolute; display: block; box-shadow: inset -2px -2px 0 rgba(0,0,0,.18); }
  .px-bun { left: 14px; top: 0; width: 12px; height: 8px; background: #2a1c18; border-top: 2px solid #6b4230; }
  .px-hair { left: 9px; top: 8px; width: 22px; height: 18px; background: #2a1c18; border-top: 3px solid #513024; box-shadow: inset -3px -3px 0 rgba(0,0,0,.24), 0 8px 0 #1d1412; }
  .px-face { left: 11px; top: 14px; width: 18px; height: 18px; background: #e7b98a; box-shadow: inset -3px -3px 0 #c58d65, inset 2px 2px 0 #ffd2a5; }
  .px-face::after { content: ''; position: absolute; left: 7px; top: 12px; width: 4px; height: 2px; background: #a86055; }
  .px-eye { top: 23px; width: 3px; height: 3px; background: #211712; box-shadow: none; }
  .eye-l { left: 16px; } .eye-r { left: 24px; }
  .px-robe { left: 8px; top: 34px; width: 24px; height: 38px; background: linear-gradient(90deg, #4d7e52 0 35%, #6da86b 35% 65%, #3f6845 65%); box-shadow: inset -3px -3px 0 rgba(0,0,0,.25), inset 3px 0 0 rgba(255,255,255,.08); }
  .avatar-female .px-robe { background: linear-gradient(90deg, #694987 0 35%, #9365ad 35% 65%, #563a72 65%); }
  .px-belt { left: 7px; top: 49px; width: 26px; height: 5px; background: #d7b25e; border-top: 1px solid rgba(255,255,255,.24); box-shadow: none; }
  .px-sleeve { top: 36px; width: 8px; height: 28px; background: #487349; box-shadow: inset -2px -2px 0 rgba(0,0,0,.22); }
  .avatar-female .px-sleeve { background: #674a7f; }
  .sleeve-l { left: 1px; } .sleeve-r { right: 1px; }
  .px-leg { top: 71px; width: 9px; height: 18px; background: #3f4f3d; box-shadow: inset -2px -2px 0 rgba(0,0,0,.25), 0 13px 0 #221b18; }
  .leg-l { left: 10px; } .leg-r { right: 10px; }
  .px-tool { width: 5px; height: 42px; right: -4px; top: 35px; background: #8f6033; transform: rotate(-12deg); box-shadow: 0 -6px 0 #d1b063, 0 -10px 0 #ede09a, inset -2px 0 0 rgba(0,0,0,.25); }
  .avatar-realm-2 .px-tool { box-shadow: 0 -6px 0 #72c9ff, 0 -10px 0 #d8f5ff, inset -2px 0 0 rgba(0,0,0,.25); }
  .avatar-realm-3 .px-tool { box-shadow: 0 -6px 0 #c58bff, 0 -10px 0 #f0d9ff, inset -2px 0 0 rgba(0,0,0,.25); }
  .avatar-realm-4 .px-tool { box-shadow: 0 -6px 0 #ffd86d, 0 -10px 0 #fff2ad, inset -2px 0 0 rgba(0,0,0,.25), 0 0 7px #ffd86d; }
  .pixel-avatar-shadow, .monster-shadow { position: absolute; left: 20px; right: 20px; bottom: 13px; height: 5px; background: rgba(0,0,0,.35); }
  .monster-aura { position: absolute; inset: 14px 8px 18px; border: 2px double rgba(255,100,80,.32); box-shadow: 0 0 14px rgba(255,80,60,.18); }
  .tower-monster .monster-aura { border-color: rgba(245,198,92,.45); box-shadow: 0 0 18px rgba(245,198,92,.28); }
  .monster-pixel-body { position: absolute; left: 18px; top: 22px; width: 50px; height: 70px; background: linear-gradient(90deg, #704142 0 28%, #9a5950 28% 70%, #5e3338 70%); box-shadow: inset -4px -4px 0 rgba(0,0,0,.28), inset 3px 3px 0 rgba(255,255,255,.08), 0 -8px 0 #3c2530; filter: drop-shadow(2px 3px 0 rgba(0,0,0,.45)); }
  .tower-monster .monster-pixel-body { background: linear-gradient(90deg, #6a512b 0 28%, #a47732 28% 70%, #514022 70%); box-shadow: inset -4px -4px 0 rgba(0,0,0,.3), inset 3px 3px 0 rgba(255,255,255,.08), 0 -8px 0 #3b2c20, 0 0 8px rgba(245,198,92,.18); }
  .monster-emoji { position: absolute; left: 50%; top: 15px; transform: translateX(-50%); font-size: 24px; line-height: 1; filter: saturate(.9); }
  .monster-eye { position: absolute; top: 34px; width: 4px; height: 4px; background: #ffe071; box-shadow: 0 0 4px #ff6b45; }
  .monster-eye.eye-l { left: 15px; } .monster-eye.eye-r { left: 31px; }
  .monster-claw { position: absolute; top: 54px; width: 8px; height: 14px; background: #d8c08a; box-shadow: inset -2px -2px 0 rgba(0,0,0,.25); }
  .claw-l { left: -7px; transform: rotate(10deg); } .claw-r { right: -7px; transform: rotate(-10deg); }
  .fighter-hit { animation: player-hit 0.28s ease; }
  @keyframes player-hit { 0%,100% { transform: translateX(0); } 45% { transform: translateX(5px); } }
  @media (max-width: 420px) { .battle-stage { grid-template-columns: 1fr 34px 1fr; gap: .35rem; padding-left: .4rem; padding-right: .4rem; } .battle-pixel-card, .monster-pixel-card { width: 74px; height: 112px; } .pixel-avatar { left: 17px; transform: scale(1.1); } .monster-pixel-body { left: 12px; transform: scale(.95); transform-origin: top center; } .battle-vs { font-size: 11px; } }

</style>
