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
      正在同步最新数据...
    </div>
    <div
      v-else-if="loadError"
      class="border border-danger/30 bg-danger/5 text-xs text-danger text-center p-3"
    >
      {{ loadError }}
    </div>
    <div
      v-else-if="entries.length === 0"
      class="text-xs text-muted text-center py-4"
    >
      暂无数据。登录角色并产生游戏数据后才会出现。
    </div>
    <div v-else class="space-y-1">
      <div
        v-for="(entry, idx) in entries"
        :key="`${entry.playerName}-${entry.realmName}-${idx}`"
        class="leaderboard-row border border-accent/15 rounded-xs p-2"
        :class="rankRowClass(idx)"
      >
        <div class="flex items-center gap-2">
          <span
            class="rank-badge text-lg w-8 text-center shrink-0"
            :class="rankBadgeClass(idx)"
            >{{ idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1 }}</span
          >
          <button
            type="button"
            class="profile-avatar shrink-0"
            :class="profileAvatarClass(entry)"
            :aria-label="`查看${entry.playerName}的公开仙籍`"
            :aria-expanded="expandedEntryKey === entryKey(entry, idx)"
            @click="toggleProfile(entry, idx)"
          >
            <span class="profile-avatar-emoji">{{ avatarEmoji(entry.publicProfile?.avatarId) }}</span>
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
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
            <div class="text-[10px] text-muted flex items-center gap-2">
              <span>第{{ entry.year }}年 {{ entry.season }} 第{{ entry.day }}天</span>
              <button
                type="button"
                class="profile-toggle"
                @click="toggleProfile(entry, idx)"
              >
                {{ expandedEntryKey === entryKey(entry, idx) ? "收起仙籍" : "查看仙籍" }}
              </button>
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-sm text-accent">{{ formatValue(entry) }}</div>
            <div class="text-[10px] text-muted">{{ activeTabLabel }}</div>
          </div>
        </div>
        <div
          v-if="expandedEntryKey === entryKey(entry, idx)"
          class="public-profile mt-2 pt-2 border-t border-accent/15"
        >
          <div class="public-profile-title">
            <span>✦ 公开仙籍</span>
            <span>{{ entry.publicProfile?.ascended ? "仙界英姿" : "凡界英姿" }}</span>
          </div>
          <div class="public-profile-grid">
            <div><span>身份</span><b>{{ entry.publicProfile?.genderLabel || "未公开" }}</b></div>
            <div><span>境界</span><b>{{ entry.realmName || "凡人" }}</b></div>
            <div><span>灵根</span><b>{{ entry.publicProfile?.spiritRoot || "未显灵根" }}</b></div>
            <div class="col-span-2 profile-attributes">
              <span>资质</span>
              <b>
                根骨 {{ entry.publicProfile?.attributes?.physique || 1 }} ·
                力道 {{ entry.publicProfile?.attributes?.strength || 1 }} ·
                身法 {{ entry.publicProfile?.attributes?.agility || 1 }} ·
                悟性 {{ entry.publicProfile?.attributes?.perception || 1 }}
              </b>
            </div>
            <template v-if="entry.publicProfile?.ascended">
              <div><span>仙籍</span><b>{{ entry.publicProfile.immortalRank || "初录仙籍" }}</b></div>
              <div><span>仙职</span><b>{{ entry.publicProfile.immortalOffice || "未授仙职" }}</b></div>
              <div><span>道统</span><b>{{ entry.publicProfile.lineage || "未立道统" }}</b></div>
              <div class="col-span-2"><span>本命仙术</span><b>{{ entry.publicProfile.immortalArt || "尚未显化" }}</b></div>
            </template>
          </div>
          <p class="public-profile-note">仅展示角色公开资料，不显示账号、资产与存档隐私。</p>
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
const loadError = ref("");
const expandedEntryKey = ref("");

const entryKey = (entry: any, idx: number) =>
  `${entry?.playerName || "无名"}-${entry?.realmName || "凡人"}-${idx}`;

const toggleProfile = (entry: any, idx: number) => {
  const key = entryKey(entry, idx);
  expandedEntryKey.value = expandedEntryKey.value === key ? "" : key;
};

const AVATAR_EMOJI: Record<string, string> = { bamboo_scholar: "🎋", peach_swordswoman: "🌸", cloud_alchemist: "☁️", crane_hermit: "🪽", lotus_mystic: "🪷", thunder_guardian: "⚡", moon_rabbit: "🐇", golden_carp: "🐟" };
const avatarEmoji = (id: unknown) => AVATAR_EMOJI[String(id)] || AVATAR_EMOJI.bamboo_scholar;

const profileAvatarClass = (entry: any) => ({
  "profile-avatar-female": entry?.publicProfile?.gender === "female",
  "profile-avatar-immortal": entry?.publicProfile?.ascended === true,
});

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

const flushRealtimeSave = () =>
  new Promise<boolean>((resolve) => {
    const timeout = window.setTimeout(() => resolve(false), 12000);
    window.dispatchEvent(
      new CustomEvent("taoyuan:flush-realtime-save", {
        detail: {
          resolve: (ok: boolean) => {
            window.clearTimeout(timeout);
            resolve(ok);
          },
        },
      }),
    );
  });

const loadLeaderboard = async () => {
  if (loading.value) return;
  loading.value = true;
  loadError.value = "";
  try {
    expandedEntryKey.value = "";
    const synced = await flushRealtimeSave();
    if (!synced) {
      entries.value = [];
      loadError.value =
        "最新进度尚未写入服务器，已停止刷新排行榜，请稍后重试。游戏数据不会因排行榜未更新而回退。";
      return;
    }
    const res = await fetch(`/api/leaderboard?by=${activeTab.value}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "排行榜请求失败");
    entries.value = data.leaderboard || [];
  } catch (error: any) {
    entries.value = [];
    loadError.value = error?.message || "排行榜加载失败，请稍后重试。";
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

.profile-avatar {
  position: relative;
  width: 34px;
  height: 38px;
  overflow: hidden;
  border: 1px solid rgba(208, 170, 92, 0.35);
  border-radius: 8px 8px 5px 5px;
  background: linear-gradient(180deg, rgba(32, 52, 63, 0.95), rgba(15, 25, 30, 0.95));
  box-shadow: inset 0 0 10px rgba(108, 184, 178, 0.08);
}

.profile-avatar-emoji { font-size: 22px; line-height: 1; }

.profile-avatar:focus-visible,
.profile-avatar:hover {
  border-color: rgba(220, 183, 101, 0.85);
  box-shadow: 0 0 10px rgba(220, 183, 101, 0.22);
}

.profile-head,
.profile-body {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: block;
}

.profile-head {
  top: 7px;
  width: 13px;
  height: 13px;
  border-radius: 45% 45% 48% 48%;
  background: #d7b58b;
  box-shadow: 0 -4px 0 1px #27343c;
}

.profile-body {
  bottom: -4px;
  width: 27px;
  height: 20px;
  border-radius: 45% 45% 0 0;
  background: linear-gradient(135deg, #3d6870, #243e4b 65%);
  border-top: 2px solid rgba(215, 181, 139, 0.55);
}

.profile-avatar-female .profile-head {
  box-shadow: -4px -3px 0 1px #3b2f3d, 4px -3px 0 1px #3b2f3d;
}

.profile-avatar-female .profile-body {
  background: linear-gradient(135deg, #72526f, #3f405d 65%);
}

.profile-halo {
  position: absolute;
  z-index: 2;
  right: 2px;
  top: 0;
  color: rgba(244, 205, 112, 0);
  font-size: 10px;
}

.profile-avatar-immortal {
  border-color: rgba(244, 205, 112, 0.72);
  background: radial-gradient(circle at 50% 25%, rgba(120, 211, 220, 0.3), rgba(25, 30, 54, 0.95) 68%);
}

.profile-avatar-immortal .profile-halo {
  color: #f4cd70;
  text-shadow: 0 0 6px rgba(244, 205, 112, 0.8);
}

.profile-toggle {
  color: rgba(217, 181, 102, 0.9);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.public-profile {
  position: relative;
  z-index: 1;
}

.public-profile-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: rgba(225, 190, 111, 0.95);
  font-size: 11px;
}

.public-profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.public-profile-grid > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid rgba(208, 170, 92, 0.14);
  border-radius: 3px;
  background: rgba(11, 23, 29, 0.35);
  font-size: 10px;
}

.public-profile-grid span {
  color: rgba(155, 168, 169, 0.9);
}

.public-profile-grid b {
  overflow: hidden;
  color: rgba(226, 199, 139, 0.95);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-profile-grid .profile-attributes {
  align-items: flex-start;
}

.public-profile-grid .profile-attributes b {
  overflow: visible;
  text-align: right;
  text-overflow: clip;
  white-space: normal;
}

.public-profile-note {
  margin-top: 5px;
  color: rgba(142, 157, 159, 0.75);
  font-size: 9px;
  text-align: right;
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
