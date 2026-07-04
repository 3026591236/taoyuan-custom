<template>
  <div class="space-y-3">
    <!-- ===== 洞府 ===== -->
    <Divider title label="🏔️ 洞府" />
    <div v-if="cultivation.caveTier === 0" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">花费 8000 文 + 200 灵气，在山壁开凿一处洞府。洞府内可安置丹房、灵圃、静室、百草园、聚灵阵，大幅提升修行效率。</p>
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
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
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

    <!-- ===== 百草园 ===== -->
    <Divider title label="🌿 百草园" />
    <div v-if="!cultivation.hasCaveSlot('herbgarden')" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">需先在洞府中安置百草园设施，才可在此管理药材。</p>
    </div>
    <div v-else class="space-y-2">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="stat-card"><span>百草园</span><b>Lv.{{ cultivation.herbGardenLevel }}</b></div>
        <div class="stat-card"><span>日产</span><b>{{ 10 + cultivation.herbGardenLevel }}株/种</b></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <Button class="justify-center" @click="cultivation.claimDailyHerbs">领取今日药材</Button>
        <Button class="justify-center" :disabled="cultivation.herbGardenLevel >= 10" @click="cultivation.upgradeHerbGarden">
          升级（{{ (cultivation.herbGardenLevel + 1) * 2000 }}文）
        </Button>
      </div>
      <div class="grid grid-cols-3 md:grid-cols-4 gap-1">
        <div v-for="herb in herbList" :key="herb.id" class="border border-accent/10 rounded-xs p-2 text-center text-xs">
          <span class="text-lg">{{ herb.emoji }}</span>
          <p class="text-[10px] text-accent">{{ herb.name }}</p>
          <p class="text-[10px] text-muted">{{ itemCount(herb.id) }}</p>
        </div>
      </div>
    </div>

    <!-- ===== 聚灵阵 ===== -->
    <Divider title label="🔮 聚灵阵" />
    <div v-if="!cultivation.hasCaveSlot('spiritArray')" class="game-panel p-3 text-center space-y-2">
      <p class="text-xs text-muted leading-relaxed">需先在洞府中安置聚灵阵，才可凝聚五行元气。</p>
    </div>
    <div v-else class="space-y-2">
      <div class="grid grid-cols-2 gap-2 text-xs mb-2">
        <div class="stat-card"><span>聚灵阵</span><b>Lv.{{ cultivation.spiritArrayLevel }}</b></div>
        <div class="stat-card"><span>日产</span><b>{{ 1 + cultivation.spiritArrayLevel }}/种</b></div>
      </div>
      <Button class="w-full justify-center" @click="cultivation.claimDailyElements">凝聚五行元气</Button>
      <div class="grid grid-cols-5 gap-1">
        <div v-for="el in elementList" :key="el.key" class="border border-accent/10 rounded-xs p-2 text-center text-xs">
          <span class="text-sm">{{ el.emoji }}</span>
          <p class="text-[10px] text-accent">{{ el.name }}</p>
          <p class="text-[10px] text-muted">{{ getElement(el.key) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore, HERB_DATA } from '@/stores/useCultivationStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import type { CaveSlotType } from '@/stores/useCultivationStore'

const cultivation = useCultivationStore()
const inventory = useInventoryStore()
const itemCount = (id: string) => inventory.getItemCount(id)

const caveSlotOptions: Array<{ type: CaveSlotType; name: string; desc: string; cost: number }> = [
  { type: 'alchemy', name: '丹房', desc: '洞府内炼丹，灵气消耗减少20%', cost: 3000 },
  { type: 'farm', name: '灵圃', desc: '洞府内种灵植，灵气产出增加50%', cost: 2000 },
  { type: 'meditation', name: '静室', desc: '洞府内打坐，修为和灵力翻倍', cost: 4000 },
  { type: 'herbgarden', name: '🌿 百草园', desc: '每日收获药材，可升级增加产量', cost: 5000 },
  { type: 'spiritArray', name: '🔮 聚灵阵', desc: '每日凝聚五行元气', cost: 5000 },
]

const herbList = computed(() =>
  Object.entries(HERB_DATA).map(([id, data]) => ({ id, ...data }))
)

const elementList = [
  { key: 'metal', name: '金元气', emoji: '⚜️' },
  { key: 'wood', name: '木元气', emoji: '🌳' },
  { key: 'water', name: '水元气', emoji: '💧' },
  { key: 'fire', name: '火元气', emoji: '🔥' },
  { key: 'earth', name: '土元气', emoji: '🪨' },
]
const getElement = (key: string) => cultivation.elements[key] ?? 0
</script>

<style scoped>
.stat-card { border: 1px solid rgba(200,164,92,.18); border-radius: 2px; padding: 8px; background: rgba(0,0,0,.12); display: flex; justify-content: space-between; gap: 8px; }
.stat-card b { color: var(--color-accent); font-weight: 400; }
</style>
