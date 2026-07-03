<template>
  <div class="space-y-3">
    <Divider title label="🔨 炼器" />

    <div v-if="!cultivationStore.unlocked" class="text-xs text-muted text-center py-4">需先启蒙修仙</div>
    <div v-else class="space-y-2">
      <div v-for="recipe in FORGE_RECIPES" :key="recipe.id" class="border border-accent/15 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-accent font-bold">{{ recipe.name }}</span>
            <span class="text-[10px] ml-1" :class="qualityColor(recipe.quality)">{{ qualityLabel(recipe.quality) }}</span>
          </div>
          <div class="text-[10px] text-muted">{{ recipe.slot }}</div>
        </div>
        <div class="text-[10px] text-muted">效果：{{ recipe.effectDesc }}</div>
        <div class="text-[10px]">
          <span class="text-muted">材料：</span>
          <span v-for="(m, i) in recipe.materials" :key="i" class="mr-2" :class="hasMaterial(m) ? 'text-accent' : 'text-danger'">
            {{ m.name }}×{{ m.qty }}
          </span>
          <span :class="hasSpiritStones(recipe.spiritStones) ? 'text-accent' : 'text-danger'" class="ml-2">灵石×{{ recipe.spiritStones }}</span>
        </div>
        <button class="btn w-full justify-center text-xs" @click="forge(recipe)" :disabled="!canForge(recipe)">
          🔨 炼制
        </button>
      </div>
    </div>

    <!-- 炼器动画遮罩 -->
    <Transition name="panel-fade">
      <div v-if="forging" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="text-center">
          <div class="forge-anvil text-6xl">🔨</div>
          <div class="forge-fire text-4xl mt-2">🔥</div>
          <div class="text-accent font-bold mt-4">{{ forgeStage }}</div>
        </div>
      </div>
    </Transition>

    <!-- 法宝栏 -->
    <Divider title label="法宝装备" />
    <div class="grid grid-cols-3 gap-2">
      <div v-for="(slot, key) in ARTIFACT_SLOTS" :key="key" class="border border-accent/15 rounded-xs p-2 text-center">
        <div class="text-[10px] text-muted">{{ slot }}</div>
        <div v-if="(cultivationStore.artifacts as any)?.[key]" class="text-lg mt-1" :class="qualityColor((cultivationStore.artifacts as any)[key].quality)">
          {{ (cultivationStore.artifacts as any)[key].emoji }}
        </div>
        <div v-else class="text-lg mt-1 text-muted">—</div>
        <div v-if="(cultivationStore.artifacts as any)?.[key]" class="text-[10px]" :class="qualityColor((cultivationStore.artifacts as any)[key].quality)">
          {{ (cultivationStore.artifacts as any)[key].name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import Divider from '@/components/game/Divider.vue'
  import { useCultivationStore } from '@/stores/useCultivationStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { addLog, showFloat } from '@/composables/useGameLog'

  const cultivationStore = useCultivationStore()
  const inv = useInventoryStore()

  const forging = ref(false)
  const forgeStage = ref('')

  type Quality = 'common' | 'spirit' | 'immortal' | 'divine' | 'saint'
  const ARTIFACT_SLOTS: Record<string, string> = {
    sword: '🗡️飞剑', armor: '🛡️护甲', talisman: '📜灵符',
    seal: '🔮法印', orb: '💠灵珠', array: '⭕阵盘'
  }

  const FORGE_RECIPES = [
    { id: 'iron_sword', name: '玄铁剑', emoji: '🗡️', slot: 'sword', quality: 'common' as Quality, spiritStones: 10, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 3 }], effectDesc: '攻击+8', atk: 8, def: 0, aura: 0, cultivation: 0 },
    { id: 'spirit_sword', name: '灵光剑', emoji: '🗡️', slot: 'sword', quality: 'spirit' as Quality, spiritStones: 30, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 5 }, { itemId: 'spirit_stone', name: '灵石', qty: 10 }], effectDesc: '攻击+20', atk: 20, def: 0, aura: 5, cultivation: 0 },
    { id: 'iron_armor', name: '玄铁甲', emoji: '🛡️', slot: 'armor', quality: 'common' as Quality, spiritStones: 15, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 5 }], effectDesc: '防御+10', atk: 0, def: 10, aura: 0, cultivation: 0 },
    { id: 'spirit_armor', name: '灵光甲', emoji: '🛡️', slot: 'armor', quality: 'spirit' as Quality, spiritStones: 35, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 8 }, { itemId: 'spirit_stone', name: '灵石', qty: 12 }], effectDesc: '防御+22 灵气+3', atk: 0, def: 22, aura: 3, cultivation: 0 },
    { id: 'spirit_talisman', name: '聚灵符', emoji: '📜', slot: 'talisman', quality: 'common' as Quality, spiritStones: 8, materials: [{ itemId: 'spirit_stone', name: '灵石', qty: 5 }], effectDesc: '灵气+10', atk: 0, def: 0, aura: 10, cultivation: 0 },
    { id: 'aura_orb', name: '灵珠', emoji: '💠', slot: 'orb', quality: 'spirit' as Quality, spiritStones: 20, materials: [{ itemId: 'spirit_stone', name: '灵石', qty: 15 }], effectDesc: '灵气+15 修为+5', atk: 0, def: 0, aura: 15, cultivation: 5 },
    { id: 'thunder_seal', name: '雷印', emoji: '🔮', slot: 'seal', quality: 'immortal' as Quality, spiritStones: 50, materials: [{ itemId: 'thunder_essence', name: '雷精', qty: 2 }, { itemId: 'spirit_stone', name: '灵石', qty: 20 }], effectDesc: '攻击+35 防御+15', atk: 35, def: 15, aura: 0, cultivation: 0 },
    { id: 'array_disk', name: '五行阵盘', emoji: '⭕', slot: 'array', quality: 'immortal' as Quality, spiritStones: 60, materials: [{ itemId: 'nether_core', name: '冥核', qty: 1 }, { itemId: 'thunder_essence', name: '雷精', qty: 1 }, { itemId: 'spirit_stone', name: '灵石', qty: 25 }], effectDesc: '全属性+20', atk: 20, def: 20, aura: 20, cultivation: 20 },
  ]

  const qualityColor = (q: string) => ({ common: 'text-gray-300', spirit: 'text-green-400', immortal: 'text-blue-400', divine: 'text-purple-400', saint: 'text-yellow-400' }[q] || '')
  const qualityLabel = (q: string) => ({ common: '凡品', spirit: '灵品', immortal: '仙品', divine: '神品', saint: '圣品' }[q] || '')

  const hasMaterial = (m: { itemId: string; qty: number }) => ((inv.items as any)[m.itemId] || 0) >= m.qty
  const hasSpiritStones = (n: number) => ((inv.items as any)['spirit_stone'] || 0) >= n

  const canForge = (recipe: typeof FORGE_RECIPES[0]) => {
    if (!recipe.materials.every(m => hasMaterial(m))) return false
    if (!hasSpiritStones(recipe.spiritStones)) return false
    return true
  }

  const forge = async (recipe: typeof FORGE_RECIPES[0]) => {
    if (!canForge(recipe)) return
    // Consume materials
    for (const m of recipe.materials) inv.removeItem(m.itemId, m.qty) as any
    inv.removeItem('spirit_stone', recipe.spiritStones)

    // Forge animation
    forging.value = true
    forgeStage.value = '🔥 点火...'
    await new Promise(r => setTimeout(r, 800))
    forgeStage.value = '🔨 锻打...'
    await new Promise(r => setTimeout(r, 800))
    forgeStage.value = '✨ 成型...'
    await new Promise(r => setTimeout(r, 600))

    // Determine quality (spirit root bonus)
    let quality = recipe.quality
    const c = cultivationStore
    if (c.spiritRoot !== 'mixed' && Math.random() < 0.3) {
      const qOrder: Quality[] = ['common', 'spirit', 'immortal', 'divine', 'saint']
      const idx = qOrder.indexOf(quality)
      if (idx < qOrder.length - 1) quality = qOrder[idx + 1] as Quality
    }

    // Create artifact
    const artifact = { id: recipe.id + '_' + Date.now(), name: quality === recipe.quality ? recipe.name : recipe.name.replace(/^(玄铁|灵光|聚灵|五行)/, qualityLabel(quality)), emoji: recipe.emoji, slot: recipe.slot, quality, atk: recipe.atk * (quality !== recipe.quality ? 1.3 : 1), def: recipe.def * (quality !== recipe.quality ? 1.3 : 1), aura: recipe.aura * (quality !== recipe.quality ? 1.3 : 1), cultivation: recipe.cultivation * (quality !== recipe.quality ? 1.3 : 1) }

    if (!c.artifacts) c.artifacts = {} as any
    ;(c.artifacts as any)[recipe.slot] = artifact

    forgeStage.value = quality !== recipe.quality ? `🌟 品质提升！${qualityLabel(quality)}！` : `✅ 炼制成功！`
    await new Promise(r => setTimeout(r, 1000))
    forging.value = false

    addLog(`炼制出 ${qualityLabel(quality)}${artifact.name}！`)
    showFloat(`炼制成功：${artifact.name}`, 'success')
  }
</script>

<style scoped>
  .forge-anvil {
    animation: anvil-bounce 0.4s ease infinite alternate;
  }
  @keyframes anvil-bounce {
    0% { transform: translateY(0) rotate(-5deg); }
    100% { transform: translateY(-15px) rotate(5deg); }
  }
  .forge-fire {
    animation: fire-glow 0.3s ease infinite alternate;
  }
  @keyframes fire-glow {
    0% { transform: scale(1); filter: brightness(1); }
    100% { transform: scale(1.2); filter: brightness(1.5); }
  }
</style>
