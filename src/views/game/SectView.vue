<template>
  <div class="space-y-3">
    <Divider title label="🏛️ 宗门" />

    <div v-if="!cultivationStore.unlocked" class="text-xs text-muted text-center py-4">需先启蒙修仙</div>
    <div v-else-if="cultivationStore.realmIndex < 10" class="text-xs text-muted text-center py-4">需达到筑基期方可加入宗门</div>
    <div v-else-if="!cultivationStore.sect" class="space-y-2">
      <p class="text-xs text-muted text-center">选择你的宗门，开启职位、日课、功法和贡献兑换</p>
      <div v-for="sect in SECTS" :key="sect.id" class="border border-accent/20 rounded-xs p-3 space-y-2 sect-card">
        <div class="flex items-center gap-2">
          <span class="text-3xl">{{ sect.emoji }}</span>
          <div>
            <div class="text-accent font-bold text-sm">{{ sect.name }}</div>
            <div class="text-[10px] text-muted">{{ sect.motto }}</div>
          </div>
        </div>
        <div class="text-xs">{{ sect.desc }}</div>
        <div class="text-[10px] text-accent">宗门加成：{{ sect.bonusDesc }}</div>
        <div class="space-y-1">
          <div class="text-[10px] text-muted">宗门技能：</div>
          <div v-for="(skill, i) in sect.skills" :key="i" class="text-[10px] ml-2">• {{ skill.name }}：{{ skill.desc }}</div>
        </div>
        <button class="btn w-full justify-center text-xs" @click="joinSect(sect.id)">拜入{{ sect.name }}</button>
      </div>
    </div>

    <div v-else class="space-y-3">
      <div class="border border-accent/20 rounded-xs p-3 sect-card">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-3xl">{{ currentSect?.emoji }}</span>
          <div class="min-w-0 flex-1">
            <div class="text-accent font-bold">{{ currentSect?.name }} · {{ currentRank!.name }}</div>
            <div class="text-[10px] text-muted">{{ currentSect?.motto }}</div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div class="border border-accent/10 rounded-xs p-1"><p class="text-muted">贡献</p><p class="text-accent">{{ cultivationStore.sectContribution || 0 }}</p></div>
          <div class="border border-accent/10 rounded-xs p-1"><p class="text-muted">功勋</p><p class="text-accent">{{ cultivationStore.sectMerit || 0 }}</p></div>
          <div class="border border-accent/10 rounded-xs p-1"><p class="text-muted">职位</p><p class="text-accent">{{ currentRank!.name }}</p></div>
        </div>
        <div class="text-[10px] text-accent mt-2">宗门加成：{{ currentSect?.bonusDesc }}；职位加成：{{ currentRank!.bonus }}</div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">宗门职位</p>
          <span class="text-[10px] text-muted">{{ nextRank ? `下一阶：${nextRank.name}` : '已至当前最高职位' }}</span>
        </div>
        <div v-if="nextRank" class="text-[10px] text-muted leading-relaxed">
          晋升要求：功勋 {{ cultivationStore.sectMerit || 0 }}/{{ nextRank.merit }} · 境界 {{ cultivationStore.realmIndex }}/{{ nextRank.realm }} · 消耗贡献 {{ nextRank.cost }}
        </div>
        <button class="btn w-full justify-center text-xs" :disabled="!canPromote" @click="promoteRank">
          {{ nextRank ? `晋升${nextRank.name}` : '职位已满' }}
        </button>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">今日宗门日课</p>
          <span class="text-[10px] text-muted">每日重置 · 已完成 {{ doneDailyCount }}/{{ DAILY_TASKS.length }}</span>
        </div>
        <div v-for="task in DAILY_TASKS" :key="task.id" class="border border-accent/10 rounded-xs p-2">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs">{{ task.name }}</p>
              <p class="text-[10px] text-muted leading-relaxed">{{ task.desc }}</p>
              <p class="text-[10px] text-accent">奖励：贡献{{ task.contribution }}、功勋{{ task.merit }}{{ task.rewardText ? `、${task.rewardText}` : '' }}</p>
            </div>
            <button class="btn text-[10px] shrink-0" :disabled="isDailyDone(task.id) || !canDoDaily(task)" @click="finishDaily(task)">
              {{ isDailyDone(task.id) ? '已完成' : '完成' }}
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div v-for="(skill, i) in currentSect?.skills" :key="i" class="border border-accent/15 rounded-xs p-2 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold">{{ skill.name }}</span>
            <span class="text-[10px] text-accent">Lv.{{ getSectSkillLevel(i) }} / {{ skillLevelCap }}</span>
          </div>
          <div class="text-[10px] text-muted min-h-[2.25rem]">{{ skill.desc }}</div>
          <div class="text-[10px]">升级费用：{{ getSkillCost(i) }} 贡献</div>
          <button class="btn w-full justify-center text-xs" @click="upgradeSkill(i)" :disabled="!canUpgradeSkill(i)">升级技能</button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <p class="text-xs text-accent">宗门宝库</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div v-for="item in TREASURY" :key="item.id" class="border border-accent/10 rounded-xs p-2 space-y-1">
            <p class="text-xs">{{ item.name }}</p>
            <p class="text-[10px] text-muted">{{ item.desc }}</p>
            <p class="text-[10px] text-accent">消耗贡献 {{ item.cost }}</p>
            <button class="btn w-full justify-center text-xs" :disabled="(cultivationStore.sectContribution || 0) < item.cost" @click="redeem(item)">兑换</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import Divider from '@/components/game/Divider.vue'
  import { useCultivationStore } from '@/stores/useCultivationStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { addLog, showFloat } from '@/composables/useGameLog'

  const cultivationStore = useCultivationStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()

  type SectId = 'sword' | 'alchemy' | 'talisman'

  const SECTS = [
    {
      id: 'sword' as const, name: '剑宗', emoji: '⚔️', motto: '剑气纵横三万里，一剑光寒十九洲',
      desc: '以剑入道，重视历练、斩妖和剑意磨砺。', bonusDesc: '攻击与战斗成长更强',
      skills: [
        { name: '御剑术', desc: '飞剑与基础攻击成长提高，适合红尘历练。' },
        { name: '剑意', desc: '提升暴击与破防理解，强化秘境表现。' },
        { name: '万剑归宗', desc: '高阶群攻剑诀，职位越高越能发挥。' }
      ]
    },
    {
      id: 'alchemy' as const, name: '丹宗', emoji: '⚗️', motto: '一炉定乾坤，丹成天下闻',
      desc: '炼丹圣地，重视灵植、丹房和药理积累。', bonusDesc: '炼丹、灵植与恢复收益更好',
      skills: [
        { name: '丹火', desc: '提升炼丹火候，减少材料浪费。' },
        { name: '药理', desc: '提升丹药与灵植转化效果。' },
        { name: '造化丹术', desc: '高阶丹术，产出更稳定的修仙资源。' }
      ]
    },
    {
      id: 'talisman' as const, name: '符宗', emoji: '📜', motto: '一符镇天地，万法皆可封',
      desc: '以符入道，重视灵力调度、阵法和防御。', bonusDesc: '灵力消耗与防御表现更优',
      skills: [
        { name: '灵符术', desc: '提升灵力运用效率，适合长期修行。' },
        { name: '封印术', desc: '削弱妖兽攻势，提高挑战容错。' },
        { name: '天罡符阵', desc: '强化防御阵势，降低高阶战斗压力。' }
      ]
    }
  ]

  const RANKS = [
    { name: '外门弟子', merit: 0, realm: 10, cost: 0, bonus: '可接日课，技能上限3' },
    { name: '内门弟子', merit: 80, realm: 11, cost: 120, bonus: '技能上限4，宝库折扣雏形' },
    { name: '亲传弟子', merit: 220, realm: 13, cost: 260, bonus: '技能上限5，日课收益更高' },
    { name: '执事', merit: 480, realm: 16, cost: 520, bonus: '宗门贡献转化战力更明显' },
    { name: '长老候补', merit: 900, realm: 19, cost: 900, bonus: '当前最高职位，后续接宗门副本' }
  ]

  const DAILY_TASKS = [
    { id: 'lecture', name: '听道早课', desc: '在宗门听长老讲道，稳步积累功勋。', contribution: 30, merit: 8 },
    { id: 'patrol', name: '山门巡守', desc: '巡守山门、驱散游妖，获得少量灵石。', contribution: 45, merit: 12, reward: () => inventoryStore.addItem('spirit_stone', 3), rewardText: '灵石×3' },
    { id: 'donate', name: '上交灵材', desc: '上交灵石×5换取更高宗门评价。', contribution: 70, merit: 18, require: () => inventoryStore.getItemCount('spirit_stone') >= 5, consume: () => inventoryStore.removeItem('spirit_stone', 5), rewardText: '需灵石×5' }
  ]

  const TREASURY = [
    { id: 'spirit_stone_pack', name: '灵石匣', desc: '领取灵石×10，补充修仙市集和功法消耗。', cost: 90, reward: () => inventoryStore.addItem('spirit_stone', 10) },
    { id: 'spirit_seed_pack', name: '灵植种匣', desc: '蕴灵稻、凝露草、朱果种子各×2。', cost: 150, reward: () => { inventoryStore.addItem('seed_spirit_rice', 2); inventoryStore.addItem('seed_dew_grass', 2); inventoryStore.addItem('seed_vermilion_fruit', 2) } },
    { id: 'secret_material', name: '秘境材料匣', desc: '木灵珠×1、魂晶×1，用于炼丹与后续养成。', cost: 220, reward: () => { inventoryStore.addItem('wood_spirit', 1); inventoryStore.addItem('soul_crystal', 1) } }
  ]

  const currentSect = computed(() => SECTS.find(s => s.id === cultivationStore.sect))
  const currentRank = computed(() => RANKS[cultivationStore.sectRank || 0] ?? RANKS[0])
  const nextRank = computed(() => RANKS[(cultivationStore.sectRank || 0) + 1] ?? null)
  const skillLevelCap = computed(() => Math.min(5, 3 + (cultivationStore.sectRank || 0)))
  const dailyKey = computed(() => `${gameStore.year}-${gameStore.season}-${gameStore.day}`)
  const doneDailyCount = computed(() => {
    resetDailyIfNeeded()
    return cultivationStore.sectDailyDone.length
  })
  const canPromote = computed(() => {
    const next = nextRank.value
    if (!next) return false
    return (cultivationStore.sectMerit || 0) >= next.merit && cultivationStore.realmIndex >= next.realm && (cultivationStore.sectContribution || 0) >= next.cost
  })

  const resetDailyIfNeeded = () => {
    if (cultivationStore.sectDailyKey !== dailyKey.value) {
      cultivationStore.sectDailyKey = dailyKey.value
      cultivationStore.sectDailyDone = []
    }
  }
  const isDailyDone = (id: string) => {
    resetDailyIfNeeded()
    return cultivationStore.sectDailyDone.includes(id)
  }
  const canDoDaily = (task: typeof DAILY_TASKS[number]) => !task.require || task.require()

  const joinSect = (id: SectId) => {
    cultivationStore.sect = id
    cultivationStore.sectSkills = [0, 0, 0]
    cultivationStore.sectContribution = 80
    cultivationStore.sectRank = 0
    cultivationStore.sectMerit = 0
    cultivationStore.sectDailyKey = dailyKey.value
    cultivationStore.sectDailyDone = []
    addLog(`加入${SECTS.find(s => s.id === id)?.name}！获得入门贡献80。`)
    showFloat(`拜入${SECTS.find(s => s.id === id)?.name}`, 'success')
  }

  const finishDaily = (task: typeof DAILY_TASKS[number]) => {
    resetDailyIfNeeded()
    if (isDailyDone(task.id) || !canDoDaily(task)) return
    task.consume?.()
    const rankBonus = 1 + (cultivationStore.sectRank || 0) * 0.12
    const contribution = Math.floor(task.contribution * rankBonus)
    const merit = Math.floor(task.merit * rankBonus)
    cultivationStore.sectContribution = (cultivationStore.sectContribution || 0) + contribution
    cultivationStore.sectMerit = (cultivationStore.sectMerit || 0) + merit
    task.reward?.()
    cultivationStore.sectDailyDone.push(task.id)
    addLog(`完成宗门日课「${task.name}」，贡献+${contribution}，功勋+${merit}。`)
    showFloat('宗门日课完成', 'success')
  }

  const promoteRank = () => {
    const next = nextRank.value
    if (!next || !canPromote.value) return
    cultivationStore.sectContribution -= next.cost
    cultivationStore.sectRank += 1
    addLog(`宗门职位晋升为「${next.name}」！`)
    showFloat(`晋升${next.name}`, 'success')
  }

  const getSectSkillLevel = (idx: number) => (cultivationStore.sectSkills?.[idx] || 0)
  const getSkillCost = (idx: number) => {
    const level = getSectSkillLevel(idx)
    return (idx + 1) * 60 * (level + 1) + level * 40
  }
  const canUpgradeSkill = (idx: number) => {
    const level = getSectSkillLevel(idx)
    if (level >= skillLevelCap.value) return false
    return (cultivationStore.sectContribution || 0) >= getSkillCost(idx)
  }
  const upgradeSkill = (idx: number) => {
    if (!canUpgradeSkill(idx)) return
    const level = getSectSkillLevel(idx)
    const cost = getSkillCost(idx)
    cultivationStore.sectContribution = (cultivationStore.sectContribution || 0) - cost
    cultivationStore.sectSkills[idx] = level + 1
    addLog(`${currentSect.value?.skills[idx]?.name ?? '技能'} 升级到 Lv.${level + 1}！`)
    showFloat('技能升级！', 'success')
  }

  const redeem = (item: typeof TREASURY[number]) => {
    if ((cultivationStore.sectContribution || 0) < item.cost) return
    cultivationStore.sectContribution -= item.cost
    item.reward()
    addLog(`在宗门宝库兑换了「${item.name}」。`)
    showFloat('宝库兑换成功', 'success')
  }
</script>

<style scoped>
  .sect-card { transition: all 0.3s; }
  .sect-card:hover { border-color: rgba(255, 180, 0, 0.4); box-shadow: 0 0 15px rgba(255, 180, 0, 0.1); }
</style>
