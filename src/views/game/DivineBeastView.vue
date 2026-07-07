<template>
  <div class="space-y-3">
    <Divider title label="🐾 灵兽" />
    <div v-if="!cultivation.beast" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">消耗 30 灵力引灵，在灵脉附近寻找灵兽伙伴。灵兽会提供被动加成，陪伴你修行。</p>
      <Button class="w-full justify-center" :disabled="!cultivation.unlocked || cultivation.mana < 30" @click="cultivation.encounterBeast">引灵寻兽（30灵力）</Button>
    </div>
    <div v-else class="space-y-2">
      <div class="border border-accent/20 rounded-xs p-3 bg-panel/40 flex items-center gap-3">
        <span class="text-3xl">{{ cultivation.beastEmoji }}</span>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm text-accent">{{ cultivation.beastName }}</span>
            <span class="text-[10px] text-muted">Lv.{{ cultivation.beastLevel }}</span>
          </div>
          <p class="text-xs text-muted">{{ cultivation.beastData?.desc }}</p>
          <p class="text-xs text-success mt-0.5">{{ cultivation.beastData?.bonusDesc }}</p>
          <p class="text-[10px] text-accent mt-0.5">阶段：{{ cultivation.beastStage }} · {{ cultivation.beastAssistDesc }}</p>
          <div class="mt-1 flex items-center space-x-2">
            <span class="text-[10px] text-muted shrink-0">羁绊</span>
            <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
              <div class="h-full rounded-xs bg-accent transition-all" :style="{ width: (cultivation.beastBond % 100) + '%' }" />
            </div>
            <span class="text-[10px] text-muted">{{ cultivation.beastBond }}</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Button class="w-full justify-between" :disabled="beastFeedCount < (cultivation.beastData?.feedQty ?? 99)" @click="cultivation.feedBeast">
          <span>喂食{{ cultivation.beastName }}</span>
          <span class="text-muted text-xs">{{ beastFeedItemName }} {{ beastFeedCount }}/{{ cultivation.beastData?.feedQty }}</span>
        </Button>
        <Button class="w-full justify-between" :disabled="!cultivation.beastDailyAvailable" @click="cultivation.trainBeastDaily">
          <span>每日陪练</span>
          <span class="text-muted text-xs">体力8 / 灵力12</span>
        </Button>
      </div>
      <div class="border border-accent/10 rounded-xs p-2 text-[10px] text-muted leading-relaxed">
        羁绊阶段：初识 0 · 亲近 100 · 同心 300 · 灵契 500。战斗胜利会触发协战并小幅增加羁绊，凶兽与登仙塔收益更高。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore } from '@/stores/useCultivationStore'
import { useInventoryStore } from '@/stores/useInventoryStore'

const cultivation = useCultivationStore()
const inventory = useInventoryStore()

const beastFeedCount = computed(() => {
  const crop = cultivation.beastData?.feedCrop
  return crop ? inventory.getItemCount(crop) : 0
})
const beastFeedItemName = computed(() => {
  const crop = cultivation.beastData?.feedCrop
  if (crop === 'dew_grass') return '凝露草'
  if (crop === 'spirit_rice') return '蕴灵稻'
  if (crop === 'vermilion_fruit') return '朱果'
  return crop ?? ''
})
</script>

<style scoped>
</style>
