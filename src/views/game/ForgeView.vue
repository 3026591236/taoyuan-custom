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

          <div class="border border-accent/10 rounded-xs p-2 text-[10px] space-y-1">
            <p class="text-accent">词条洗练</p>
            <p v-if="affixFor(gear.slot)" class="text-muted">
              当前：<span :class="affixRarityClass(affixFor(gear.slot)?.rarity)">{{ affixFor(gear.slot)?.rarity || '普通' }}·{{ affixFor(gear.slot)?.name }}</span>
              Lv.{{ affixFor(gear.slot)?.level }} · {{ affixFor(gear.slot)?.desc }}
              <span v-if="affixFor(gear.slot)?.setId"> · {{ setName(affixFor(gear.slot)?.setId) }}</span>
            </p>
            <p v-else class="text-muted">暂无词条，可消耗灵石洗练出随机方向；连续8次未出稀有会触发保底。</p>
            <div class="grid grid-cols-2 gap-1">
              <button class="btn justify-center text-xs" :disabled="spiritStoneCount < (affixFor(gear.slot)?.locked ? 20 : 12)" @click="rerollAffix(gear.slot)">洗练（{{ affixFor(gear.slot)?.locked ? '锁定×20' : '灵石×12' }}）</button>
              <button class="btn justify-center text-xs" :disabled="!affixFor(gear.slot)" @click="toggleAffixLock(gear.slot)">{{ affixFor(gear.slot)?.locked ? '解锁词条' : '锁定词条' }}</button>
            </div>
            <p class="text-muted">保底进度：{{ longTerm.gearPity[gear.slot] || 0 }}/8</p>
          </div>

        </div>
      </div>


      <div class="border border-accent/15 rounded-xs p-3 text-[10px] text-muted leading-relaxed space-y-2">
        <p class="text-accent text-xs">套装词条与稀有图鉴</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div v-for="set in longTerm.gearSetBonuses" :key="set.id" class="stat-chip" :class="set.active ? 'text-success' : ''">{{ set.name }} {{ set.count }}/4 · {{ set.desc }}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
          <div v-for="entry in longTerm.rareAffixCodex" :key="entry.name" class="stat-chip" :class="entry.discovered ? affixRarityClass(entry.rarity) : 'text-muted'">{{ entry.discovered ? '已发现' : '未发现' }} · {{ entry.rarity }} {{ entry.name }} · {{ entry.desc }}</div>
        </div>
      </div>

      <div class="border border-accent/15 rounded-xs p-3 text-[10px] text-muted leading-relaxed">
        <p class="text-accent text-xs mb-1">材料路线</p>
        <p>法宝碎片来自青丘旧林、凶兽、登仙塔和秘境抉择；魂晶来自幽冥洞窟/登仙塔；风羽来自昆仑外境；雷精来自昆仑外境、宗门订单和雷云观想相关循环。炼器图纸暂不参与四件装备淬炼，可在洞府折灵换灵石。</p>
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
  import { useLongTermStore } from '@/stores/useLongTermStore'
  import { addLog, showFloat } from '@/composables/useGameLog'

  const cultivationStore = useCultivationStore()
  const inv = useInventoryStore()
  const longTerm = useLongTermStore()
  const forging = ref(false)
  const forgeStage = ref('')

  const slotIcons: Record<string, string> = { sword: '🗡️', robe: '🥋', boots: '👢', amulet: '📿' }
  const slotNames: Record<string, string> = { sword: '灵剑', robe: '法衣', boots: '云靴', amulet: '护符' }
  const spiritStoneCount = computed(() => inv.getItemCount('spirit_stone'))

  const affixFor = (slot: string) => longTerm.gearAffixes[slot]?.[0]
  const setName = (id?: string) => ({ demon: '镇魔套装', spirit: '聚灵套装', sea: '瀚海套装' } as Record<string, string>)[id || ''] || ''
  const affixRarityClass = (rarity?: string) => rarity === '绝品' ? 'text-amber-300' : rarity === '稀有' ? 'text-purple-300' : 'text-accent'

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

  const toggleAffixLock = (slot: string) => {
    const res = longTerm.toggleAffixLock(slot)
    addLog(res.message)
    showFloat(res.message, res.success ? 'success' : 'danger')
  }

  const rerollAffix = (slot: string) => {
    const res = longTerm.rerollGearAffix(slot)
    addLog(res.message)
    showFloat(res.message, res.success ? 'success' : 'danger')
  }

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
