<template>
  <div class="space-y-3">
    <Divider title label="🏺 炼丹炉" />
    <div v-if="!cultivation.alchemyUnlocked" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">花费 5000 文在灵田旁安置炼丹炉。炼丹会消耗灵植、灵气和灵力。</p>
      <Button class="w-full justify-center" :disabled="!cultivation.unlocked" @click="cultivation.unlockAlchemy">安置炼丹炉（5000文）</Button>
    </div>
    <div v-else>
      <div class="flex gap-1 mb-2 flex-wrap">
        <button v-for="cat in pillCategories" :key="cat" class="tab-btn" :class="{ active: pillFilter === cat }" @click="pillFilter = cat">{{ cat }}</button>
      </div>
      <div class="grid grid-cols-1 gap-2">
        <div v-for="recipe in filteredPillRecipes" :key="recipe.id" class="border border-accent/15 rounded-xs p-3 bg-panel/30">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div>
              <p class="text-sm text-accent">{{ recipe.name }}</p>
              <p class="text-[10px] text-muted">{{ recipe.desc }}</p>
            </div>
            <span class="text-[10px] text-muted">背包 {{ itemCount(recipe.id) }}</span>
          </div>
          <p class="text-[10px] text-muted mb-2">材料：{{ recipe.materialText }}；灵气 {{ recipe.aura }}；灵力 {{ recipe.mana }}</p>
          <p v-if="recipe.realmRequired > 0" class="text-[10px] text-caution mb-1">需达到 {{ realmNameByIndex(recipe.realmRequired) }}</p>
          <div class="grid grid-cols-2 gap-2">
            <Button class="justify-center" @click="cultivation.craftPill(recipe.id)">炼制</Button>
            <Button class="justify-center" :disabled="itemCount(recipe.id) <= 0" @click="cultivation.usePill(recipe.id)">服用</Button>
          </div>
        </div>
      </div>
      <p v-if="cultivation.foundationPillBlessing > 0" class="text-xs text-success mt-2">筑基药力：下次突破灵气需求 -{{ cultivation.foundationPillBlessing }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore, REALMS } from '@/stores/useCultivationStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import type { PillId } from '@/stores/useCultivationStore'

const cultivation = useCultivationStore()
const inventory = useInventoryStore()
const itemCount = (id: string) => inventory.getItemCount(id)
const realmNameByIndex = (idx: number) => REALMS[idx]?.name ?? ''

const pillFilter = ref('全部')
const pillCategories = ['全部', '修炼', '突破', '恢复', '特殊', '属性', '元神']

const pillRecipes: Array<{ id: PillId; name: string; desc: string; materialText: string; aura: number; mana: number; category: string; realmRequired: number }> = [
  { id: 'mana_recovery_pill', name: '回灵丹', desc: '回复灵力45点', materialText: '凝露草×2', aura: 20, mana: 0, category: '恢复', realmRequired: 0 },
  { id: 'qi_gathering_pill', name: '聚气丹', desc: '修为+160', materialText: '蕴灵稻×3、凝露草×1', aura: 60, mana: 10, category: '修炼', realmRequired: 0 },
  { id: 'foundation_pill', name: '筑基丹', desc: '降低突破灵气900，修为+300', materialText: '朱果×2、凝露草×3、蕴灵稻×5', aura: 360, mana: 40, category: '突破', realmRequired: 3 },
  { id: 'lianjing_pill', name: '炼精丹', desc: '修为+500', materialText: '川芎×30、白芷×30、锁阳×30', aura: 300, mana: 25, category: '修炼', realmRequired: 4 },
  { id: 'huaqi_pill', name: '化气丹', desc: '修为+800，灵力+30', materialText: '重楼×40、沉香×40、佩兰×40', aura: 400, mana: 35, category: '修炼', realmRequired: 7 },
  { id: 'lianqi_pill', name: '炼气丹', desc: '修为+1200，灵气+60', materialText: '川芎×50、玉竹×50、赤芍×50、重楼×50、神曲×50', aura: 500, mana: 50, category: '修炼', realmRequired: 9 },
  { id: 'huashen_pill', name: '化神丹', desc: '修为+2500', materialText: '川芎×60、重楼×60、白芷×60、赤芍×60、锁阳×60', aura: 600, mana: 60, category: '修炼', realmRequired: 14 },
  { id: 'lianshen_pill', name: '炼神丹', desc: '修为+4000', materialText: '玉竹×70、赤芍×70、重楼×70、锁阳×70、佩兰×70', aura: 700, mana: 70, category: '修炼', realmRequired: 16 },
  { id: 'life_extension_pill', name: '延寿丹', desc: '恢复全部体力', materialText: '龙葵×3、神曲×5、紫菀×5', aura: 500, mana: 80, category: '特殊', realmRequired: 8 },
  { id: 'marrow_wash_pill', name: '洗髓丹', desc: '随机洗炼灵根', materialText: '龙葵×5、赤芍×10、沉香×10、紫菀×10', aura: 800, mana: 100, category: '特殊', realmRequired: 6 },
  { id: 'good_fortune_pill', name: '造化丹', desc: '加速元神修炼', materialText: '龙葵×5、沉香×10、紫菀×10、神曲×10', aura: 900, mana: 120, category: '元神', realmRequired: 10 },
  { id: 'returning_void_pill', name: '还虚丹', desc: '突破灵气-1500', materialText: '川芎×20、玉竹×20、重楼×20、沉香×20', aura: 450, mana: 45, category: '突破', realmRequired: 12 },
  { id: 'refining_void_pill', name: '炼虚丹', desc: '突破灵气-3000', materialText: '白芷×30、赤芍×30、紫菀×30、佩兰×30、神曲×30', aura: 650, mana: 65, category: '突破', realmRequired: 18 },
  { id: 'merge_way_pill', name: '合道丹', desc: '突破灵气-5000', materialText: '龙葵×3、紫菀×15、佩兰×15、神曲×15', aura: 1000, mana: 100, category: '突破', realmRequired: 22 },
  { id: 'soul_mending_pill', name: '养魂丹', desc: '恢复元神伤势2层并治疗肉身', materialText: '魂晶×2、玉竹×20、紫菀×12', aura: 720, mana: 90, category: '元神', realmRequired: 10 },
  { id: 'nirvana_soul_pill', name: '涅魂丹', desc: '清除元神伤势，元神等级+1', materialText: '雷精×2、龙葵×2、神曲×12、魂晶×3', aura: 1200, mana: 140, category: '元神', realmRequired: 16 },
  { id: 'dragon_face_pill', name: '龙颜丹', desc: '体/精+20%', materialText: '龙葵×3、锁阳×20、沉香×20', aura: 700, mana: 90, category: '属性', realmRequired: 15 },
  { id: 'spirit_mending_pill', name: '补灵丹', desc: '灵力上限+20', materialText: '白芷×25、玉竹×25、紫菀×25', aura: 550, mana: 55, category: '属性', realmRequired: 11 },
  { id: 'rebirth_pill', name: '轮回丹', desc: '转生所需，服用可踏入轮回重塑修行', materialText: '龙葵×10、神曲×15、紫菀×15、锁阳×10', aura: 3000, mana: 200, category: '特殊', realmRequired: 20 },
]

const filteredPillRecipes = computed(() =>
  pillFilter.value === '全部' ? pillRecipes : pillRecipes.filter(r => r.category === pillFilter.value)
)
</script>

<style scoped>
.tab-btn { padding: 2px 10px; border: 1px solid rgba(200,164,92,.2); border-radius: 2px; background: transparent; color: var(--color-muted); font-size: 11px; cursor: pointer; }
.tab-btn.active { background: rgba(200,164,92,.25); color: var(--color-accent); font-weight: 500; }
</style>
