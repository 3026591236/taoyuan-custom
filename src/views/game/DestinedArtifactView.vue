<template>
  <div class="space-y-3">
    <Divider title label="⚔️ 本命法宝" />
    <div class="border border-accent/20 rounded-xs p-3 bg-panel/40">
      <p class="text-xs text-muted leading-relaxed mb-2">
        以心血祭炼，炼制属于自己的本命法宝。本命法宝是单件长期核心法宝，既能通过蕴养等级稳定提升修仙总战力，也可每日释放主动威能，辅助战斗、修行与洞府维护。
      </p>
      <div v-if="!cultivation.destinedArtifact" class="space-y-2">
        <div
          v-for="art in destinedArtifactOptions"
          :key="art.id"
          class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs"
        >
          <p class="text-accent text-sm mb-1">{{ art.emoji }} {{ art.name }}</p>
          <p class="text-muted leading-relaxed min-h-[2rem]">{{ art.desc }}</p>
          <p class="text-[10px] text-muted my-2">消耗：灵气2000 / 铜钱20000</p>
          <Button
            class="w-full justify-center"
            :disabled="!cultivation.unlocked"
            @click="cultivation.forgeDestinedArtifact(art.id)"
          >
            炼制{{ art.name }}
          </Button>
        </div>
      </div>
      <div v-else class="space-y-2">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="stat-card">
            <span>本命法宝</span
            ><b
              >{{ destinedArtifactData?.emoji }}
              {{ destinedArtifactData?.name }}</b
            >
          </div>
          <div class="stat-card">
            <span>长期战力</span
            ><b>+{{ cultivation.destinedArtifactLevel * 360 }}</b>
          </div>
        </div>
        <Button
          class="w-full justify-between"
          @click="cultivation.upgradeDestinedArtifact"
        >
          <span>蕴养法宝</span>
          <span class="text-muted text-xs"
            >{{ cultivation.destinedArtifactLevel * 5000 + 10000 }}文</span
          >
        </Button>
        <div class="artifact-active-card">
          <div>
            <p class="text-xs text-accent">主动威能</p>
            <p class="text-[10px] text-muted leading-relaxed">
              {{ cultivation.destinedArtifactActiveDesc }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[10px]">
            <div class="stat-card">
              <span>今日剩余</span
              ><b
                >{{ cultivation.destinedArtifactActiveRemaining }}/{{
                  cultivation.destinedArtifactActiveLimit
                }}</b
              >
            </div>
            <div class="stat-card">
              <span>灵力</span
              ><b>{{ cultivation.mana }}/{{ cultivation.maxMana }}</b>
            </div>
          </div>
          <Button
            class="w-full justify-center"
            :disabled="cultivation.destinedArtifactActiveRemaining <= 0"
            @click="cultivation.activateDestinedArtifact"
          >
            释放{{ destinedArtifactData?.name }}威能
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Divider from "@/components/game/Divider.vue";
import Button from "@/components/game/Button.vue";
import { useCultivationStore } from "@/stores/useCultivationStore";

const cultivation = useCultivationStore();

const destinedArtifactOptions = [
  {
    id: "qixing_sword",
    name: "七星剑",
    emoji: "🗡️",
    desc: "剑含北斗七星之威，偏向战斗威仪与长期战力成长。",
  },
  {
    id: "taiji_mirror",
    name: "太极镜",
    emoji: "🪞",
    desc: "阴阳调和之宝，偏向护身镇念与长期战力成长。",
  },
  {
    id: "azure_lotus",
    name: "青莲灯",
    emoji: "🏮",
    desc: "青莲照心之宝，偏向清心养性与长期战力成长。",
  },
];
const destinedArtifactData = computed(() =>
  destinedArtifactOptions.find((a) => a.id === cultivation.destinedArtifact),
);
</script>

<style scoped>
.stat-card {
  border: 1px solid rgba(200, 164, 92, 0.18);
  border-radius: 2px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.stat-card b {
  color: var(--color-accent);
  font-weight: 400;
}
</style>

<style scoped>
.artifact-active-card {
  border: 1px solid rgba(200, 164, 92, 0.18);
  border-radius: 4px;
  padding: 10px;
  background: linear-gradient(
    135deg,
    rgba(200, 164, 92, 0.08),
    rgba(80, 180, 255, 0.04)
  );
  display: grid;
  gap: 8px;
}
</style>
