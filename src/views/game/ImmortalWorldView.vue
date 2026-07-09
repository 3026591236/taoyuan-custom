<template>
  <div class="immortal-page" :class="`art-${ascensionStore.lastArtId}`">
    <div class="immortal-sky" :key="ascensionStore.visualPulse">
      <span class="star s1">✦</span><span class="star s2">✧</span><span class="star s3">✦</span>
      <span class="cloud c1">☁</span><span class="cloud c2">☁</span>
    </div>

    <div class="flex items-center justify-between mb-3 relative z-10">
      <div>
        <h3 class="text-accent text-sm">仙界 · 云阙天门</h3>
        <p class="text-[10px] text-muted">飞升后人物、技能、战斗反馈切换为仙界体系</p>
      </div>
      <button class="text-xs text-muted hover:text-accent" @click="returnToWorld">返回下界</button>
    </div>

    <div class="immortal-hero relative z-10 mb-4">
      <div class="hero-avatar" :key="ascensionStore.visualPulse">
        <div class="halo"></div>
        <div class="immortal-body">仙</div>
        <div class="sword-light"></div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xl text-accent">{{ ascensionStore.immortalTitle || '初入仙门' }} · {{ ascensionStore.immortalRank }}</p>
        <p class="text-xs text-muted mt-1">{{ officeInfo.icon }} {{ officeInfo.name }}：{{ officeInfo.desc }}</p>
        <div class="grid grid-cols-4 gap-1.5 mt-3 text-center">
          <div class="stat"><b>{{ ascensionStore.merit }}</b><span>功德</span></div>
          <div class="stat"><b>{{ ascensionStore.immortalJade }}</b><span>仙玉</span></div>
          <div class="stat"><b>{{ ascensionStore.ruleFragments }}</b><span>法则</span></div>
          <div class="stat"><b>{{ ascensionStore.immortalPower }}</b><span>仙战力</span></div>
        </div>
      </div>
    </div>

    <div class="border border-amber-200/20 rounded-xs p-3 mb-4 bg-black/10 relative z-10">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙体显化</p>
        <span class="text-[10px] text-muted">飞升后角色不再是凡身立绘</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="part in ascensionStore.bodyProfile" :key="part.name" class="body-card">
          <p class="text-xs text-accent">{{ part.name }} Lv.{{ part.level }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ part.desc }}</p>
        </div>
      </div>
    </div>

    <div class="mb-4 relative z-10">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙术特效</p><span class="text-[10px] text-muted">点击切换战斗表现</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="art in IMMORTAL_ARTS" :key="art.id" class="art-card" :class="ascensionStore.lastArtId === art.id ? 'active' : ''" @click="ascensionStore.castImmortalArt(art.id)">
          <span class="text-xl">{{ art.icon }}</span><span class="text-xs text-accent">{{ art.name }}</span><span class="text-[10px] text-muted">{{ art.element }} · {{ art.effect }}</span>
        </button>
      </div>
    </div>

    <div class="battle-log relative z-10 mb-4" :key="`battle-${ascensionStore.visualPulse}`">
      <p class="text-xs text-accent mb-1">仙术反馈</p><p class="text-xs leading-relaxed">{{ ascensionStore.lastBattleText }}</p>
    </div>

    <div class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙域试炼</p><span class="text-[10px] text-muted">奖励功德 / 仙玉 / 法则碎片</span></div>
      <div class="grid grid-cols-1 gap-2">
        <div v-for="trial in IMMORTAL_TRIALS" :key="trial.id" class="trial-card">
          <div class="min-w-0">
            <p class="text-sm text-accent">{{ trial.icon }} {{ trial.name }}</p>
            <p class="text-[10px] text-muted">{{ trial.realm }} · {{ trial.enemy }} · 难度 {{ trial.difficulty }} · 已胜 {{ ascensionStore.trialWins[trial.id] || 0 }} 次</p>
            <p class="text-[10px] text-muted leading-relaxed mt-1">{{ trial.desc }}</p>
          </div>
          <button class="btn shrink-0" @click="ascensionStore.challengeTrial(trial.id)">施展仙术</button>
        </div>
      </div>
    </div>

    <div class="relative z-10">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙职</p><span class="text-[10px] text-muted">仙界身份影响方向</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="office in IMMORTAL_OFFICES" :key="office.id" class="office-card" :class="ascensionStore.immortalOffice === office.id ? 'active' : ''" @click="ascensionStore.chooseOffice(office.id)">
          <span>{{ office.icon }}</span><span class="text-xs text-accent">{{ office.name }}</span><span class="text-[10px] text-muted">{{ office.buff }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAscensionStore, IMMORTAL_ARTS, IMMORTAL_TRIALS, IMMORTAL_OFFICES } from '@/stores/useAscensionStore'
import { addLog } from '@/composables/useGameLog'
import { computed } from 'vue'
const router = useRouter(); const ascensionStore = useAscensionStore()
const officeInfo = computed(() => ascensionStore.officeInfo)
const returnToWorld = () => { ascensionStore.returnToWorld(); router.push('/game/cultivation'); addLog('返回下界，仙光暂敛。') }
</script>
<style scoped>
.immortal-page{position:relative;overflow:hidden;border:1px solid rgba(250,214,124,.24);border-radius:4px;padding:12px;min-height:100%;background:radial-gradient(circle at 20% 0%,rgba(255,247,190,.18),transparent 28%),radial-gradient(circle at 80% 10%,rgba(135,196,255,.16),transparent 30%),linear-gradient(180deg,rgba(17,24,48,.92),rgba(42,31,62,.88));box-shadow:inset 0 0 35px rgba(255,224,139,.08)}
.immortal-sky{position:absolute;inset:0;pointer-events:none;opacity:.9}.star,.cloud{position:absolute;animation:float 4s ease-in-out infinite alternate}.s1{left:12%;top:14%;color:#fff2a8}.s2{right:18%;top:8%;color:#bfe7ff;animation-delay:.6s}.s3{left:72%;top:34%;color:#ffd6fb;animation-delay:1.2s}.c1{left:-4%;top:58%;color:rgba(255,255,255,.18);font-size:46px}.c2{right:-2%;top:42%;color:rgba(255,255,255,.14);font-size:40px;animation-delay:.8s}
.immortal-hero{display:flex;gap:14px;align-items:center;border:1px solid rgba(250,214,124,.22);background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02));border-radius:4px;padding:14px}.hero-avatar{position:relative;width:78px;height:96px;display:grid;place-items:center}.halo{position:absolute;width:70px;height:70px;border:2px double rgba(255,230,151,.8);border-radius:50%;box-shadow:0 0 18px rgba(255,223,126,.55),inset 0 0 18px rgba(120,200,255,.18);animation:pulse 1.6s ease-in-out}.immortal-body{position:relative;z-index:1;width:40px;height:58px;display:grid;place-items:center;color:#20150d;font-weight:700;background:linear-gradient(180deg,#fff6c4,#79d6ff 48%,#d5b1ff);clip-path:polygon(50% 0,78% 16%,88% 72%,50% 100%,12% 72%,22% 16%);box-shadow:0 0 16px rgba(255,255,255,.55)}.sword-light{position:absolute;right:7px;top:8px;width:4px;height:78px;background:linear-gradient(#fff,#8ddfff,transparent);transform:rotate(32deg);box-shadow:0 0 12px #9ee7ff}
.stat,.body-card{border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:6px;background:rgba(0,0,0,.12)}.stat b{display:block;color:#ffe28a;font-size:12px}.stat span{color:rgba(255,255,255,.52);font-size:10px}.body-card{min-height:72px}.art-card,.office-card{display:flex;flex-direction:column;gap:3px;align-items:flex-start;text-align:left;border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:9px;background:rgba(0,0,0,.12);transition:.16s}.art-card:hover,.office-card:hover,.art-card.active,.office-card.active{border-color:rgba(255,226,138,.58);background:rgba(255,226,138,.08);box-shadow:0 0 14px rgba(255,226,138,.12)}.battle-log{border:1px solid rgba(141,222,255,.28);background:linear-gradient(90deg,rgba(113,210,255,.1),rgba(255,226,138,.08));border-radius:3px;padding:10px;animation:pulse .8s ease-out}.trial-card{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:10px;background:rgba(0,0,0,.12)}.art-purple_thunder_seal .battle-log{border-color:rgba(190,140,255,.5);box-shadow:0 0 15px rgba(183,108,255,.18)}.art-solar_flame .battle-log{border-color:rgba(255,180,72,.5);box-shadow:0 0 15px rgba(255,130,44,.18)}.art-cloud_body .battle-log{border-color:rgba(190,245,255,.5);box-shadow:0 0 15px rgba(168,236,255,.18)}@keyframes float{from{transform:translateY(0)}to{transform:translateY(-10px)}}@keyframes pulse{0%{transform:scale(.96);opacity:.72}60%{transform:scale(1.04);opacity:1}100%{transform:scale(1);opacity:1}}
</style>
