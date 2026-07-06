<template>
  <div class="space-y-3">
    <!-- ===== 灵田修行 ===== -->
    <Divider title label="灵田修行" />

    <div class="border border-accent/20 rounded-xs p-3 bg-panel/40">
      <p class="text-sm text-accent mb-1">{{ cultivation.unlocked ? '灵田已启蒙' : '田间似有灵机' }}</p>
      <p class="text-xs text-muted leading-relaxed">
        修行并非凭空而来。先在田里翻土、播种、收获，地脉感应会一点点积累；感应圆满后，再整理灵脉启蒙灵田。
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="stat-card"><span>境界</span><b>{{ cultivation.realmName }}</b></div>
      <div class="stat-card"><span>灵根</span><b>{{ cultivation.spiritRootName }}</b></div>
      <div class="stat-card"><span>灵田</span><b>{{ cultivation.fieldTierName }}</b></div>
      <div class="stat-card"><span>灵气</span><b>{{ cultivation.aura }}</b></div>
      <div class="stat-card col-span-2" v-if="!cultivation.unlocked">
        <div class="flex justify-between mb-1"><span>地脉感应</span><b>{{ cultivation.earthPulse }}/100</b></div>
        <div class="bar"><div class="bar-fill pulse" :style="{ width: cultivation.earthPulse + '%' }" /></div>
      </div>
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
      <p class="text-xs text-muted leading-relaxed">先通过收获作物把地脉感应积累到100，再花费1800文整理田庄地脉，开启黄阶灵田。开启后，普通作物也会产出少量灵气，灵植产出更多。</p>
      <Button class="w-full justify-center" :disabled="cultivation.earthPulse < 100" @click="cultivation.unlock">地脉启蒙（1800文）</Button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Button class="justify-between" @click="cultivation.meditate"><span>打坐调息</span><span class="text-muted text-xs">修为/灵力</span></Button>
      <Button class="justify-between" @click="cultivation.refineAura"><span>炼化灵气</span><span class="text-muted text-xs">灵气→修为</span></Button>
      <Button class="justify-between" :disabled="!cultivation.canBreakthrough" @click="handleBreakthrough"><span>{{ cultivation.isMajorBreakthrough ? '渡劫突破' : '尝试突破' }}</span><span class="text-muted text-xs">{{ cultivation.isMajorBreakthrough ? `成功率${cultivation.tribulationSuccessPercent}%` : '消耗灵气' }}</span></Button>
      <Button class="justify-between" @click="cultivation.upgradeField"><span>温养灵田</span><span class="text-muted text-xs">提升等阶</span></Button>
    </div>

    <div v-if="cultivation.unlocked" class="border rounded-xs p-3 text-xs leading-relaxed" :class="cultivation.isMajorBreakthrough ? 'border-caution/40 bg-caution/5' : 'border-accent/10'">
      <p class="text-accent mb-1">{{ cultivation.isMajorBreakthrough ? '⚡ 天劫预兆' : '突破提示' }}</p>
      <template v-if="cultivation.isMajorBreakthrough">
        <p>下一境界：<span class="text-accent">{{ cultivation.nextRealm.name }}</span>，跨大境界会引动雷劫。</p>
        <p>当前渡劫通过率：<span class="text-caution">{{ cultivation.tribulationSuccessPercent }}%</span>；元神伤势：<span class="text-danger">{{ cultivation.yuanShenInjury }}</span>层。</p>
        <p class="text-muted">失败惩罚：扣除突破灵气、损失部分修为和灵力，元神受伤，严重时元神掉级。可炼养魂丹/涅魂丹恢复。</p>
      </template>
      <template v-else>
        <p class="text-muted">小层突破不会触发雷劫；跨入筑基、金丹、元婴等大境界时才会渡劫。</p>
      </template>
    </div>

    <Divider title label="📜 功法" />
    <div v-if="!cultivation.unlocked" class="border border-accent/10 rounded-xs p-3 text-xs text-muted">启蒙灵田后可研读功法。功法秘籍可在修仙市集用灵石兑换。</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-2">
      <div v-for="manual in manuals" :key="manual.key" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs space-y-2">
        <div class="flex justify-between gap-2">
          <p class="text-accent text-sm">{{ manual.name }}</p>
          <span :class="cultivation.manuals[manual.key] > 0 ? 'text-success' : 'text-muted'">{{ cultivation.manuals[manual.key] ? `${cultivation.manuals[manual.key]}层` : '未习得' }}</span>
        </div>
        <p class="text-muted leading-relaxed">{{ manual.desc }}</p>
        <p class="text-[10px] text-muted">效果：{{ manual.effects }}</p>
        <p class="text-[10px] text-muted">升级：灵气{{ manual.auraCost * Math.max(1, cultivation.manuals[manual.key] || 1) }} / 修为{{ manual.cultivationCost * Math.max(1, cultivation.manuals[manual.key] || 1) }}</p>
        <Button class="w-full justify-center" :disabled="!cultivation.manuals[manual.key] || cultivation.manuals[manual.key] >= manual.maxLevel" @click="handleUpgradeManual(manual.key)">
          {{ !cultivation.manuals[manual.key] ? '先在市集购买秘籍' : cultivation.manuals[manual.key] >= manual.maxLevel ? '功法圆满' : '参悟升级' }}
        </Button>
      </div>
    </div>

    
    <!-- 挂机收益估算 -->
    <div v-if="cultivation.unlocked" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs space-y-1">
      <p class="text-accent mb-1">📊 挂机收益估算（每分钟）</p>
      <div class="grid grid-cols-2 gap-1 text-[10px]">
        <span>灵气 ≈ {{ idleAuraPerMin }}/分</span>
        <span>修为 ≈ {{ idleCultivationPerMin }}/分</span>
      </div>
      <p class="text-[10px] text-muted mt-1">受灵田、洞府、功法等加成影响。在线或离线均按此速率累计。</p>
    </div>

<div class="border border-accent/10 rounded-xs p-3 text-xs text-muted leading-relaxed">
      <p class="text-accent mb-1">灵植联动</p>
      <p>现在普通作物会先积累地脉感应，启蒙后也能转化少量灵气；蕴灵稻、凝露草、朱果则是更高效的灵植和炼丹材料。</p>
      <p class="mt-1">建议路线：种田收获 → 地脉感应100 → 启蒙灵田 → 种灵植 → 炼丹突破。</p>
    </div>

    <!-- ===== 灵膳修行 ===== -->
    <Divider title label="🍲 灵膳修行" />
    <div v-if="!cultivation.unlocked" class="border border-accent/10 rounded-xs p-3 text-xs text-muted">启蒙灵田后，可把农产与灵植做成每日灵膳，直接转化为灵气、修为与灵力。</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div v-for="meal in spiritMeals" :key="meal.id" class="border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs space-y-2">
        <div class="flex justify-between gap-2">
          <div>
            <p class="text-accent text-sm">{{ meal.name }}</p>
            <p class="text-muted leading-relaxed">{{ meal.desc }}</p>
          </div>
          <span class="text-[10px]" :class="cultivation.spiritMealAvailable(meal.id) ? 'text-success' : 'text-muted'">{{ cultivation.spiritMealAvailable(meal.id) ? '今日可食' : '今日已食' }}</span>
        </div>
        <p class="text-[10px] text-muted">材料：{{ meal.materials.map(m => `${m.name}×${m.quantity}`).join('、') }}</p>
        <p class="text-[10px] text-muted">收益：灵气+{{ meal.aura }} / 修为+{{ meal.cultivation }} / 灵力+{{ meal.mana }} / 体力-{{ meal.stamina }}</p>
        <p v-if="meal.minFieldTier > 0" class="text-[10px] text-caution">需要 {{ fieldTierName(meal.minFieldTier) }}</p>
        <Button class="w-full justify-center" :disabled="!cultivation.spiritMealAvailable(meal.id) || cultivation.fieldTier < meal.minFieldTier" @click="cultivation.cookSpiritMeal(meal.id)">食用灵膳</Button>
      </div>
    </div>

    <!-- ===== 轮回殿 ===== -->
    <Divider title label="🔄 轮回殿" />
    <div class="border border-red-600/40 rounded-xs p-3 bg-red-950/20">
      <div class="grid grid-cols-2 gap-2 text-xs mb-3">
        <div class="stat-card"><span>转数</span><b class="text-red-400">{{ cultivation.rebirthCount }}转</b></div>
        <div class="stat-card"><span>灵蕴</span><b class="text-purple-400">{{ cultivation.lingYun }}点</b></div>
        <div class="stat-card"><span>转生增益</span><b class="text-emerald-400">灵气+{{ cultivation.rebirthBonus }}%</b></div>
        <div class="stat-card"><span>丹药加成</span><b class="text-emerald-400">+{{ Math.floor(cultivation.rebirthCount * 5) }}%</b></div>
      </div>
      <div class="text-xs text-muted leading-relaxed mb-3 space-y-1">
        <p class="text-accent">🔮 每转增益：灵气产量+10% · 丹药效果+5% · 灵蕴+1 · 灵根晋升</p>
        <p class="text-[10px]">当前灵根：<span class="text-accent">{{ cultivation.spiritRootName }}</span>（下一转：{{ cultivation.spiritRoot === 'celestial' ? '[已达天灵根]' : nextSpiritRootName }}）</p>
        <p class="text-[10px]">下一转效果：洞府/法宝/元神/丹药效果保留，境界与灵田重置</p>
      </div>
      <div v-if="cultivation.canRebirth" class="space-y-2 mb-3">
        <div class="text-xs text-success">✅ 你已达到大乘初期，修为圆满，可进行转生！</div>
        <div class="text-[10px] text-muted space-y-1">
          <p>· 需要轮回丹 ×1</p>
          <p>· 消耗灵气 {{ cultivation.rebirthCost.aura.toLocaleString() }}</p>
          <p>· 消耗铜钱 {{ cultivation.rebirthCost.money.toLocaleString() }}</p>
          <p class="text-caution">⚠️ 转生后将重置境界至凡人、灵田至黄阶、灵兽羁绊归零</p>
        </div>
        <Button class="w-full justify-center !bg-red-700 hover:!bg-red-600 !text-white" @click="confirmRebirth">踏入轮回（第{{ cultivation.rebirthCount + 1 }}转）</Button>
      </div>
      <div v-else class="text-xs text-muted">
        <span v-if="!cultivation.unlocked">启蒙灵田后可查看转生条件。</span>
        <span v-else>需达到「大乘初期」且修为满后方可转生。当前境界：{{ cultivation.realmName }}</span>
      </div>

      <!-- 已解锁功能 -->
      <div v-if="cultivation.rebirthCount > 0" class="mt-3 pt-3 border-t border-accent/15">
        <p class="text-xs text-accent mb-2">✨ 转生解锁</p>
        <div class="grid grid-cols-2 gap-1 text-[10px]">
          <span :class="cultivation.rebirthCount >= 1 ? 'text-success' : 'text-muted/50'">✅ 1转·洞府</span>
          <span :class="cultivation.rebirthCount >= 3 ? 'text-success' : 'text-muted/50'">✅ 3转·本命法宝</span>
          <span :class="cultivation.rebirthCount >= 5 ? 'text-success' : 'text-muted/50'">✅ 5转·灵兽</span>
          <span :class="cultivation.rebirthCount >= 8 ? 'text-success' : 'text-muted/50'">🔒 8转·元神秘境</span>
          <span :class="cultivation.rebirthCount >= 10 ? 'text-success' : 'text-muted/50'">🔒 10转·秘境二层</span>
          <span :class="cultivation.rebirthCount >= 15 ? 'text-success' : 'text-muted/50'">🔒 15转·装备升星</span>
          <span :class="cultivation.rebirthCount >= 20 ? 'text-success' : 'text-muted/50'">🏆 20转·转生称号</span>
        </div>
      </div>
    </div>

    <!-- 天劫动画 -->
    <Teleport to="body">
      <div v-if="tribulationFx" class="tribulation-overlay" :class="tribulationFx">
        <div class="tribulation-cloud cloud-a"></div>
        <div class="tribulation-cloud cloud-b"></div>
        <div class="lightning bolt-a"></div>
        <div class="lightning bolt-b"></div>
        <div class="tribulation-ground"></div>
        <div class="pixel-hero" :class="tribulationFx">
          <span class="px bun"></span><span class="px hair"></span><span class="px face"></span><span class="px eye eye-l"></span><span class="px eye eye-r"></span><span class="px robe"></span><span class="px belt"></span><span class="px sleeve sleeve-l"></span><span class="px sleeve sleeve-r"></span><span class="px leg leg-l"></span><span class="px leg leg-r"></span>
        </div>
        <div class="tribulation-text">{{ tribulationFx === 'success' ? '渡劫成功' : '天劫失败' }}</div>
      </div>
    </Teleport>

    <!-- 轮回转生确认弹窗 -->
    <Teleport to="body">
      <div v-if="showRebirthConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div class="bg-zinc-900 border-2 border-red-600 rounded-xs p-6 max-w-sm w-full mx-4">
          <p class="text-lg text-red-400 mb-2">⚠️ 确认转生</p>
          <div class="text-xs text-muted leading-relaxed space-y-1 mb-4">
            <p>· 境界：<span class="text-caution">{{ cultivation.realmName }}</span> → <span class="text-success">凡人</span></p>
            <p>· 灵田：<span class="text-caution">{{ cultivation.fieldTierName }}</span> → <span class="text-success">黄阶灵田</span></p>
            <p>· 灵兽羁绊：归零（灵兽保留）</p>
            <p class="text-success">· 保留：洞府/法宝/元神/丹药效果/30%灵气</p>
            <p class="text-caution mt-2">此操作不可逆！确认要踏入{{ cultivation.rebirthCount + 1 }}转吗？</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <Button class="justify-center" @click="showRebirthConfirm = false">取消</Button>
            <Button class="justify-center !bg-red-700 hover:!bg-red-600 !text-white" @click="doRebirth">确认转生</Button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 农具法宝化 ===== -->
    <Divider title label="✨ 农具法宝化" />
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
import { computed, ref } from 'vue'
import { sfxThunder, sfxLevelUp, sfxHurt } from '@/composables/useAudio'
import { addLog } from '@/composables/useGameLog'
import Divider from '@/components/game/Divider.vue'
import Button from '@/components/game/Button.vue'
import { useCultivationStore, SPIRIT_MEAL_RECIPES, FIELD_TIERS, CULTIVATION_MANUALS } from '@/stores/useCultivationStore'
import type { ArtifactKey, CultivationManualKey } from '@/stores/useCultivationStore'

const cultivation = useCultivationStore()
  // === 挂机收益估算 ===
  const idleAuraPerMin = computed(() => {
    if (!cultivation.unlocked) return 0
    return Math.max(1, Math.floor(1.2 + cultivation.fieldTier * 0.35 + cultivation.caveAuraRegen * 0.08 + (cultivation.hasCaveSlot("spiritArray") ? 0.8 : 0) + (cultivation.manuals?.wood ?? 0) * 0.12))
  })
  const idleCultivationPerMin = computed(() => {
    if (!cultivation.unlocked) return 0
    return Math.max(1, Math.floor(4 + cultivation.realmIndex * 0.28 + cultivation.fieldTier * 0.8 + (cultivation.hasCaveSlot("meditation") ? 3 : 0) + (cultivation.beast === "crane" ? 2 : 0) + (cultivation.manuals?.void ?? 0) * 0.25))
  })

const spiritMeals = SPIRIT_MEAL_RECIPES
const fieldTierName = (idx: number) => FIELD_TIERS[idx] ?? '更高阶灵田'
const manuals = (Object.entries(CULTIVATION_MANUALS) as Array<[CultivationManualKey, typeof CULTIVATION_MANUALS[CultivationManualKey]]>).map(([key, def]) => ({ key, ...def }))

const artifacts: Array<{ key: ArtifactKey; name: string; desc: string; aura: number; money: number }> = [
  { key: 'glimmerHoe', name: '流光锄', desc: '锄刃引动地脉，灵植收获时额外产出灵气。', aura: 220, money: 2000 },
  { key: 'spiritKettle', name: '引灵壶', desc: '炼化灵气时收益提高，修为增长更稳定。', aura: 320, money: 2600 },
  { key: 'spiritRain', name: '灵雨诀', desc: '以法诀唤灵雨，灵植收获额外引灵。', aura: 520, money: 3600 }
]

// 转生系统
const showRebirthConfirm = ref(false)
const spiritRootOrder = ['mixed', 'wood', 'water', 'earth', 'fire', 'metal', 'celestial']
const spiritRootNameMap: Record<string, string> = { mixed: '杂灵根', wood: '木灵根', water: '水灵根', earth: '土灵根', fire: '火灵根', metal: '金灵根', celestial: '天灵根' }
const nextSpiritRootName = computed(() => {
  const idx = spiritRootOrder.indexOf(cultivation.spiritRoot)
  if (idx < 0 || idx >= spiritRootOrder.length - 1) return '[已达天灵根]'
  const nextRoot = spiritRootOrder[idx + 1]
  return nextRoot ? spiritRootNameMap[nextRoot] : '[已达天灵根]'
})
const tribulationFx = ref<'success' | 'fail' | null>(null)
const playTribulationFx = (result: 'success' | 'fail') => {
  tribulationFx.value = result
  void sfxThunder()
  setTimeout(() => { result === 'success' ? sfxLevelUp() : sfxHurt() }, 520)
  setTimeout(() => { tribulationFx.value = null }, 1900)
}
const handleBreakthrough = () => {
  const major = cultivation.isMajorBreakthrough
  const ok = cultivation.breakthrough()
  if (major && cultivation.lastTribulationResult !== 'none') playTribulationFx(cultivation.lastTribulationResult)
  else if (ok) sfxLevelUp()
}
const handleUpgradeManual = (key: CultivationManualKey) => {
  const result = cultivation.upgradeManual(key)
  addLog(result.message)
}
const confirmRebirth = () => {
  if (!cultivation.canRebirth) return
  showRebirthConfirm.value = true
}
const doRebirth = () => {
  showRebirthConfirm.value = false
  cultivation.rebirth()
}

const cultivationPercent = computed(() => Math.min(100, Math.round((cultivation.cultivation / cultivation.maxCultivation) * 100)))
const manaPercent = computed(() => Math.min(100, Math.round((cultivation.mana / cultivation.maxMana) * 100)))
</script>

<style scoped>
.stat-card { border: 1px solid rgba(200,164,92,.18); border-radius: 2px; padding: 8px; background: rgba(0,0,0,.12); display: flex; justify-content: space-between; gap: 8px; }
.stat-card b { color: var(--color-accent); font-weight: 400; }
.bar { height: 6px; border: 1px solid rgba(200,164,92,.22); background: rgba(0,0,0,.2); }
.bar-fill { height: 100%; background: var(--color-accent); transition: width .2s; }
.bar-fill.mana { background: rgb(96,165,250); }
.bar-fill.pulse { background: rgb(74, 222, 128); }
.tribulation-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 65%, rgba(255,255,255,.12), transparent 20%), rgba(3, 7, 18, .86); overflow: hidden; pointer-events: none; }
.tribulation-cloud { position: absolute; top: 8%; width: 260px; height: 76px; background: #111827; border: 3px solid rgba(148,163,184,.55); box-shadow: 0 0 35px rgba(96,165,250,.28); image-rendering: pixelated; }
.cloud-a { left: 12%; animation: cloudShake .2s steps(2) infinite; }
.cloud-b { right: 10%; top: 14%; animation: cloudShake .25s steps(2) infinite reverse; }
.lightning { position: absolute; top: 8%; left: 50%; width: 18px; height: 60%; background: linear-gradient(#fff, #fde68a 30%, #60a5fa); clip-path: polygon(45% 0, 72% 0, 55% 32%, 82% 32%, 35% 100%, 48% 48%, 22% 48%); filter: drop-shadow(0 0 18px #fef08a); animation: thunderStrike .42s steps(2) 3; }
.bolt-b { left: 56%; transform: scale(.72) rotate(8deg); animation-delay: .18s; }
.tribulation-ground { position: absolute; bottom: 18%; width: 180px; height: 12px; background: rgba(15,23,42,.9); border: 2px solid rgba(224,178,94,.4); }
.pixel-hero { position: relative; width: 64px; height: 118px; image-rendering: pixelated; transform: scale(1.25); animation: heroShock .12s steps(2) infinite; }
.pixel-hero.success { filter: drop-shadow(0 0 16px #facc15); animation: heroAscend .9s ease-out infinite alternate; }
.pixel-hero.fail { filter: grayscale(.35) drop-shadow(0 0 12px #60a5fa); }
.px { position: absolute; display: block; box-shadow: inset -2px -2px rgba(0,0,0,.25); }
.bun { left: 25px; top: 4px; width: 16px; height: 9px; background: #2a1c18; }
.hair { left: 18px; top: 12px; width: 30px; height: 22px; background: #2a1c18; }
.face { left: 20px; top: 24px; width: 26px; height: 24px; background: #e7b98a; }
.eye { top: 34px; width: 4px; height: 4px; background: #111; box-shadow: none; }
.eye-l { left: 27px; } .eye-r { left: 39px; }
.robe { left: 16px; top: 51px; width: 34px; height: 44px; background: linear-gradient(90deg,#694987 0,#9365ad 50%,#563a72 100%); }
.belt { left: 14px; top: 70px; width: 38px; height: 5px; background: #efca75; box-shadow: none; }
.sleeve { top: 54px; width: 11px; height: 34px; background: #674a7f; }
.sleeve-l { left: 4px; } .sleeve-r { right: 4px; }
.leg { top: 95px; width: 12px; height: 18px; background: #3f4f3d; }
.leg-l { left: 20px; } .leg-r { right: 18px; }
.tribulation-text { position: absolute; bottom: 13%; color: #fef3c7; font-size: 22px; letter-spacing: 4px; text-shadow: 0 0 12px #facc15; animation: textPulse .35s steps(2) infinite; }
.tribulation-overlay.fail .tribulation-text { color: #93c5fd; text-shadow: 0 0 12px #60a5fa; }
@keyframes thunderStrike { 0%, 100% { opacity: 0; } 20%, 70% { opacity: 1; } }
@keyframes cloudShake { 0% { transform: translateX(0); } 100% { transform: translateX(6px); } }
@keyframes heroShock { 0% { transform: scale(1.25) translateX(-2px); } 100% { transform: scale(1.25) translateX(2px); } }
@keyframes heroAscend { from { transform: scale(1.25) translateY(0); } to { transform: scale(1.25) translateY(-10px); } }
@keyframes textPulse { from { opacity: .72; } to { opacity: 1; } }
</style>
