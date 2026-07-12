<template>
  <Transition name="panel-fade">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3"
      @click.self="$emit('close')"
    >
      <div
        class="map-container game-panel w-full max-w-sm md:max-w-150 max-h-[85vh] overflow-y-auto relative"
      >
        <button
          class="absolute top-4 right-4 px-2 py-1 text-xs transition-colors hover:border-accent/60 hover:bg-panel/80 text-muted border border-accent/20"
          @click="$emit('close')"
        >
          <X :size="14" />
        </button>
        <p class="text-accent text-sm text-center mb-3 tracking-widest">
          {{ isImmortalMap ? "云阙仙图" : "万象仙图" }}
        </p>

        <template v-if="isImmortalMap">
          <div class="map-path map-path-cultivation">── 云阙天域 ──</div>
          <div class="map-area map-area-immortal">
            <p class="map-area-title map-cultivation-title">云阙</p>
            <div class="map-area-grid">
              <button
                v-for="z in immortalMapZones"
                :key="z.key"
                class="map-loc map-loc-immortal"
                :disabled="navBusy"
                :class="{
                  'map-loc-active':
                    route.query.tab === z.key ||
                    (!route.query.tab && z.key === 'home'),
                }"
                @click="goImmortalZone(z.key)"
              >
                <span class="immortal-map-icon">{{ z.icon }}</span>
                <span>{{ z.label }}</span>
              </button>
              <button
                class="map-loc map-loc-return"
                :disabled="navBusy"
                @click="returnMortalWorld"
              >
                <Sparkles :size="18" />
                <span>返回凡域</span>
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <!-- 灵田洞天 -->
          <div class="map-area">
            <p class="map-area-title">灵田洞天</p>
            <div class="map-area-grid">
              <button
                v-for="t in farmGroup"
                :key="t.key"
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === t.key }"
                @click="go(t.key)"
              >
                <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>

          <div class="map-path">···</div>

          <!-- 万象人间 -->
          <div class="flex space-x-2">
            <div class="map-area flex-1">
              <p class="map-area-title">万象集</p>
              <div class="map-area-grid">
                <button
                  v-for="t in villageGroup"
                  :key="t.key"
                  class="map-loc"
                  :disabled="navBusy"
                  :class="{ 'map-loc-active': current === t.key }"
                  @click="go(t.key)"
                >
                  <component
                    :is="t.getIcon ? t.getIcon() : t.icon"
                    :size="18"
                  />
                  <span>{{ t.label }}</span>
                </button>
              </div>
            </div>
            <div class="map-area flex-1">
              <p class="map-area-title">山海野境</p>
              <div class="map-area-grid">
                <button
                  v-for="t in wildGroup"
                  :key="t.key"
                  class="map-loc"
                  :disabled="navBusy"
                  :class="{ 'map-loc-active': current === t.key }"
                  @click="go(t.key)"
                >
                  <component
                    :is="t.getIcon ? t.getIcon() : t.icon"
                    :size="18"
                  />
                  <span>{{ t.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="map-path">···</div>

          <!-- 百工器作 -->
          <div class="map-area">
            <p class="map-area-title">百工器作</p>
            <div class="map-area-grid">
              <button
                v-for="t in craftGroup"
                :key="t.key"
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === t.key }"
                @click="go(t.key)"
              >
                <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>

          <div class="map-path map-path-cultivation">── 问道长阶 ──</div>

          <!-- 问道 -->
          <div class="map-area map-area-cultivation">
            <p class="map-area-title map-cultivation-title">问道</p>
            <div class="map-area-grid">
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'cultivation' }"
                @click="go('cultivation')"
              >
                <Sparkles :size="18" />
                <span>问道</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                @click="goCultivationMarket"
              >
                <Store :size="18" />
                <span>仙市</span>
              </button>
              <button
                class="map-loc map-loc-ascension"
                :disabled="navBusy"
                :class="{
                  'map-loc-active':
                    current === 'ascension' || current === 'immortal-world',
                }"
                @click="goAscension"
              >
                <Sparkles :size="18" />
                <span>{{ ascensionStore.ascended ? "云阙" : "飞升" }}</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'alchemy' }"
                @click="go('alchemy')"
              >
                <FlaskConical :size="18" />
                <span>丹炉</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'cave' }"
                @click="go('cave')"
              >
                <Mountain :size="18" />
                <span>洞天</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'destined-artifact' }"
                @click="go('destined-artifact')"
              >
                <Sword :size="18" />
                <span>本命宝</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'talisman' }"
                @click="go('talisman')"
              >
                <ScrollText :size="18" />
                <span>符箓</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'yuan-shen' }"
                @click="go('yuan-shen')"
              >
                <CircleDot :size="18" />
                <span>神魂</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'divine-beast' }"
                @click="go('divine-beast')"
              >
                <PawPrint :size="18" />
                <span>仙兽</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                @click="handleSpecial('openCombat')"
              >
                <Flame :size="18" />
                <span>万象秘境</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === 'events' }"
                @click="go('events' as PanelKey)"
              >
                <CalendarDays :size="18" />
                <span>天时活动</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                @click="handleSpecial('openSect')"
              >
                <Swords :size="18" />
                <span>道统</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                @click="handleSpecial('openForge')"
              >
                <Cog :size="18" />
                <span>器阁</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                @click="handleSpecial('openLeaderboard')"
              >
                <Trophy :size="18" />
                <span>天榜</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                @click="go('chat' as PanelKey)"
              >
                <MessageCircle :size="18" />
                <span>传音</span>
              </button>
            </div>
          </div>

          <div class="map-path">···</div>

          <!-- 随身仙囊 -->
          <div class="map-area">
            <p class="map-area-title">随身仙囊</p>
            <div class="map-area-grid">
              <button
                v-for="t in personalGroup"
                :key="t.key"
                class="map-loc"
                :disabled="navBusy"
                :class="{ 'map-loc-active': current === t.key }"
                @click="go(t.key)"
              >
                <component :is="t.getIcon ? t.getIcon() : t.icon" :size="18" />
                <span>{{ t.label }}</span>
              </button>
              <button
                class="map-loc daily-checkin-loc"
                :disabled="navBusy || checkinBusy || checkinChecked"
                @click="handleCheckin"
              >
                <Gift :size="18" />
                <span>{{ checkinChecked ? "已签到" : "每日签到" }}</span>
              </button>
              <button
                class="map-loc"
                :disabled="navBusy"
                @click="handleOpenMail"
              >
                <div style="position: relative; display: inline-flex">
                  <Mail :size="18" />
                  <span v-if="unclaimedMailCount" class="mail-dot">{{
                    unclaimedMailCount > 99 ? "99+" : unclaimedMailCount
                  }}</span>
                </div>
                <span>飞书</span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  X,
  Gift,
  Mail,
  Trophy,
  Swords,
  Sparkles,
  Flame,
  Cog,
  Store,
  FlaskConical,
  Mountain,
  Sword,
  ScrollText,
  CircleDot,
  PawPrint,
  CalendarDays,
  MessageCircle,
} from "lucide-vue-next";
import { TABS, navigateToPanel } from "@/composables/useNavigation";
import { useAscensionStore } from "@/stores/useAscensionStore";
import type { PanelKey } from "@/composables/useNavigation";

const props = defineProps<{
  open: boolean;
  current: string;
  checkinChecked?: boolean;
  checkinBusy?: boolean;
  unclaimedMailCount?: number;
}>();
const router = useRouter();
const route = useRoute();
const ascensionStore = useAscensionStore();
const navBusy = ref(false);
const isImmortalMap = computed(() =>
  route.path.includes("/game/immortal-world"),
);
const immortalMapZones = [
  { key: "home", label: "仙界大厅", icon: "🏯" },
  { key: "realm", label: "仙阶突破", icon: "🌌" },
  { key: "cave", label: "仙界洞天", icon: "🏔️" },
  { key: "market", label: "仙市兑换", icon: "💎" },
  { key: "trial", label: "仙域试炼", icon: "⚔️" },
  { key: "gear", label: "仙器谱", icon: "✦" },
  { key: "edict", label: "云阙天诏", icon: "🪬" },
  { key: "arena", label: "仙擂问道", icon: "🏆" },
  { key: "fate", label: "命盘天命", icon: "🔮" },
  { key: "rift", label: "混沌裂隙", icon: "🕳️" },
  { key: "office", label: "仙职仙盟", icon: "📜" },
  { key: "story", label: "仙界主线", icon: "📖" },
  { key: "arts", label: "仙术演武", icon: "✨" },
  { key: "echo", label: "凡界回响", icon: "🌾" },
];
const emit = defineEmits<{
  close: [];
  checkin: [];
  openMail: [];
  openLeaderboard: [];
  openCombat: [];
  openForge: [];
  openSect: [];
}>();

const tabMap = computed(() => {
  const m = new Map<string, (typeof TABS)[number]>();
  for (const t of TABS) m.set(t.key, t);
  return m;
});

const pick = (keys: PanelKey[]) =>
  keys.map((k) => tabMap.value.get(k)!).filter(Boolean);

const farmGroup = computed(() =>
  pick(["farm", "animal", "cottage", "home", "breeding", "fishpond"]),
);
const villageGroup = computed(() =>
  pick(["village", "shop", "museum", "guild"]),
);
const wildGroup = computed(() =>
  pick(["forage", "fishing", "mining", "hanhai"]),
);
const craftGroup = computed(() => pick(["cooking", "workshop", "upgrade"]));
const personalGroup = computed(() =>
  pick(["charinfo", "inventory", "skills", "achievement", "wallet", "quest"]),
);

const afterCloseNavigate = (fn: () => void) => {
  if (navBusy.value) return;
  navBusy.value = true;
  emit("close");
  const run = () => {
    try {
      fn();
    } finally {
      window.setTimeout(() => {
        navBusy.value = false;
      }, 350);
    }
  };
  window.requestAnimationFrame(() => window.setTimeout(run, 0));
};

const go = (key: PanelKey) => {
  afterCloseNavigate(() => navigateToPanel(key));
};
const goImmortalZone = (tab: string) => {
  afterCloseNavigate(() => {
    void router.push({
      path: "/game/immortal-world",
      query: { ...route.query, tab },
    });
  });
};
const returnMortalWorld = () => {
  afterCloseNavigate(() => {
    ascensionStore.returnToWorld();
    void router.push("/game/cultivation");
  });
};
const goCultivationMarket = () => {
  afterCloseNavigate(() => {
    void router.push({ path: "/game/shop", query: { market: "cultivation" } });
  });
};
const goAscension = () => {
  afterCloseNavigate(() => {
    void router.push(
      ascensionStore.ascended ? "/game/immortal-world" : "/game/ascension",
    );
  });
};

const handleCheckin = () => {
  afterCloseNavigate(() => emit("checkin"));
};
const handleOpenMail = () => {
  afterCloseNavigate(() => emit("openMail"));
};
const handleSpecial = (
  event: "openLeaderboard" | "openCombat" | "openForge" | "openSect",
) => {
  afterCloseNavigate(() => {
    if (event === "openLeaderboard") emit("openLeaderboard");
    else if (event === "openCombat") emit("openCombat");
    else if (event === "openForge") emit("openForge");
    else emit("openSect");
  });
};

const preloadCultivationPages = () => {
  const load = () => {
    void Promise.allSettled([
      import("@/views/game/CultivationView.vue"),
      import("@/views/game/AlchemyView.vue"),
      import("@/views/game/CaveView.vue"),
      import("@/views/game/DestinedArtifactView.vue"),
      import("@/views/game/TalismanView.vue"),
      import("@/views/game/YuanShenView.vue"),
      import("@/views/game/DivineBeastView.vue"),
      import("@/views/game/CombatView.vue"),
      import("@/views/game/ForgeView.vue"),
      import("@/views/game/SectView.vue"),
      import("@/views/game/LeaderboardView.vue"),
      import("@/views/game/EventView.vue"),
      import("@/views/game/AscensionView.vue"),
      import("@/views/game/ImmortalWorldView.vue"),
    ]);
  };
  const idle = (globalThis as any).requestIdleCallback as
    undefined | ((cb: () => void, opts?: { timeout?: number }) => number);
  if (idle) idle(load, { timeout: 900 });
  else globalThis.setTimeout(load, 120);
};

watch(
  () => props.open,
  (open) => {
    navBusy.value = false;
    if (open) preloadCultivationPages();
  },
);
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
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
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

.map-area-immortal {
  border-color: rgba(255, 226, 138, 0.42);
  background:
    radial-gradient(
      circle at 50% 0%,
      rgba(255, 226, 138, 0.12),
      transparent 60%
    ),
    rgba(0, 0, 0, 0.12);
}
.map-loc-immortal {
  min-width: 70px;
  border-color: rgba(255, 226, 138, 0.26);
  background: linear-gradient(
    135deg,
    rgba(255, 226, 138, 0.09),
    rgba(116, 203, 255, 0.06)
  );
}
.map-loc-return {
  min-width: 70px;
  color: #ffe28a;
  border-color: rgba(255, 226, 138, 0.5);
}
.immortal-map-icon {
  font-size: 18px;
  line-height: 1;
}

.daily-checkin-loc {
  color: var(--color-accent);
}

.map-loc-ascension {
  color: var(--color-accent);
  border-color: rgba(245, 198, 92, 0.45);
  box-shadow: 0 0 10px rgba(245, 198, 92, 0.12);
}
.map-loc:disabled,
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
.map-path-cultivation {
  color: #c084fc;
  letter-spacing: 0.18em;
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
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.05),
    rgba(192, 132, 252, 0.08)
  );
}
.map-cultivation-title {
  color: #c084fc;
}
</style>
