<template>
  <div class="space-y-3">
    <Divider title label="排行榜" />

    <div class="flex gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="btn flex-1 justify-center text-xs"
        :class="{ '!bg-accent !text-bg': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="text-xs text-muted text-center py-4">
      加载中...
    </div>
    <div
      v-else-if="entries.length === 0"
      class="text-xs text-muted text-center py-4"
    >
      暂无数据。需要玩家登录账号并保存云存档后才会出现。
    </div>
    <div v-else class="space-y-1">
      <div
        v-for="(entry, idx) in entries"
        :key="idx"
        class="leaderboard-row border border-accent/15 rounded-xs p-2 flex items-center gap-2"
        :class="rankRowClass(idx)"
      >
        <span
          class="rank-badge text-lg w-8 text-center shrink-0"
          :class="rankBadgeClass(idx)"
          >{{ idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1 }}</span
        >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="rank-name text-sm truncate"
              :class="rankNameClass(idx)"
              :data-name="entry.playerName"
              >{{ entry.playerName }}</span
            >
            <span
              v-if="entry.daoTitle"
              class="dao-title text-[10px] shrink-0"
              >「{{ entry.daoTitle }}」</span
            >
            <span
              v-if="idx < 10"
              class="rank-effect-tag text-[10px]"
              :class="rankTagClass(idx)"
              >{{ rankEffectLabel(idx) }}</span
            >
            <span class="text-[10px] text-muted">{{ entry.realmName }}</span>
          </div>
          <div class="text-[10px] text-muted">
            第{{ entry.year }}年 {{ entry.season }} 第{{ entry.day }}天
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-sm text-accent">{{ formatValue(entry) }}</div>
          <div class="text-[10px] text-muted">{{ activeTabLabel }}</div>
        </div>
      </div>
    </div>

    <div
      v-if="myRankHint"
      class="border border-accent/15 rounded-xs p-2 text-xs text-accent/80 text-center"
    >
      📈 {{ myRankHint }}
    </div>
    <button class="btn w-full justify-center" @click="loadLeaderboard">
      刷新排行
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Divider from "@/components/game/Divider.vue";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useCultivationStore } from "@/stores/useCultivationStore";

const tabs = [
  { key: "cultivation", label: "境界" },
  { key: "power", label: "战力" },
  { key: "money", label: "铜钱" },
  { key: "aura", label: "灵气" },
];
const activeTab = ref("cultivation");
const entries = ref<any[]>([]);
const loading = ref(false);

const activeTabLabel = computed(
  () => tabs.find((t) => t.key === activeTab.value)?.label ?? "",
);

const rankRowClass = (idx: number) => {
  if (idx === 0) return "rank-row-gold";
  if (idx === 1) return "rank-row-silver";
  if (idx === 2) return "rank-row-bronze";
  if (idx < 10) return "rank-row-top10";
  return "";
};

const rankNameClass = (idx: number) => {
  if (idx === 0) return "rank-name-gold";
  if (idx === 1) return "rank-name-silver";
  if (idx === 2) return "rank-name-bronze";
  if (idx < 10) return "rank-name-top10";
  return "text-accent";
};

const rankBadgeClass = (idx: number) => {
  if (idx === 0) return "rank-badge-gold";
  if (idx === 1) return "rank-badge-silver";
  if (idx === 2) return "rank-badge-bronze";
  if (idx < 10) return "rank-badge-top10";
  return "";
};

const rankTagClass = (idx: number) => {
  if (idx === 0) return "rank-tag-gold";
  if (idx === 1) return "rank-tag-silver";
  if (idx === 2) return "rank-tag-bronze";
  return "rank-tag-top10";
};

const rankEffectLabel = (idx: number) => {
  if (idx === 0) return "天榜魁首";
  if (idx === 1) return "月华无双";
  if (idx === 2) return "赤铜战名";
  return "星辉十杰";
};

const switchTab = (key: string) => {
  activeTab.value = key;
  loadLeaderboard();
};

const formatValue = (entry: any) => {
  if (activeTab.value === "money")
    return `${(entry.money || 0).toLocaleString()}文`;
  if (activeTab.value === "aura") return `${entry.aura || 0}`;
  if (activeTab.value === "power")
    return `${(entry.combatPower || 0).toLocaleString()}`;
  return `${entry.realmName || "凡人"} · ${entry.cultivation || 0}`;
};

const loadLeaderboard = async () => {
  loading.value = true;
  try {
    const res = await fetch(`/api/leaderboard?by=${activeTab.value}`);
    const data = await res.json().catch(() => ({}));
    entries.value = data.leaderboard || [];
  } catch {
    entries.value = [];
  } finally {
    loading.value = false;
  }
};

const player = usePlayerStore();
const cultivation = useCultivationStore();

// 距离上一名提示
const myRankHint = computed(() => {
  if (entries.value.length === 0) return "";
  const myName = player.playerName;
  const myIdx = entries.value.findIndex((e: any) => e.playerName === myName);
  if (myIdx < 0) {
    // Not on board — show distance to last place
    const last = entries.value[entries.value.length - 1];
    if (!last) return "";
    if (activeTab.value === "power")
      return `距上榜还需战力 ${(last.combatPower || 0) - (cultivation.combatPower || 0) > 0 ? (last.combatPower || 0) - (cultivation.combatPower || 0) : 0}`;
    if (activeTab.value === "money")
      return `距上榜还需铜钱 ${Math.max(0, (last.money || 0) - (player.money || 0))}`;
    if (activeTab.value === "aura")
      return `距上榜还需灵气 ${Math.max(0, (last.aura || 0) - (cultivation.aura || 0))}`;
    return "努力上榜吧！";
  }
  if (myIdx === 0) return "🏆 你是榜首！";
  const above = entries.value[myIdx - 1];
  if (!above) return "";
  if (activeTab.value === "power")
    return `距上一名差战力 ${(above.combatPower || 0) - (cultivation.combatPower || 0)}`;
  if (activeTab.value === "money")
    return `距上一名差铜钱 ${Math.max(0, (above.money || 0) - (player.money || 0))}`;
  if (activeTab.value === "aura")
    return `距上一名差灵气 ${Math.max(0, (above.aura || 0) - (cultivation.aura || 0))}`;
  return `距上一名差${above.cultivation - (cultivation.cultivation || 0)}修为`;
});

onMounted(loadLeaderboard);
</script>

<style scoped>
.leaderboard-row {
  position: relative;
  overflow: hidden;
}

.leaderboard-row::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.rank-row-gold {
  border-color: rgba(255, 205, 86, 0.55);
  background:
    radial-gradient(
      circle at 12% 20%,
      rgba(255, 210, 90, 0.18),
      transparent 34%
    ),
    rgba(255, 193, 7, 0.06);
  box-shadow:
    0 0 18px rgba(255, 190, 70, 0.16),
    inset 0 0 14px rgba(255, 231, 135, 0.06);
}

.rank-row-silver {
  border-color: rgba(190, 225, 255, 0.46);
  background:
    radial-gradient(
      circle at 12% 20%,
      rgba(190, 225, 255, 0.16),
      transparent 34%
    ),
    rgba(125, 190, 255, 0.05);
  box-shadow:
    0 0 16px rgba(160, 220, 255, 0.13),
    inset 0 0 14px rgba(220, 245, 255, 0.05);
}

.rank-row-bronze {
  border-color: rgba(255, 142, 86, 0.42);
  background:
    radial-gradient(
      circle at 12% 20%,
      rgba(255, 132, 72, 0.15),
      transparent 34%
    ),
    rgba(255, 104, 54, 0.05);
  box-shadow:
    0 0 14px rgba(255, 120, 70, 0.12),
    inset 0 0 14px rgba(255, 180, 120, 0.05);
}

.rank-row-top10 {
  border-color: rgba(120, 220, 255, 0.26);
  background: linear-gradient(
    90deg,
    rgba(60, 180, 255, 0.04),
    rgba(200, 120, 255, 0.05),
    rgba(60, 180, 255, 0.04)
  );
}

.rank-row-gold::before,
.rank-row-silver::before,
.rank-row-bronze::before,
.rank-row-top10::before {
  opacity: 1;
  background: linear-gradient(
    115deg,
    transparent 0%,
    rgba(255, 255, 255, 0.18) 45%,
    transparent 58%
  );
  transform: translateX(-130%);
  animation: rankSweep 3.8s ease-in-out infinite;
}

.rank-row-silver::before {
  animation-delay: 0.35s;
}
.rank-row-bronze::before {
  animation-delay: 0.7s;
}
.rank-row-top10::before {
  animation-delay: 1s;
  opacity: 0.65;
}

.dao-title {
  color: #d8b4fe;
  white-space: nowrap;
}

.rank-name {
  position: relative;
  z-index: 1;
  font-weight: 800;
  letter-spacing: 0.04em;
  max-width: 9rem;
}

.rank-name-gold {
  color: #ffe08a;
  text-shadow:
    0 0 6px rgba(255, 201, 74, 0.95),
    0 0 14px rgba(255, 116, 38, 0.55),
    0 1px 0 #7a3600;
  animation: goldPulse 1.9s ease-in-out infinite;
}

.rank-name-silver {
  color: #e9fbff;
  text-shadow:
    0 0 6px rgba(200, 245, 255, 0.9),
    0 0 14px rgba(112, 180, 255, 0.55),
    0 1px 0 #24406a;
  animation: silverFloat 2.4s ease-in-out infinite;
}

.rank-name-bronze {
  color: #ffb07a;
  text-shadow:
    0 0 6px rgba(255, 138, 82, 0.9),
    0 0 13px rgba(255, 67, 38, 0.45),
    0 1px 0 #65240f;
  animation: bronzeSpark 2.1s ease-in-out infinite;
}

.rank-name-top10 {
  color: #bff7ff;
  background: linear-gradient(90deg, #7ee7ff, #f1c6ff, #fff6a8, #7ee7ff);
  background-size: 240% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 8px rgba(95, 220, 255, 0.35);
  animation: starGradient 3s linear infinite;
}

.rank-badge {
  position: relative;
  z-index: 1;
}
.rank-badge-gold {
  filter: drop-shadow(0 0 6px rgba(255, 210, 70, 0.9));
  animation: badgePop 1.8s ease-in-out infinite;
}
.rank-badge-silver {
  filter: drop-shadow(0 0 6px rgba(190, 235, 255, 0.75));
  animation: badgePop 2.2s ease-in-out infinite;
}
.rank-badge-bronze {
  filter: drop-shadow(0 0 6px rgba(255, 135, 75, 0.75));
  animation: badgePop 2s ease-in-out infinite;
}
.rank-badge-top10 {
  color: #7ee7ff;
  text-shadow: 0 0 8px rgba(95, 220, 255, 0.55);
}

.rank-effect-tag {
  position: relative;
  z-index: 1;
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 4px;
  white-space: nowrap;
}

.rank-tag-gold {
  color: #ffd45a;
  background: rgba(255, 205, 80, 0.08);
  box-shadow: 0 0 8px rgba(255, 205, 80, 0.22);
}
.rank-tag-silver {
  color: #ccefff;
  background: rgba(180, 225, 255, 0.08);
  box-shadow: 0 0 8px rgba(180, 225, 255, 0.2);
}
.rank-tag-bronze {
  color: #ffa06d;
  background: rgba(255, 132, 82, 0.08);
  box-shadow: 0 0 8px rgba(255, 132, 82, 0.18);
}
.rank-tag-top10 {
  color: #9beeff;
  background: rgba(100, 220, 255, 0.06);
}

@keyframes rankSweep {
  0% {
    transform: translateX(-130%);
  }
  52%,
  100% {
    transform: translateX(130%);
  }
}
@keyframes goldPulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.35);
  }
}
@keyframes silverFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1px);
  }
}
@keyframes bronzeSpark {
  0%,
  100% {
    filter: saturate(1);
  }
  50% {
    filter: saturate(1.45) brightness(1.18);
  }
}
@keyframes starGradient {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 240% 50%;
  }
}
@keyframes badgePop {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}
</style>
