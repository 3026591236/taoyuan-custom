<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-sm text-accent">
        <Zap :size="14" />
        <span>快捷用药</span>
      </div>
      <span class="text-xs text-muted"
        >体力 {{ playerStore.stamina }}/{{ playerStore.maxStamina
        }}<span
          v-if="playerStore.stamina > playerStore.maxStamina"
          class="text-success"
        >
          +{{ playerStore.stamina - playerStore.maxStamina }}</span
        ></span
      >
    </div>

    <div
      class="border border-accent/15 rounded-xs p-3 bg-accent/5 text-xs text-muted leading-relaxed"
    >
      这里会汇总纳戒中可快速使用的丹药、食物和功能道具。体力丹可让体力临时超过上限，最多额外+500；时间禁锢丹会暂停游戏时间流逝30分钟现实时间。
      <span v-if="clock.isTimeFrozen.value" class="block text-success mt-1"
        >当前时间禁锢中：剩余约 {{ freezeRemainText }}</span
      >
    </div>

    <div
      v-if="quickItems.length === 0"
      class="py-8 text-center text-muted border border-accent/10 rounded-xs"
    >
      <Package :size="24" class="mx-auto mb-2 opacity-40" />
      <p class="text-xs">纳戒中暂无可快捷使用的物品或丹药。</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div
        v-for="item in quickItems"
        :key="item.item.itemId + ':' + item.item.quality"
        class="quick-card"
      >
        <div class="min-w-0">
          <p class="text-sm text-accent truncate">
            {{ item.def?.name || item.item.itemId }}
            <span class="text-xs text-muted">×{{ item.item.quantity }}</span>
          </p>
          <p class="text-[10px] text-muted leading-relaxed mt-1">
            {{ usageText(item.item.itemId, item.def?.description) }}
          </p>
        </div>
        <Button
          class="shrink-0 !px-3"
          :icon="Sparkles"
          :icon-size="12"
          @click="handleUse(item.item.itemId, item.item.quality)"
          >使用</Button
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Zap, Package, Sparkles } from "lucide-vue-next";
import Button from "@/components/game/Button.vue";
import { getItemById } from "@/data";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useItemUsage, isQuickUsableItem } from "@/composables/useItemUsage";
import { useGameClock } from "@/composables/useGameClock";
import type { Quality } from "@/types";

const inventoryStore = useInventoryStore();
const playerStore = usePlayerStore();
const usage = useItemUsage();
const clock = useGameClock();

const quickItems = computed(() =>
  inventoryStore.items
    .map((item) => ({ item, def: getItemById(item.itemId) }))
    .filter(
      (row) =>
        isQuickUsableItem(row.item.itemId) ||
        (!!row.def?.edible && !!row.def.staminaRestore),
    )
    .sort((a, b) =>
      (a.def?.name || a.item.itemId).localeCompare(
        b.def?.name || b.item.itemId,
        "zh-Hans-CN",
      ),
    ),
);

const freezeRemainText = computed(() => {
  const ms = clock.timeFreezeRemainingMs.value;
  const minutes = Math.ceil(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
});

const usageText = (itemId: string, fallback?: string) => {
  const map: Record<string, string> = {
    stamina_pill: "使用后体力+100，可临时超过体力上限；额外体力最多+500。",
    time_stasis_pill:
      "使用后暂停游戏时间流逝30分钟现实时间，适合长时间在线整理事务。",
    mana_recovery_pill: "回复灵力，灵力已满时不会浪费。",
    cultivation_boost_pill: "元婴期以下服用，增加大量修为。",
    minor_realm_pill: "元婴期以下服用，直接提升一个小境界。",
    ascension_boost_pill: "元婴期以下服用，连续提升三重小境界。",
  };
  return map[itemId] || fallback || "可直接使用。";
};

const handleUse = (itemId: string, quality: Quality) => {
  const def = getItemById(itemId);
  if (def?.edible && def.staminaRestore && !isQuickUsableItem(itemId))
    usage.eatItem(itemId, quality);
  else usage.useItem(itemId, quality);
};
</script>

<style scoped>
.quick-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(250, 214, 124, 0.18);
  border-radius: 3px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.12);
}
.quick-card:hover {
  border-color: rgba(250, 214, 124, 0.45);
  background: rgba(250, 214, 124, 0.06);
}
</style>
