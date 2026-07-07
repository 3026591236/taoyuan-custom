<template>
  <div class="space-y-3">
    <Divider title label="🔨 炼器" />

    <div v-if="!cultivationStore.unlocked" class="text-xs text-muted text-center py-4">需先启蒙修仙</div>
    <template v-else>
      <div class="border border-accent/20 rounded-xs p-3 bg-panel/30 text-xs text-muted leading-relaxed space-y-1">
        <p class="text-accent text-sm">修仙装备淬炼</p>
        <p>炼器页现在直接服务角色页的「灵剑 / 法衣 / 云靴 / 护符」。这里负责消耗秘境材料与灵石进行淬炼；角色页负责总览战力、渡劫稳定和农场装备区分。</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div v-for="gear in gearCards" :key="gear.id" class="border border-accent/15 rounded-xs p-3 space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-lg">{{ gear.icon }}</span>
                <span class="text-accent font-bold">{{ gear.name }}</span>
                <span class="text-[10px] text-muted">{{ gear.slotName }}</span>
              </div>
              <p class="text-[10px] text-muted leading-relaxed mt-1">{{ gear.desc }}</p>
            </div>
            <span class="text-xs" :class="gear.level > 0 ? 'text-success' : 'text-muted'">{{ gear.level > 0 ? `${gear.level}阶` : '未凝练' }}</span>
          </div>

          <div class="grid grid-cols-2 gap-1 text-[10px]">
            <div class="stat-chip">战力 +{{ gear.power }}</div>
            <div class="stat-chip">渡劫 +{{ gear.tribulation }}%</div>
          </div>

          <div class="text-[10px] leading-relaxed">
            <span class="text-muted">材料：</span>
            <span :class="gear.hasMaterial ? 'text-accent' : 'text-danger'">{{ gear.material.name }}×{{ gear.material.quantity }}（{{ gear.materialOwned }}）</span>
            <span class="mx-1 text-muted">/</span>
            <span :class="gear.hasSpiritStone ? 'text-accent' : 'text-danger'">灵石×{{ gear.spiritStoneCost }}（{{ spiritStoneCount }}）</span>
          </div>

          <button class="btn w-full justify-center text-xs" :disabled="!gear.canForge || forging" @click="forgeGear(gear.id)">
            {{ gear.level >= gear.maxLevel ? '已淬炼圆满' : gear.level > 0 ? '继续淬炼' : '凝练成器' }}
          </button>
        </div>
      </div>

      <div class="border border-accent/15 rounded-xs p-3 text-[10px] text-muted leading-relaxed">
        <p class="text-accent text-xs mb-1">材料路线</p>
        <p>法宝碎片来自青丘旧林、凶兽、登仙塔和秘境抉择；魂晶来自幽冥洞窟/登仙塔；风羽来自昆仑外境；雷精来自昆仑外境、宗门订单和雷云观想相关循环。多余修仙材料可在洞府折灵换灵石。</p>
      </div>
    </template>

    <Transition name="panel-fade">
      <div v-if="forging" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="text-center">
          <div class="forge-anvil text-6xl">🔨</div>
          <div class="forge-fire text-4xl mt-2">🔥</div>
          <div class="text-accent font-bold mt-4">{{ forgeStage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import Divider from '@/components/game/Divider.vue'
  import { DAO_GEAR, type DaoGearId } from '@/stores/useCultivationStore'
  import { useCultivationStore } from '@/stores/useCultivationStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'

  const cultivationStore = useCultivationStore()
  const inv = useInventoryStore()
  const forging = ref(false)
  const forgeStage = ref('')

  const slotIcons: Record<string, string> = { sword: '🗡️', robe: '🥋', boots: '👢', amulet: '📿' }
  const slotNames: Record<string, string> = { sword: '灵剑', robe: '法衣', boots: '云靴', amulet: '护符' }
  const spiritStoneCount = computed(() => inv.getItemCount('spirit_stone'))

  const gearCards = computed(() => DAO_GEAR.map(gear => {
    const level = cultivationStore.daoGearLevel(gear.id)
    const materialOwned = inv.getItemCount(gear.material.itemId)
    const hasMaterial = materialOwned >= gear.material.quantity
    const hasSpiritStone = spiritStoneCount.value >= gear.spiritStoneCost
    return {
      ...gear,
      icon: slotIcons[gear.slot] ?? '✨',
      slotName: slotNames[gear.slot] ?? gear.slot,
      level,
      materialOwned,
      hasMaterial,
      hasSpiritStone,
      canForge: cultivationStore.canForgeDaoGear(gear.id),
      power: level * gear.powerPerLevel,
      tribulation: Math.round(level * gear.tribulationPerLevel * 100)
    }
  }))

  const forgeGear = async (id: DaoGearId) => {
    const gear = DAO_GEAR.find(g => g.id === id)
    if (!gear || !cultivationStore.canForgeDaoGear(id)) return
    forging.value = true
    forgeStage.value = '🔥 引火温炉...'
    await new Promise(r => setTimeout(r, 520))
    forgeStage.value = `🔨 淬炼${gear.name}...`
    await new Promise(r => setTimeout(r, 620))
    forgeStage.value = '✨ 灵纹入器...'
    await new Promise(r => setTimeout(r, 520))
    cultivationStore.forgeDaoGear(id)
    forgeStage.value = `✅ ${gear.name}淬炼完成！`
    await new Promise(r => setTimeout(r, 700))
    forging.value = false
  }
</script>

<style scoped>
  .stat-chip {
    border: 1px solid rgba(200, 164, 92, 0.16);
    background: rgba(200, 164, 92, 0.06);
    border-radius: 2px;
    padding: 0.25rem 0.35rem;
    color: rgb(var(--color-muted));
  }
  .forge-anvil { animation: anvil-bounce 0.4s ease infinite alternate; }
  @keyframes anvil-bounce {
    0% { transform: translateY(0) rotate(-5deg); }
    100% { transform: translateY(-15px) rotate(5deg); }
  }
  .forge-fire { animation: fire-glow 0.3s ease infinite alternate; }
  @keyframes fire-glow {
    0% { transform: scale(1); filter: brightness(1); }
    100% { transform: scale(1.2); filter: brightness(1.5); }
  }
</style>
