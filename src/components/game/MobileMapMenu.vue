<template>
  <Transition name="panel-fade">
    <div v-if="open" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3" @click.self="$emit('close')">
      <div class="map-container game-panel w-full max-w-sm md:max-w-150 max-h-[85vh] overflow-y-auto relative">
        <button
          class="absolute top-4 right-4 px-2 py-1 text-xs transition-colors hover:border-accent/60 hover:bg-panel/80 text-muted border border-accent/20"
          @click="$emit('close')"
        >
          <X :size="14" />
        </button>
        <p class="text-accent text-sm text-center mb-3 tracking-widest">修仙地图</p>

        <!-- 田庄 -->
        <div class="map-area">
          <p class="map-area-title">田庄</p>
          <div class="map-area-grid">
            <button v-for="t in farmGroup" :key="t.key" class="map-loc" :class="{ 'map-loc-active': current === t.key }" @click="go(t.key)">
              <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <div class="map-path">···</div>

        <!-- 野外 -->
        <div class="flex space-x-2">
          <div class="map-area flex-1">
            <p class="map-area-title">村落</p>
            <div class="map-area-grid">
              <button
                v-for="t in villageGroup"
                :key="t.key"
                class="map-loc"
                :class="{ 'map-loc-active': current === t.key }"
                @click="go(t.key)"
              >
                <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>
          <div class="map-area flex-1">
            <p class="map-area-title">野外</p>
            <div class="map-area-grid">
              <button
                v-for="t in wildGroup"
                :key="t.key"
                class="map-loc"
                :class="{ 'map-loc-active': current === t.key }"
                @click="go(t.key)"
              >
                <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="map-path">···</div>

        <!-- 工坊 -->
        <div class="map-area">
          <p class="map-area-title">工坊</p>
          <div class="map-area-grid">
            <button
              v-for="t in craftGroup"
              :key="t.key"
              class="map-loc"
              :class="{ 'map-loc-active': current === t.key }"
              @click="go(t.key)"
            >
              <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <div class="map-path" style="color:#c084fc;">· · ✦ 修仙之途 ✦ · ·</div>

        <!-- 修仙 -->
        <div class="map-area map-area-cultivation">
          <p class="map-area-title map-cultivation-title">修仙</p>
          <div class="map-area-grid">
            <button
              class="map-loc"
              :class="{ 'map-loc-active': current === 'cultivation' }"
              @click="go('cultivation')"
            >
              <Sparkles :size="18" />
              <span>修行</span>
            </button>
            <button class="map-loc" :class="{ 'map-loc-active': current === 'alchemy' }" @click="go('alchemy')">
              <span style="font-size:18px">🏺</span>
              <span>炼丹</span>
            </button>
            <button class="map-loc" :class="{ 'map-loc-active': current === 'cave' }" @click="go('cave')">
              <span style="font-size:18px">🏔️</span>
              <span>洞府</span>
            </button>
            <button class="map-loc" :class="{ 'map-loc-active': current === 'destined-artifact' }" @click="go('destined-artifact')">
              <span style="font-size:18px">⚔️</span>
              <span>法宝</span>
            </button>
            <button class="map-loc" :class="{ 'map-loc-active': current === 'talisman' }" @click="go('talisman')">
              <span style="font-size:18px">📜</span>
              <span>制符</span>
            </button>
            <button class="map-loc" :class="{ 'map-loc-active': current === 'yuan-shen' }" @click="go('yuan-shen')">
              <span style="font-size:18px">🧘</span>
              <span>元神</span>
            </button>
            <button class="map-loc" :class="{ 'map-loc-active': current === 'divine-beast' }" @click="go('divine-beast')">
              <span style="font-size:18px">🐾</span>
              <span>灵兽</span>
            </button>
            <button class="map-loc" @click="handleSpecial('openCombat')">
              <Flame :size="18" />
              <span>秘境</span>
            </button>
            <button class="map-loc" @click="handleSpecial('openSect')">
              <Swords :size="18" />
              <span>门派</span>
            </button>
            <button class="map-loc" @click="handleSpecial('openForge')">
              <Cog :size="18" />
              <span>炼器</span>
            </button>
            <button class="map-loc" @click="handleSpecial('openLeaderboard')">
              <Trophy :size="18" />
              <span>排行</span>
            </button>
          </div>
        </div>

        <div class="map-path">···</div>

        <!-- 随身 -->
        <div class="map-area">
          <p class="map-area-title">随身</p>
          <div class="map-area-grid">
            <button
              v-for="t in personalGroup"
              :key="t.key"
              class="map-loc"
              :class="{ 'map-loc-active': current === t.key }"
              @click="go(t.key)"
            >
              <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
              <span>{{ t.label }}</span>
            </button>
            <button class="map-loc daily-checkin-loc" :disabled="checkinBusy || checkinChecked" @click="handleCheckin">
              <Gift :size="18" />
              <span>{{ checkinChecked ? '已签到' : '每日签到' }}</span>
            </button>
            <button class="map-loc" @click="handleOpenMail">
              <div style="position:relative;display:inline-flex">
                <Mail :size="18" />
                <span v-if="unclaimedMailCount" class="mail-dot">{{ unclaimedMailCount > 99 ? '99+' : unclaimedMailCount }}</span>
              </div>
              <span>系统邮件</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { X, Gift, Mail, Trophy, Swords, Sparkles, Flame, Cog } from 'lucide-vue-next'
  import { TABS, navigateToPanel } from '@/composables/useNavigation'
  import type { PanelKey } from '@/composables/useNavigation'

  defineProps<{ open: boolean; current: string; checkinChecked?: boolean; checkinBusy?: boolean; unclaimedMailCount?: number }>()
  const emit = defineEmits<{ close: []; checkin: []; openMail: []; openLeaderboard: []; openCombat: []; openForge: []; openSect: [] }>()

  const tabMap = computed(() => {
    const m = new Map<string, (typeof TABS)[number]>()
    for (const t of TABS) m.set(t.key, t)
    return m
  })

  const pick = (keys: PanelKey[]) => keys.map(k => tabMap.value.get(k)!).filter(Boolean)

  const farmGroup = computed(() => pick(['farm', 'animal', 'cottage', 'home', 'breeding', 'fishpond']))
  const villageGroup = computed(() => pick(['village', 'shop', 'museum', 'guild']))
  const wildGroup = computed(() => pick(['forage', 'fishing', 'mining', 'hanhai']))
  const craftGroup = computed(() => pick(['cooking', 'workshop', 'upgrade']))
  const personalGroup = computed(() => pick(['charinfo', 'inventory', 'skills', 'achievement', 'wallet', 'quest']))

  const go = (key: PanelKey) => {
    navigateToPanel(key)
    emit('close')
  }
  const handleCheckin = () => {
    emit('checkin')
  }
  const handleOpenMail = () => {
    emit('openMail')
  }
  const handleSpecial = (event: 'openLeaderboard' | 'openCombat' | 'openForge' | 'openSect') => {
    if (event === 'openLeaderboard') emit('openLeaderboard')
    else if (event === 'openCombat') emit('openCombat')
    else if (event === 'openForge') emit('openForge')
    else emit('openSect')
    emit('close')
  }
</script>

<style scoped>
  /* 地图菜单 */
  .map-area {
    border: 1px dashed rgba(200, 164, 92, 0.3);
    border-radius: 2px;
    padding: 8px;
  }

  .map-area-title {
    font-size: 10px;
    color: var(--color-muted);
    margin-bottom: 6px;
    letter-spacing: 0.1em;
    text-align: center;
  }

  .map-area-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: 6px;
  }

  .map-loc {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2px;
    padding: 6px 8px;
    min-width: 52px;
    font-size: 10px;
    color: rgb(var(--color-text));
    background: rgb(var(--color-bg));
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .map-loc:hover,
  .map-loc:active {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .map-loc-active {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .daily-checkin-loc {
    color: var(--color-accent);
  }
  .daily-checkin-loc:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .map-path {
    text-align: center;
    color: rgba(200, 164, 92, 0.3);
    font-size: 10px;
    line-height: 1;
    padding: 4px 0;
    letter-spacing: 0.3em;
  }

  .mail-dot {
    position: absolute;
    right: -6px;
    top: -6px;
    min-width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    line-height: 16px;
    text-align: center;
    padding: 0 3px;
  }

  /* 修仙区域 */
  .map-area-cultivation {
    border-color: rgba(192, 132, 252, 0.4);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(192, 132, 252, 0.08));
  }
  .map-cultivation-title {
    color: #c084fc;
  }
</style>
