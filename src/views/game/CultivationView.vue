<template>
  <div class="space-y-3">
    <Divider title label="灵田修行" />

    <div class="border border-accent/20 rounded-xs p-3 bg-panel/40">
      <p class="text-sm text-accent mb-1">{{ cultivation.unlocked ? '灵田已启蒙' : '田间似有灵机' }}</p>
      <p class="text-xs text-muted leading-relaxed">
        修行并非凭空而来。桃源田庄地下藏有一缕灵脉，灵田、灵植、打坐与突破会逐步接入原本的种田生活。
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="stat-card"><span>境界</span><b>{{ cultivation.realmName }}</b></div>
      <div class="stat-card"><span>灵根</span><b>{{ cultivation.spiritRootName }}</b></div>
      <div class="stat-card"><span>灵田</span><b>{{ cultivation.fieldTierName }}</b></div>
      <div class="stat-card"><span>灵气</span><b>{{ cultivation.aura }}</b></div>
      <div class="stat-card col-span-2">
        <div class="flex justify-between mb-1"><span>修为</span><b>{{ cultivation.cultivation }}/{{ cultivation.maxCultivation }}</b></div>
        <div class="bar"><div class="bar-fill" :style="{ width: cultivationPercent + '%' }" /></div>
      </div>
      <div class="stat-card col-span-2">
        <div class="flex justify-between mb-1"><span>灵力</span><b>{{ cultivation.mana }}/{{ cultivation.maxMana }}</b></div>
        <div class="bar"><div class="bar-fill mana" :style="{ width: manaPercent + '%' }" /></div>
      </div>
    </div>

    <div v-if="!cultivation.unlocked" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">花费 3000 文整理田庄地脉，开启黄阶灵田。开启后，部分高阶作物收获时会产生灵气。</p>
      <Button class="w-full justify-center" @click="cultivation.unlock">灵田启蒙（3000文）</Button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Button class="justify-between" @click="cultivation.meditate"><span>打坐调息</span><span class="text-muted text-xs">修为/灵力</span></Button>
      <Button class="justify-between" @click="cultivation.refineAura"><span>炼化灵气</span><span class="text-muted text-xs">灵气→修为</span></Button>
      <Button class="justify-between" :disabled="!cultivation.canBreakthrough" @click="cultivation.breakthrough"><span>尝试突破</span><span class="text-muted text-xs">消耗灵气</span></Button>
      <Button class="justify-between" @click="cultivation.upgradeField"><span>温养灵田</span><span class="text-muted text-xs">提升等阶</span></Button>
    </div>

    <div class="border border-accent/10 rounded-xs p-3 text-xs text-muted leading-relaxed">
      <p class="text-accent mb-1">灵植联动</p>
      <p>新增蕴灵稻、凝露草、朱果三种灵植。它们收获时只给少量灵气，主要用途改为炼丹材料。</p>
      <p class="mt-1">种子会随季节在万物铺出售：蕴灵稻春/夏，凝露草春/秋，朱果夏/秋。</p>
    </div>

    <Divider title label="炼丹炉" />
    <div v-if="!cultivation.alchemyUnlocked" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">花费 5000 文在灵田旁安置炼丹炉。炼丹会消耗灵植、灵气和灵力。</p>
      <Button class="w-full justify-center" :disabled="!cultivation.unlocked" @click="cultivation.unlockAlchemy">安置炼丹炉（5000文）</Button>
    </div>
    <div v-else class="grid grid-cols-1 gap-2">
      <div v-for="recipe in pillRecipes" :key="recipe.id" class="border border-accent/15 rounded-xs p-3 bg-panel/30">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div>
            <p class="text-sm text-accent">{{ recipe.name }}</p>
            <p class="text-[10px] text-muted">{{ recipe.desc }}</p>
          </div>
          <span class="text-[10px] text-muted">背包 {{ itemCount(recipe.id) }}</span>
        </div>
        <p class="text-[10px] text-muted mb-2">材料：{{ recipe.materialText }}；灵气 {{ recipe.aura }}；灵力 {{ recipe.mana }}</p>
        <div class="grid grid-cols-2 gap-2">
          <Button class="justify-center" @click="cultivation.craftPill(recipe.id)">炼制</Button>
          <Button class="justify-center" :disabled="itemCount(recipe.id) <= 0" @click="cultivation.usePill(recipe.id)">服用</Button>
        </div>
      </div>
      <p v-if="cultivation.foundationPillBlessing > 0" class="text-xs text-success">筑基丹药力：下次突破灵气需求 -{{ cultivation.foundationPillBlessing }}</p>
    </div>

    <Divider title label="洞府" />
    <div v-if="cultivation.caveTier === 0" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">花费 8000 文 + 200 灵气，在山壁开凿一处洞府。洞府内可安置丹房、灵圃、静室，大幅提升修行效率。</p>
      <Button class="w-full justify-center" :disabled="!cultivation.unlocked" @click="cultivation.openCave">开辟洞府（8000文 + 200灵气）</Button>
    </div>
    <div v-else class="space-y-2">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="stat-card"><span>洞府</span><b>{{ cultivation.caveTierName }}</b></div>
        <div class="stat-card"><span>槽位</span><b>{{ cultivation.caveSlots.length }}/{{ cultivation.caveMaxSlots }}</b></div>
        <div class="stat-card"><span>灵气恢复</span><b>+{{ cultivation.caveAuraRegen }}/次</b></div>
        <div class="stat-card"><span>设施</span><b>{{ cultivation.caveSlotNames.join('、') || '空' }}</b></div>
      </div>
      <Button class="w-full justify-between" @click="cultivation.upgradeCave"><span>扩建洞府</span><span class="text-muted text-xs">消耗灵气</span></Button>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div v-for="slot in caveSlotOptions" :key="slot.type" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs">
          <p class="text-accent text-sm mb-1">{{ slot.name }}</p>
          <p class="text-muted leading-relaxed min-h-[2rem]">{{ slot.desc }}</p>
          <p class="text-[10px] text-muted my-2">安置费：{{ slot.cost }}文</p>
          <Button class="w-full justify-center" :disabled="cultivation.hasCaveSlot(slot.type) || cultivation.caveSlots.length >= cultivation.caveMaxSlots" @click="cultivation.placeCaveSlot(slot.type)">
            {{ cultivation.hasCaveSlot(slot.type) ? '已安置' : '安置' }}
          </Button>
        </div>
      </div>
    </div>

    <Divider title label="灵兽" />
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
          <div class="mt-1 flex items-center space-x-2">
            <span class="text-[10px] text-muted shrink-0">羁绊</span>
            <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
              <div class="h-full rounded-xs bg-accent transition-all" :style="{ width: (cultivation.beastBond % 100) + '%' }" />
            </div>
            <span class="text-[10px] text-muted">{{ cultivation.beastBond }}</span>
          </div>
        </div>
      </div>
      <Button class="w-full justify-between" :disabled="beastFeedCount < (cultivation.beastData?.feedQty ?? 99)" @click="cultivation.feedBeast">
        <span>喂食{{ cultivation.beastName }}</span>
        <span class="text-muted text-xs">{{ beastFeedItemName }} {{ beastFeedCount }}/{{ cultivation.beastData?.feedQty }}</span>
      </Button>
    </div>

    <Divider title label="农具法宝化" />
    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
      <div v-for="artifact in artifacts" :key="artifact.key" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs">
        <p class="text-accent text-sm mb-1">{{ artifact.name }}</p>
        <p class="text-muted leading-relaxed min-h-[2.5rem]">{{ artifact.desc }}</p>
        <p class="text-[10px] text-muted my-2">消耗：灵气 {{ artifact.aura }} / 铜钱 {{ artifact.money }}</p>
        <Button class="w-full justify-center" :disabled="cultivation.artifacts[artifact.key]" @click="cultivation.unlockArtifact(artifact.key)">
          {{ cultivation.artifacts[artifact.key] ? '已法宝化' : '法宝化' }}
        </Button>
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
  import type { ArtifactKey, PillId } from '@/stores/useCultivationStore'

  const cultivation = useCultivationStore()
  const inventory = useInventoryStore()
  const itemCount = (id: string) => inventory.getItemCount(id)

  const caveSlotOptions: Array<{ type: import('@/stores/useCultivationStore').CaveSlotType; name: string; desc: string; cost: number }> = [
    { type: 'alchemy', name: '丹房', desc: '洞府内炼丹，灵气消耗减少20%', cost: 3000 },
    { type: 'farm', name: '灵圃', desc: '洞府内种灵植，灵气产出增加50%', cost: 2000 },
    { type: 'meditation', name: '静室', desc: '洞府内打坐，修为和灵力翻倍', cost: 4000 }
  ]

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

  const pillRecipes: Array<{ id: PillId; name: string; desc: string; materialText: string; aura: number; mana: number }> = [
    { id: 'mana_recovery_pill', name: '回灵丹', desc: '回复灵力，适合连续炼丹/调息。', materialText: '凝露草×2', aura: 20, mana: 0 },
    { id: 'qi_gathering_pill', name: '聚气丹', desc: '增加修为，是炼气期日常修炼丹。', materialText: '蕴灵稻×3、凝露草×1', aura: 60, mana: 10 },
    { id: 'foundation_pill', name: '筑基丹', desc: '辅助突破，降低下次突破灵气需求。', materialText: '朱果×2、凝露草×3、蕴灵稻×5', aura: 360, mana: 40 }
  ]

  const artifacts: Array<{ key: ArtifactKey; name: string; desc: string; aura: number; money: number }> = [
    { key: 'glimmerHoe', name: '流光锄', desc: '锄刃引动地脉，灵植收获时额外产出灵气。', aura: 220, money: 2000 },
    { key: 'spiritKettle', name: '引灵壶', desc: '炼化灵气时收益提高，修为增长更稳定。', aura: 320, money: 2600 },
    { key: 'spiritRain', name: '灵雨诀', desc: '以法诀唤灵雨，灵植收获额外引灵。', aura: 520, money: 3600 }
  ]

  const cultivationPercent = computed(() => Math.min(100, Math.round((cultivation.cultivation / cultivation.maxCultivation) * 100)))
  const manaPercent = computed(() => Math.min(100, Math.round((cultivation.mana / cultivation.maxMana) * 100)))
</script>

<style scoped>
  .stat-card { border: 1px solid rgba(200,164,92,.18); border-radius: 2px; padding: 8px; background: rgba(0,0,0,.12); display: flex; justify-content: space-between; gap: 8px; }
  .stat-card b { color: var(--color-accent); font-weight: 400; }
  .bar { height: 6px; border: 1px solid rgba(200,164,92,.22); background: rgba(0,0,0,.2); }
  .bar-fill { height: 100%; background: var(--color-accent); transition: width .2s; }
  .bar-fill.mana { background: rgb(96,165,250); }
</style>
