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
          <Button
            class="w-full justify-center"
            :disabled="!cultivation.hasCaveSlot(slot.type) && cultivation.caveSlots.length >= cultivation.caveMaxSlots"
            @click="cultivation.hasCaveSlot(slot.type) ? cultivation.removeCaveSlot(slot.type) : cultivation.placeCaveSlot(slot.type)"
          >
            {{ cultivation.hasCaveSlot(slot.type) ? '取消安置' : '安置' }}
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
        <div class="stat-card"><span>现实日收益</span><b>{{ cultivation.herbDailyYield }}株</b></div>
        <div class="stat-card col-span-2"><span>可领取</span><b>{{ cultivation.herbClaimDays }}天（最多累计7天）</b></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <Button class="justify-center" :disabled="cultivation.herbClaimDays <= 0" @click="cultivation.claimDailyHerbs">领取现实日药材</Button>
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
        <div class="stat-card"><span>现实日元气</span><b>{{ cultivation.spiritArrayElementYield }}/种</b></div>
        <div class="stat-card"><span>现实日灵石</span><b>{{ cultivation.spiritArrayStoneYield }}</b></div>
        <div class="stat-card"><span>可领取</span><b>{{ cultivation.spiritArrayClaimDays }}天</b></div>
      </div>
      <Button class="w-full justify-center" :disabled="cultivation.spiritArrayClaimDays <= 0" @click="cultivation.claimDailyElements">凝聚现实日元气与灵石</Button>
      <div class="grid grid-cols-5 gap-1">
        <div v-for="el in elementList" :key="el.key" class="border border-accent/10 rounded-xs p-2 text-center text-xs">
          <span class="text-sm">{{ el.emoji }}</span>
          <p class="text-[10px] text-accent">{{ el.name }}</p>
          <p class="text-[10px] text-muted">{{ getElement(el.key) }}</p>
        </div>
      </div>
    </div>


    <!-- ===== 灵石坊 ===== -->
    <Divider title label="💎 灵石坊" />
    <div class="game-panel p-3 space-y-2">
      <p class="text-xs text-muted leading-relaxed">灵石目前是背包材料：秘境会掉落，炼器会消耗，普通出售仍换铜钱；多余修仙材料可在这里折换成灵石。为避免数值膨胀，灵石炼气有每日次数限制，且同日连续转化成本递增、收益略降。</p>
      <div class="border border-accent/20 rounded-xs p-3 space-y-2 bg-black/10">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-accent text-sm">灵石炼气</p>
            <p class="text-[10px] text-muted">今日 {{ cultivation.spiritStoneRefineCountToday }}/{{ cultivation.spiritStoneRefineLimit }} 次，剩余 {{ cultivation.spiritStoneRefineRemaining }} 次</p>
          </div>
          <div class="text-xs text-muted">灵石×{{ cultivation.spiritStoneRefineCost }} → 灵气+{{ cultivation.spiritStoneRefineAuraGain }}</div>
        </div>
        <Button class="w-full justify-center" :disabled="itemCount('spirit_stone') < cultivation.spiritStoneRefineCost || cultivation.spiritStoneRefineRemaining <= 0" @click="cultivation.refineSpiritStoneToAura">
          灵石炼气（持有灵石 {{ itemCount('spirit_stone') }}）
        </Button>
        <p class="text-[10px] text-muted leading-relaxed">每日固定10次。首次约1000灵石→10000灵气，后续同日成本快速递增、收益逐步递减，定位为消耗大量多余灵石、突破前补缺口，避免无限刷灵气。</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div v-for="recipe in SPIRIT_STONE_EXCHANGES" :key="recipe.id" class="border border-accent/15 rounded-xs p-2 text-xs space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-accent">{{ recipe.name }}</span>
            <span class="text-muted">持有 {{ itemCount(recipe.itemId) }}</span>
          </div>
          <p class="text-[10px] text-muted leading-relaxed">{{ recipe.desc }}</p>
          <Button class="w-full justify-between" :disabled="itemCount(recipe.itemId) < recipe.quantity" @click="cultivation.exchangeForSpiritStones(recipe.id)">
            <span>{{ recipe.itemName }}×{{ recipe.quantity }}</span>
            <span>→ 灵石×{{ recipe.spiritStones }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore, HERB_DATA, SPIRIT_STONE_EXCHANGES } from '@/stores/useCultivationStore'
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
