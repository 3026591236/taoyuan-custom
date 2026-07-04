<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <User :size="14" />
        <span>角色信息</span>
      </div>
      <span class="text-xs text-muted">第{{ gameStore.year }}年 {{ SEASON_NAMES[gameStore.season] }}</span>
    </div>

    <!-- 角色身份 + 属性 + 轮廓 -->
    <div class="border border-accent/20 rounded-xs p-2 mb-3">
      <div class="flex gap-3">
        <!-- 角色轮廓 -->
        <div class="shrink-0 flex items-center justify-center">
          <div class="pixel-avatar-card" :class="[`avatar-${playerStore.gender}`, cultivationStore.unlocked ? `avatar-realm-${Math.min(cultivationStore.realmIndex, 4)}` : 'avatar-mortal']">
            <div v-if="cultivationStore.unlocked" class="pixel-avatar-aura"></div>
            <div class="pixel-avatar">
              <span class="px-hair px"></span>
              <span class="px-bun px"></span>
              <span class="px-face px"></span>
              <span class="px-eye px eye-l"></span>
              <span class="px-eye px eye-r"></span>
              <span class="px-robe px"></span>
              <span class="px-belt px"></span>
              <span class="px-sleeve px sleeve-l"></span>
              <span class="px-sleeve px sleeve-r"></span>
              <span class="px-leg px leg-l"></span>
              <span class="px-leg px leg-r"></span>
              <span class="px-tool px"></span>
            </div>
            <div class="pixel-avatar-shadow"></div>
          </div>
        </div>
        <!-- 属性 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-accent">{{ playerStore.playerName }}</span>
            <span class="text-xs text-muted">{{ genderLabel }}</span>
          </div>
          <div v-if="cultivationStore.unlocked" class="flex items-center justify-between mb-1">
            <span class="text-xs text-accent">{{ cultivationStore.realmName }}</span>
            <span class="text-xs text-muted">{{ cultivationStore.spiritRootName }}</span>
          </div>

          <div class="flex flex-col space-y-1.5">
            <!-- 体力 -->
            <div class="flex items-center space-x-2">
              <span class="text-xs text-muted shrink-0">体力</span>
              <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                <div class="h-full rounded-xs transition-all" :class="playerStore.staminaPercent > 35 ? 'bg-success' : 'bg-danger'" :style="{ width: playerStore.staminaPercent + '%' }" />
              </div>
              <span class="text-xs whitespace-nowrap">{{ playerStore.stamina }}/{{ playerStore.maxStamina }}</span>
            </div>
            <!-- 生命 -->
            <div class="flex items-center space-x-2">
              <span class="text-xs text-muted shrink-0">生命</span>
              <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                <div class="h-full rounded-xs transition-all" :class="playerStore.getHpPercent() > 25 ? 'bg-success' : 'bg-danger'" :style="{ width: playerStore.getHpPercent() + '%' }" />
              </div>
              <span class="text-xs whitespace-nowrap">{{ playerStore.hp }}/{{ playerStore.getMaxHp() }}</span>
            </div>
            <!-- 铜钱 -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">铜钱</span>
              <span class="text-xs text-accent">{{ playerStore.money }}文</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 角色资质 -->
      <div class="mt-2 pt-2 border-t border-accent/10">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-muted">角色资质</span>
          <span class="text-[10px] text-accent">总评 {{ playerStore.attributePower }}</span>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <div v-for="item in attributeList" :key="item.key" class="border border-accent/10 rounded-xs px-2 py-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-muted">{{ item.name }}</span>
              <span class="text-xs text-accent">{{ item.level }}</span>
            </div>
            <div class="h-1 bg-bg rounded-xs overflow-hidden border border-accent/10">
              <div class="h-full bg-accent/70" :style="{ width: item.percent + '%' }" />
            </div>
            <p class="text-[10px] text-muted mt-0.5">{{ item.hint }}</p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1 mt-1.5 text-[10px] text-muted">
          <span>攻击 +{{ playerStore.attributeAttackBonus }}</span>
          <span>生命 +{{ playerStore.attributeMaxHpBonus }}</span>
          <span>减伤 {{ Math.round(playerStore.attributeDefenseBonus * 100) }}%</span>
        </div>
      </div>

      <!-- 修仙属性（启蒙后显示） -->
      <div v-if="cultivationStore.unlocked" class="mt-2 pt-2 border-t border-accent/10">
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">修为</span>
            <span class="text-xs text-accent">{{ cultivationStore.cultivation }}/{{ cultivationStore.maxCultivation }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">灵力</span>
            <span class="text-xs text-accent">{{ cultivationStore.mana }}/{{ cultivationStore.maxMana }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">灵气</span>
            <span class="text-xs text-accent">{{ cultivationStore.aura }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">灵田</span>
            <span class="text-xs text-accent">{{ cultivationStore.fieldTierName }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">炼丹炉</span>
            <span class="text-xs" :class="cultivationStore.alchemyUnlocked ? 'text-accent' : 'text-muted/40'">{{ cultivationStore.alchemyUnlocked ? '已安置' : '未安置' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">法宝</span>
            <span class="text-xs text-accent">{{ equippedArtifactCount }}/3</span>
          </div>
        </div>
        <!-- 突破进度 -->
        <div class="mt-1.5 flex items-center space-x-2">
          <span class="text-xs text-muted shrink-0">突破</span>
          <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
            <div class="h-full rounded-xs transition-all bg-accent" :style="{ width: breakthroughPercent + '%' }" />
          </div>
          <span class="text-xs whitespace-nowrap" :class="cultivationStore.canBreakthrough ? 'text-accent' : 'text-muted'">{{ cultivationStore.canBreakthrough ? '可突破' : Math.round(breakthroughPercent) + '%' }}</span>
        </div>
        <button v-if="cultivationStore.canBreakthrough" class="btn w-full justify-center mt-1.5" @click="handleBreakthrough">⚡ 突破境界</button>
      </div>
    </div>

    <!-- 装备槽位 -->
    <div class="border border-accent/20 rounded-xs p-2 mb-3">
      <p class="text-xs text-muted mb-1.5">装备</p>
      <div class="grid grid-cols-3 gap-1 mb-1">
        <div
          class="border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5"
          @click="activeSlot = 'weapon'"
        >
          <p class="text-[10px] text-muted">武器</p>
          <p class="text-xs text-accent truncate">{{ equippedWeaponName }}</p>
        </div>
        <div
          class="border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5"
          @click="activeSlot = 'ring1'"
        >
          <p class="text-[10px] text-muted">戒指1</p>
          <p class="text-xs truncate" :class="equippedRing1 ? 'text-accent' : 'text-muted/40'">
            {{ equippedRing1?.name ?? '空' }}
          </p>
        </div>
        <div
          class="border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5"
          @click="activeSlot = 'ring2'"
        >
          <p class="text-[10px] text-muted">戒指2</p>
          <p class="text-xs truncate" :class="equippedRing2 ? 'text-accent' : 'text-muted/40'">
            {{ equippedRing2?.name ?? '空' }}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-1">
        <div class="border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5" @click="activeSlot = 'hat'">
          <p class="text-[10px] text-muted">帽子</p>
          <p class="text-xs truncate" :class="equippedHatName ? 'text-accent' : 'text-muted/40'">
            {{ equippedHatName ?? '空' }}
          </p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5" @click="activeSlot = 'shoe'">
          <p class="text-[10px] text-muted">鞋子</p>
          <p class="text-xs truncate" :class="equippedShoeName ? 'text-accent' : 'text-muted/40'">
            {{ equippedShoeName ?? '空' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 装备选择弹窗 -->
    <Transition name="panel-fade">
      <div v-if="activeSlot" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="activeSlot = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeSlot = null">
            <X :size="14" />
          </button>

          <!-- 武器弹窗 -->
          <template v-if="activeSlot === 'weapon'">
            <p class="text-sm text-accent mb-2">选择武器</p>
            <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
              <div
                v-for="(weapon, index) in inventoryStore.ownedWeapons"
                :key="index"
                class="flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1"
                :class="index === inventoryStore.equippedWeaponIndex ? 'border-accent/30' : 'border-accent/10'"
                @click="handleEquipWeapon(index)"
              >
                <div class="min-w-0">
                  <span class="text-xs" :class="index === inventoryStore.equippedWeaponIndex ? 'text-accent' : ''">
                    {{ getWeaponDisplayName(weapon.defId, weapon.enchantmentId) }}
                  </span>
                  <p class="text-[10px] text-muted truncate">
                    攻{{ getWeaponStats(weapon).attack }} · 暴击{{ Math.round(getWeaponStats(weapon).critRate * 100) }}%
                    <template v-if="weapon.enchantmentId">· {{ getEnchantName(weapon.enchantmentId) }}</template>
                  </p>
                </div>
                <span v-if="index === inventoryStore.equippedWeaponIndex" class="text-[10px] text-accent shrink-0 ml-1">当前</span>
              </div>
            </div>
          </template>

          <!-- 戒指弹窗 -->
          <template v-else-if="activeSlot === 'ring1' || activeSlot === 'ring2'">
            <p class="text-sm text-accent mb-2">选择{{ activeSlot === 'ring1' ? '戒指1' : '戒指2' }}</p>
            <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
              <!-- 卸下按钮 -->
              <div
                v-if="(activeSlot === 'ring1' ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2) >= 0"
                class="flex items-center border border-danger/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-danger/5 mr-1"
                @click="handleUnequipRingFromPopup"
              >
                <span class="text-xs text-danger">卸下当前戒指</span>
              </div>
              <!-- 戒指列表 -->
              <template v-if="inventoryStore.ownedRings.length > 0">
                <div
                  v-for="(ring, idx) in ownedRingList"
                  :key="idx"
                  class="flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1"
                  :class="isRingInCurrentSlot(idx) ? 'border-accent/30' : 'border-accent/10'"
                  @click="handleEquipRingFromPopup(idx)"
                >
                  <div class="min-w-0">
                    <span class="text-xs" :class="isRingInCurrentSlot(idx) ? 'text-accent' : ''">{{ ring.name }}</span>
                    <p class="text-[10px] text-muted truncate">{{ ring.effectText }}</p>
                  </div>
                  <span v-if="isRingInCurrentSlot(idx)" class="text-[10px] text-accent shrink-0 ml-1">当前</span>
                  <span v-else-if="isRingInOtherSlot(idx)" class="text-[10px] text-muted shrink-0 ml-1">
                    在{{ activeSlot === 'ring1' ? '槽2' : '槽1' }}
                  </span>
                </div>
              </template>
              <p v-else class="text-xs text-muted/40 text-center py-2">暂无戒指</p>
            </div>
          </template>

          <!-- 帽子弹窗 -->
          <template v-else-if="activeSlot === 'hat'">
            <p class="text-sm text-accent mb-2">选择帽子</p>
            <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
              <div
                v-if="inventoryStore.equippedHatIndex >= 0"
                class="flex items-center border border-danger/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-danger/5 mr-1"
                @click="handleUnequipHatFromPopup"
              >
                <span class="text-xs text-danger">卸下当前帽子</span>
              </div>
              <template v-if="inventoryStore.ownedHats.length > 0">
                <div
                  v-for="hat in ownedHatList"
                  :key="hat.index"
                  class="flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1"
                  :class="hat.index === inventoryStore.equippedHatIndex ? 'border-accent/30' : 'border-accent/10'"
                  @click="handleEquipHatFromPopup(hat.index)"
                >
                  <div class="min-w-0">
                    <span class="text-xs" :class="hat.index === inventoryStore.equippedHatIndex ? 'text-accent' : ''">{{ hat.name }}</span>
                    <p class="text-[10px] text-muted truncate">{{ hat.effectText }}</p>
                  </div>
                  <span v-if="hat.index === inventoryStore.equippedHatIndex" class="text-[10px] text-accent shrink-0 ml-1">当前</span>
                </div>
              </template>
              <p v-else class="text-xs text-muted/40 text-center py-2">暂无帽子</p>
            </div>
          </template>

          <!-- 鞋子弹窗 -->
          <template v-else-if="activeSlot === 'shoe'">
            <p class="text-sm text-accent mb-2">选择鞋子</p>
            <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
              <div
                v-if="inventoryStore.equippedShoeIndex >= 0"
                class="flex items-center border border-danger/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-danger/5 mr-1"
                @click="handleUnequipShoeFromPopup"
              >
                <span class="text-xs text-danger">卸下当前鞋子</span>
              </div>
              <template v-if="inventoryStore.ownedShoes.length > 0">
                <div
                  v-for="shoe in ownedShoeList"
                  :key="shoe.index"
                  class="flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1"
                  :class="shoe.index === inventoryStore.equippedShoeIndex ? 'border-accent/30' : 'border-accent/10'"
                  @click="handleEquipShoeFromPopup(shoe.index)"
                >
                  <div class="min-w-0">
                    <span class="text-xs" :class="shoe.index === inventoryStore.equippedShoeIndex ? 'text-accent' : ''">
                      {{ shoe.name }}
                    </span>
                    <p class="text-[10px] text-muted truncate">{{ shoe.effectText }}</p>
                  </div>
                  <span v-if="shoe.index === inventoryStore.equippedShoeIndex" class="text-[10px] text-accent shrink-0 ml-1">当前</span>
                </div>
              </template>
              <p v-else class="text-xs text-muted/40 text-center py-2">暂无鞋子</p>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- 工具一览 -->
    <div class="border border-accent/20 rounded-xs p-2 mb-3">
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-xs text-muted">工具</p>
        <button class="text-xs text-accent hover:underline" @click="goToUpgrade">前往升级</button>
      </div>
      <div class="flex flex-col space-y-1">
        <div
          v-for="tool in inventoryStore.tools"
          :key="tool.type"
          class="flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1"
        >
          <div>
            <span class="text-xs">{{ TOOL_NAMES[tool.type] }}</span>
            <span class="text-xs text-muted ml-1">{{ TIER_NAMES[tool.tier] }}</span>
          </div>
          <span class="text-[10px] text-muted">-{{ Math.round((1 - inventoryStore.getToolStaminaMultiplier(tool.type)) * 100) }}%体力</span>
        </div>
      </div>
    </div>

    <!-- 技能总览 -->
    <div class="border border-accent/20 rounded-xs p-2 mb-3">
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-xs text-muted">技能</p>
        <button class="text-xs text-accent hover:underline" @click="goToSkills">查看详情</button>
      </div>
      <div class="flex flex-col space-y-0.5">
        <div v-for="skill in skillStore.skills" :key="skill.type" class="flex items-center justify-between">
          <span class="text-xs text-muted">{{ SKILL_NAMES[skill.type] }}</span>
          <div class="flex items-center space-x-1.5">
            <span class="text-xs text-accent">Lv.{{ skill.level }}</span>
            <span v-if="skill.perk5" class="text-[10px] text-success">{{ PERK_NAMES[skill.perk5] }}</span>
            <span v-if="skill.perk10" class="text-[10px] text-success">{{ PERK_NAMES[skill.perk10] }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 被动加成 -->
    <div v-if="unlockedWalletItems.length > 0" class="border border-accent/20 rounded-xs p-2 mb-3">
      <p class="text-xs text-muted mb-1.5">被动加成</p>
      <div class="flex flex-col space-y-0.5">
        <div v-for="item in unlockedWalletItems" :key="item.id" class="flex items-center justify-between">
          <span class="text-xs text-accent">{{ item.name }}</span>
          <span class="text-xs text-muted">{{ item.description }}</span>
        </div>
      </div>
    </div>

    <!-- 家庭 -->
    <div v-if="spouseInfo" class="border border-accent/20 rounded-xs p-2">
      <p class="text-xs text-muted mb-1.5">家庭</p>
      <div class="flex flex-col space-y-0.5">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">配偶</span>
          <span class="text-xs text-accent">{{ spouseInfo.name }}</span>
        </div>
        <div v-for="child in npcStore.children" :key="child.id" class="flex items-center justify-between">
          <span class="text-xs text-muted">{{ child.name }}</span>
          <span class="text-xs">{{ CHILD_STAGE_NAMES[child.stage] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { User, X } from 'lucide-vue-next'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { ATTRIBUTE_NAMES, usePlayerStore, type AttributeKey } from '@/stores/usePlayerStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { useWalletStore } from '@/stores/useWalletStore'
  import { useCultivationStore } from '@/stores/useCultivationStore'
  import { TOOL_NAMES, TIER_NAMES, getNpcById } from '@/data'
  import { getWeaponById, getEnchantmentById, getWeaponDisplayName } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import type { EquipmentEffectType } from '@/types'
  import { WALLET_ITEMS } from '@/data/wallet'
  import { navigateToPanel } from '@/composables/useNavigation'
  import type { SkillType, SkillPerk5, SkillPerk10, ChildStage, OwnedWeapon } from '@/types'
  import { addLog } from '@/composables/useGameLog'

  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const walletStore = useWalletStore()
  const cultivationStore = useCultivationStore()
  const npcStore = useNpcStore()
  const gameStore = useGameStore()

  // === 身份 ===
  const genderLabel = computed(() => (playerStore.gender === 'male' ? '男' : '女'))

  // === 角色资质 ===
  const ATTRIBUTE_HINTS: Record<AttributeKey, string> = {
    physique: '收获作物成长，提升生命',
    strength: '战斗历练成长，提升攻击',
    agility: '挑战强敌成长，提升减伤',
    perception: '优质收获与红尘历练成长'
  }
  const attributeList = computed(() =>
    (Object.keys(ATTRIBUTE_NAMES) as AttributeKey[]).map(key => {
      const attr = playerStore.attributes[key]
      const required = playerStore.getAttributeExpRequired(key)
      return {
        key,
        name: ATTRIBUTE_NAMES[key],
        level: attr.level,
        percent: required > 0 ? Math.min(100, Math.round((attr.exp / required) * 100)) : 100,
        hint: ATTRIBUTE_HINTS[key]
      }
    })
  )

  // === 修仙 ===
  const equippedArtifactCount = computed(() => {
    const a = cultivationStore.artifacts
    return (a.glimmerHoe ? 1 : 0) + (a.spiritKettle ? 1 : 0) + (a.spiritRain ? 1 : 0)
  })
  const breakthroughPercent = computed(() => {
    if (!cultivationStore.unlocked) return 0
    const needed = cultivationStore.maxCultivation
    if (needed <= 0) return 0
    return Math.min(100, (cultivationStore.cultivation / needed) * 100)
  })
  const handleBreakthrough = () => {
    if (!cultivationStore.canBreakthrough) return
    cultivationStore.breakthrough()
  }

  // === 装备槽位 ===

  const activeSlot = ref<'weapon' | 'ring1' | 'ring2' | 'hat' | 'shoe' | null>(null)

  // === 武器 ===

  const equippedWeaponName = computed(() => {
    const weapon = inventoryStore.ownedWeapons[inventoryStore.equippedWeaponIndex]
    if (!weapon) return '无'
    return getWeaponDisplayName(weapon.defId, weapon.enchantmentId)
  })

  const getWeaponStats = (weapon: OwnedWeapon): { attack: number; critRate: number } => {
    const def = getWeaponById(weapon.defId)
    if (!def) return { attack: 0, critRate: 0 }
    let attack = def.attack
    let critRate = def.critRate
    if (weapon.enchantmentId) {
      const enchant = getEnchantmentById(weapon.enchantmentId)
      if (enchant) {
        attack += enchant.attackBonus
        critRate += enchant.critBonus
      }
    }
    return { attack, critRate }
  }

  const getEnchantName = (enchantmentId: string): string => {
    return getEnchantmentById(enchantmentId)?.name ?? ''
  }

  const handleEquipWeapon = (index: number) => {
    if (inventoryStore.equipWeapon(index)) {
      const weapon = inventoryStore.ownedWeapons[index]!
      const name = getWeaponDisplayName(weapon.defId, weapon.enchantmentId)
      addLog(`装备了${name}。`)
    }
  }

  // === 戒指 ===

  const RING_EFFECT_SHORT: Record<EquipmentEffectType, string> = {
    attack_bonus: '攻击',
    crit_rate_bonus: '暴击',
    defense_bonus: '减伤',
    vampiric: '吸血',
    max_hp_bonus: '生命',
    stamina_reduction: '体力减免',
    mining_stamina: '挖矿体力减免',
    farming_stamina: '农耕体力减免',
    fishing_stamina: '钓鱼体力减免',
    crop_quality_bonus: '品质',
    crop_growth_bonus: '生长加速',
    fish_quality_bonus: '鱼品质',
    fishing_calm: '鱼速降低',
    sell_price_bonus: '售价',
    shop_discount: '折扣',
    gift_friendship: '好感',
    monster_drop_bonus: '掉落',
    exp_bonus: '经验',
    treasure_find: '宝箱',
    ore_bonus: '矿石',
    luck: '幸运',
    travel_speed: '旅行加速'
  }

  const formatRingEffects = (defId: string): string => {
    const def = getRingById(defId)
    if (!def) return ''
    return def.effects
      .map(e => {
        const label = RING_EFFECT_SHORT[e.type]
        return e.value > 0 && e.value < 1 ? `${label}${Math.round(e.value * 100)}%` : `${label}+${e.value}`
      })
      .join(' ')
  }

  const getRingInfo = (index: number): { name: string; effectText: string } | null => {
    if (index < 0 || index >= inventoryStore.ownedRings.length) return null
    const ring = inventoryStore.ownedRings[index]!
    const def = getRingById(ring.defId)
    if (!def) return null
    return { name: def.name, effectText: formatRingEffects(ring.defId) }
  }

  const equippedRing1 = computed(() => getRingInfo(inventoryStore.equippedRingSlot1))
  const equippedRing2 = computed(() => getRingInfo(inventoryStore.equippedRingSlot2))

  const ownedRingList = computed(() =>
    inventoryStore.ownedRings.map((ring, index) => ({
      index,
      name: getRingById(ring.defId)?.name ?? ring.defId,
      effectText: formatRingEffects(ring.defId)
    }))
  )

  const handleEquipRingFromPopup = (ringIndex: number) => {
    const slot: 0 | 1 = activeSlot.value === 'ring1' ? 0 : 1
    if (inventoryStore.equipRing(ringIndex, slot)) {
      const def = getRingById(inventoryStore.ownedRings[ringIndex]!.defId)
      addLog(`将${def?.name ?? '戒指'}装备到槽位${slot + 1}。`)
      activeSlot.value = null
    }
  }

  const handleUnequipRingFromPopup = () => {
    const slot: 0 | 1 = activeSlot.value === 'ring1' ? 0 : 1
    const idx = slot === 0 ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2
    const def = idx >= 0 ? getRingById(inventoryStore.ownedRings[idx]!.defId) : null
    if (inventoryStore.unequipRing(slot)) {
      addLog(`卸下了${def?.name ?? '戒指'}。`)
      activeSlot.value = null
    }
  }

  const isRingInCurrentSlot = (idx: number): boolean => {
    if (activeSlot.value === 'ring1') return inventoryStore.equippedRingSlot1 === idx
    return inventoryStore.equippedRingSlot2 === idx
  }

  const isRingInOtherSlot = (idx: number): boolean => {
    if (activeSlot.value === 'ring1') return inventoryStore.equippedRingSlot2 === idx
    return inventoryStore.equippedRingSlot1 === idx
  }

  // === 帽子 ===

  const equippedHatName = computed(() => {
    const hat = inventoryStore.ownedHats[inventoryStore.equippedHatIndex]
    if (!hat) return null
    return getHatById(hat.defId)?.name ?? null
  })

  const formatEquipEffects = (effects: { type: EquipmentEffectType; value: number }[]): string => {
    return effects
      .map(e => {
        const label = RING_EFFECT_SHORT[e.type]
        return e.value > 0 && e.value < 1 ? `${label}${Math.round(e.value * 100)}%` : `${label}+${e.value}`
      })
      .join(' ')
  }

  const ownedHatList = computed(() =>
    inventoryStore.ownedHats.map((hat, index) => {
      const def = getHatById(hat.defId)
      return {
        index,
        name: def?.name ?? hat.defId,
        effectText: def ? formatEquipEffects(def.effects) : ''
      }
    })
  )

  const handleEquipHatFromPopup = (index: number) => {
    if (inventoryStore.equipHat(index)) {
      const def = getHatById(inventoryStore.ownedHats[index]!.defId)
      addLog(`装备了${def?.name ?? '帽子'}。`)
      activeSlot.value = null
    }
  }

  const handleUnequipHatFromPopup = () => {
    const idx = inventoryStore.equippedHatIndex
    const def = idx >= 0 ? getHatById(inventoryStore.ownedHats[idx]!.defId) : null
    if (inventoryStore.unequipHat()) {
      addLog(`卸下了${def?.name ?? '帽子'}。`)
      activeSlot.value = null
    }
  }

  // === 鞋子 ===

  const equippedShoeName = computed(() => {
    const shoe = inventoryStore.ownedShoes[inventoryStore.equippedShoeIndex]
    if (!shoe) return null
    return getShoeById(shoe.defId)?.name ?? null
  })

  const ownedShoeList = computed(() =>
    inventoryStore.ownedShoes.map((shoe, index) => {
      const def = getShoeById(shoe.defId)
      return {
        index,
        name: def?.name ?? shoe.defId,
        effectText: def ? formatEquipEffects(def.effects) : ''
      }
    })
  )

  const handleEquipShoeFromPopup = (index: number) => {
    if (inventoryStore.equipShoe(index)) {
      const def = getShoeById(inventoryStore.ownedShoes[index]!.defId)
      addLog(`装备了${def?.name ?? '鞋子'}。`)
      activeSlot.value = null
    }
  }

  const handleUnequipShoeFromPopup = () => {
    const idx = inventoryStore.equippedShoeIndex
    const def = idx >= 0 ? getShoeById(inventoryStore.ownedShoes[idx]!.defId) : null
    if (inventoryStore.unequipShoe()) {
      addLog(`卸下了${def?.name ?? '鞋子'}。`)
      activeSlot.value = null
    }
  }

  // === 技能 ===
  const SKILL_NAMES: Record<SkillType, string> = {
    farming: '农耕',
    foraging: '采集',
    fishing: '钓鱼',
    mining: '挖矿',
    combat: '战斗'
  }

  const PERK_NAMES: Record<SkillPerk5 | SkillPerk10, string> = {
    harvester: '丰收者',
    rancher: '牧人',
    lumberjack: '樵夫',
    herbalist: '药师',
    fisher: '渔夫',
    trapper: '捕手',
    miner: '矿工',
    geologist: '地质学家',
    fighter: '斗士',
    defender: '守护者',
    intensive: '精耕',
    artisan: '匠人',
    coopmaster: '牧场主',
    shepherd: '牧羊人',
    botanist: '植物学家',
    alchemist: '炼金师',
    forester: '伐木工',
    tracker: '追踪者',
    angler: '垂钓大师',
    aquaculture: '水产商',
    mariner: '水手',
    luremaster: '诱饵师',
    prospector: '探矿者',
    blacksmith: '铁匠',
    excavator: '挖掘者',
    mineralogist: '宝石学家',
    warrior: '武者',
    brute: '蛮力者',
    acrobat: '杂技师',
    tank: '重甲者'
  }

  // === 被动 ===
  const unlockedWalletItems = computed(() => WALLET_ITEMS.filter(w => walletStore.has(w.id)))

  // === 家庭 ===
  const spouseInfo = computed(() => {
    const spouseState = npcStore.getSpouse()
    if (!spouseState) return null
    const npcDef = getNpcById(spouseState.npcId)
    return npcDef ? { name: npcDef.name } : null
  })

  const CHILD_STAGE_NAMES: Record<ChildStage, string> = {
    baby: '婴儿',
    toddler: '幼童',
    child: '孩童',
    teen: '少年'
  }

  // === 导航 ===
  const goToUpgrade = () => {
    navigateToPanel('upgrade')
  }

  const goToSkills = () => {
    navigateToPanel('skills')
  }
</script>

<style scoped>
  .pixel-avatar-card {
    position: relative;
    width: 72px;
    height: 116px;
    border: 1px solid rgba(224, 178, 94, 0.35);
    background:
      linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px),
      linear-gradient(0deg, rgba(255,255,255,.04) 1px, transparent 1px),
      radial-gradient(circle at 50% 80%, rgba(92, 68, 38, .9), rgba(25, 22, 18, .95));
    background-size: 8px 8px, 8px 8px, auto;
    image-rendering: pixelated;
    overflow: hidden;
    box-shadow: inset 0 0 0 2px rgba(0,0,0,.25);
  }

  .pixel-avatar-card::before {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 12px;
    height: 6px;
    background: repeating-linear-gradient(90deg, rgba(87, 58, 32, .9) 0 6px, rgba(47, 35, 24, .9) 6px 12px);
  }

  .pixel-avatar-aura {
    position: absolute;
    inset: 10px 6px 18px;
    border: 2px solid rgba(120, 245, 220, .38);
    box-shadow: 0 0 10px rgba(120, 245, 220, .22), inset 0 0 12px rgba(120, 245, 220, .12);
  }

  .avatar-realm-1 .pixel-avatar-aura { border-color: rgba(95, 207, 122, .45); box-shadow: 0 0 10px rgba(95, 207, 122, .22); }
  .avatar-realm-2 .pixel-avatar-aura { border-color: rgba(83, 178, 245, .48); box-shadow: 0 0 12px rgba(83, 178, 245, .28); }
  .avatar-realm-3 .pixel-avatar-aura { border-color: rgba(191, 119, 255, .52); box-shadow: 0 0 14px rgba(191, 119, 255, .32); }
  .avatar-realm-4 .pixel-avatar-aura { border-color: rgba(245, 198, 92, .58); box-shadow: 0 0 16px rgba(245, 198, 92, .35); }

  .pixel-avatar {
    position: absolute;
    left: 16px;
    top: 8px;
    width: 40px;
    height: 92px;
    transform: scale(1.2);
    transform-origin: top center;
  }

  .px { position: absolute; display: block; box-shadow: inset -2px -2px 0 rgba(0,0,0,.18); }
  .px-bun { left: 14px; top: 0; width: 12px; height: 8px; background: #2a1c18; }
  .px-hair { left: 9px; top: 8px; width: 22px; height: 18px; background: #2a1c18; }
  .px-face { left: 11px; top: 14px; width: 18px; height: 18px; background: #e7b98a; }
  .px-eye { top: 23px; width: 3px; height: 3px; background: #211712; box-shadow: none; }
  .eye-l { left: 16px; }
  .eye-r { left: 24px; }
  .px-robe { left: 8px; top: 34px; width: 24px; height: 34px; background: #5b8a5d; }
  .px-belt { left: 7px; top: 49px; width: 26px; height: 4px; background: #d7b25e; box-shadow: none; }
  .px-sleeve { top: 36px; width: 8px; height: 28px; background: #487349; }
  .sleeve-l { left: 1px; }
  .sleeve-r { right: 1px; }
  .px-leg { top: 68px; width: 9px; height: 18px; background: #3f4f3d; }
  .leg-l { left: 10px; }
  .leg-r { right: 10px; }
  .px-tool { right: -2px; top: 42px; width: 4px; height: 35px; background: #8a5a32; transform: rotate(-12deg); box-shadow: 0 -5px 0 #caa85d; }
  .avatar-female .px-robe { background: #7f5b96; }
  .avatar-female .px-sleeve { background: #674a7f; }
  .avatar-female .px-belt { background: #efca75; }
  .avatar-mortal .px-tool { box-shadow: 0 -5px 0 #b0a081; }

  .pixel-avatar-shadow {
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: 13px;
    height: 5px;
    background: rgba(0,0,0,.35);
  }


  /* V0.5.10：把角色从几何轮廓加强为像素立绘感。 */
  .pixel-avatar-card {
    border-width: 2px;
    background:
      linear-gradient(180deg, rgba(44, 36, 30, .95), rgba(22, 18, 16, .98)),
      repeating-linear-gradient(90deg, transparent 0 7px, rgba(255,255,255,.04) 7px 8px);
  }
  .pixel-avatar-card::after {
    content: '';
    position: absolute;
    left: 6px; right: 6px; top: 6px; bottom: 6px;
    border: 1px solid rgba(224, 178, 94, .22);
    pointer-events: none;
  }
  .pixel-avatar {
    top: 5px;
    filter: drop-shadow(2px 3px 0 rgba(0,0,0,.45));
  }
  .px-hair { border-top: 3px solid #513024; box-shadow: inset -3px -3px 0 rgba(0,0,0,.24), 0 8px 0 #1d1412; }
  .px-bun { border-top: 2px solid #6b4230; }
  .px-face { box-shadow: inset -3px -3px 0 #c58d65, inset 2px 2px 0 #ffd2a5; }
  .px-face::after {
    content: '';
    position: absolute;
    left: 7px; top: 12px; width: 4px; height: 2px;
    background: #a86055;
  }
  .px-robe {
    height: 38px;
    background: linear-gradient(90deg, #4d7e52 0 35%, #6da86b 35% 65%, #3f6845 65%);
    box-shadow: inset -3px -3px 0 rgba(0,0,0,.25), inset 3px 0 0 rgba(255,255,255,.08);
  }
  .avatar-female .px-robe { background: linear-gradient(90deg, #694987 0 35%, #9365ad 35% 65%, #563a72 65%); }
  .px-belt { height: 5px; border-top: 1px solid rgba(255,255,255,.24); }
  .px-sleeve { box-shadow: inset -2px -2px 0 rgba(0,0,0,.22); }
  .px-leg { top: 71px; box-shadow: inset -2px -2px 0 rgba(0,0,0,.25), 0 13px 0 #221b18; }
  .px-tool { width: 5px; height: 42px; right: -4px; top: 35px; background: #8f6033; box-shadow: 0 -6px 0 #d1b063, 0 -10px 0 #ede09a, inset -2px 0 0 rgba(0,0,0,.25); }
  .avatar-realm-2 .px-tool { box-shadow: 0 -6px 0 #72c9ff, 0 -10px 0 #d8f5ff, inset -2px 0 0 rgba(0,0,0,.25); }
  .avatar-realm-3 .px-tool { box-shadow: 0 -6px 0 #c58bff, 0 -10px 0 #f0d9ff, inset -2px 0 0 rgba(0,0,0,.25); }
  .avatar-realm-4 .px-tool { box-shadow: 0 -6px 0 #ffd86d, 0 -10px 0 #fff2ad, inset -2px 0 0 rgba(0,0,0,.25), 0 0 7px #ffd86d; }
  .pixel-avatar-aura {
    border-style: double;
    background: radial-gradient(circle at center, rgba(255,255,255,.06), transparent 58%);
  }

</style>
