<template>
  <div class="immortal-page" :class="`art-${ascensionStore.lastArtId}`">
    <div class="immortal-sky" :key="ascensionStore.visualPulse">
      <span class="star s1">✦</span><span class="star s2">✧</span><span class="star s3">✦</span>
      <span class="cloud c1">☁</span><span class="cloud c2">☁</span>
    </div>

    <div class="flex items-center justify-between mb-3 relative z-10">
      <div>
        <h3 class="text-accent text-sm">仙界 · 云阙天门 <span v-if="ascensionStore.adminPreviewMode" class="preview-badge">ADMIN 预览</span></h3>
        <p class="text-[10px] text-muted">{{ sectionTitle }} · 通过仙界地图切换区域</p>
        <p v-if="ascensionStore.adminPreviewMode" class="text-[10px] text-warning mt-1">管理员预览数据仅用于检查界面/功能完整性，不写入正式存档。</p>
      </div>
      <div class="flex items-center gap-2"><button v-if="ascensionStore.adminPreviewMode" class="text-xs text-warning hover:text-accent" @click="exitAdminPreview">退出预览</button><button class="text-xs text-muted hover:text-accent" @click="returnToWorld">返回凡界</button></div>
    </div>

    <div v-if="isTab('home')" class="immortal-hero relative z-10 mb-4">
      <div class="hero-avatar immortal-portrait-stage" aria-label="仙界角色立绘">
        <div class="immortal-gate gate-back"></div>
        <div class="immortal-gate gate-front"></div>
        <div class="portrait-orbit orbit-a"></div><div class="portrait-orbit orbit-b"></div><div class="portrait-orbit orbit-c"></div>
        <img class="immortal-artwork" src="/assets/immortal/immortal-sovereign-anime.png" alt="二次元仙界角色立绘" draggable="false" />
        <div class="portrait-cloud cloud-left"></div><div class="portrait-cloud cloud-mid"></div><div class="portrait-cloud cloud-right"></div>
        <div class="portrait-nameplate"><span>{{ ascensionStore.immortalRealmInfo.icon }}</span> 仙身显化</div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xl text-accent">{{ ascensionStore.immortalTitle || '初入仙门' }} · {{ ascensionStore.immortalRank }}</p>
        <p class="text-xs text-muted mt-1">{{ officeInfo.icon }} {{ officeInfo.name }}：{{ officeInfo.desc }}</p>
        <p class="text-[10px] text-accent mt-1">{{ ascensionStore.immortalRealmInfo.icon }} 当前仙阶：{{ ascensionStore.immortalRealmInfo.name }} · {{ ascensionStore.immortalRealmInfo.desc }}</p>
        <div class="grid grid-cols-5 gap-1.5 mt-3 text-center">
          <div class="stat"><b>{{ ascensionStore.merit }}</b><span>功德</span></div>
          <div class="stat"><b>{{ ascensionStore.immortalJade }}</b><span>仙玉</span></div>
          <div class="stat"><b>{{ ascensionStore.ruleFragments }}</b><span>法则</span></div>
          <div class="stat"><b>{{ ascensionStore.immortalPower }}</b><span>仙战力</span></div>
          <div class="stat"><b>{{ ascensionStore.immortalEssence }}</b><span>器魄</span></div>
        </div>
      </div>
    </div>

    <div v-if="isTab('home')" class="immortal-zone-grid relative z-10 mb-4">
      <button v-for="zone in IMMORTAL_ZONES" :key="zone.key" class="zone-card" @click="switchTab(zone.key)">
        <img class="zone-art" :src="zoneArt(zone.key)" :alt="`${zone.name}插画`" draggable="false" />
        <span class="zone-card-shade"></span>
        <span class="text-sm text-accent relative z-[1]">{{ zone.name }}</span>
        <span class="text-[10px] text-muted leading-relaxed">{{ zone.desc }}</span>
      </button>
    </div>

    <div v-if="isTab('home')" class="border border-amber-200/20 rounded-xs p-3 mb-4 bg-black/10 relative z-10">
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

    <div v-if="isTab('gear')" class="relative z-10 mb-4 immortal-gear-panel">
      <div class="gear-banner">
        <div><p class="text-xs text-accent">仙器谱 · 六部位共鸣</p><p class="text-[10px] text-muted mt-1">试炼与裂隙掉落仙器精魄；淬炼至 Lv.3 激活部位共鸣。</p></div>
        <div class="gear-power"><b>+{{ ascensionStore.gearPower }}</b><span>仙器战力</span></div>
      </div>
      <p class="gear-resonance">{{ ascensionStore.gearResonance }}</p>
      <div class="gear-grid">
        <button v-for="gear in IMMORTAL_GEAR" :key="gear.id" class="gear-card" :class="`gear-${gear.id}`" @click="ascensionStore.upgradeImmortalGear(gear.id)">
          <img :src="gear.art" :alt="gear.name" draggable="false" />
          <span class="gear-shade"></span>
          <span class="gear-level">Lv.{{ ascensionStore.gearLevels[gear.id] || 0 }}</span>
          <span class="gear-name">{{ gear.name }}</span>
          <span class="gear-desc">{{ gear.desc }}</span>
          <span class="gear-cost">淬炼：器魄{{ 4 + (ascensionStore.gearLevels[gear.id] || 0) * 3 }} / 仙玉{{ 3 + (ascensionStore.gearLevels[gear.id] || 0) * 2 }}<template v-if="(ascensionStore.gearLevels[gear.id] || 0) >= 3"> / 法则{{ 1 + Math.floor(((ascensionStore.gearLevels[gear.id] || 0) - 3) / 2) }}</template></span>
        </button>
      </div>
    </div>

    <div v-if="isTab('arts')" class="mb-4 relative z-10">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙术特效</p><span class="text-[10px] text-muted">点击切换战斗表现</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="art in IMMORTAL_ARTS" :key="art.id" class="art-card" :class="ascensionStore.lastArtId === art.id ? 'active' : ''" @click="ascensionStore.castImmortalArt(art.id)">
          <span class="text-xl">{{ art.icon }}</span><span class="text-xs text-accent">{{ art.name }}</span><span class="text-[10px] text-muted">{{ art.element }} · {{ art.effect }}</span>
        </button>
      </div>
    </div>

    <div v-if="isTab('arts')" class="battle-log relative z-10 mb-4" :key="`battle-${ascensionStore.visualPulse}`">
      <p class="text-xs text-accent mb-1">仙术反馈</p><p class="text-xs leading-relaxed">{{ ascensionStore.lastBattleText }}</p>
    </div>

    <div v-if="isTab('story')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙界主线</p><span class="text-[10px] text-muted">章节 {{ ascensionStore.storyProgress }}/{{ IMMORTAL_STORY_CHAPTERS.length }}</span></div>
      <div class="immortal-scene-banner story-scene"><img :src="ART.story" alt="云阙天门主线场景" /></div>
      <div class="space-y-2">
        <div v-for="chapter in IMMORTAL_STORY_CHAPTERS" :key="chapter.id" class="story-card" :class="ascensionStore.storyClaimed[chapter.id] ? 'done' : ''">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm text-accent">{{ chapter.icon }} {{ chapter.chapter }} · {{ chapter.title }}</p>
              <p class="text-[10px] text-muted leading-relaxed mt-1">{{ chapter.desc }}</p>
            </div>
            <button class="btn-mini shrink-0" :disabled="ascensionStore.storyClaimed[chapter.id] || !chapter.need(ascensionStore.storyState)" @click="ascensionStore.claimStoryChapter(chapter.id)">
              {{ ascensionStore.storyClaimed[chapter.id] ? '已完成' : chapter.need(ascensionStore.storyState) ? '推进剧情' : '未达成' }}
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2 text-[10px]">
            <span class="text-warning">条件：{{ chapter.requirement }}</span>
            <span class="text-success">奖励：{{ chapter.rewardText }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isTab('fate')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">道统传承</p><span class="text-[10px] text-muted">当前 {{ ascensionStore.lineageInfo.name }}</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="lineage in IMMORTAL_LINEAGES" :key="lineage.id" class="office-card lineage-card" :class="ascensionStore.immortalLineage === lineage.id ? 'active' : ''" @click="ascensionStore.chooseLineage(lineage.id)">
          <span class="text-sm text-accent">{{ lineage.icon }} {{ lineage.name }}</span>
          <span class="text-[10px] text-muted leading-relaxed">{{ lineage.desc }}</span>
          <span class="text-[10px] text-success">{{ lineage.bonus }}</span>
        </button>
      </div>
    </div>

    <div v-if="isTab('fate')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙界天命</p><span class="text-[10px] text-muted">天命积分 +{{ ascensionStore.mandateProgress }}</span></div>
      <div class="grid grid-cols-1 gap-2">
        <div v-for="mandate in IMMORTAL_MANDATES" :key="mandate.id" class="mandate-card">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <p class="text-sm text-accent">{{ mandate.icon }} {{ mandate.name }}</p>
              <p class="text-[10px] text-muted leading-relaxed">{{ mandate.desc }}</p>
            </div>
            <span class="text-[10px] text-muted shrink-0">已决 {{ ascensionStore.mandateDone[mandate.id] || 0 }}</span>
          </div>
          <div class="grid grid-cols-3 gap-1">
            <button v-for="choice in mandate.choices" :key="choice.id" class="choice-card" @click="ascensionStore.resolveMandate(mandate.id, choice.id)">
              <span class="text-[11px] text-accent">{{ choice.name }}</span>
              <span class="text-[10px] text-muted leading-tight">{{ choice.desc }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isTab('office')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙盟协作</p><span class="text-[10px] text-muted">协作声望 +{{ ascensionStore.allianceScore }}</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="ally in IMMORTAL_ALLIANCES" :key="ally.id" class="alliance-card" @click="ascensionStore.coordinateAlliance(ally.id)">
          <span class="text-sm text-accent">{{ ally.icon }} {{ ally.name }}</span>
          <span class="text-[10px] text-muted leading-relaxed">{{ ally.desc }}</span>
          <span class="text-[10px] text-warning">消耗 功德{{ ally.costMerit }} / 仙玉{{ ally.costJade }}</span>
          <span class="text-[10px] text-success">法则+{{ ally.rewardRule }}｜赛季+{{ ally.rewardSeason }}｜已协作 {{ ascensionStore.allianceProgress[ally.id] || 0 }}</span>
        </button>
      </div>
    </div>

    <div v-if="isTab('rift')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">混沌裂隙</p><span class="text-[10px] text-muted">镇压次数 +{{ ascensionStore.riftScore }}</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="rift in CHAOS_RIFTS" :key="rift.id" class="rift-card visual-rift-card rift-boss-card" :class="ascensionStore.riftBossInfo(rift.id).turns >= 4 ? 'boss-fury' : ''" @click="ascensionStore.challengeChaosRift(rift.id)">
          <img class="rift-art" :src="ART.rift" :alt="`${rift.name}怪物`" draggable="false" />
          <span class="text-sm text-accent relative z-[1]">{{ rift.name }} <b v-if="ascensionStore.riftBossInfo(rift.id).turns >= 4" class="fury-tag">狂暴</b></span>
          <span class="text-[10px] text-muted leading-relaxed">{{ rift.desc }}</span>
          <div class="boss-bars"><span><i class="hp-bar" :style="{ width: `${Math.max(0, ascensionStore.riftBossInfo(rift.id).hp / ascensionStore.riftBossInfo(rift.id).maxHp * 100)}%` }"></i></span><small>仙躯 {{ ascensionStore.riftBossInfo(rift.id).hp }}/{{ ascensionStore.riftBossInfo(rift.id).maxHp }}</small><span class="shield-bar"><i :style="{ width: `${Math.max(0, ascensionStore.riftBossInfo(rift.id).shield / ascensionStore.riftBossInfo(rift.id).maxShield * 100)}%` }"></i></span><small>法则护盾 {{ ascensionStore.riftBossInfo(rift.id).shield }}</small></div>
          <span class="text-[10px]" :class="ascensionStore.immortalPower >= rift.needPower ? 'text-success' : 'text-danger'">建议仙战力 {{ rift.needPower }}｜当前 {{ ascensionStore.immortalPower }}</span>
          <span class="text-[10px] text-warning">连续施法破盾，击杀奖励含仙器精魄</span>
        </button>
      </div>
    </div>

    <div v-if="isTab('fate')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙缘命盘</p><span class="text-[10px] text-muted">命盘战力 +{{ ascensionStore.fatePlatePower }}</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="plate in FATE_PLATES" :key="plate.id" class="fate-card" @click="ascensionStore.upgradeFatePlate(plate.id)">
          <span class="text-sm text-accent">{{ plate.icon }} {{ plate.name }} Lv.{{ ascensionStore.fatePlateLevels[plate.id] || 0 }}</span>
          <span class="text-[10px] text-muted leading-relaxed">{{ plate.desc }}</span>
          <span class="text-[10px] text-warning">消耗 法则{{ plate.costRule + (ascensionStore.fatePlateLevels[plate.id] || 0) * 6 }} / 仙玉{{ plate.costJade + (ascensionStore.fatePlateLevels[plate.id] || 0) * 4 }}</span>
          <span class="text-[10px] text-success">每级仙战力+{{ plate.power }}｜{{ plate.bonus }}</span>
        </button>
      </div>
    </div>

    <div v-if="isTab('cave')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙界洞天经营</p><span class="text-[10px] text-muted">稳定 {{ ascensionStore.caveHeavenStability }}% · 战力倍率 {{ Math.round(ascensionStore.caveHeavenStabilityRate * 100) }}%</span></div>
      <div class="immortal-scene-banner cave-scene"><img :src="ART.cave" alt="仙界洞天场景" /></div>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <button v-for="node in IMMORTAL_CAVE_NODES" :key="node.id" class="body-card market-card" @click="ascensionStore.upgradeCaveNode(node.id)">
          <span class="text-sm text-accent">{{ node.icon }} {{ node.name }} Lv.{{ ascensionStore.caveLevels[node.id] || 0 }}</span>
          <span class="text-[10px] text-muted leading-relaxed">{{ node.desc }}</span>
          <span class="text-[10px] text-warning">升级 仙玉{{ node.jadeCost + (ascensionStore.caveLevels[node.id] || 0) * 3 }} / 法则{{ node.ruleCost + (ascensionStore.caveLevels[node.id] || 0) }}</span>
          <span class="text-[10px] text-success">每级仙战力+{{ node.powerPerLevel }}</span>
        </button>
      </div>
      <button class="btn w-full justify-center" :disabled="!ascensionStore.caveHeavenNeedsMaintenance" @click="ascensionStore.maintainCaveHeaven">维护洞天（功德{{ ascensionStore.caveHeavenMaintenanceCost.merit }} / 仙玉{{ ascensionStore.caveHeavenMaintenanceCost.jade }} / 法则{{ ascensionStore.caveHeavenMaintenanceCost.rule }}）</button>
    </div>

    <div v-if="isTab('realm')" class="relative z-10 mb-4">
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

    <div v-if="isTab('market')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙市兑换</p><span class="text-[10px] text-muted">资源转化，不复制凡界商店</span></div>
      <div class="immortal-scene-banner market-scene"><img :src="ART.market" alt="仙市场景" /></div>
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

    <div v-if="isTab('trial')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙域试炼</p><span class="text-[10px] text-muted">奖励功德 / 仙玉 / 法则碎片</span></div>
      <div class="grid grid-cols-1 gap-2">
        <div v-for="trial in IMMORTAL_TRIALS" :key="trial.id" class="trial-card visual-trial-card">
          <img class="combat-art enemy-art" :src="ART.trial" :alt="`${trial.enemy}首领`" draggable="false" />
          <div class="min-w-0 relative z-[1]">
            <p class="text-sm text-accent">{{ trial.icon }} {{ trial.name }}</p>
            <p class="text-[10px] text-muted">{{ trial.realm }} · {{ trial.enemy }} · 难度 {{ trial.difficulty }} · 已胜 {{ ascensionStore.trialWins[trial.id] || 0 }} 次</p>
            <p class="text-[10px] text-muted leading-relaxed mt-1">{{ trial.desc }}</p>
          </div>
          <button class="btn shrink-0" @click="ascensionStore.challengeTrial(trial.id)">施展仙术</button>
        </div>
      </div>
    </div>


    <div v-if="isTab('arena')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙擂问道 · PK</p><span class="text-[10px] text-muted">{{ ascensionStore.pkRecord }}</span></div>
      <div class="grid grid-cols-1 gap-2">
        <div v-for="rival in IMMORTAL_RIVALS" :key="rival.id" class="trial-card pk-card visual-trial-card">
          <img class="combat-art rival-art" :src="ART.rival" :alt="`${rival.name}立绘`" draggable="false" />
          <div class="min-w-0 relative z-[1]">
            <p class="text-sm text-accent">{{ rival.icon }} {{ rival.name }}</p>
            <p class="text-[10px] text-muted">{{ rival.style }} · 战力 {{ rival.power }} · 连胜加成 {{ ascensionStore.pkStreak * 35 }}</p>
            <p class="text-[10px] text-muted leading-relaxed mt-1">{{ rival.desc }}</p>
          </div>
          <button class="btn shrink-0" @click="ascensionStore.challengeRival(rival.id)">登擂斗法</button>
        </div>
      </div>
    </div>

    <div v-if="isTab('arena')" class="relative z-10 mb-4">
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

    <div v-if="isTab('office')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">仙职事务</p><span class="text-[10px] text-muted">同仙职完成奖励更高</span></div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="duty in IMMORTAL_DUTIES" :key="duty.id" class="duty-card" :class="ascensionStore.dutyDone[duty.id] ? 'done' : ''" @click="ascensionStore.completeDuty(duty.id)">
          <span class="text-lg">{{ duty.icon }}</span><span class="text-xs text-accent">{{ duty.name }}</span><span class="text-[10px] text-muted">{{ duty.desc }}</span>
          <span class="text-[10px]" :class="ascensionStore.dutyDone[duty.id] ? 'text-success' : 'text-muted'">{{ ascensionStore.dutyDone[duty.id] ? '今日已办' : `功德+${duty.rewardMerit}` }}</span>
        </button>
      </div>
    </div>

    <div v-if="isTab('cave')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">洞天建设</p><span class="text-[10px] text-muted">洞天战力 +{{ ascensionStore.cavePower }}</span></div>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="node in IMMORTAL_CAVE_NODES" :key="node.id" class="body-card cave-card">
          <p class="text-xs text-accent">{{ node.icon }} {{ node.name }} Lv.{{ ascensionStore.caveLevels[node.id] || 0 }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ node.desc }}</p>
          <button class="btn w-full justify-center mt-2" @click="ascensionStore.upgradeCaveNode(node.id)">升级</button>
        </div>
      </div>
    </div>

    <div v-if="isTab('cave')" class="relative z-10 mb-4 expedition-panel">
      <div class="flex items-center justify-between mb-2"><p class="text-xs text-accent">洞天派遣</p><span class="text-[10px] text-muted">每天每项一次 · 先建设对应洞天</span></div>
      <div class="grid grid-cols-3 gap-2">
        <button v-for="mission in IMMORTAL_EXPEDITIONS" :key="mission.id" class="expedition-card" :class="ascensionStore.expeditionClaimed[mission.id] === new Date().toISOString().slice(0, 10) ? 'done' : ''" @click="ascensionStore.dispatchImmortalExpedition(mission.id)">
          <p class="text-xs text-accent">{{ mission.name }}</p><p class="text-[10px] text-muted leading-relaxed">{{ mission.desc }}</p><p class="text-[10px] text-warning">需 {{ IMMORTAL_CAVE_NODES.find(n => n.id === mission.needNode)?.name }} Lv.1</p><p class="text-[10px] text-success">仙玉+{{ mission.jade }} · 器魄+{{ mission.essence }}</p><p class="text-[10px]" :class="ascensionStore.expeditionClaimed[mission.id] === new Date().toISOString().slice(0, 10) ? 'text-success' : 'text-muted'">{{ ascensionStore.expeditionClaimed[mission.id] === new Date().toISOString().slice(0, 10) ? '今日已归' : '派遣仙舟' }}</p>
        </button>
      </div>
    </div>

    <div v-if="isTab('echo')" class="relative z-10 mb-4">
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

    <div v-if="isTab('office')" class="relative z-10">
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
import { useRoute, useRouter } from 'vue-router'
import { useAscensionStore, IMMORTAL_ARTS, IMMORTAL_GEAR, IMMORTAL_EXPEDITIONS, IMMORTAL_TRIALS, IMMORTAL_OFFICES, IMMORTAL_DUTIES, IMMORTAL_CAVE_NODES, MORTAL_ECHOES, IMMORTAL_RIVALS, IMMORTAL_MARKET, IMMORTAL_SEASON_REWARDS, IMMORTAL_LINEAGES, IMMORTAL_MANDATES, IMMORTAL_ALLIANCES, CHAOS_RIFTS, FATE_PLATES, IMMORTAL_STORY_CHAPTERS } from '@/stores/useAscensionStore'
import { addLog } from '@/composables/useGameLog'
import { computed } from 'vue'
const router = useRouter(); const route = useRoute(); const ascensionStore = useAscensionStore()
const officeInfo = computed(() => ascensionStore.officeInfo)
const immortalTab = computed(() => String(route.query.tab || 'home'))
const isTab = (...keys: string[]) => keys.includes(immortalTab.value)
const switchTab = (tab: string) => { void router.push({ path: '/game/immortal-world', query: { ...route.query, tab } }) }
const sectionTitle = computed(() => ({
  home: '仙界大厅',
  gear: '仙器谱',
  arts: '仙术演武',
  story: '仙界主线',
  realm: '仙阶突破',
  cave: '仙界洞天',
  market: '仙市兑换',
  trial: '仙域试炼',
  arena: '仙擂问道',
  office: '仙职仙盟',
  fate: '命盘天命',
  rift: '混沌裂隙',
  echo: '凡界回响'
}[immortalTab.value] || '仙界大厅'))
const ART = {
  trial: '/assets/immortal/trial-enemy.png',
  rival: '/assets/immortal/arena-rival.png',
  rift: '/assets/immortal/rift-beast.png',
  cave: '/assets/immortal/cave-heaven.png',
  market: '/assets/immortal/immortal-market.png',
  story: '/assets/immortal/story-gate.png'
}
const zoneArt = (key: string) => ({ realm: ART.story, cave: ART.cave, market: ART.market, trial: ART.trial, arena: ART.rival, rift: ART.rift, fate: ART.story, office: ART.market, story: ART.story, gear: ART.trial, arts: ART.trial, echo: ART.cave }[key] || ART.story)
const IMMORTAL_ZONES = [
  { key: 'realm', icon: '🌌', name: '仙阶突破', desc: '真仙、玄仙、地仙等仙阶成长' },
  { key: 'cave', icon: '🏯', name: '仙界洞天', desc: '仙域经营、洞天维护与建设' },
  { key: 'market', icon: '💎', name: '仙市兑换', desc: '功德、仙玉、法则资源转化' },
  { key: 'trial', icon: '⚔️', name: '仙域试炼', desc: '挑战仙域敌人与获取材料' },
  { key: 'gear', icon: '✦', name: '仙器谱', desc: '六部位仙器、淬炼与套装共鸣' },
  { key: 'arena', icon: '🏆', name: '仙擂问道', desc: '斗法、连胜与赛季奖励' },
  { key: 'fate', icon: '🔮', name: '命盘天命', desc: '命盘、道统与天命抉择' },
  { key: 'rift', icon: '🕳️', name: '混沌裂隙', desc: '镇压裂隙获取高阶奖励' },
  { key: 'office', icon: '📜', name: '仙职仙盟', desc: '仙职事务与仙盟协作' },
  { key: 'story', icon: '📖', name: '仙界主线', desc: '云阙天门后的主线章节' },
  { key: 'arts', icon: '✨', name: '仙术演武', desc: '切换仙术表现与战斗反馈' },
  { key: 'echo', icon: '🌾', name: '凡界回响', desc: '飞升后反哺凡界系统' }
]
const exitAdminPreview = () => {
  ascensionStore.exitAdminPreview()
  router.replace('/')
}
const returnToWorld = () => { ascensionStore.returnToWorld(); router.push('/game/cultivation'); addLog('返回下界，仙光暂敛。') }
</script>
<style scoped>
.immortal-page{position:relative;overflow:hidden;border:1px solid rgba(250,214,124,.24);border-radius:4px;padding:12px;min-height:100%;background:radial-gradient(circle at 20% 0%,rgba(255,247,190,.18),transparent 28%),radial-gradient(circle at 80% 10%,rgba(135,196,255,.16),transparent 30%),linear-gradient(180deg,rgba(17,24,48,.92),rgba(42,31,62,.88));box-shadow:inset 0 0 35px rgba(255,224,139,.08)}
.immortal-sky{position:absolute;inset:0;pointer-events:none;opacity:.9}.star,.cloud{position:absolute;animation:float 4s ease-in-out infinite alternate}.s1{left:12%;top:14%;color:#fff2a8}.s2{right:18%;top:8%;color:#bfe7ff;animation-delay:.6s}.s3{left:72%;top:34%;color:#ffd6fb;animation-delay:1.2s}.c1{left:-4%;top:58%;color:rgba(255,255,255,.18);font-size:46px}.c2{right:-2%;top:42%;color:rgba(255,255,255,.14);font-size:40px;animation-delay:.8s}
.immortal-hero{display:flex;gap:14px;align-items:center;border:1px solid rgba(250,214,124,.22);background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02));border-radius:4px;padding:14px}.hero-avatar{position:relative;width:78px;height:96px;display:grid;place-items:center}.halo{position:absolute;width:70px;height:70px;border:2px double rgba(255,230,151,.8);border-radius:50%;box-shadow:0 0 18px rgba(255,223,126,.55),inset 0 0 18px rgba(120,200,255,.18);animation:pulse 1.6s ease-in-out}.immortal-body{position:relative;z-index:1;width:40px;height:58px;display:grid;place-items:center;color:#20150d;font-weight:700;background:linear-gradient(180deg,#fff6c4,#79d6ff 48%,#d5b1ff);clip-path:polygon(50% 0,78% 16%,88% 72%,50% 100%,12% 72%,22% 16%);box-shadow:0 0 16px rgba(255,255,255,.55)}.sword-light{position:absolute;right:7px;top:8px;width:4px;height:78px;background:linear-gradient(#fff,#8ddfff,transparent);transform:rotate(32deg);box-shadow:0 0 12px #9ee7ff}
.stat,.body-card{border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:6px;background:rgba(0,0,0,.12)}.stat b{display:block;color:#ffe28a;font-size:12px}.stat span{color:rgba(255,255,255,.52);font-size:10px}.body-card{min-height:72px}.art-card,.office-card,.duty-card,.choice-card,.alliance-card,.rift-card,.fate-card{display:flex;flex-direction:column;gap:3px;align-items:flex-start;text-align:left;border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:9px;background:rgba(0,0,0,.12);transition:.16s}.art-card:hover,.office-card:hover,.duty-card:hover,.art-card.active,.office-card.active,.duty-card.done{border-color:rgba(255,226,138,.58);background:rgba(255,226,138,.08);box-shadow:0 0 14px rgba(255,226,138,.12)}.battle-log{border:1px solid rgba(141,222,255,.28);background:linear-gradient(90deg,rgba(113,210,255,.1),rgba(255,226,138,.08));border-radius:3px;padding:10px;animation:pulse .8s ease-out}.trial-card,.realm-card{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:10px;background:rgba(0,0,0,.12)}.art-purple_thunder_seal .battle-log{border-color:rgba(190,140,255,.5);box-shadow:0 0 15px rgba(183,108,255,.18)}.art-solar_flame .battle-log{border-color:rgba(255,180,72,.5);box-shadow:0 0 15px rgba(255,130,44,.18)}.art-cloud_body .battle-log{border-color:rgba(190,245,255,.5);box-shadow:0 0 15px rgba(168,236,255,.18)}.pk-card{border-color:rgba(255,120,120,.22)}.cave-card,.echo-card,.market-card{min-height:120px}.mandate-card{border:1px solid rgba(141,222,255,.2);border-radius:3px;padding:10px;background:rgba(0,0,0,.12)}.choice-card{min-height:74px;gap:3px;align-items:flex-start;text-align:left;border:1px solid rgba(250,214,124,.14);border-radius:3px;padding:7px;background:rgba(255,255,255,.035);transition:.16s}.choice-card:hover{border-color:rgba(255,226,138,.55);background:rgba(255,226,138,.08)}.story-card{border:1px solid rgba(255,226,138,.18);border-radius:3px;padding:10px;background:linear-gradient(135deg,rgba(255,226,138,.07),rgba(141,222,255,.04));position:relative;overflow:hidden}.story-card.done{border-color:rgba(105,232,162,.45);background:rgba(105,232,162,.07)}.story-card::after{content:'';position:absolute;inset:auto 0 0 0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,226,138,.5),transparent)}.lineage-card{min-height:104px}.alliance-card,.rift-card,.fate-card{min-height:126px;gap:5px;align-items:flex-start;text-align:left;border:1px solid rgba(141,222,255,.16);border-radius:3px;padding:9px;background:linear-gradient(135deg,rgba(141,222,255,.055),rgba(255,226,138,.035));transition:.16s}.alliance-card:hover,.rift-card:hover,.fate-card:hover{border-color:rgba(141,222,255,.45);transform:translateY(-1px);box-shadow:0 0 18px rgba(141,222,255,.08)}.realm-card{border:1px solid rgba(250,214,124,.16);border-radius:3px;padding:10px;background:rgba(0,0,0,.12)}.season-card{min-height:112px}.season-card.claimed{opacity:.62}.duty-card{min-height:110px}.duty-card.done{opacity:.72}
@keyframes float{from{transform:translateY(0)}to{transform:translateY(-10px)}}@keyframes pulse{0%{transform:scale(.96);opacity:.72}60%{transform:scale(1.04);opacity:1}100%{transform:scale(1);opacity:1}}


/* V2.6.5 仙界视觉强化：星穹、仙门、流光卡片 */
.immortal-celestial-page{
  position:relative;
  isolation:isolate;
  min-height:100%;
  padding:10px;
  border-radius:12px;
  overflow:hidden;
  background:
    radial-gradient(circle at 18% 5%, rgba(255,230,150,.22), transparent 24%),
    radial-gradient(circle at 85% 10%, rgba(135,210,255,.22), transparent 26%),
    radial-gradient(circle at 50% 35%, rgba(168,120,255,.12), transparent 34%),
    linear-gradient(180deg, rgba(8,11,30,.92), rgba(8,4,22,.96) 48%, rgba(2,8,18,.98));
}
.immortal-celestial-page::before{
  content:'';
  position:absolute;
  inset:0;
  z-index:-2;
  opacity:.72;
  background-image:
    radial-gradient(circle, rgba(255,255,255,.85) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(255,226,138,.8) 0 1px, transparent 1.6px),
    linear-gradient(115deg, transparent 0 40%, rgba(120,210,255,.10) 45%, transparent 52% 100%);
  background-size:72px 72px, 118px 118px, 100% 100%;
  animation:celestialDrift 22s linear infinite;
}
.immortal-celestial-page::after{
  content:'';
  position:absolute;
  inset:0;
  z-index:-1;
  pointer-events:none;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255,226,138,.22), transparent 42%),
    linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
  mask-image:linear-gradient(#000, transparent 70%);
}
.immortal-celestial-page > .card:first-child,
.immortal-celestial-page .page-hero,
.immortal-celestial-page section:first-child{
  position:relative;
  overflow:hidden;
  border:1px solid rgba(255,226,138,.42)!important;
  box-shadow:0 0 36px rgba(255,226,138,.15), inset 0 0 28px rgba(110,190,255,.08);
  background:
    linear-gradient(135deg, rgba(255,226,138,.15), rgba(130,210,255,.08) 48%, rgba(135,80,255,.10)),
    rgba(6,10,28,.72)!important;
}
.celestial-orbit-ring{
  position:absolute;
  right:-54px;
  top:-72px;
  width:210px;
  height:210px;
  border-radius:999px;
  border:1px solid rgba(255,226,138,.32);
  box-shadow:0 0 32px rgba(255,226,138,.18), inset 0 0 32px rgba(120,210,255,.12);
  animation:celestialSpin 18s linear infinite;
}
.celestial-orbit-ring::before,.celestial-orbit-ring::after{
  content:'';position:absolute;border-radius:999px;inset:34px;border:1px dashed rgba(135,210,255,.28)
}
.celestial-orbit-ring::after{inset:72px;border-color:rgba(255,255,255,.18)}
.celestial-starfield{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 76% 18%, rgba(255,255,255,.9) 0 2px, transparent 3px),radial-gradient(circle at 63% 38%, rgba(255,226,138,.9) 0 1.5px, transparent 3px),radial-gradient(circle at 88% 58%, rgba(140,220,255,.9) 0 1.5px, transparent 3px);animation:twinkle 2.8s ease-in-out infinite alternate}
.immortal-celestial-page .card,
.immortal-celestial-page .art-card,
.immortal-celestial-page .office-card,
.immortal-celestial-page .duty-card,
.immortal-celestial-page .choice-card,
.immortal-celestial-page .alliance-card,
.immortal-celestial-page .rift-card,
.immortal-celestial-page .fate-card,
.immortal-celestial-page .trial-card,
.immortal-celestial-page .realm-card,
.immortal-celestial-page .story-card,
.immortal-celestial-page .mandate-card{
  position:relative;
  overflow:hidden;
  backdrop-filter:blur(10px);
  border-color:rgba(255,226,138,.22)!important;
  box-shadow:0 10px 26px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.06);
}
.immortal-celestial-page .art-card::before,
.immortal-celestial-page .office-card::before,
.immortal-celestial-page .duty-card::before,
.immortal-celestial-page .choice-card::before,
.immortal-celestial-page .alliance-card::before,
.immortal-celestial-page .rift-card::before,
.immortal-celestial-page .fate-card::before,
.immortal-celestial-page .trial-card::before,
.immortal-celestial-page .realm-card::before,
.immortal-celestial-page .story-card::before{
  content:'';
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(115deg, transparent 0 35%, rgba(255,255,255,.11) 45%, transparent 56% 100%);
  transform:translateX(-120%);
  transition:transform .65s ease;
}
.immortal-celestial-page .art-card:hover::before,
.immortal-celestial-page .office-card:hover::before,
.immortal-celestial-page .duty-card:hover::before,
.immortal-celestial-page .choice-card:hover::before,
.immortal-celestial-page .alliance-card:hover::before,
.immortal-celestial-page .rift-card:hover::before,
.immortal-celestial-page .fate-card:hover::before,
.immortal-celestial-page .trial-card:hover::before,
.immortal-celestial-page .realm-card:hover::before,
.immortal-celestial-page .story-card:hover::before{transform:translateX(120%)}
.immortal-celestial-page button.btn,
.immortal-celestial-page .btn{
  border-color:rgba(255,226,138,.42)!important;
  background:linear-gradient(135deg, rgba(255,226,138,.22), rgba(116,203,255,.14))!important;
  box-shadow:0 0 14px rgba(255,226,138,.12);
}
.immortal-celestial-page button.btn:not(:disabled):hover,
.immortal-celestial-page .btn:not(:disabled):hover{
  transform:translateY(-1px);
  box-shadow:0 0 22px rgba(255,226,138,.24),0 0 18px rgba(116,203,255,.16);
}
.immortal-celestial-page .text-accent{ text-shadow:0 0 10px rgba(255,226,138,.42); }
.immortal-celestial-page .battle-log{box-shadow:0 0 22px rgba(116,203,255,.16), inset 0 0 16px rgba(255,226,138,.06)}
@keyframes celestialDrift{from{background-position:0 0,0 0,0 0}to{background-position:72px 72px,-118px 118px,0 0}}
@keyframes celestialSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes twinkle{from{opacity:.45;filter:blur(.2px)}to{opacity:1;filter:blur(0)}}
@media (prefers-reduced-motion:reduce){.immortal-celestial-page::before,.celestial-orbit-ring,.celestial-starfield{animation:none}.immortal-celestial-page *{transition:none!important}}


.immortal-zone-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.zone-card{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:4px;align-items:flex-start;text-align:left;min-height:92px;border:1px solid rgba(255,226,138,.22);border-radius:4px;padding:10px;background:linear-gradient(135deg,rgba(255,226,138,.09),rgba(116,203,255,.06));box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:.16s}.zone-card:hover{border-color:rgba(255,226,138,.58);transform:translateY(-1px);box-shadow:0 0 18px rgba(255,226,138,.13)}.zone-icon{font-size:22px;filter:drop-shadow(0 0 8px rgba(255,226,138,.35))}
.immortal-portrait-stage{position:relative;width:190px;height:268px;display:grid;place-items:center;overflow:visible;border:1px solid rgba(255,226,138,.36);border-radius:22px;background:radial-gradient(circle at 50% 18%,rgba(255,244,179,.28),transparent 34%),radial-gradient(circle at 45% 66%,rgba(125,227,255,.18),transparent 46%),linear-gradient(180deg,rgba(5,11,35,.86),rgba(23,10,48,.58));box-shadow:0 0 38px rgba(255,226,138,.2),0 0 42px rgba(101,214,255,.09),inset 0 0 30px rgba(255,255,255,.06)}.immortal-gate{position:absolute;border-radius:999px;border:1px solid rgba(255,226,138,.35);box-shadow:0 0 30px rgba(255,226,138,.15),inset 0 0 26px rgba(116,203,255,.09)}.gate-back{top:18px;width:166px;height:166px;background:radial-gradient(circle,rgba(255,226,138,.12),transparent 65%)}.gate-front{top:44px;width:126px;height:126px;border-style:dashed;border-color:rgba(140,226,255,.42);animation:celestialSpin 16s linear infinite}.portrait-orbit{position:absolute;border-radius:999px;border:1px solid rgba(255,255,255,.22)}.orbit-a{top:49px;width:172px;height:76px;transform:rotate(-18deg);animation:celestialSpin 14s linear infinite}.orbit-b{top:70px;width:154px;height:62px;transform:rotate(20deg);border-color:rgba(255,226,138,.34);animation:celestialSpin 12s linear infinite reverse}.orbit-c{top:92px;width:120px;height:48px;transform:rotate(-8deg);border-color:rgba(126,232,255,.28)}.portrait-star{position:absolute;width:4px;height:4px;border-radius:999px;background:#fff7bf;box-shadow:0 0 10px #ffe28a}.star-a{left:24px;top:42px}.star-b{right:25px;top:78px}.star-c{left:34px;bottom:80px}.immortal-artwork{position:absolute;z-index:5;inset:4px;width:calc(100% - 8px);height:calc(100% - 8px);object-fit:cover;object-position:center 42%;border-radius:20px;filter:saturate(1.1) contrast(1.04) drop-shadow(0 0 16px rgba(126,232,255,.25)) drop-shadow(0 0 22px rgba(255,226,138,.18))}.portrait-cloud{position:absolute;z-index:7;bottom:18px;height:22px;border-radius:999px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,246,192,.24),rgba(134,225,255,.16));box-shadow:0 0 16px rgba(255,255,255,.13);backdrop-filter:blur(2px)}.cloud-left{left:12px;width:72px}.cloud-mid{left:54px;width:86px;bottom:8px}.cloud-right{right:12px;width:72px}.portrait-nameplate{position:absolute;z-index:9;bottom:-14px;padding:3px 12px;border:1px solid rgba(255,226,138,.48);border-radius:999px;background:linear-gradient(135deg,rgba(20,15,40,.95),rgba(10,28,46,.92));color:#ffe28a;font-size:11px;letter-spacing:.16em;box-shadow:0 0 18px rgba(255,226,138,.22)}

/* V2.6.8 二次元仙界美术包 */
.zone-card{isolation:isolate}.zone-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:.52;z-index:-2;transition:.2s}.zone-card:hover .zone-art{opacity:.72;transform:scale(1.04)}.zone-card-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(135deg,rgba(5,10,30,.45),rgba(9,9,24,.9) 76%)}.immortal-scene-banner{position:relative;height:118px;overflow:hidden;border:1px solid rgba(255,226,138,.3);border-radius:5px;margin-bottom:8px;background:#0b1025;box-shadow:inset 0 0 20px rgba(0,0,0,.45),0 0 16px rgba(119,217,255,.08)}.immortal-scene-banner::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,9,28,.16),rgba(5,9,28,.52));pointer-events:none}.immortal-scene-banner img{width:100%;height:100%;object-fit:cover;object-position:center 48%;display:block}.visual-trial-card{position:relative;min-height:122px;overflow:hidden;isolation:isolate}.combat-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:74% 42%;opacity:.42;z-index:-1;filter:saturate(1.08) contrast(1.06)}.visual-trial-card::after{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(7,11,28,.94) 0%,rgba(7,11,28,.67) 58%,rgba(7,11,28,.15) 100%)}.rival-art{object-position:78% 35%}.visual-rift-card{position:relative;overflow:hidden;isolation:isolate}.rift-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:.42;z-index:-1;filter:saturate(1.14) contrast(1.08)}.visual-rift-card::after{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(135deg,rgba(7,8,25,.7),rgba(10,4,30,.9))}
.immortal-gear-panel{padding:10px;border:1px solid rgba(255,226,138,.26);border-radius:8px;background:linear-gradient(145deg,rgba(10,18,45,.75),rgba(31,12,58,.62));box-shadow:inset 0 0 35px rgba(125,210,255,.06),0 0 24px rgba(255,226,138,.07)}.gear-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:76px;padding:12px;border:1px solid rgba(255,226,138,.25);border-radius:6px;background:linear-gradient(90deg,rgba(255,226,138,.12),rgba(104,207,255,.08))}.gear-power{text-align:right}.gear-power b{display:block;font-size:22px;color:#ffe28a;text-shadow:0 0 14px rgba(255,226,138,.6)}.gear-power span{font-size:10px;color:rgba(255,255,255,.55)}.gear-resonance{margin:8px 0;padding:6px 8px;border-left:2px solid #ffe28a;color:#bcecff;font-size:11px;background:rgba(255,226,138,.05)}.gear-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gear-card{position:relative;display:flex;min-height:164px;overflow:hidden;flex-direction:column;align-items:flex-start;justify-content:flex-end;text-align:left;padding:9px;border:1px solid rgba(142,222,255,.26);border-radius:7px;background:#0b1027;isolation:isolate;transition:.22s}.gear-card:hover{transform:translateY(-2px);border-color:#ffe28a;box-shadow:0 0 22px rgba(255,226,138,.24)}.gear-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:-2;transition:.25s}.gear-card:hover img{transform:scale(1.08)}.gear-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,10,30,.05),rgba(6,8,27,.94) 78%)}.gear-level{position:absolute;right:7px;top:7px;padding:2px 6px;border:1px solid rgba(255,226,138,.58);border-radius:999px;color:#ffe28a;font-size:10px;background:rgba(11,12,35,.72)}.gear-name{color:#ffe28a;font-size:13px;text-shadow:0 0 10px rgba(255,226,138,.45)}.gear-desc{min-height:30px;margin-top:3px;color:rgba(235,245,255,.72);font-size:10px;line-height:1.35}.gear-cost{margin-top:5px;color:#9bdfff;font-size:10px;line-height:1.3}
.rift-boss-card{min-height:185px}.boss-bars{position:relative;z-index:1;width:100%;margin:2px 0 3px}.boss-bars>span{display:block;height:5px;overflow:hidden;border:1px solid rgba(255,180,180,.35);border-radius:999px;background:rgba(0,0,0,.5)}.boss-bars i{display:block;height:100%;border-radius:inherit;transition:width .45s ease}.hp-bar{background:linear-gradient(90deg,#ff476a,#ffbe58);box-shadow:0 0 9px #ff3f69}.boss-bars small{display:block;margin:2px 0;color:rgba(255,255,255,.68);font-size:9px}.boss-bars .shield-bar{border-color:rgba(102,222,255,.42)}.shield-bar i{background:linear-gradient(90deg,#66dfff,#a78bfa);box-shadow:0 0 9px #65dfff}.fury-tag{margin-left:4px;padding:1px 4px;border:1px solid rgba(255,85,85,.7);border-radius:4px;color:#ff9b9b;font-size:9px;animation:furyPulse .7s infinite alternate}.boss-fury{border-color:rgba(255,72,92,.7)!important;box-shadow:0 0 22px rgba(255,55,80,.27)!important}.expedition-panel{padding:10px;border:1px solid rgba(102,222,255,.2);border-radius:7px;background:linear-gradient(135deg,rgba(65,170,255,.07),rgba(255,226,138,.04))}.expedition-card{display:flex;min-height:134px;flex-direction:column;align-items:flex-start;text-align:left;padding:8px;border:1px solid rgba(162,220,255,.18);border-radius:5px;background:rgba(3,10,28,.46);transition:.18s}.expedition-card:hover{transform:translateY(-2px);border-color:rgba(255,226,138,.62);box-shadow:0 0 16px rgba(126,225,255,.12)}.expedition-card.done{opacity:.62;border-color:rgba(105,232,162,.42)}@keyframes furyPulse{from{box-shadow:0 0 4px rgba(255,55,80,.35)}to{box-shadow:0 0 14px rgba(255,55,80,.9)}}
@media (max-width:420px){.immortal-zone-grid{grid-template-columns:1fr}.immortal-hero{align-items:flex-start}.immortal-portrait-stage{width:158px;height:236px}.immortal-artwork{inset:3px;width:calc(100% - 6px);height:calc(100% - 6px)}}

.preview-badge{display:inline-flex;margin-left:6px;padding:1px 6px;border:1px solid rgba(255,226,138,.45);border-radius:999px;font-size:10px;color:#ffe28a;background:rgba(255,226,138,.12);box-shadow:0 0 12px rgba(255,226,138,.18)}
</style>
