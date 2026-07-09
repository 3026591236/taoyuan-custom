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
        <p class="text-[10px] text-accent mt-1">{{ ascensionStore.immortalRealmInfo.icon }} 当前仙阶：{{ ascensionStore.immortalRealmInfo.name }} · {{ ascensionStore.immortalRealmInfo.desc }}</p>
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
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙阶突破</p><span class="text-[10px] text-muted">仙阶战力 +{{ ascensionStore.immortalRealmPowerBonus }}</span></div>
      <div class="realm-card">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ ascensionStore.immortalRealmInfo.icon }} {{ ascensionStore.immortalRealmInfo.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ ascensionStore.immortalRealmInfo.desc }}</p>
          <p v-if="ascensionStore.nextImmortalRealm" class="text-[10px] text-muted mt-1">下阶 {{ ascensionStore.nextImmortalRealm.name }}：功德{{ ascensionStore.nextImmortalRealm.meritCost }} / 仙玉{{ ascensionStore.nextImmortalRealm.jadeCost }} / 法则{{ ascensionStore.nextImmortalRealm.ruleCost }}</p>
          <p v-else class="text-[10px] text-success mt-1">仙阶已至当前顶峰，后续可通过洞天与赛季继续成长。</p>
        </div>
        <button class="btn shrink-0" :disabled="!ascensionStore.nextImmortalRealm" @click="ascensionStore.breakthroughImmortalRealm()">突破仙阶</button>
      </div>
    </div>

    <div class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙市兑换</p><span class="text-[10px] text-muted">资源转化，不复制凡界商店</span></div>
      <div class="grid grid-cols-2 gap-2">
        <div v-for="goods in IMMORTAL_MARKET" :key="goods.id" class="body-card market-card">
          <p class="text-xs text-accent">{{ goods.icon }} {{ goods.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ goods.desc }}</p>
          <p class="text-[10px] text-muted">消耗 功德{{ goods.costMerit }} / 仙玉{{ goods.costJade }} / 法则{{ goods.costRule }}</p>
          <p class="text-[10px] text-success">获得：{{ goods.reward }} · 已购 {{ ascensionStore.marketPurchases[goods.id] || 0 }}</p>
          <button class="btn w-full justify-center mt-2" @click="ascensionStore.buyImmortalMarket(goods.id)">兑换</button>
        </div>
      </div>
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


    <div class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙擂问道 · PK</p><span class="text-[10px] text-muted">{{ ascensionStore.pkRecord }}</span></div>
      <div class="grid grid-cols-1 gap-2">
        <div v-for="rival in IMMORTAL_RIVALS" :key="rival.id" class="trial-card pk-card">
          <div class="min-w-0">
            <p class="text-sm text-accent">{{ rival.icon }} {{ rival.name }}</p>
            <p class="text-[10px] text-muted">{{ rival.style }} · 战力 {{ rival.power }} · 连胜加成 {{ ascensionStore.pkStreak * 35 }}</p>
            <p class="text-[10px] text-muted leading-relaxed mt-1">{{ rival.desc }}</p>
          </div>
          <button class="btn shrink-0" @click="ascensionStore.challengeRival(rival.id)">登擂斗法</button>
        </div>
      </div>
    </div>

    <div class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙擂赛季</p><span class="text-[10px] text-muted">积分 {{ ascensionStore.seasonScore }}</span></div>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="reward in IMMORTAL_SEASON_REWARDS" :key="reward.id" class="body-card season-card" :class="ascensionStore.seasonClaimed[reward.id] ? 'claimed' : ''">
          <p class="text-xs text-accent">{{ reward.icon }} {{ reward.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ reward.desc }}</p>
          <p class="text-[10px] text-muted">需要积分 {{ reward.needScore }}</p>
          <button class="btn w-full justify-center mt-2" :disabled="ascensionStore.seasonClaimed[reward.id]" @click="ascensionStore.claimSeasonReward(reward.id)">{{ ascensionStore.seasonClaimed[reward.id] ? '已领取' : '领取' }}</button>
        </div>
      </div>
    </div>

    <div class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙职事务</p><span class="text-[10px] text-muted">同仙职完成奖励更高</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="duty in IMMORTAL_DUTIES" :key="duty.id" class="duty-card" :class="ascensionStore.dutyDone[duty.id] ? 'done' : ''" @click="ascensionStore.completeDuty(duty.id)">
          <span class="text-lg">{{ duty.icon }}</span><span class="text-xs text-accent">{{ duty.name }}</span><span class="text-[10px] text-muted">{{ duty.desc }}</span>
          <span class="text-[10px]" :class="ascensionStore.dutyDone[duty.id] ? 'text-success' : 'text-muted'">{{ ascensionStore.dutyDone[duty.id] ? '今日已办' : `功德+${duty.rewardMerit}` }}</span>
        </button>
      </div>
    </div>

    <div class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">洞天建设</p><span class="text-[10px] text-muted">洞天战力 +{{ ascensionStore.cavePower }}</span></div>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="node in IMMORTAL_CAVE_NODES" :key="node.id" class="body-card cave-card">
          <p class="text-xs text-accent">{{ node.icon }} {{ node.name }} Lv.{{ ascensionStore.caveLevels[node.id] || 0 }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ node.desc }}</p>
          <button class="btn w-full justify-center mt-2" @click="ascensionStore.upgradeCaveNode(node.id)">升级</button>
        </div>
      </div>
    </div>

    <div class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">凡界回响</p><span class="text-[10px] text-muted">飞升后反哺旧系统</span></div>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="echo in MORTAL_ECHOES" :key="echo.id" class="body-card echo-card">
          <p class="text-xs text-accent">{{ echo.icon }} {{ echo.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ echo.desc }}</p>
          <p class="text-[10px] text-muted">已赐福 {{ ascensionStore.echoBlessings[echo.id] || 0 }} 次</p>
          <button class="btn w-full justify-center mt-2" @click="ascensionStore.sendMortalEcho(echo.id)">消耗功德{{ echo.meritCost }}</button>
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
import { useAscensionStore, IMMORTAL_ARTS, IMMORTAL_TRIALS, IMMORTAL_OFFICES, IMMORTAL_DUTIES, IMMORTAL_CAVE_NODES, MORTAL_ECHOES, IMMORTAL_RIVALS, IMMORTAL_MARKET, IMMORTAL_SEASON_REWARDS } from '@/stores/useAscensionStore'
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
.stat,.body-card{border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:6px;background:rgba(0,0,0,.12)}.stat b{display:block;color:#ffe28a;font-size:12px}.stat span{color:rgba(255,255,255,.52);font-size:10px}.body-card{min-height:72px}.art-card,.office-card,.duty-card{display:flex;flex-direction:column;gap:3px;align-items:flex-start;text-align:left;border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:9px;background:rgba(0,0,0,.12);transition:.16s}.art-card:hover,.office-card:hover,.duty-card:hover,.art-card.active,.office-card.active,.duty-card.done{border-color:rgba(255,226,138,.58);background:rgba(255,226,138,.08);box-shadow:0 0 14px rgba(255,226,138,.12)}.battle-log{border:1px solid rgba(141,222,255,.28);background:linear-gradient(90deg,rgba(113,210,255,.1),rgba(255,226,138,.08));border-radius:3px;padding:10px;animation:pulse .8s ease-out}.trial-card,.realm-card{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:10px;background:rgba(0,0,0,.12)}.art-purple_thunder_seal .battle-log{border-color:rgba(190,140,255,.5);box-shadow:0 0 15px rgba(183,108,255,.18)}.art-solar_flame .battle-log{border-color:rgba(255,180,72,.5);box-shadow:0 0 15px rgba(255,130,44,.18)}.art-cloud_body .battle-log{border-color:rgba(190,245,255,.5);box-shadow:0 0 15px rgba(168,236,255,.18)}.pk-card{border-color:rgba(255,120,120,.22)}.cave-card,.echo-card,.market-card{min-height:120px}.realm-card{border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:10px;background:rgba(0,0,0,.12)}.season-card{min-height:112px}.season-card.claimed{opacity:.62}.duty-card{min-height:110px}.duty-card.done{opacity:.72}
@keyframes float{from{transform:translateY(0)}to{transform:translateY(-10px)}}@keyframes pulse{0%{transform:scale(.96);opacity:.72}60%{transform:scale(1.04);opacity:1}100%{transform:scale(1);opacity:1}}
</style>
