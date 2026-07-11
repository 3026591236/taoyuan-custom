<template>
  <div class="immortal-page" :class="`art-${ascensionStore.lastArtId}`">
    <div class="immortal-sky" :key="ascensionStore.visualPulse">
      <span class="star s1">✦</span><span class="star s2">✧</span
      ><span class="star s3">✦</span> <span class="cloud c1">☁</span
      ><span class="cloud c2">☁</span>
    </div>

    <div class="flex items-center justify-between mb-3 relative z-10">
      <div>
        <h3 class="text-accent text-sm">
          仙界 · 云阙天门
          <span v-if="ascensionStore.adminPreviewMode" class="preview-badge"
            >ADMIN 预览</span
          >
        </h3>
        <p class="text-[10px] text-muted">
          {{ sectionTitle }} · 通过仙界地图切换区域
        </p>
        <p
          v-if="ascensionStore.adminPreviewMode"
          class="text-[10px] text-warning mt-1"
        >
          管理员预览数据仅用于检查界面/功能完整性，不写入正式存档。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="ascensionStore.adminPreviewMode"
          class="text-xs text-warning hover:text-accent"
          @click="exitAdminPreview"
        >
          退出预览</button
        ><button
          class="text-xs text-muted hover:text-accent"
          @click="returnToWorld"
        >
          返回凡界
        </button>
      </div>
    </div>

    <div v-if="isTab('home')" class="immortal-hero relative z-10 mb-4">
      <div
        class="hero-avatar immortal-portrait-stage"
        aria-label="仙界角色立绘"
      >
        <div class="immortal-gate gate-back"></div>
        <div class="immortal-gate gate-front"></div>
        <div class="portrait-orbit orbit-a"></div>
        <div class="portrait-orbit orbit-b"></div>
        <div class="portrait-orbit orbit-c"></div>
        <img
          class="immortal-artwork"
          src="/assets/immortal/immortal-sovereign-anime.png"
          alt="二次元仙界角色立绘"
          draggable="false"
        />
        <div class="portrait-cloud cloud-left"></div>
        <div class="portrait-cloud cloud-mid"></div>
        <div class="portrait-cloud cloud-right"></div>
        <div class="portrait-nameplate">
          <span>{{ ascensionStore.immortalRealmInfo.icon }}</span> 仙身显化
        </div>
      </div>
      <div class="flex-1 min-w-0 immortal-profile">
        <div class="profile-crown">
          <span>云阙仙录 · 正册</span><i></i><span>飞升者档案</span>
        </div>
        <p class="text-xl text-accent">
          {{ ascensionStore.immortalTitle || "初入仙门" }}
          <em>· {{ ascensionStore.immortalRank }}</em>
        </p>
        <p class="text-xs text-muted mt-1">
          {{ officeInfo.icon }} {{ officeInfo.name }}：{{ officeInfo.desc }}
        </p>
        <p class="text-[10px] text-accent mt-1">
          {{ ascensionStore.immortalRealmInfo.icon }} 当前仙阶：{{
            ascensionStore.immortalRealmInfo.name
          }}
          · {{ ascensionStore.immortalRealmInfo.desc }}
        </p>
        <div class="character-combat-deck mt-3">
          <div class="combat-power">
            <span>仙界战力</span><b>{{ ascensionStore.immortalPower }}</b
            ><small>IMMORTAL POWER</small>
          </div>
          <div class="combat-vitals">
            <div class="vital-row">
              <span><i class="vital-mark hp-mark"></i>仙躯气血</span
              ><b
                >{{ ascensionStore.immortalHp }}
                <small>/ {{ ascensionStore.immortalMaxHp }}</small></b
              >
            </div>
            <div class="vital-bar hp">
              <i :style="{ width: `${ascensionStore.immortalHpRate}%` }"></i>
            </div>
            <div class="vital-row">
              <span><i class="vital-mark qi-mark"></i>本源仙力</span
              ><b
                >{{ ascensionStore.immortalQi }}
                <small>/ {{ ascensionStore.immortalMaxQi }}</small></b
              >
            </div>
            <div class="vital-bar qi">
              <i :style="{ width: `${ascensionStore.immortalQiRate}%` }"></i>
            </div>
          </div>
          <div class="combat-stats">
            <div>
              <span>仙攻</span><b>{{ ascensionStore.immortalAttack }}</b>
            </div>
            <div>
              <span>仙防</span><b>{{ ascensionStore.immortalDefense }}</b>
            </div>
            <div>
              <span>暴击</span><b>{{ ascensionStore.immortalCritRate }}%</b>
            </div>
            <div>
              <span>减伤</span
              ><b>{{ ascensionStore.immortalDamageReduction }}%</b>
            </div>
          </div>
        </div>
        <div class="profile-insight-grid mt-2">
          <div>
            <span>道统</span><b>{{ ascensionStore.lineageInfo.name }}</b>
          </div>
          <div>
            <span>本命仙术</span><b>{{ currentArt.name }}</b>
          </div>
          <div>
            <span>仙器共鸣</span><b>+{{ ascensionStore.gearPower }}</b>
          </div>
          <div>
            <span>洞天稳定</span
            ><b
              :class="
                ascensionStore.caveHeavenStability < 80
                  ? 'text-danger'
                  : 'text-success'
              "
              >{{ ascensionStore.caveHeavenStability }}%</b
            >
          </div>
          <div>
            <span>斗法战绩</span><b>{{ ascensionStore.pkRecord }}</b>
          </div>
          <div>
            <span>裂隙镇压</span><b>{{ ascensionStore.riftScore }} 次</b>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isTab('home')" class="immortal-dossier relative z-10 mb-4">
      <div class="dossier-resource-row">
        <span
          ><i>功德</i><b>{{ ascensionStore.merit }}</b></span
        ><span
          ><i>仙玉</i><b>{{ ascensionStore.immortalJade }}</b></span
        ><span
          ><i>法则</i><b>{{ ascensionStore.ruleFragments }}</b></span
        ><span
          ><i>器魄</i><b>{{ ascensionStore.immortalEssence }}</b></span
        >
      </div>
      <div class="dossier-summary-row">
        <div>
          <span>三元仙身</span
          ><b
            >仙体 <em>Lv.{{ ascensionStore.immortalBodyLevel }}</em
            >　仙骨 <em>Lv.{{ ascensionStore.immortalBoneLevel }}</em
            >　仙魂 <em>Lv.{{ ascensionStore.immortalSoulLevel }}</em></b
          >
        </div>
        <div>
          <span>仙界战绩</span
          ><b
            >裂隙镇压 <em>{{ ascensionStore.riftScore }}</em> 次　斗法
            {{ ascensionStore.pkRecord }}</b
          >
        </div>
      </div>
    </div>
    <div
      v-if="isTab('home')"
      class="border border-amber-200/20 rounded-xs p-3 mb-4 bg-black/10 relative z-10"
    >
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙身三元 · 道果档案</p>
        <span class="text-[10px] text-muted"
          >仙体、仙骨、仙魂共同决定仙界根基</span
        >
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="part in ascensionStore.bodyProfile"
          :key="part.name"
          class="body-card"
        >
          <p class="text-xs text-accent">{{ part.name }} Lv.{{ part.level }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ part.desc }}</p>
        </div>
      </div>
    </div>

    <div v-if="isTab('home')" class="immortal-record relative z-10 mb-4">
      <div>
        <p class="text-xs text-accent">云阙战报</p>
        <p class="text-[10px] text-muted">最近一次仙界行动</p>
      </div>
      <p class="text-[11px] text-slate-200 leading-relaxed">
        {{
          ascensionStore.lastBattleText ||
          "仙门初开，万象待定。前往试炼、裂隙或洞天，书写你的仙界战绩。"
        }}
      </p>
    </div>

    <div v-if="isTab('edict')" class="celestial-edict-board relative z-10 mb-4">
      <div class="edict-head">
        <div>
          <p class="text-xs text-accent">云阙天诏</p>
          <p class="text-[10px] text-muted">
            每日与每周目标，完成后领取仙界成长资源
          </p>
        </div>
        <span>天庭玉册</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="edict in ascensionStore.celestialEdicts"
          :key="edict.id"
          class="edict-card"
          :class="edict.state.claimed ? 'claimed' : ''"
        >
          <div class="flex justify-between gap-1">
            <p class="text-[11px] text-accent">{{ edict.name }}</p>
            <span class="text-[9px] text-muted">{{
              edict.period === "daily" ? "每日" : "每周"
            }}</span>
          </div>
          <p class="text-[10px] text-muted leading-relaxed">{{ edict.desc }}</p>
          <div class="edict-progress">
            <i
              :style="{
                width: `${Math.min(100, (edict.state.value / edict.target) * 100)}%`,
              }"
            ></i>
          </div>
          <div class="flex justify-between items-center gap-1">
            <span class="text-[10px] text-warning"
              >{{ edict.state.value }}/{{ edict.target }} · 器魄+{{
                edict.reward.essence
              }}</span
            ><button
              class="btn-mini"
              :disabled="
                edict.state.claimed || edict.state.value < edict.target
              "
              @click="ascensionStore.claimCelestialEdict(edict.id)"
            >
              {{
                edict.state.claimed
                  ? "已领"
                  : edict.state.value >= edict.target
                    ? "领诏赏"
                    : "进行中"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isTab('gear')" class="relative z-10 mb-4 immortal-gear-panel">
      <div class="gear-banner">
        <div>
          <p class="text-xs text-accent">仙器谱 · 六部位共鸣</p>
          <p class="text-[10px] text-muted mt-1">
            试炼与裂隙掉落仙器精魄；淬炼至 Lv.3 激活部位共鸣。
          </p>
        </div>
        <div class="gear-power">
          <b>+{{ ascensionStore.gearPower }}</b
          ><span>仙器战力</span>
        </div>
      </div>
      <p class="gear-resonance">{{ ascensionStore.gearResonance }}</p>
      <div class="gear-grid">
        <button
          v-for="gear in IMMORTAL_GEAR"
          :key="gear.id"
          class="gear-card"
          :class="`gear-${gear.id}`"
          @click="ascensionStore.upgradeImmortalGear(gear.id)"
        >
          <img :src="gear.art" :alt="gear.name" draggable="false" />
          <span class="gear-shade"></span>
          <span class="gear-level"
            >Lv.{{ ascensionStore.gearLevels[gear.id] || 0 }}</span
          >
          <span class="gear-name">{{ gear.name }}</span>
          <span class="gear-desc">{{ gear.desc }}</span>
          <span class="gear-cost"
            >淬炼：器魄{{ 4 + (ascensionStore.gearLevels[gear.id] || 0) * 3 }} /
            仙玉{{ 3 + (ascensionStore.gearLevels[gear.id] || 0) * 2
            }}<template v-if="(ascensionStore.gearLevels[gear.id] || 0) >= 3">
              / 法则{{
                1 +
                Math.floor(((ascensionStore.gearLevels[gear.id] || 0) - 3) / 2)
              }}</template
            ></span
          >
        </button>
      </div>
    </div>

    <div v-if="isTab('arts')" class="mb-4 relative z-10">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙术特效</p>
        <span class="text-[10px] text-muted">点击切换战斗表现</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="art in IMMORTAL_ARTS"
          :key="art.id"
          class="art-card"
          :class="ascensionStore.lastArtId === art.id ? 'active' : ''"
          @click="ascensionStore.castImmortalArt(art.id)"
        >
          <span class="text-xl">{{ art.icon }}</span
          ><span class="text-xs text-accent">{{ art.name }}</span
          ><span class="text-[10px] text-muted"
            >{{ art.element }} · {{ art.effect }}</span
          ><span class="text-[10px] text-warning">{{
            art.id === "purple_thunder_seal"
              ? "破盾强效"
              : art.id === "solar_flame"
                ? "越战越强"
                : art.id === "starfall_sword"
                  ? "连胜爆发"
                  : "仙体护持"
          }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="isTab('arts')"
      class="battle-log relative z-10 mb-4"
      :key="`battle-${ascensionStore.visualPulse}`"
    >
      <p class="text-xs text-accent mb-1">仙术反馈</p>
      <p class="text-xs leading-relaxed">{{ ascensionStore.lastBattleText }}</p>
    </div>

    <div v-if="isTab('story')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙界主线</p>
        <span class="text-[10px] text-muted"
          >章节 {{ ascensionStore.storyProgress }}/{{
            IMMORTAL_STORY_CHAPTERS.length
          }}</span
        >
      </div>
      <div class="immortal-scene-banner story-scene">
        <img :src="ART.story" alt="云阙天门主线场景" />
      </div>
      <div class="space-y-2">
        <div
          v-for="chapter in IMMORTAL_STORY_CHAPTERS"
          :key="chapter.id"
          class="story-card"
          :class="ascensionStore.storyClaimed[chapter.id] ? 'done' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm text-accent">
                {{ chapter.icon }} {{ chapter.chapter }} · {{ chapter.title }}
              </p>
              <p class="text-[10px] text-muted leading-relaxed mt-1">
                {{ chapter.desc }}
              </p>
            </div>
            <button
              class="btn-mini shrink-0"
              :disabled="
                ascensionStore.storyClaimed[chapter.id] ||
                !chapter.need(ascensionStore.storyState)
              "
              @click="ascensionStore.claimStoryChapter(chapter.id)"
            >
              {{
                ascensionStore.storyClaimed[chapter.id]
                  ? "已完成"
                  : chapter.need(ascensionStore.storyState)
                    ? "推进剧情"
                    : "未达成"
              }}
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
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">道统传承</p>
        <span class="text-[10px] text-muted"
          >当前 {{ ascensionStore.lineageInfo.name }}</span
        >
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="lineage in IMMORTAL_LINEAGES"
          :key="lineage.id"
          class="office-card lineage-card"
          :class="ascensionStore.immortalLineage === lineage.id ? 'active' : ''"
          @click="ascensionStore.chooseLineage(lineage.id)"
        >
          <span class="text-sm text-accent"
            >{{ lineage.icon }} {{ lineage.name }}</span
          >
          <span class="text-[10px] text-muted leading-relaxed">{{
            lineage.desc
          }}</span>
          <span class="text-[10px] text-success">{{ lineage.bonus }}</span>
        </button>
      </div>
    </div>

    <div v-if="isTab('fate')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙界天命</p>
        <span class="text-[10px] text-muted"
          >天命积分 +{{ ascensionStore.mandateProgress }}</span
        >
      </div>
      <div class="grid grid-cols-1 gap-2">
        <div
          v-for="mandate in IMMORTAL_MANDATES"
          :key="mandate.id"
          class="mandate-card"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <p class="text-sm text-accent">
                {{ mandate.icon }} {{ mandate.name }}
              </p>
              <p class="text-[10px] text-muted leading-relaxed">
                {{ mandate.desc }}
              </p>
            </div>
            <span class="text-[10px] text-muted shrink-0"
              >已决 {{ ascensionStore.mandateDone[mandate.id] || 0 }}</span
            >
          </div>
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="choice in mandate.choices"
              :key="choice.id"
              class="choice-card"
              @click="ascensionStore.resolveMandate(mandate.id, choice.id)"
            >
              <span class="text-[11px] text-accent">{{ choice.name }}</span>
              <span class="text-[10px] text-muted leading-tight">{{
                choice.desc
              }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isTab('office')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙盟协作</p>
        <span class="text-[10px] text-muted"
          >协作声望 +{{ ascensionStore.allianceScore }}</span
        >
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="ally in IMMORTAL_ALLIANCES"
          :key="ally.id"
          class="alliance-card"
          @click="ascensionStore.coordinateAlliance(ally.id)"
        >
          <span class="text-sm text-accent"
            >{{ ally.icon }} {{ ally.name }}</span
          >
          <span class="text-[10px] text-muted leading-relaxed">{{
            ally.desc
          }}</span>
          <span class="text-[10px] text-warning"
            >消耗 功德{{ ally.costMerit }} / 仙玉{{ ally.costJade }}</span
          >
          <span class="text-[10px] text-success"
            >法则+{{ ally.rewardRule }}｜赛季+{{ ally.rewardSeason }}｜已协作
            {{ ascensionStore.allianceProgress[ally.id] || 0 }}</span
          >
        </button>
      </div>
    </div>

    <div v-if="isTab('rift')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">混沌裂隙</p>
        <span class="text-[10px] text-muted"
          >镇压次数 +{{ ascensionStore.riftScore }}</span
        >
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="rift in CHAOS_RIFTS"
          :key="rift.id"
          class="rift-card visual-rift-card rift-boss-card"
          :class="
            ascensionStore.riftBossInfo(rift.id).turns >= 4 ? 'boss-fury' : ''
          "
          @click="ascensionStore.challengeChaosRift(rift.id)"
        >
          <img
            class="rift-art"
            :src="ART.rift"
            :alt="`${rift.name}怪物`"
            draggable="false"
          />
          <span class="text-sm text-accent relative z-[1]"
            >{{ rift.name }} · {{ rift.bossName }}
            <b
              v-if="ascensionStore.riftBossInfo(rift.id).turns >= 4"
              class="fury-tag"
              >狂暴</b
            ></span
          >
          <span class="text-[10px] text-muted leading-relaxed">{{
            rift.desc
          }}</span>
          <div class="rift-phase-row">
            <b>{{ ascensionStore.riftBossInfo(rift.id).dungeonRank }}</b
            ><span
              >阶段：{{ ascensionStore.riftBossInfo(rift.id).phaseName }}</span
            ><span
              >弱点：{{
                IMMORTAL_ARTS.find((a) => a.id === rift.weakness)?.name
              }}</span
            >
          </div>
          <div class="boss-bars">
            <span
              ><i
                class="hp-bar"
                :style="{
                  width: `${Math.max(0, (ascensionStore.riftBossInfo(rift.id).hp / ascensionStore.riftBossInfo(rift.id).maxHp) * 100)}%`,
                }"
              ></i></span
            ><small
              >仙躯 {{ ascensionStore.riftBossInfo(rift.id).hp }}/{{
                ascensionStore.riftBossInfo(rift.id).maxHp
              }}</small
            ><span class="shield-bar"
              ><i
                :style="{
                  width: `${Math.max(0, (ascensionStore.riftBossInfo(rift.id).shield / ascensionStore.riftBossInfo(rift.id).maxShield) * 100)}%`,
                }"
              ></i></span
            ><small
              >法则护盾 {{ ascensionStore.riftBossInfo(rift.id).shield }}</small
            >
          </div>
          <span
            class="text-[10px]"
            :class="
              ascensionStore.immortalPower >= rift.needPower
                ? 'text-success'
                : 'text-danger'
            "
            >建议仙战力 {{ rift.needPower }}｜当前
            {{ ascensionStore.immortalPower }}｜已镇压
            {{ ascensionStore.riftClears[rift.id] || 0 }} 层</span
          >
          <span class="text-[10px] text-warning"
            >三阶段首领会重组护盾/狂暴反击，击杀掉落专属材料、首领遗珍碎片与仙器精魄</span
          >
        </button>
      </div>
      <div class="hunt-panel">
        <div class="relic-head">
          <div>
            <p class="text-xs text-accent">裂隙猎榜 · 首领悬赏</p>
            <span>每日/每周追猎目标，串联首领击杀、遗珍炼化与裂隙套装</span>
          </div>
          <b>{{ RIFT_HUNTS.length }} 项</b>
        </div>
        <div class="grid grid-cols-1 gap-2">
          <button
            v-for="hunt in ascensionStore.riftHunts"
            :key="hunt.id"
            class="hunt-card"
            :class="
              hunt.state.claimed
                ? 'done'
                : hunt.state.value >= hunt.target
                  ? 'ready'
                  : ''
            "
            @click="ascensionStore.claimRiftHunt(hunt.id)"
          >
            <span class="text-xs text-accent"
              >{{ hunt.period === "daily" ? "每日" : "每周" }} ·
              {{ hunt.name }}</span
            >
            <span class="text-[10px] text-muted">{{ hunt.desc }}</span>
            <i
              ><em
                :style="{
                  width: `${Math.min(100, (hunt.state.value / hunt.target) * 100)}%`,
                }"
              ></em
            ></i>
            <span class="text-[10px] text-warning"
              >进度 {{ hunt.state.value }}/{{ hunt.target }}｜奖励 功德+{{
                hunt.reward.merit
              }}
              仙玉+{{ hunt.reward.jade }} 法则+{{ hunt.reward.rule }} 器魄+{{
                hunt.reward.essence
              }}</span
            >
            <span class="text-[10px] text-success">{{
              hunt.state.claimed
                ? "已领取"
                : hunt.state.value >= hunt.target
                  ? "点击领取猎榜赏"
                  : "继续镇压首领"
            }}</span>
          </button>
        </div>
      </div>
      <div class="hunt-panel season-rift-panel">
        <div class="relic-head">
          <div>
            <p class="text-xs text-accent">裂隙赛季功勋</p>
            <span
              >根据裂隙镇压、猎榜领取、遗珍炼化累计功勋，形成长期段位奖励</span
            >
          </div>
          <b
            >{{ ascensionStore.riftSeasonRank }} ·
            {{ ascensionStore.riftSeasonScore }}</b
          >
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="reward in RIFT_SEASON_REWARDS"
            :key="reward.id"
            class="hunt-card season-reward-card"
            :class="
              ascensionStore.riftSeasonClaimed[reward.id]
                ? 'done'
                : ascensionStore.riftSeasonScore >= reward.needScore
                  ? 'ready'
                  : ''
            "
            @click="ascensionStore.claimRiftSeasonReward(reward.id)"
          >
            <span class="text-xs text-accent"
              >{{ reward.icon }} {{ reward.name }}</span
            >
            <span class="text-[10px] text-muted">{{ reward.desc }}</span>
            <i
              ><em
                :style="{
                  width: `${Math.min(100, (ascensionStore.riftSeasonScore / reward.needScore) * 100)}%`,
                }"
              ></em
            ></i>
            <span class="text-[10px] text-warning"
              >需要功勋 {{ reward.needScore }}｜当前
              {{ ascensionStore.riftSeasonScore }}</span
            >
            <span class="text-[10px] text-success">{{
              ascensionStore.riftSeasonClaimed[reward.id]
                ? "已领取"
                : ascensionStore.riftSeasonScore >= reward.needScore
                  ? "点击领取赛季赏"
                  : "继续追猎"
            }}</span>
          </button>
        </div>
      </div>
      <div class="relic-panel">
        <div class="relic-head">
          <div>
            <p class="text-xs text-accent">首领遗珍 · 裂隙套装</p>
            <span>击杀具名首领获得遗珍碎片，炼化后形成仙界长期追求</span>
          </div>
          <b>遗珍战力 +{{ ascensionStore.riftRelicPower }}</b>
        </div>
        <p class="relic-set">{{ ascensionStore.riftRelicSetBonus }}</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="relic in RIFT_BOSS_RELICS"
            :key="relic.id"
            class="relic-card"
            @click="ascensionStore.upgradeRiftRelic(relic.id)"
          >
            <span class="text-sm text-accent"
              >{{ relic.icon }} {{ relic.name }} Lv.{{
                ascensionStore.riftRelics[relic.id] || 0
              }}</span
            >
            <span class="text-[10px] text-muted"
              >源自 {{ relic.boss }} · {{ relic.desc }}</span
            >
            <span class="text-[10px] text-warning"
              >持有 {{ relic.fragmentName }} ×{{
                ascensionStore.riftRelicFragments[relic.id] || 0
              }}｜炼化消耗随等级提升</span
            >
            <span class="text-[10px] text-success"
              >每级仙战力+{{ relic.power }}｜{{ relic.bonus }}</span
            >
          </button>
        </div>
      </div>
    </div>

    <div v-if="isTab('fate')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙缘命盘</p>
        <span class="text-[10px] text-muted"
          >命盘战力 +{{ ascensionStore.fatePlatePower }}</span
        >
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="plate in FATE_PLATES"
          :key="plate.id"
          class="fate-card"
          @click="ascensionStore.upgradeFatePlate(plate.id)"
        >
          <span class="text-sm text-accent"
            >{{ plate.icon }} {{ plate.name }} Lv.{{
              ascensionStore.fatePlateLevels[plate.id] || 0
            }}</span
          >
          <span class="text-[10px] text-muted leading-relaxed">{{
            plate.desc
          }}</span>
          <span class="text-[10px] text-warning"
            >消耗 法则{{
              plate.costRule +
              (ascensionStore.fatePlateLevels[plate.id] || 0) * 6
            }}
            / 仙玉{{
              plate.costJade +
              (ascensionStore.fatePlateLevels[plate.id] || 0) * 4
            }}</span
          >
          <span class="text-[10px] text-success"
            >每级仙战力+{{ plate.power }}｜{{ plate.bonus }}</span
          >
        </button>
      </div>
    </div>

    <div v-if="isTab('cave')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙界洞天经营</p>
        <span class="text-[10px] text-muted"
          >稳定 {{ ascensionStore.caveHeavenStability }}% · 战力倍率
          {{ Math.round(ascensionStore.caveHeavenStabilityRate * 100) }}%</span
        >
      </div>
      <div class="immortal-scene-banner cave-scene">
        <img :src="ART.cave" alt="仙界洞天场景" />
      </div>
      <div class="cave-resonance">
        <span>阵眼共鸣 · {{ ascensionStore.caveResonance.name }}</span
        ><b
          >全府均衡 Lv.{{ ascensionStore.caveResonanceLevel }} · 灵机与派遣 ×{{
            ascensionStore.caveResonance.yieldRate.toFixed(2)
          }}
          · 每日失稳 -{{ ascensionStore.caveResonance.decayReduce }}</b
        >
      </div>
      <div class="cave-yield-panel">
        <div>
          <p>洞天灵机</p>
          <span
            >功德 +{{ ascensionStore.caveHeavenYield.merit }}　仙玉 +{{
              ascensionStore.caveHeavenYield.jade
            }}　法则 +{{ ascensionStore.caveHeavenYield.rule }}　器魄 +{{
              ascensionStore.caveHeavenYield.essence
            }}<template v-if="ascensionStore.caveHeavenYield.dew"
              >　仙露 +{{ ascensionStore.caveHeavenYield.dew }}</template
            ></span
          >
        </div>
        <button
          class="btn-mini"
          :disabled="ascensionStore.caveHeavenHarvestedToday"
          @click="ascensionStore.claimCaveHeavenYield()"
        >
          {{
            ascensionStore.caveHeavenHarvestedToday ? "今日已收取" : "收取灵机"
          }}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <button
          v-for="node in IMMORTAL_CAVE_NODES"
          :key="node.id"
          class="body-card market-card"
          @click="ascensionStore.upgradeCaveNode(node.id)"
        >
          <span class="text-sm text-accent"
            >{{ node.icon }} {{ node.name }} Lv.{{
              ascensionStore.caveLevels[node.id] || 0
            }}</span
          >
          <span class="text-[10px] text-muted leading-relaxed">{{
            node.desc
          }}</span>
          <span class="text-[10px] text-warning"
            >升级 仙玉{{
              node.jadeCost + (ascensionStore.caveLevels[node.id] || 0) * 3
            }}
            / 法则{{
              node.ruleCost + (ascensionStore.caveLevels[node.id] || 0)
            }}</span
          >
          <span class="text-[10px] text-success"
            >每级仙战力+{{ node.powerPerLevel }}</span
          >
        </button>
      </div>
      <button
        class="btn w-full justify-center"
        :disabled="!ascensionStore.caveHeavenNeedsMaintenance"
        @click="ascensionStore.maintainCaveHeaven"
      >
        维护洞天（功德{{ ascensionStore.caveHeavenMaintenanceCost.merit }} /
        仙玉{{ ascensionStore.caveHeavenMaintenanceCost.jade }} / 法则{{
          ascensionStore.caveHeavenMaintenanceCost.rule
        }}）
      </button>
      <div
        v-if="ascensionStore.caveHeavenFx"
        class="cave-cinematic"
        :class="`cave-fx-${ascensionStore.caveHeavenFx.type}`"
      >
        <div class="cave-fx-cloud cf1"></div>
        <div class="cave-fx-cloud cf2"></div>
        <div class="cave-fx-ring cr1"></div>
        <div class="cave-fx-ring cr2"></div>
        <i
          v-for="n in 14"
          :key="n"
          class="cave-fx-spark"
          :style="{ '--i': n }"
        ></i>
        <div class="cave-fx-content">
          <em>{{ ascensionStore.caveHeavenFx.icon }}</em>
          <h4>{{ ascensionStore.caveHeavenFx.title }}</h4>
          <p>{{ ascensionStore.caveHeavenFx.text }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="isTab('realm')"
      class="realm-sanctum relative z-10 mb-4"
      :class="`realm-stage-${ascensionStore.immortalRealmStage}`"
    >
      <div class="realm-sky-art" aria-hidden="true">
        <span class="realm-moon"></span><span class="realm-star rs1">✦</span
        ><span class="realm-star rs2">✧</span
        ><span class="realm-star rs3">✦</span
        ><span class="realm-cloud rc1"></span
        ><span class="realm-cloud rc2"></span>
      </div>
      <div class="realm-sanctum-content">
        <p class="realm-kicker">云阙仙阶 · 破境台</p>
        <div class="realm-icon">
          {{ ascensionStore.immortalRealmInfo.icon }}
        </div>
        <h4>{{ ascensionStore.immortalRealmInfo.name }}</h4>
        <p class="realm-desc">{{ ascensionStore.immortalRealmInfo.desc }}</p>
        <div v-if="ascensionStore.nextImmortalRealm" class="realm-next">
          <span>下一仙阶 · {{ ascensionStore.nextImmortalRealm.name }}</span
          ><b
            >功德 {{ ascensionStore.nextImmortalRealm.meritCost }}　仙玉
            {{ ascensionStore.nextImmortalRealm.jadeCost }}　法则
            {{ ascensionStore.nextImmortalRealm.ruleCost }}</b
          >
        </div>
        <p v-else class="realm-peak">
          仙阶已至当前顶峰，后续可通过洞天、仙器与赛季继续成长。
        </p>
        <button
          class="realm-break-btn"
          :disabled="!ascensionStore.nextImmortalRealm"
          @click="triggerRealmBreakthrough"
        >
          <span>凝神破境</span
          ><small
            >仙阶战力底蕴 +{{
              ascensionStore.nextImmortalRealm?.powerBonus || 0
            }}</small
          >
        </button>
      </div>
      <div
        v-if="ascensionStore.immortalBreakthroughFx"
        class="breakthrough-cinematic"
        :class="[
          `fx-stage-${ascensionStore.immortalBreakthroughFx.stage}`,
          `fx-phase-${ascensionStore.immortalBreakthroughPhase}`,
        ]"
      >
        <div class="fx-vignette"></div>
        <div class="fx-aurora"></div>
        <div class="fx-heaven-mark"></div>
        <div class="fx-rune r1">☷</div>
        <div class="fx-rune r2">☵</div>
        <div class="fx-ring r1"></div>
        <div class="fx-ring r2"></div>
        <div class="fx-lightning l1"></div>
        <div class="fx-lightning l2"></div>
        <div class="fx-lightning l3"></div>
        <div class="fx-sword-light"></div>
        <div class="fx-sword-light s2"></div>
        <i
          v-for="n in 18"
          :key="n"
          class="fx-particle"
          :style="{ '--i': n }"
        ></i>
        <div class="fx-content">
          <em>{{
            ascensionStore.immortalBreakthroughPhase === "charge"
              ? "法阵凝聚"
              : ascensionStore.immortalBreakthroughPhase === "tribulation"
                ? "天劫临身"
                : ascensionStore.immortalBreakthroughPhase === "ascend"
                  ? "仙光破界"
                  : "大道显名"
          }}</em>
          <p>{{ ascensionStore.immortalBreakthroughFx.icon }}</p>
          <h4>破境 · {{ ascensionStore.immortalBreakthroughFx.name }}</h4>
          <span>仙光入体　法则重铸</span>
        </div>
      </div>
    </div>

    <div v-if="isTab('market')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙市兑换</p>
        <span class="text-[10px] text-muted">资源转化，不复制凡界商店</span>
      </div>
      <div class="immortal-scene-banner market-scene">
        <img :src="ART.market" alt="仙市场景" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="goods in IMMORTAL_MARKET"
          :key="goods.id"
          class="body-card market-card"
        >
          <p class="text-xs text-accent">{{ goods.icon }} {{ goods.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ goods.desc }}</p>
          <p class="text-[10px] text-muted">
            消耗 功德{{ goods.costMerit }} / 仙玉{{ goods.costJade }} / 法则{{
              goods.costRule
            }}
          </p>
          <p class="text-[10px] text-success">
            获得：{{ goods.reward }} · 已购
            {{ ascensionStore.marketPurchases[goods.id] || 0 }}
          </p>
          <button
            class="btn w-full justify-center mt-2"
            @click="ascensionStore.buyImmortalMarket(goods.id)"
          >
            兑换
          </button>
        </div>
      </div>
    </div>

    <div v-if="isTab('trial')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙域试炼</p>
        <span class="text-[10px] text-muted">奖励功德 / 仙玉 / 法则碎片</span>
      </div>
      <div class="grid grid-cols-1 gap-2">
        <div
          v-for="trial in IMMORTAL_TRIALS"
          :key="trial.id"
          class="trial-card visual-trial-card"
        >
          <img
            class="combat-art enemy-art"
            :src="ART.trial"
            :alt="`${trial.enemy}首领`"
            draggable="false"
          />
          <div class="min-w-0 relative z-[1]">
            <p class="text-sm text-accent">{{ trial.icon }} {{ trial.name }}</p>
            <p class="text-[10px] text-muted">
              {{ trial.realm }} · {{ trial.enemy }} · 难度
              {{ trial.difficulty }} · 已胜
              {{ ascensionStore.trialWins[trial.id] || 0 }} 次
            </p>
            <p class="text-[10px] text-muted leading-relaxed mt-1">
              {{ trial.desc }}
            </p>
          </div>
          <button
            class="btn shrink-0"
            @click="ascensionStore.challengeTrial(trial.id)"
          >
            施展仙术
          </button>
        </div>
      </div>
    </div>

    <div v-if="isTab('arena')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙擂问道 · PK</p>
        <span class="text-[10px] text-muted">{{
          ascensionStore.pkRecord
        }}</span>
      </div>
      <div class="grid grid-cols-1 gap-2">
        <div
          v-for="rival in IMMORTAL_RIVALS"
          :key="rival.id"
          class="trial-card pk-card visual-trial-card"
        >
          <img
            class="combat-art rival-art"
            :src="ART.rival"
            :alt="`${rival.name}立绘`"
            draggable="false"
          />
          <div class="min-w-0 relative z-[1]">
            <p class="text-sm text-accent">{{ rival.icon }} {{ rival.name }}</p>
            <p class="text-[10px] text-muted">
              {{ rival.style }} · 战力 {{ rival.power }} · 连胜加成
              {{ ascensionStore.pkStreak * 35 }}
            </p>
            <p class="text-[10px] text-muted leading-relaxed mt-1">
              {{ rival.desc }}
            </p>
          </div>
          <button
            class="btn shrink-0"
            @click="ascensionStore.challengeRival(rival.id)"
          >
            登擂斗法
          </button>
        </div>
      </div>
    </div>

    <div v-if="isTab('arena')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙擂赛季</p>
        <span class="text-[10px] text-muted"
          >积分 {{ ascensionStore.seasonScore }}</span
        >
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="reward in IMMORTAL_SEASON_REWARDS"
          :key="reward.id"
          class="body-card season-card"
          :class="ascensionStore.seasonClaimed[reward.id] ? 'claimed' : ''"
        >
          <p class="text-xs text-accent">{{ reward.icon }} {{ reward.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">
            {{ reward.desc }}
          </p>
          <p class="text-[10px] text-muted">需要积分 {{ reward.needScore }}</p>
          <button
            class="btn w-full justify-center mt-2"
            :disabled="ascensionStore.seasonClaimed[reward.id]"
            @click="ascensionStore.claimSeasonReward(reward.id)"
          >
            {{ ascensionStore.seasonClaimed[reward.id] ? "已领取" : "领取" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isTab('office')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙职事务</p>
        <span class="text-[10px] text-muted">同仙职完成奖励更高</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="duty in IMMORTAL_DUTIES"
          :key="duty.id"
          class="duty-card"
          :class="ascensionStore.dutyDone[duty.id] ? 'done' : ''"
          @click="ascensionStore.completeDuty(duty.id)"
        >
          <span class="text-lg">{{ duty.icon }}</span
          ><span class="text-xs text-accent">{{ duty.name }}</span
          ><span class="text-[10px] text-muted">{{ duty.desc }}</span>
          <span
            class="text-[10px]"
            :class="
              ascensionStore.dutyDone[duty.id] ? 'text-success' : 'text-muted'
            "
            >{{
              ascensionStore.dutyDone[duty.id]
                ? "今日已办"
                : `功德+${duty.rewardMerit}`
            }}</span
          >
        </button>
      </div>
    </div>

    <div v-if="isTab('cave')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">洞天建设</p>
        <span class="text-[10px] text-muted"
          >洞天战力 +{{ ascensionStore.cavePower }}</span
        >
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="node in IMMORTAL_CAVE_NODES"
          :key="node.id"
          class="body-card cave-card"
        >
          <p class="text-xs text-accent">
            {{ node.icon }} {{ node.name }} Lv.{{
              ascensionStore.caveLevels[node.id] || 0
            }}
          </p>
          <p class="text-[10px] text-muted leading-relaxed">{{ node.desc }}</p>
          <button
            class="btn w-full justify-center mt-2"
            @click="ascensionStore.upgradeCaveNode(node.id)"
          >
            升级
          </button>
        </div>
      </div>
    </div>

    <div v-if="isTab('cave')" class="relative z-10 mb-4 expedition-panel">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">洞天派遣</p>
        <span class="text-[10px] text-muted"
          >每天每项一次 · 先建设对应洞天</span
        >
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="mission in IMMORTAL_EXPEDITIONS"
          :key="mission.id"
          class="expedition-card"
          :class="
            ascensionStore.expeditionClaimed[mission.id] ===
            new Date().toISOString().slice(0, 10)
              ? 'done'
              : ''
          "
          @click="ascensionStore.dispatchImmortalExpedition(mission.id)"
        >
          <p class="text-xs text-accent">{{ mission.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">
            {{ mission.desc }}
          </p>
          <p class="text-[10px] text-warning">
            需
            {{
              IMMORTAL_CAVE_NODES.find((n) => n.id === mission.needNode)?.name
            }}
            Lv.1
          </p>
          <p class="text-[10px] text-success">
            功德+{{ ascensionStore.caveExpeditionReward(mission.id).merit }} ·
            仙玉+{{ ascensionStore.caveExpeditionReward(mission.id).jade }} ·
            器魄+{{ ascensionStore.caveExpeditionReward(mission.id).essence }}
          </p>
          <p
            class="text-[10px]"
            :class="
              ascensionStore.expeditionClaimed[mission.id] ===
              new Date().toISOString().slice(0, 10)
                ? 'text-success'
                : 'text-muted'
            "
          >
            {{
              ascensionStore.expeditionClaimed[mission.id] ===
              new Date().toISOString().slice(0, 10)
                ? "今日已归"
                : "派遣仙舟"
            }}
          </p>
        </button>
      </div>
    </div>

    <div v-if="isTab('echo')" class="relative z-10 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">凡界回响</p>
        <span class="text-[10px] text-muted">飞升后反哺旧系统</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="echo in MORTAL_ECHOES"
          :key="echo.id"
          class="body-card echo-card"
        >
          <p class="text-xs text-accent">{{ echo.icon }} {{ echo.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">{{ echo.desc }}</p>
          <p class="text-[10px] text-muted">
            已赐福 {{ ascensionStore.echoBlessings[echo.id] || 0 }} 次
          </p>
          <button
            class="btn w-full justify-center mt-2"
            @click="ascensionStore.sendMortalEcho(echo.id)"
          >
            消耗功德{{ echo.meritCost }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isTab('office')" class="relative z-10">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">仙职</p>
        <span class="text-[10px] text-muted">仙界身份影响方向</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="office in IMMORTAL_OFFICES"
          :key="office.id"
          class="office-card"
          :class="ascensionStore.immortalOffice === office.id ? 'active' : ''"
          @click="ascensionStore.chooseOffice(office.id)"
        >
          <span>{{ office.icon }}</span
          ><span class="text-xs text-accent">{{ office.name }}</span
          ><span class="text-[10px] text-muted">{{ office.buff }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import {
  useAscensionStore,
  IMMORTAL_ARTS,
  IMMORTAL_GEAR,
  IMMORTAL_EXPEDITIONS,
  IMMORTAL_TRIALS,
  IMMORTAL_OFFICES,
  IMMORTAL_DUTIES,
  IMMORTAL_CAVE_NODES,
  MORTAL_ECHOES,
  IMMORTAL_RIVALS,
  IMMORTAL_MARKET,
  IMMORTAL_SEASON_REWARDS,
  IMMORTAL_LINEAGES,
  IMMORTAL_MANDATES,
  IMMORTAL_ALLIANCES,
  CHAOS_RIFTS,
  RIFT_BOSS_RELICS,
  RIFT_HUNTS,
  RIFT_SEASON_REWARDS,
  FATE_PLATES,
  IMMORTAL_STORY_CHAPTERS,
} from "@/stores/useAscensionStore";
import { addLog } from "@/composables/useGameLog";
import { computed } from "vue";
const router = useRouter();
const route = useRoute();
const ascensionStore = useAscensionStore();
const officeInfo = computed(() => ascensionStore.officeInfo);
const currentArt = computed(
  () =>
    IMMORTAL_ARTS.find((art) => art.id === ascensionStore.lastArtId) ||
    IMMORTAL_ARTS[0]!,
);
const immortalTab = computed(() => String(route.query.tab || "home"));
const isTab = (...keys: string[]) => keys.includes(immortalTab.value);
const triggerRealmBreakthrough = () => {
  ascensionStore.breakthroughImmortalRealm();
};
const sectionTitle = computed(
  () =>
    ({
      home: "仙界大厅",
      gear: "仙器谱",
      arts: "仙术演武",
      story: "仙界主线",
      realm: "仙阶突破",
      cave: "仙界洞天",
      market: "仙市兑换",
      trial: "仙域试炼",
      arena: "仙擂问道",
      office: "仙职仙盟",
      fate: "命盘天命",
      rift: "混沌裂隙",
      echo: "凡界回响",
    })[immortalTab.value] || "仙界大厅",
);
const ART = {
  trial: "/assets/immortal/trial-enemy.png",
  rival: "/assets/immortal/arena-rival.png",
  rift: "/assets/immortal/rift-beast.png",
  cave: "/assets/immortal/cave-heaven.png",
  market: "/assets/immortal/immortal-market.png",
  story: "/assets/immortal/story-gate.png",
};
const exitAdminPreview = () => {
  ascensionStore.exitAdminPreview();
  router.replace("/");
};
const returnToWorld = () => {
  ascensionStore.returnToWorld();
  router.push("/game/cultivation");
  addLog("返回下界，仙光暂敛。");
};
</script>
<style scoped>
.immortal-page {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(250, 214, 124, 0.24);
  border-radius: 4px;
  padding: 12px;
  min-height: 100%;
  background:
    radial-gradient(
      circle at 20% 0%,
      rgba(255, 247, 190, 0.18),
      transparent 28%
    ),
    radial-gradient(
      circle at 80% 10%,
      rgba(135, 196, 255, 0.16),
      transparent 30%
    ),
    linear-gradient(180deg, rgba(17, 24, 48, 0.92), rgba(42, 31, 62, 0.88));
  box-shadow: inset 0 0 35px rgba(255, 224, 139, 0.08);
}
.immortal-sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.9;
}
.star,
.cloud {
  position: absolute;
  animation: float 4s ease-in-out infinite alternate;
}
.s1 {
  left: 12%;
  top: 14%;
  color: #fff2a8;
}
.s2 {
  right: 18%;
  top: 8%;
  color: #bfe7ff;
  animation-delay: 0.6s;
}
.s3 {
  left: 72%;
  top: 34%;
  color: #ffd6fb;
  animation-delay: 1.2s;
}
.c1 {
  left: -4%;
  top: 58%;
  color: rgba(255, 255, 255, 0.18);
  font-size: 46px;
}
.c2 {
  right: -2%;
  top: 42%;
  color: rgba(255, 255, 255, 0.14);
  font-size: 40px;
  animation-delay: 0.8s;
}
.immortal-hero {
  display: flex;
  gap: 14px;
  align-items: center;
  border: 1px solid rgba(250, 214, 124, 0.22);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.02)
  );
  border-radius: 4px;
  padding: 14px;
}
.hero-avatar {
  position: relative;
  width: 78px;
  height: 96px;
  display: grid;
  place-items: center;
}
.halo {
  position: absolute;
  width: 70px;
  height: 70px;
  border: 2px double rgba(255, 230, 151, 0.8);
  border-radius: 50%;
  box-shadow:
    0 0 18px rgba(255, 223, 126, 0.55),
    inset 0 0 18px rgba(120, 200, 255, 0.18);
  animation: pulse 1.6s ease-in-out;
}
.immortal-body {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 58px;
  display: grid;
  place-items: center;
  color: #20150d;
  font-weight: 700;
  background: linear-gradient(180deg, #fff6c4, #79d6ff 48%, #d5b1ff);
  clip-path: polygon(50% 0, 78% 16%, 88% 72%, 50% 100%, 12% 72%, 22% 16%);
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.55);
}
.sword-light {
  position: absolute;
  right: 7px;
  top: 8px;
  width: 4px;
  height: 78px;
  background: linear-gradient(#fff, #8ddfff, transparent);
  transform: rotate(32deg);
  box-shadow: 0 0 12px #9ee7ff;
}
.stat,
.body-card {
  border: 1px solid rgba(250, 214, 124, 0.16);
  border-radius: 3px;
  padding: 6px;
  background: rgba(0, 0, 0, 0.12);
}
.stat b {
  display: block;
  color: #ffe28a;
  font-size: 12px;
}
.stat span {
  color: rgba(255, 255, 255, 0.52);
  font-size: 10px;
}
.body-card {
  min-height: 72px;
}
.art-card,
.office-card,
.duty-card,
.choice-card,
.alliance-card,
.rift-card,
.fate-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
  text-align: left;
  border: 1px solid rgba(250, 214, 124, 0.16);
  border-radius: 3px;
  padding: 9px;
  background: rgba(0, 0, 0, 0.12);
  transition: 0.16s;
}
.art-card:hover,
.office-card:hover,
.duty-card:hover,
.art-card.active,
.office-card.active,
.duty-card.done {
  border-color: rgba(255, 226, 138, 0.58);
  background: rgba(255, 226, 138, 0.08);
  box-shadow: 0 0 14px rgba(255, 226, 138, 0.12);
}
.battle-log {
  border: 1px solid rgba(141, 222, 255, 0.28);
  background: linear-gradient(
    90deg,
    rgba(113, 210, 255, 0.1),
    rgba(255, 226, 138, 0.08)
  );
  border-radius: 3px;
  padding: 10px;
  animation: pulse 0.8s ease-out;
}
.trial-card,
.realm-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(250, 214, 124, 0.16);
  border-radius: 3px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.12);
}
.art-purple_thunder_seal .battle-log {
  border-color: rgba(190, 140, 255, 0.5);
  box-shadow: 0 0 15px rgba(183, 108, 255, 0.18);
}
.art-solar_flame .battle-log {
  border-color: rgba(255, 180, 72, 0.5);
  box-shadow: 0 0 15px rgba(255, 130, 44, 0.18);
}
.art-cloud_body .battle-log {
  border-color: rgba(190, 245, 255, 0.5);
  box-shadow: 0 0 15px rgba(168, 236, 255, 0.18);
}
.pk-card {
  border-color: rgba(255, 120, 120, 0.22);
}
.cave-card,
.echo-card,
.market-card {
  min-height: 120px;
}
.mandate-card {
  border: 1px solid rgba(141, 222, 255, 0.2);
  border-radius: 3px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.12);
}
.choice-card {
  min-height: 74px;
  gap: 3px;
  align-items: flex-start;
  text-align: left;
  border: 1px solid rgba(250, 214, 124, 0.14);
  border-radius: 3px;
  padding: 7px;
  background: rgba(255, 255, 255, 0.035);
  transition: 0.16s;
}
.choice-card:hover {
  border-color: rgba(255, 226, 138, 0.55);
  background: rgba(255, 226, 138, 0.08);
}
.story-card {
  border: 1px solid rgba(255, 226, 138, 0.18);
  border-radius: 3px;
  padding: 10px;
  background: linear-gradient(
    135deg,
    rgba(255, 226, 138, 0.07),
    rgba(141, 222, 255, 0.04)
  );
  position: relative;
  overflow: hidden;
}
.story-card.done {
  border-color: rgba(105, 232, 162, 0.45);
  background: rgba(105, 232, 162, 0.07);
}
.story-card::after {
  content: "";
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 226, 138, 0.5),
    transparent
  );
}
.lineage-card {
  min-height: 104px;
}
.alliance-card,
.rift-card,
.fate-card {
  min-height: 126px;
  gap: 5px;
  align-items: flex-start;
  text-align: left;
  border: 1px solid rgba(141, 222, 255, 0.16);
  border-radius: 3px;
  padding: 9px;
  background: linear-gradient(
    135deg,
    rgba(141, 222, 255, 0.055),
    rgba(255, 226, 138, 0.035)
  );
  transition: 0.16s;
}
.alliance-card:hover,
.rift-card:hover,
.fate-card:hover {
  border-color: rgba(141, 222, 255, 0.45);
  transform: translateY(-1px);
  box-shadow: 0 0 18px rgba(141, 222, 255, 0.08);
}
.realm-card {
  border: 1px solid rgba(250, 214, 124, 0.16);
  border-radius: 3px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.12);
}
.season-card {
  min-height: 112px;
}
.season-card.claimed {
  opacity: 0.62;
}
.duty-card {
  min-height: 110px;
}
.duty-card.done {
  opacity: 0.72;
}
@keyframes float {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-10px);
  }
}
@keyframes pulse {
  0% {
    transform: scale(0.96);
    opacity: 0.72;
  }
  60% {
    transform: scale(1.04);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* V2.6.5 仙界视觉强化：星穹、仙门、流光卡片 */
.immortal-celestial-page {
  position: relative;
  isolation: isolate;
  min-height: 100%;
  padding: 10px;
  border-radius: 12px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 18% 5%,
      rgba(255, 230, 150, 0.22),
      transparent 24%
    ),
    radial-gradient(
      circle at 85% 10%,
      rgba(135, 210, 255, 0.22),
      transparent 26%
    ),
    radial-gradient(
      circle at 50% 35%,
      rgba(168, 120, 255, 0.12),
      transparent 34%
    ),
    linear-gradient(
      180deg,
      rgba(8, 11, 30, 0.92),
      rgba(8, 4, 22, 0.96) 48%,
      rgba(2, 8, 18, 0.98)
    );
}
.immortal-celestial-page::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: 0.72;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.85) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(255, 226, 138, 0.8) 0 1px, transparent 1.6px),
    linear-gradient(
      115deg,
      transparent 0 40%,
      rgba(120, 210, 255, 0.1) 45%,
      transparent 52% 100%
    );
  background-size:
    72px 72px,
    118px 118px,
    100% 100%;
  animation: celestialDrift 22s linear infinite;
}
.immortal-celestial-page::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse at 50% 0%,
      rgba(255, 226, 138, 0.22),
      transparent 42%
    ),
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  mask-image: linear-gradient(#000, transparent 70%);
}
.immortal-celestial-page > .card:first-child,
.immortal-celestial-page .page-hero,
.immortal-celestial-page section:first-child {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 226, 138, 0.42) !important;
  box-shadow:
    0 0 36px rgba(255, 226, 138, 0.15),
    inset 0 0 28px rgba(110, 190, 255, 0.08);
  background:
    linear-gradient(
      135deg,
      rgba(255, 226, 138, 0.15),
      rgba(130, 210, 255, 0.08) 48%,
      rgba(135, 80, 255, 0.1)
    ),
    rgba(6, 10, 28, 0.72) !important;
}
.celestial-orbit-ring {
  position: absolute;
  right: -54px;
  top: -72px;
  width: 210px;
  height: 210px;
  border-radius: 999px;
  border: 1px solid rgba(255, 226, 138, 0.32);
  box-shadow:
    0 0 32px rgba(255, 226, 138, 0.18),
    inset 0 0 32px rgba(120, 210, 255, 0.12);
  animation: celestialSpin 18s linear infinite;
}
.celestial-orbit-ring::before,
.celestial-orbit-ring::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  inset: 34px;
  border: 1px dashed rgba(135, 210, 255, 0.28);
}
.celestial-orbit-ring::after {
  inset: 72px;
  border-color: rgba(255, 255, 255, 0.18);
}
.celestial-starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 76% 18%,
      rgba(255, 255, 255, 0.9) 0 2px,
      transparent 3px
    ),
    radial-gradient(
      circle at 63% 38%,
      rgba(255, 226, 138, 0.9) 0 1.5px,
      transparent 3px
    ),
    radial-gradient(
      circle at 88% 58%,
      rgba(140, 220, 255, 0.9) 0 1.5px,
      transparent 3px
    );
  animation: twinkle 2.8s ease-in-out infinite alternate;
}
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
.immortal-celestial-page .mandate-card {
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border-color: rgba(255, 226, 138, 0.22) !important;
  box-shadow:
    0 10px 26px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
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
.immortal-celestial-page .story-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 0 35%,
    rgba(255, 255, 255, 0.11) 45%,
    transparent 56% 100%
  );
  transform: translateX(-120%);
  transition: transform 0.65s ease;
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
.immortal-celestial-page .story-card:hover::before {
  transform: translateX(120%);
}
.immortal-celestial-page button.btn,
.immortal-celestial-page .btn {
  border-color: rgba(255, 226, 138, 0.42) !important;
  background: linear-gradient(
    135deg,
    rgba(255, 226, 138, 0.22),
    rgba(116, 203, 255, 0.14)
  ) !important;
  box-shadow: 0 0 14px rgba(255, 226, 138, 0.12);
}
.immortal-celestial-page button.btn:not(:disabled):hover,
.immortal-celestial-page .btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow:
    0 0 22px rgba(255, 226, 138, 0.24),
    0 0 18px rgba(116, 203, 255, 0.16);
}
.immortal-celestial-page .text-accent {
  text-shadow: 0 0 10px rgba(255, 226, 138, 0.42);
}
.immortal-celestial-page .battle-log {
  box-shadow:
    0 0 22px rgba(116, 203, 255, 0.16),
    inset 0 0 16px rgba(255, 226, 138, 0.06);
}
@keyframes celestialDrift {
  from {
    background-position:
      0 0,
      0 0,
      0 0;
  }
  to {
    background-position:
      72px 72px,
      -118px 118px,
      0 0;
  }
}
@keyframes celestialSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes twinkle {
  from {
    opacity: 0.45;
    filter: blur(0.2px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .immortal-celestial-page::before,
  .celestial-orbit-ring,
  .celestial-starfield {
    animation: none;
  }
  .immortal-celestial-page * {
    transition: none !important;
  }
}

.immortal-zone-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.zone-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  text-align: left;
  min-height: 92px;
  border: 1px solid rgba(255, 226, 138, 0.22);
  border-radius: 4px;
  padding: 10px;
  background: linear-gradient(
    135deg,
    rgba(255, 226, 138, 0.09),
    rgba(116, 203, 255, 0.06)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: 0.16s;
}
.zone-card:hover {
  border-color: rgba(255, 226, 138, 0.58);
  transform: translateY(-1px);
  box-shadow: 0 0 18px rgba(255, 226, 138, 0.13);
}
.zone-icon {
  font-size: 22px;
  filter: drop-shadow(0 0 8px rgba(255, 226, 138, 0.35));
}
.immortal-portrait-stage {
  position: relative;
  width: 190px;
  height: 268px;
  display: grid;
  place-items: center;
  overflow: visible;
  border: 1px solid rgba(255, 226, 138, 0.36);
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 50% 18%,
      rgba(255, 244, 179, 0.28),
      transparent 34%
    ),
    radial-gradient(
      circle at 45% 66%,
      rgba(125, 227, 255, 0.18),
      transparent 46%
    ),
    linear-gradient(180deg, rgba(5, 11, 35, 0.86), rgba(23, 10, 48, 0.58));
  box-shadow:
    0 0 38px rgba(255, 226, 138, 0.2),
    0 0 42px rgba(101, 214, 255, 0.09),
    inset 0 0 30px rgba(255, 255, 255, 0.06);
}
.immortal-gate {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(255, 226, 138, 0.35);
  box-shadow:
    0 0 30px rgba(255, 226, 138, 0.15),
    inset 0 0 26px rgba(116, 203, 255, 0.09);
}
.gate-back {
  top: 18px;
  width: 166px;
  height: 166px;
  background: radial-gradient(
    circle,
    rgba(255, 226, 138, 0.12),
    transparent 65%
  );
}
.gate-front {
  top: 44px;
  width: 126px;
  height: 126px;
  border-style: dashed;
  border-color: rgba(140, 226, 255, 0.42);
  animation: celestialSpin 16s linear infinite;
}
.portrait-orbit {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
}
.orbit-a {
  top: 49px;
  width: 172px;
  height: 76px;
  transform: rotate(-18deg);
  animation: celestialSpin 14s linear infinite;
}
.orbit-b {
  top: 70px;
  width: 154px;
  height: 62px;
  transform: rotate(20deg);
  border-color: rgba(255, 226, 138, 0.34);
  animation: celestialSpin 12s linear infinite reverse;
}
.orbit-c {
  top: 92px;
  width: 120px;
  height: 48px;
  transform: rotate(-8deg);
  border-color: rgba(126, 232, 255, 0.28);
}
.portrait-star {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #fff7bf;
  box-shadow: 0 0 10px #ffe28a;
}
.star-a {
  left: 24px;
  top: 42px;
}
.star-b {
  right: 25px;
  top: 78px;
}
.star-c {
  left: 34px;
  bottom: 80px;
}
.immortal-artwork {
  position: absolute;
  z-index: 5;
  inset: 4px;
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  object-fit: cover;
  object-position: center 42%;
  border-radius: 20px;
  filter: saturate(1.1) contrast(1.04)
    drop-shadow(0 0 16px rgba(126, 232, 255, 0.25))
    drop-shadow(0 0 22px rgba(255, 226, 138, 0.18));
}
.portrait-cloud {
  position: absolute;
  z-index: 7;
  bottom: 18px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05),
    rgba(255, 246, 192, 0.24),
    rgba(134, 225, 255, 0.16)
  );
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.13);
  backdrop-filter: blur(2px);
}
.cloud-left {
  left: 12px;
  width: 72px;
}
.cloud-mid {
  left: 54px;
  width: 86px;
  bottom: 8px;
}
.cloud-right {
  right: 12px;
  width: 72px;
}
.portrait-nameplate {
  position: absolute;
  z-index: 9;
  bottom: -14px;
  padding: 3px 12px;
  border: 1px solid rgba(255, 226, 138, 0.48);
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    rgba(20, 15, 40, 0.95),
    rgba(10, 28, 46, 0.92)
  );
  color: #ffe28a;
  font-size: 11px;
  letter-spacing: 0.16em;
  box-shadow: 0 0 18px rgba(255, 226, 138, 0.22);
}

/* V2.6.8 二次元仙界美术包 */
.zone-card {
  isolation: isolate;
}
.zone-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.52;
  z-index: -2;
  transition: 0.2s;
}
.zone-card:hover .zone-art {
  opacity: 0.72;
  transform: scale(1.04);
}
.zone-card-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    135deg,
    rgba(5, 10, 30, 0.45),
    rgba(9, 9, 24, 0.9) 76%
  );
}
.immortal-scene-banner {
  position: relative;
  height: 118px;
  overflow: hidden;
  border: 1px solid rgba(255, 226, 138, 0.3);
  border-radius: 5px;
  margin-bottom: 8px;
  background: #0b1025;
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.45),
    0 0 16px rgba(119, 217, 255, 0.08);
}
.immortal-scene-banner::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(5, 9, 28, 0.16),
    rgba(5, 9, 28, 0.52)
  );
  pointer-events: none;
}
.immortal-scene-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 48%;
  display: block;
}
.visual-trial-card {
  position: relative;
  min-height: 122px;
  overflow: hidden;
  isolation: isolate;
}
.combat-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 74% 42%;
  opacity: 0.42;
  z-index: -1;
  filter: saturate(1.08) contrast(1.06);
}
.visual-trial-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    90deg,
    rgba(7, 11, 28, 0.94) 0%,
    rgba(7, 11, 28, 0.67) 58%,
    rgba(7, 11, 28, 0.15) 100%
  );
}
.rival-art {
  object-position: 78% 35%;
}
.visual-rift-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
.rift-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.42;
  z-index: -1;
  filter: saturate(1.14) contrast(1.08);
}
.visual-rift-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    135deg,
    rgba(7, 8, 25, 0.7),
    rgba(10, 4, 30, 0.9)
  );
}
.immortal-gear-panel {
  padding: 10px;
  border: 1px solid rgba(255, 226, 138, 0.26);
  border-radius: 8px;
  background: linear-gradient(
    145deg,
    rgba(10, 18, 45, 0.75),
    rgba(31, 12, 58, 0.62)
  );
  box-shadow:
    inset 0 0 35px rgba(125, 210, 255, 0.06),
    0 0 24px rgba(255, 226, 138, 0.07);
}
.gear-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 76px;
  padding: 12px;
  border: 1px solid rgba(255, 226, 138, 0.25);
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(255, 226, 138, 0.12),
    rgba(104, 207, 255, 0.08)
  );
}
.gear-power {
  text-align: right;
}
.gear-power b {
  display: block;
  font-size: 22px;
  color: #ffe28a;
  text-shadow: 0 0 14px rgba(255, 226, 138, 0.6);
}
.gear-power span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}
.gear-resonance {
  margin: 8px 0;
  padding: 6px 8px;
  border-left: 2px solid #ffe28a;
  color: #bcecff;
  font-size: 11px;
  background: rgba(255, 226, 138, 0.05);
}
.gear-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.gear-card {
  position: relative;
  display: flex;
  min-height: 164px;
  overflow: hidden;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  text-align: left;
  padding: 9px;
  border: 1px solid rgba(142, 222, 255, 0.26);
  border-radius: 7px;
  background: #0b1027;
  isolation: isolate;
  transition: 0.22s;
}
.gear-card:hover {
  transform: translateY(-2px);
  border-color: #ffe28a;
  box-shadow: 0 0 22px rgba(255, 226, 138, 0.24);
}
.gear-card img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: -2;
  transition: 0.25s;
}
.gear-card:hover img {
  transform: scale(1.08);
}
.gear-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    rgba(8, 10, 30, 0.05),
    rgba(6, 8, 27, 0.94) 78%
  );
}
.gear-level {
  position: absolute;
  right: 7px;
  top: 7px;
  padding: 2px 6px;
  border: 1px solid rgba(255, 226, 138, 0.58);
  border-radius: 999px;
  color: #ffe28a;
  font-size: 10px;
  background: rgba(11, 12, 35, 0.72);
}
.gear-name {
  color: #ffe28a;
  font-size: 13px;
  text-shadow: 0 0 10px rgba(255, 226, 138, 0.45);
}
.gear-desc {
  min-height: 30px;
  margin-top: 3px;
  color: rgba(235, 245, 255, 0.72);
  font-size: 10px;
  line-height: 1.35;
}
.gear-cost {
  margin-top: 5px;
  color: #9bdfff;
  font-size: 10px;
  line-height: 1.3;
}
.rift-boss-card {
  min-height: 214px;
}
.rift-phase-row {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  font-size: 9px;
}
.rift-phase-row b,
.rift-phase-row span {
  border: 1px solid rgba(255, 226, 138, 0.22);
  border-radius: 999px;
  padding: 1px 5px;
  background: rgba(0, 0, 0, 0.34);
  color: rgba(230, 246, 255, 0.78);
}
.rift-phase-row b {
  color: #ffe28a;
}
.boss-bars {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 2px 0 3px;
}
.boss-bars > span {
  display: block;
  height: 5px;
  overflow: hidden;
  border: 1px solid rgba(255, 180, 180, 0.35);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
}
.boss-bars i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.45s ease;
}
.hp-bar {
  background: linear-gradient(90deg, #ff476a, #ffbe58);
  box-shadow: 0 0 9px #ff3f69;
}
.boss-bars small {
  display: block;
  margin: 2px 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 9px;
}
.boss-bars .shield-bar {
  border-color: rgba(102, 222, 255, 0.42);
}
.shield-bar i {
  background: linear-gradient(90deg, #66dfff, #a78bfa);
  box-shadow: 0 0 9px #65dfff;
}
.fury-tag {
  margin-left: 4px;
  padding: 1px 4px;
  border: 1px solid rgba(255, 85, 85, 0.7);
  border-radius: 4px;
  color: #ff9b9b;
  font-size: 9px;
  animation: furyPulse 0.7s infinite alternate;
}
.boss-fury {
  border-color: rgba(255, 72, 92, 0.7) !important;
  box-shadow: 0 0 22px rgba(255, 55, 80, 0.27) !important;
}
.hunt-panel,
.relic-panel {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(255, 226, 138, 0.22);
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(255, 226, 138, 0.08),
    rgba(102, 222, 255, 0.05)
  );
}
.relic-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}
.relic-head span,
.relic-set {
  font-size: 10px;
  color: rgba(230, 246, 255, 0.62);
}
.relic-head b {
  font-size: 11px;
  color: #ffe28a;
}
.relic-set {
  margin-bottom: 7px;
  color: #69e8a2;
}
.hunt-card,
.relic-card {
  display: flex;
  min-height: 112px;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  text-align: left;
  padding: 8px;
  border: 1px solid rgba(255, 226, 138, 0.18);
  border-radius: 6px;
  background: rgba(3, 10, 28, 0.5);
  transition: 0.18s;
}
.hunt-card:hover,
.relic-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 226, 138, 0.68);
  box-shadow: 0 0 16px rgba(255, 226, 138, 0.14);
}
.expedition-panel {
  padding: 10px;
  border: 1px solid rgba(102, 222, 255, 0.2);
  border-radius: 7px;
  background: linear-gradient(
    135deg,
    rgba(65, 170, 255, 0.07),
    rgba(255, 226, 138, 0.04)
  );
}
.expedition-card {
  display: flex;
  min-height: 134px;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 8px;
  border: 1px solid rgba(162, 220, 255, 0.18);
  border-radius: 5px;
  background: rgba(3, 10, 28, 0.46);
  transition: 0.18s;
}
.expedition-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 226, 138, 0.62);
  box-shadow: 0 0 16px rgba(126, 225, 255, 0.12);
}
.expedition-card.done {
  opacity: 0.62;
  border-color: rgba(105, 232, 162, 0.42);
}
@keyframes furyPulse {
  from {
    box-shadow: 0 0 4px rgba(255, 55, 80, 0.35);
  }
  to {
    box-shadow: 0 0 14px rgba(255, 55, 80, 0.9);
  }
}
.celestial-edict-board {
  padding: 10px;
  border: 1px solid rgba(255, 226, 138, 0.32);
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(53, 29, 78, 0.68),
    rgba(8, 27, 56, 0.62)
  );
  box-shadow:
    inset 0 0 34px rgba(255, 226, 138, 0.07),
    0 0 18px rgba(130, 207, 255, 0.08);
}
.edict-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.edict-head > span {
  padding: 3px 7px;
  border: 1px solid rgba(255, 226, 138, 0.38);
  border-radius: 999px;
  color: #ffe28a;
  font-size: 10px;
  letter-spacing: 0.12em;
}
.edict-card {
  display: flex;
  min-height: 104px;
  flex-direction: column;
  gap: 4px;
  padding: 7px;
  border: 1px solid rgba(158, 216, 255, 0.19);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.22);
}
.edict-card.claimed {
  opacity: 0.64;
  border-color: rgba(105, 232, 162, 0.46);
}
.edict-progress {
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.45);
}
.edict-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6ce0ff, #ffe28a);
  box-shadow: 0 0 8px rgba(108, 224, 255, 0.7);
  transition: width 0.35s;
}
.immortal-hero {
  min-height: 275px;
  padding: 18px;
  background: linear-gradient(
    120deg,
    rgba(255, 239, 179, 0.1),
    rgba(79, 153, 255, 0.08) 45%,
    rgba(31, 12, 65, 0.36)
  );
}
.hero-avatar.immortal-portrait-stage {
  width: 220px;
  height: 254px;
  flex: none;
}
.immortal-profile {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.profile-crown {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  color: rgba(255, 228, 143, 0.7);
  font-size: 9px;
  letter-spacing: 0.13em;
}
.profile-crown i {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 226, 138, 0.6), transparent);
}
.immortal-profile em {
  font-style: normal;
  font-size: 12px;
  color: rgba(163, 225, 255, 0.78);
}
.stat-power {
  background: linear-gradient(
    145deg,
    rgba(255, 220, 123, 0.2),
    rgba(108, 213, 255, 0.12)
  );
  border-color: rgba(255, 226, 138, 0.48) !important;
}
.profile-insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}
.profile-insight-grid > div {
  min-height: 43px;
  padding: 5px 6px;
  border: 1px solid rgba(150, 219, 255, 0.16);
  border-radius: 3px;
  background: rgba(2, 8, 27, 0.35);
}
.profile-insight-grid span {
  display: block;
  color: rgba(255, 255, 255, 0.47);
  font-size: 9px;
}
.profile-insight-grid b {
  display: block;
  overflow: hidden;
  color: #c9ecff;
  font-size: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.immortal-record {
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: 11px;
  padding: 11px;
  border: 1px solid rgba(144, 221, 255, 0.25);
  border-radius: 5px;
  background: linear-gradient(
    90deg,
    rgba(73, 164, 255, 0.1),
    rgba(255, 226, 138, 0.05)
  );
  box-shadow: inset 0 0 22px rgba(111, 220, 255, 0.04);
}
.combat-core-grid {
  display: grid;
  grid-template-columns: 110px minmax(170px, 1fr) 150px;
  gap: 7px;
}
.combat-power {
  display: flex;
  min-height: 88px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(255, 225, 129, 0.55);
  border-radius: 5px;
  background: radial-gradient(
    circle,
    rgba(255, 226, 138, 0.2),
    rgba(18, 36, 77, 0.38)
  );
  box-shadow: inset 0 0 18px rgba(255, 226, 138, 0.1);
}
.combat-power span,
.combat-power small {
  color: rgba(255, 255, 255, 0.58);
  font-size: 9px;
}
.combat-power b {
  color: #ffe28a;
  font-size: 22px;
  line-height: 1.2;
  text-shadow: 0 0 13px rgba(255, 214, 105, 0.5);
}
.combat-vitals {
  padding: 7px 8px;
  border: 1px solid rgba(135, 219, 255, 0.3);
  border-radius: 5px;
  background: rgba(3, 12, 37, 0.38);
}
.vital-row {
  display: flex;
  justify-content: space-between;
  margin: 1px 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 10px;
}
.vital-row b {
  color: #effcff;
  font-weight: 600;
}
.vital-bar {
  height: 8px;
  overflow: hidden;
  margin-bottom: 7px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.48);
}
.vital-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.35s;
}
.vital-bar.hp i {
  background: linear-gradient(90deg, #e93655, #ffad62);
  box-shadow: 0 0 9px #ff4967;
}
.vital-bar.qi i {
  background: linear-gradient(90deg, #47cfff, #a58bff);
  box-shadow: 0 0 9px #63daff;
}
.combat-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.combat-stats > div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(151, 216, 255, 0.18);
  border-radius: 4px;
  background: rgba(4, 14, 38, 0.3);
}
.combat-stats span {
  color: rgba(255, 255, 255, 0.48);
  font-size: 9px;
}
.combat-stats b {
  color: #c7edff;
  font-size: 12px;
}
.resource-row .stat {
  padding: 4px;
}
.resource-row .stat b {
  font-size: 11px;
}
/* V2.8.2 大厅重排：上方仅仙身展示，全部角色数据统一落在立绘下方 */
.immortal-hero {
  position: relative;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  gap: 0;
  min-height: 0;
  padding: 24px 20px 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 226, 138, 0.32);
  border-radius: 12px;
  background:
    radial-gradient(
      ellipse at 50% 21%,
      rgba(108, 212, 255, 0.22),
      transparent 31%
    ),
    radial-gradient(
      ellipse at 50% 6%,
      rgba(255, 221, 133, 0.19),
      transparent 35%
    ),
    linear-gradient(
      148deg,
      rgba(8, 16, 46, 0.97),
      rgba(20, 14, 59, 0.92) 58%,
      rgba(5, 13, 38, 0.96)
    );
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.immortal-hero::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 42px;
  width: 450px;
  height: 450px;
  border: 1px solid rgba(126, 229, 255, 0.16);
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 55px rgba(98, 211, 255, 0.15);
}
.hero-avatar.immortal-portrait-stage {
  z-index: 1;
  width: 272px;
  height: 350px;
  align-self: center;
  border-radius: 132px 132px 18px 18px;
  border-color: rgba(255, 230, 151, 0.62);
  box-shadow:
    0 0 52px rgba(255, 221, 129, 0.2),
    0 16px 38px rgba(0, 0, 0, 0.4),
    inset 0 0 34px rgba(132, 223, 255, 0.16);
}
.immortal-artwork {
  border-radius: 128px 128px 15px 15px;
  object-position: center 39%;
}
.immortal-profile {
  position: relative;
  z-index: 1;
  width: min(760px, 100%);
  padding-top: 17px;
  text-align: center;
}
.profile-crown {
  margin: 0 auto 6px;
  justify-content: center;
}
.immortal-profile > p.text-xl {
  font-size: 26px;
  line-height: 1.25;
  letter-spacing: 0.05em;
  text-shadow: 0 0 18px rgba(255, 222, 130, 0.32);
}
.character-combat-deck {
  display: grid;
  grid-template-columns: 140px minmax(200px, 1fr) 180px;
  gap: 9px;
  min-height: 105px;
  margin-top: 15px;
  padding: 8px;
  border-top: 1px solid rgba(255, 229, 154, 0.22);
  border-bottom: 1px solid rgba(137, 218, 255, 0.17);
  text-align: left;
  background: linear-gradient(
    90deg,
    rgba(4, 10, 31, 0.28),
    rgba(120, 206, 255, 0.07),
    rgba(4, 10, 31, 0.18)
  );
}
.combat-power {
  min-height: 86px;
  border: 0;
  border-right: 1px solid rgba(255, 226, 138, 0.27);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.combat-power b {
  font-size: 28px;
  letter-spacing: 0.03em;
}
.combat-power small {
  color: rgba(255, 226, 138, 0.44);
  letter-spacing: 0.12em;
  font-size: 7px;
}
.combat-vitals {
  padding: 6px 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.vital-row {
  margin: 1px 0 3px;
  font-size: 10px;
}
.vital-row span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(220, 242, 255, 0.72);
}
.vital-row b {
  font-size: 12px;
}
.vital-row b small {
  font-size: 9px;
  opacity: 0.58;
}
.vital-mark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.hp-mark {
  background: #ff6576;
  box-shadow: 0 0 8px #ff4f67;
}
.qi-mark {
  background: #67dfff;
  box-shadow: 0 0 8px #55d4ff;
}
.vital-bar {
  height: 7px;
  margin-bottom: 9px;
  border: 0;
  background: rgba(0, 0, 0, 0.46);
}
.combat-stats {
  gap: 0;
  border-left: 1px solid rgba(139, 217, 255, 0.17);
}
.combat-stats > div {
  border: 0;
  border-radius: 0;
  background: transparent;
}
.combat-stats > div:nth-child(odd) {
  border-right: 1px solid rgba(139, 217, 255, 0.13);
}
.combat-stats > div:nth-child(-n + 2) {
  border-bottom: 1px solid rgba(139, 217, 255, 0.13);
}
.combat-stats span {
  font-size: 9px;
}
.combat-stats b {
  font-size: 13px;
  color: #d8f3ff;
}
.profile-insight-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0;
  margin-top: 10px !important;
  border: 1px solid rgba(154, 222, 255, 0.16);
  border-radius: 5px;
  overflow: hidden;
  text-align: left;
}
.profile-insight-grid > div {
  min-height: 47px;
  padding: 7px 8px;
  border: 0 !important;
  border-right: 1px solid rgba(154, 222, 255, 0.12);
  border-radius: 0;
  background: rgba(3, 10, 29, 0.24);
}
.profile-insight-grid > div:last-child {
  border-right: 0 !important;
}
.profile-insight-grid b {
  margin-top: 2px;
  font-size: 10px;
}
.immortal-record {
  grid-template-columns: 150px 1fr;
  padding: 13px 15px;
  border-left: 3px solid rgba(255, 226, 138, 0.65);
  border-radius: 0 7px 7px 0;
}
@media (max-width: 700px) {
  .immortal-hero {
    grid-template-columns: 175px minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
  }
  .hero-avatar.immortal-portrait-stage {
    width: 175px;
    height: 285px;
  }
  .character-combat-deck {
    grid-template-columns: 98px 1fr;
  }
  .combat-stats {
    grid-column: 1/-1;
    grid-template-columns: repeat(4, 1fr);
    border-left: 0;
    border-top: 1px solid rgba(139, 217, 255, 0.17);
  }
  .combat-stats > div:nth-child(-n + 2) {
    border-bottom: 0;
  }
  .combat-stats > div:nth-child(odd) {
    border-right: 1px solid rgba(139, 217, 255, 0.13);
  }
  .profile-insight-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .profile-insight-grid > div:nth-child(3) {
    border-right: 0 !important;
  }
  .profile-insight-grid > div:nth-child(-n + 3) {
    border-bottom: 1px solid rgba(154, 222, 255, 0.12) !important;
  }
}
@media (max-width: 420px) {
  .dossier-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dossier-item:nth-child(2n) {
    border-right: 0;
  }
  .dossier-item:nth-child(n + 5) {
    grid-column: span 2;
    border-bottom: 1px solid rgba(148, 218, 255, 0.12);
  }
  .dossier-item:last-child {
    border-bottom: 0;
  }
  .immortal-zone-grid {
    grid-template-columns: 1fr;
  }
  .immortal-hero {
    grid-template-columns: 1fr;
    align-items: center;
  }
  .hero-avatar.immortal-portrait-stage {
    width: 178px;
    height: 264px;
    justify-self: center;
  }
  .immortal-profile {
    padding-top: 0;
  }
  .character-combat-deck {
    grid-template-columns: 86px 1fr;
  }
  .combat-power b {
    font-size: 21px;
  }
  .profile-insight-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .profile-insight-grid > div:nth-child(2) {
    border-right: 0 !important;
  }
  .profile-insight-grid > div:nth-child(n) {
    border-bottom: 1px solid rgba(154, 222, 255, 0.12) !important;
  }
  .profile-insight-grid > div:nth-last-child(-n + 2) {
    border-bottom: 0 !important;
  }
}

.preview-badge {
  display: inline-flex;
  margin-left: 6px;
  padding: 1px 6px;
  border: 1px solid rgba(255, 226, 138, 0.45);
  border-radius: 999px;
  font-size: 10px;
  color: #ffe28a;
  background: rgba(255, 226, 138, 0.12);
  box-shadow: 0 0 12px rgba(255, 226, 138, 0.18);
}
@media (max-width: 700px) {
  .immortal-hero {
    padding: 17px 13px;
  }
  .hero-avatar.immortal-portrait-stage {
    width: 218px;
    height: 300px;
  }
  .character-combat-deck {
    grid-template-columns: 102px 1fr;
  }
  .combat-stats {
    grid-column: 1/-1;
    grid-template-columns: repeat(4, 1fr);
    border-left: 0;
    border-top: 1px solid rgba(139, 217, 255, 0.17);
  }
  .combat-stats > div:nth-child(-n + 2) {
    border-bottom: 0;
  }
  .profile-insight-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .profile-insight-grid > div:nth-child(3) {
    border-right: 0 !important;
  }
  .profile-insight-grid > div:nth-child(-n + 3) {
    border-bottom: 1px solid rgba(154, 222, 255, 0.12) !important;
  }
}
@media (max-width: 420px) {
  .hero-avatar.immortal-portrait-stage {
    width: 188px;
    height: 270px;
  }
  .immortal-profile > p.text-xl {
    font-size: 22px;
  }
  .character-combat-deck {
    grid-template-columns: 88px 1fr;
  }
  .combat-power b {
    font-size: 21px;
  }
  .profile-insight-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .profile-insight-grid > div:nth-child(2) {
    border-right: 0 !important;
  }
  .profile-insight-grid > div:nth-child(n) {
    border-bottom: 1px solid rgba(154, 222, 255, 0.12) !important;
  }
  .profile-insight-grid > div:nth-last-child(-n + 2) {
    border-bottom: 0 !important;
  }
}
.immortal-dossier {
  overflow: hidden;
  border-top: 1px solid rgba(255, 226, 138, 0.24);
  border-bottom: 1px solid rgba(148, 218, 255, 0.18);
  border-radius: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(102, 197, 255, 0.07),
    transparent
  );
  box-shadow: none;
}
.dossier-resource-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 10px 6px 9px;
}
.dossier-resource-row span {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 7px;
  border-right: 1px solid rgba(148, 218, 255, 0.15);
}
.dossier-resource-row span:last-child {
  border-right: 0;
}
.dossier-resource-row i {
  font-style: normal;
  color: rgba(216, 239, 255, 0.54);
  font-size: 10px;
}
.dossier-resource-row b {
  color: #e6f8ff;
  font-size: 16px;
  font-weight: 600;
}
.dossier-summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid rgba(148, 218, 255, 0.12);
  background: rgba(2, 8, 27, 0.2);
}
.dossier-summary-row > div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
}
.dossier-summary-row > div + div {
  border-left: 1px solid rgba(148, 218, 255, 0.12);
}
.dossier-summary-row span {
  flex: none;
  color: rgba(255, 226, 151, 0.66);
  font-size: 10px;
}
.dossier-summary-row b {
  color: rgba(226, 244, 255, 0.8);
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
}
.dossier-summary-row em {
  font-style: normal;
  color: #ffe5a1;
  font-size: 12px;
  font-weight: 600;
}
@media (max-width: 520px) {
  .dossier-resource-row {
    padding: 8px 2px;
  }
  .dossier-resource-row span {
    gap: 3px;
    flex-direction: column;
    align-items: center;
  }
  .dossier-resource-row b {
    font-size: 14px;
  }
  .dossier-summary-row {
    grid-template-columns: 1fr;
  }
  .dossier-summary-row > div + div {
    border-left: 0;
    border-top: 1px solid rgba(148, 218, 255, 0.12);
  }
  .dossier-summary-row > div {
    justify-content: space-between;
    padding: 8px 10px;
  }
  .dossier-summary-row b {
    font-size: 10px;
  }
  .dossier-summary-row em {
    font-size: 11px;
  }
}
.realm-sanctum {
  position: relative;
  overflow: hidden;
  min-height: 390px;
  border: 1px solid rgba(255, 225, 135, 0.37);
  border-radius: 12px;
  background: linear-gradient(155deg, #080f36, #17135a 62%, #060d30);
  box-shadow:
    0 16px 42px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.realm-sky-art {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      circle at 50% 20%,
      rgba(166, 220, 255, 0.32),
      transparent 20%
    ),
    radial-gradient(
      circle at 50% 74%,
      rgba(255, 208, 100, 0.18),
      transparent 38%
    );
}
.realm-moon {
  position: absolute;
  left: 50%;
  top: 24px;
  width: 136px;
  height: 136px;
  border-radius: 50%;
  transform: translateX(-50%);
  background: radial-gradient(
    circle at 35% 35%,
    #fff,
    #bfeaff 31%,
    rgba(115, 180, 255, 0.2) 61%,
    transparent 69%
  );
  box-shadow: 0 0 50px rgba(137, 213, 255, 0.65);
}
.realm-star {
  position: absolute;
  color: #fff4c3;
  text-shadow: 0 0 12px #7cddff;
  animation: realmTwinkle 2s ease-in-out infinite;
}
.rs1 {
  top: 34px;
  left: 24%;
}
.rs2 {
  top: 90px;
  right: 22%;
  animation-delay: 0.7s;
}
.rs3 {
  top: 175px;
  left: 16%;
  animation-delay: 1.2s;
}
.realm-cloud {
  position: absolute;
  bottom: 46px;
  width: 230px;
  height: 68px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    rgba(155, 218, 255, 0.24),
    rgba(93, 134, 255, 0.04) 58%,
    transparent 70%
  );
  filter: blur(4px);
  animation: realmDrift 7s ease-in-out infinite;
}
.rc1 {
  left: -30px;
}
.rc2 {
  right: -45px;
  bottom: 80px;
  animation-delay: -3s;
}
.realm-sanctum-content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 390px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 39px 22px 25px;
  text-align: center;
}
.realm-kicker {
  color: rgba(255, 229, 150, 0.72);
  font-size: 10px;
  letter-spacing: 0.3em;
}
.realm-icon {
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
  margin: 8px 0;
  border: 1px solid rgba(255, 234, 165, 0.58);
  border-radius: 50%;
  background: rgba(11, 19, 72, 0.45);
  font-size: 31px;
  box-shadow:
    0 0 22px rgba(255, 220, 120, 0.28),
    inset 0 0 20px rgba(143, 217, 255, 0.22);
}
.realm-sanctum h4 {
  color: #fff0bf;
  font-size: 27px;
  letter-spacing: 0.14em;
  text-shadow: 0 0 16px rgba(255, 217, 104, 0.5);
}
.realm-desc {
  max-width: 440px;
  margin-top: 6px;
  color: rgba(220, 240, 255, 0.73);
  font-size: 11px;
}
.realm-next {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 18px;
  color: rgba(221, 242, 255, 0.64);
  font-size: 10px;
}
.realm-next b {
  color: #ffe6a1;
  font-size: 11px;
  font-weight: 500;
}
.realm-peak {
  margin-top: 17px;
  color: #8ff3c0;
  font-size: 11px;
}
.realm-break-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 176px;
  margin-top: 18px;
  padding: 9px 25px;
  border: 1px solid rgba(255, 232, 151, 0.7);
  border-radius: 999px;
  background: linear-gradient(
    110deg,
    rgba(61, 93, 200, 0.72),
    rgba(161, 103, 228, 0.74),
    rgba(255, 186, 80, 0.64)
  );
  color: #fff7da;
  box-shadow:
    0 0 24px rgba(255, 211, 104, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
  transition: 0.2s;
}
.realm-break-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 34px rgba(255, 219, 110, 0.54);
}
.realm-break-btn:disabled {
  opacity: 0.45;
}
.realm-break-btn span {
  font-size: 14px;
  letter-spacing: 0.13em;
}
.realm-break-btn small {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 9px;
}
.breakthrough-cinematic {
  position: absolute;
  z-index: 5;
  inset: 0;
  display: grid;
  overflow: hidden;
  place-items: center;
  background: radial-gradient(
    circle,
    rgba(255, 247, 205, 0.72),
    rgba(81, 146, 255, 0.58) 25%,
    rgba(31, 17, 100, 0.9) 55%,
    #040721
  );
  isolation: isolate;
}
.breakthrough-cinematic:after {
  position: absolute;
  inset: -20%;
  z-index: 1;
  background: repeating-conic-gradient(
    from 0deg,
    transparent 0 12deg,
    rgba(255, 239, 165, 0.16) 13deg 14deg,
    transparent 15deg 30deg
  );
  content: "";
  animation: fxHalo 5s linear infinite;
}
.fx-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle,
    transparent 28%,
    rgba(1, 3, 20, 0.58) 100%
  );
  z-index: 4;
}
.fx-aurora {
  position: absolute;
  inset: -30%;
  background: conic-gradient(
    from 0deg,
    transparent,
    rgba(85, 220, 255, 0.4),
    transparent,
    rgba(255, 191, 81, 0.37),
    transparent
  );
  filter: blur(18px);
  animation: fxHalo 3.6s linear infinite;
}
.fx-content {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.fx-content em {
  margin-bottom: 5px;
  color: #ddf7ff;
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.38em;
  text-shadow: 0 0 12px #82ddff;
}
.fx-content p {
  margin: 0;
  font-size: 64px;
  filter: drop-shadow(0 0 18px #fff);
  animation: fxAvatar 1.2s ease-in-out infinite;
}
.fx-content h4 {
  margin: 3px 0;
  color: #fff4c4;
  font-size: 28px;
  letter-spacing: 0.2em;
  text-shadow: 0 0 15px #ffce67;
}
.fx-content span {
  color: #dff8ff;
  font-size: 11px;
  letter-spacing: 0.25em;
}
.fx-heaven-mark,
.fx-ring {
  position: absolute;
  border: 2px solid rgba(255, 239, 158, 0.75);
  border-radius: 50%;
  box-shadow: 0 0 28px rgba(255, 229, 120, 0.65);
}
.fx-heaven-mark {
  z-index: 2;
  width: 116px;
  height: 116px;
}
.fx-ring {
  z-index: 2;
  width: 320px;
  height: 320px;
  border-color: rgba(120, 223, 255, 0.48);
  animation: fxSpin 2.2s linear infinite;
}
.fx-ring.r2 {
  width: 454px;
  height: 454px;
  border-style: dashed;
  animation-direction: reverse;
}
.fx-rune {
  position: absolute;
  z-index: 3;
  color: #fff2ad;
  font-size: 25px;
  text-shadow: 0 0 13px #9ceaff;
}
.fx-rune.r1 {
  transform: translate(-130px, -92px);
  animation: fxRune 1.5s ease-in-out infinite;
}
.fx-rune.r2 {
  transform: translate(120px, 94px);
  animation: fxRune 1.5s ease-in-out 0.7s infinite;
}
.fx-lightning {
  position: absolute;
  z-index: 4;
  top: -15%;
  width: 13px;
  height: 120%;
  background: linear-gradient(
    90deg,
    transparent,
    #efffff,
    #9ae6ff,
    transparent
  );
  filter: blur(1px);
  transform: rotate(19deg);
  box-shadow: 0 0 22px #b9f3ff;
  opacity: 0;
}
.fx-lightning.l2 {
  transform: rotate(-25deg);
}
.fx-lightning.l3 {
  transform: rotate(4deg);
  height: 95%;
}
.fx-sword-light {
  position: absolute;
  z-index: 3;
  width: 3px;
  height: 145%;
  background: #fff9cb;
  box-shadow: 0 0 23px 9px #8fe5ff;
  transform: rotate(42deg);
  opacity: 0;
}
.fx-sword-light.s2 {
  transform: rotate(-38deg);
}
.fx-particle {
  position: absolute;
  z-index: 3;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff1aa;
  box-shadow: 0 0 9px 3px #82e6ff;
  opacity: 0;
  transform: rotate(calc(var(--i) * 20deg)) translateY(-30px);
}
.fx-phase-charge .fx-heaven-mark {
  animation: fxCharge 1.1s ease-out infinite;
}
.fx-phase-charge .fx-ring {
  animation-duration: 1.3s;
}
.fx-phase-charge .fx-content {
  animation: fxBreath 0.7s ease-in-out infinite;
}
.fx-phase-tribulation {
  animation: fxShake 0.11s linear 9;
}
.fx-phase-tribulation .fx-lightning {
  opacity: 1;
  animation: fxLightning 0.33s steps(2) infinite;
}
.fx-phase-tribulation .fx-heaven-mark {
  animation: fxExpand 0.7s ease-out infinite;
}
.fx-phase-ascend .fx-sword-light {
  opacity: 1;
  animation: fxSword 0.65s ease-out infinite;
}
.fx-phase-ascend .fx-particle {
  animation: fxParticle 1s ease-out infinite;
  animation-delay: calc(var(--i) * -55ms);
}
.fx-phase-reveal .fx-content {
  animation: fxReveal 0.8s ease-out both;
}
.fx-stage-2 {
  --stage: #9fe9ff;
}
.fx-stage-3 {
  --stage: #bfa8ff;
}
.fx-stage-4 {
  --stage: #ffbd6d;
}
.fx-stage-5 {
  --stage: #ffef9d;
}
.fx-stage-2,
.fx-stage-3,
.fx-stage-4,
.fx-stage-5 {
  background: radial-gradient(
    circle,
    var(--stage),
    rgba(62, 36, 137, 0.67) 26%,
    rgba(12, 10, 53, 0.94) 61%,
    #040721
  );
}
@keyframes fxHalo {
  to {
    transform: rotate(360deg);
  }
}
@keyframes fxSpin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes fxCharge {
  50% {
    transform: scale(0.72);
    box-shadow: 0 0 60px 16px #ffe89a;
  }
  to {
    transform: scale(1.7);
    opacity: 0;
  }
}
@keyframes fxLightning {
  50% {
    opacity: 0.12;
  }
}
@keyframes fxSword {
  to {
    transform: rotate(42deg) translateX(285px);
    opacity: 0;
  }
}
@keyframes fxParticle {
  to {
    transform: rotate(calc(var(--i) * 20deg)) translateY(-255px) scale(0.15);
    opacity: 0;
  }
}
@keyframes fxShake {
  25% {
    transform: translate(3px, -2px);
  }
  75% {
    transform: translate(-3px, 2px);
  }
}
@keyframes fxAvatar {
  50% {
    transform: scale(1.13);
    filter: drop-shadow(0 0 29px #fff);
  }
}
@keyframes fxRune {
  50% {
    opacity: 0.35;
    transform: translate(-130px, -112px) rotate(30deg);
  }
}
@keyframes fxBreath {
  50% {
    transform: scale(1.035);
  }
}
@keyframes fxReveal {
  from {
    transform: scale(1.35);
    filter: brightness(2);
  }
  to {
    transform: scale(1);
    filter: brightness(1);
  }
}
@media (max-width: 520px) {
  .fx-ring.r2 {
    width: 360px;
    height: 360px;
  }
  .fx-ring {
    width: 285px;
    height: 285px;
  }
  .fx-content h4 {
    font-size: 23px;
  }
}
.cave-cinematic {
  position: absolute;
  z-index: 12;
  inset: 0;
  display: grid;
  overflow: hidden;
  place-items: center;
  border-radius: 10px;
  background: radial-gradient(
    circle,
    rgba(224, 255, 225, 0.7),
    rgba(61, 164, 177, 0.56) 28%,
    rgba(6, 30, 68, 0.94) 72%
  );
  isolation: isolate;
  animation: caveFxFade 2.6s ease-out forwards;
}
.cave-cinematic:before {
  position: absolute;
  inset: -30%;
  background: repeating-conic-gradient(
    transparent 0 17deg,
    rgba(225, 255, 201, 0.22) 18deg 19deg,
    transparent 20deg 35deg
  );
  content: "";
  animation: caveFxSpin 4s linear infinite;
}
.cave-fx-content {
  position: relative;
  z-index: 3;
  text-align: center;
}
.cave-fx-content em {
  display: block;
  font-size: 58px;
  font-style: normal;
  filter: drop-shadow(0 0 18px #fff);
  animation: caveFxPulse 0.8s ease-in-out infinite;
}
.cave-fx-content h4 {
  margin: 2px 0;
  color: #f4ffcf;
  font-size: 23px;
  letter-spacing: 0.14em;
  text-shadow: 0 0 13px #76f4df;
}
.cave-fx-content p {
  color: #e1fbff;
  font-size: 10px;
  letter-spacing: 0.15em;
}
.cave-fx-ring {
  position: absolute;
  z-index: 2;
  width: 190px;
  height: 190px;
  border: 2px solid rgba(236, 255, 184, 0.7);
  border-radius: 50%;
  box-shadow: 0 0 28px #79e8d5;
  animation: caveFxRing 1.2s ease-out infinite;
}
.cave-fx-ring.cr2 {
  width: 340px;
  height: 340px;
  border-style: dashed;
  animation-direction: reverse;
}
.cave-fx-cloud {
  position: absolute;
  width: 280px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    rgba(174, 255, 226, 0.42),
    transparent 67%
  );
  filter: blur(5px);
  animation: caveFxCloud 2s ease-in-out infinite;
}
.cf1 {
  bottom: 18%;
  left: -50px;
}
.cf2 {
  top: 17%;
  right: -70px;
  animation-delay: -1s;
}
.cave-fx-spark {
  position: absolute;
  z-index: 2;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f8ffd1;
  box-shadow: 0 0 10px 3px #78f6e5;
  transform: rotate(calc(var(--i) * 25deg)) translateY(-65px);
  animation: caveFxSpark 1.1s ease-out infinite;
  animation-delay: calc(var(--i) * -70ms);
}
.cave-fx-upgrade {
  background: radial-gradient(
    circle,
    rgba(255, 240, 164, 0.75),
    rgba(177, 112, 45, 0.56) 30%,
    rgba(49, 21, 71, 0.95) 72%
  );
}
.cave-fx-maintain {
  background: radial-gradient(
    circle,
    rgba(171, 255, 224, 0.75),
    rgba(35, 160, 138, 0.57) 32%,
    rgba(4, 35, 65, 0.95) 72%
  );
}
.cave-fx-expedition {
  background: radial-gradient(
    circle,
    rgba(190, 232, 255, 0.74),
    rgba(49, 107, 190, 0.58) 32%,
    rgba(7, 18, 72, 0.96) 72%
  );
}
.cave-fx-expedition .cave-fx-content {
  animation: caveFxSail 1.1s ease-in-out infinite;
}
@keyframes caveFxFade {
  0%,
  73% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
@keyframes caveFxSpin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes caveFxRing {
  to {
    transform: scale(2.35);
    opacity: 0;
  }
}
@keyframes caveFxPulse {
  50% {
    transform: scale(1.14);
  }
}
@keyframes caveFxCloud {
  50% {
    transform: translateX(36px);
  }
}
@keyframes caveFxSpark {
  to {
    transform: rotate(calc(var(--i) * 25deg)) translateY(-240px);
    opacity: 0;
  }
}
@keyframes caveFxSail {
  50% {
    transform: translateX(9px) rotate(2deg);
  }
}
.cave-resonance {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 8px 0;
  padding: 8px 10px;
  border-left: 2px solid #9fe7ff;
  background: rgba(76, 190, 255, 0.08);
  font-size: 10px;
}
.cave-resonance span {
  color: #ffe3a1;
}
.cave-resonance b {
  color: rgba(220, 246, 255, 0.72);
  font-weight: 400;
  text-align: right;
}
.cave-yield-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 9px 0;
  padding: 10px 12px;
  border: 1px solid rgba(119, 221, 255, 0.26);
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(69, 188, 255, 0.12),
    rgba(255, 223, 130, 0.07)
  );
}
.cave-yield-panel p {
  color: #ffe8a7;
  font-size: 11px;
}
.cave-yield-panel span {
  display: block;
  margin-top: 3px;
  color: rgba(221, 245, 255, 0.68);
  font-size: 10px;
}
.cave-yield-panel .btn-mini {
  flex: none;
}
@media (max-width: 450px) {
  .cave-resonance {
    flex-direction: column;
  }
  .cave-resonance b {
    text-align: left;
  }
  .cave-yield-panel {
    align-items: flex-start;
  }
  .cave-yield-panel span {
    line-height: 1.6;
  }
}
</style>

.hunt-card.done{opacity:.62;border-color:rgba(105,232,162,.38)}.hunt-card.ready{border-color:rgba(255,226,138,.72);box-shadow:0
0 14px rgba(255,226,138,.16)}.hunt-card
i{display:block;width:100%;height:5px;border-radius:999px;background:rgba(0,0,0,.42);overflow:hidden}.hunt-card
i
em{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#69e8a2,#ffe28a)}
.season-rift-panel{border-color:rgba(105,232,162,.26);background:linear-gradient(135deg,rgba(105,232,162,.08),rgba(255,226,138,.05))}.season-reward-card{min-height:118px}.season-reward-card.ready{border-color:rgba(105,232,162,.72);box-shadow:0
0 14px rgba(105,232,162,.16)}
