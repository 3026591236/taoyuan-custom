<template>
  <div class="space-y-3">
    <Divider title label="🏛️ 门派" />

    <div v-if="!cultivationStore.unlocked" class="text-xs text-muted text-center py-4">需先启蒙修仙</div>
    <div v-else-if="cultivationStore.realmIndex < 10" class="text-xs text-muted text-center py-4">需达到筑基期方可加入门派</div>
    <div v-else-if="!cultivationStore.sect" class="space-y-2">
      <p class="text-xs text-muted text-center">选择你的门派，修习门派绝学</p>
      <div v-for="sect in SECTS" :key="sect.id" class="border border-accent/20 rounded-xs p-3 space-y-2 sect-card">
        <div class="flex items-center gap-2">
          <span class="text-3xl">{{ sect.emoji }}</span>
          <div>
            <div class="text-accent font-bold text-sm">{{ sect.name }}</div>
            <div class="text-[10px] text-muted">{{ sect.motto }}</div>
          </div>
        </div>
        <div class="text-xs">{{ sect.desc }}</div>
        <div class="text-[10px] text-accent">门派加成：{{ sect.bonusDesc }}</div>
        <div class="space-y-1">
          <div class="text-[10px] text-muted">门派技能：</div>
          <div v-for="(skill, i) in sect.skills" :key="i" class="text-[10px] ml-2">• {{ skill.name }}：{{ skill.desc }}</div>
        </div>
        <button class="btn w-full justify-center text-xs" @click="joinSect(sect.id)">拜入{{ sect.name }}</button>
      </div>
    </div>

    <!-- 已加入门派 -->
    <div v-else class="space-y-2">
      <div class="border border-accent/20 rounded-xs p-3 sect-card">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-3xl">{{ currentSect?.emoji }}</span>
          <div>
            <div class="text-accent font-bold">{{ currentSect?.name }}</div>
            <div class="text-[10px] text-muted">{{ currentSect?.motto }}</div>
          </div>
        </div>
        <div class="text-[10px] text-accent">门派加成：{{ currentSect?.bonusDesc }}</div>
        <div class="text-xs text-muted mt-1">门派贡献：{{ cultivationStore.sectContribution || 0 }}</div>
      </div>

      <!-- 门派技能 -->
      <div v-for="(skill, i) in currentSect?.skills" :key="i" class="border border-accent/15 rounded-xs p-2 space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold">{{ skill.name }}</span>
          <span class="text-[10px] text-accent">Lv.{{ getSectSkillLevel(i) }} / 3</span>
        </div>
        <div class="text-[10px] text-muted">{{ skill.desc }}</div>
        <div class="text-[10px]">升级费用：{{ (i + 1) * 50 * (getSectSkillLevel(i) + 1) }} 贡献</div>
        <button class="btn w-full justify-center text-xs" @click="upgradeSkill(i)" :disabled="!canUpgradeSkill(i)">
          升级技能
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import Divider from '@/components/game/Divider.vue'
  import { useCultivationStore } from '@/stores/useCultivationStore'
  import { addLog, showFloat } from '@/composables/useGameLog'

  const cultivationStore = useCultivationStore()

  const SECTS = [
    {
      id: 'sword' as const, name: '剑宗', emoji: '⚔️', motto: '剑气纵横三万里，一剑光寒十九洲',
      desc: '以剑入道，攻伐天下第一', bonusDesc: '攻击+30%',
      skills: [
        { name: '御剑术', desc: '飞剑攻击+15%/+30%/+50%' },
        { name: '剑意', desc: '暴击率+10%/+20%/+35%' },
        { name: '万剑归宗', desc: '战斗伤害+20%/+40%/+60%' }
      ]
    },
    {
      id: 'alchemy' as const, name: '丹宗', emoji: '⚗️', motto: '一炉定乾坤，丹成天下闻',
      desc: '炼丹圣地，丹药品质无双', bonusDesc: '炼丹品质+1级',
      skills: [
        { name: '丹火', desc: '炼丹成功率+15%/+30%/+50%' },
        { name: '药理', desc: '丹药效果+20%/+40%/+60%' },
        { name: '造化丹术', desc: '有概率炼出高品质丹药+10%/+25%/+40%' }
      ]
    },
    {
      id: 'talisman' as const, name: '符宗', emoji: '📜', motto: '一符镇天地，万法皆可封',
      desc: '以符入道，灵力运用天下无双', bonusDesc: '灵力消耗-25%',
      skills: [
        { name: '灵符术', desc: '灵力消耗-10%/-20%/-35%' },
        { name: '封印术', desc: '战斗中怪物攻击-10%/-20%/-30%' },
        { name: '天罡符阵', desc: '防御+15%/+30%/+50%' }
      ]
    }
  ]

  const currentSect = computed(() => SECTS.find(s => s.id === cultivationStore.sect))

  const joinSect = (id: 'sword' | 'alchemy' | 'talisman') => {
    cultivationStore.sect = id
    cultivationStore.sectSkills = [0, 0, 0]
    cultivationStore.sectContribution = 0
    addLog(`加入${SECTS.find(s => s.id === id)?.name}！`)
    showFloat(`拜入${SECTS.find(s => s.id === id)?.name}`, 'success')
  }

  const getSectSkillLevel = (idx: number) => (cultivationStore.sectSkills?.[idx] || 0)
  const canUpgradeSkill = (idx: number) => {
    const level = getSectSkillLevel(idx)
    if (level >= 3) return false
    const cost = (idx + 1) * 50 * (level + 1)
    return (cultivationStore.sectContribution || 0) >= cost
  }
  const upgradeSkill = (idx: number) => {
    if (!canUpgradeSkill(idx)) return
    const level = getSectSkillLevel(idx)
    const cost = (idx + 1) * 50 * (level + 1)
    cultivationStore.sectContribution = (cultivationStore.sectContribution || 0) - cost
    cultivationStore.sectSkills[idx] = level + 1
    addLog(`${currentSect.value?.skills[idx]?.name ?? '技能'} 升级到 Lv.${level + 1}！`)
    showFloat('技能升级！', 'success')
  }
</script>

<style scoped>
  .sect-card {
    transition: all 0.3s;
  }
  .sect-card:hover {
    border-color: rgba(255, 180, 0, 0.4);
    box-shadow: 0 0 15px rgba(255, 180, 0, 0.1);
  }
</style>
