<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-accent text-sm">飞升台</h3>
      <span class="text-xs text-muted">大乘后期 · 飞升真仙</span>
    </div>

    <div
      v-if="ascensionStore.ascended"
      class="border border-success/30 rounded-xs p-4 mb-4 text-center"
    >
      <p class="text-success text-lg mb-2">已飞升仙界</p>
      <p class="text-xs text-muted">
        称号：{{ ascensionStore.immortalTitle || "初入仙门" }}
      </p>
      <div class="mt-3 flex gap-2 justify-center">
        <Button class="justify-center" @click="goImmortalWorld"
          >进入仙界</Button
        >
        <Button class="justify-center" @click="goBack">返回修行</Button>
      </div>
    </div>

    <div v-else>
      <div class="border border-accent/20 rounded-xs p-3 mb-4">
        <p class="text-sm text-accent mb-2">飞升条件</p>
        <ul class="text-xs text-muted space-y-1">
          <li
            :class="
              cultivationStore.realmIndex >= 27 ? 'text-success' : 'text-danger'
            "
          >
            境界达到大乘后期 {{ cultivationStore.realmIndex >= 27 ? "✓" : "✗" }}
          </li>
          <li>完成渡劫引导，备齐飞升材料</li>
        </ul>
      </div>
      <div class="border border-accent/20 rounded-xs p-3 mb-4">
        <p class="text-sm text-accent mb-2">飞升材料</p>
        <div
          v-for="mat in ascensionStore.ascensionMaterials"
          :key="mat.itemId"
          class="flex justify-between text-xs mb-1"
        >
          <span class="text-muted">{{ mat.name }}</span>
          <span
            :class="
              getCombinedItemCount(mat.itemId) >= mat.quantity
                ? 'text-success'
                : 'text-danger'
            "
            >{{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}</span
          >
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-muted">铜钱</span>
          <span
            :class="
              playerStore.money >= ascensionStore.ascensionMoneyCost
                ? 'text-success'
                : 'text-danger'
            "
            >{{ playerStore.money }}/{{
              ascensionStore.ascensionMoneyCost
            }}</span
          >
        </div>
      </div>
      <div class="border border-caution/20 rounded-xs p-3 mb-4">
        <p class="text-xs text-caution mb-1">飞升后</p>
        <p class="text-xs text-muted">
          境界进入真仙，开启全新的仙界界面体系；仍可随时返回下界继续旧玩法。
        </p>
      </div>
      <Button
        class="w-full justify-center"
        :class="{
          '!bg-accent !text-bg':
            ascensionStore.canAscend && ascensionStore.ascensionMaterialsReady,
        }"
        :disabled="
          !ascensionStore.canAscend || !ascensionStore.ascensionMaterialsReady
        "
        @click="handleAscend"
        >飞升</Button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAscensionStore } from "@/stores/useAscensionStore";
import { useCultivationStore } from "@/stores/useCultivationStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { getCombinedItemCount } from "@/composables/useCombinedInventory";
import { addLog } from "@/composables/useGameLog";
import Button from "@/components/game/Button.vue";
const router = useRouter();
const ascensionStore = useAscensionStore();
const cultivationStore = useCultivationStore();
const playerStore = usePlayerStore();
const handleAscend = () =>
  ascensionStore.performAscension()
    ? addLog("飞升大吉！仙界之门已开。")
    : addLog("飞升条件不满足。");
const goImmortalWorld = () => {
  ascensionStore.enterImmortalWorld();
  router.push("/game/immortal-world");
};
const goBack = () => router.push("/game/cultivation");
</script>
