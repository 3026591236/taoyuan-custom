<template>
  <div class="space-y-3">
    <Divider title label="🏛️ 宗门" />

    <div
      v-if="!cultivationStore.unlocked"
      class="text-xs text-muted text-center py-4"
    >
      需先启蒙修仙
    </div>
    <div
      v-else-if="cultivationStore.realmIndex < 10"
      class="text-xs text-muted text-center py-4"
    >
      需达到筑基期方可加入宗门
    </div>
    <div v-else-if="!cultivationStore.sect" class="space-y-2">
      <p class="text-xs text-muted text-center">
        选择你的宗门，开启职位、日课、功法和贡献兑换
      </p>
      <div
        v-for="sect in SECTS"
        :key="sect.id"
        class="border border-accent/20 rounded-xs p-3 space-y-2 sect-card"
      >
        <div class="flex items-center gap-2">
          <span class="text-3xl">{{ sect.emoji }}</span>
          <div>
            <div class="text-accent font-bold text-sm">{{ sect.name }}</div>
            <div class="text-[10px] text-muted">{{ sect.motto }}</div>
          </div>
        </div>
        <div class="text-xs">{{ sect.desc }}</div>
        <div class="text-[10px] text-accent">
          宗门加成：{{ sect.bonusDesc }}
        </div>
        <div class="space-y-1">
          <div class="text-[10px] text-muted">宗门百艺：</div>
          <div
            v-for="(skill, i) in sect.skills"
            :key="i"
            class="text-[10px] ml-2"
          >
            • {{ skill.name }}：{{ skill.desc }}
          </div>
        </div>
        <button
          class="btn w-full justify-center text-xs"
          @click="joinSect(sect.id)"
        >
          拜入{{ sect.name }}
        </button>
      </div>
    </div>

    <div v-else class="space-y-3">
      <div class="border border-accent/20 rounded-xs p-3 sect-card">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-3xl">{{ currentSect?.emoji }}</span>
          <div class="min-w-0 flex-1">
            <div class="text-accent font-bold">
              {{ currentSect?.name }} · {{ currentRank!.name }}
            </div>
            <div class="text-[10px] text-muted">{{ currentSect?.motto }}</div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div class="border border-accent/10 rounded-xs p-1">
            <p class="text-muted">贡献</p>
            <p class="text-accent">
              {{ cultivationStore.sectContribution || 0 }}
            </p>
          </div>
          <div class="border border-accent/10 rounded-xs p-1">
            <p class="text-muted">功勋</p>
            <p class="text-accent">{{ cultivationStore.sectMerit || 0 }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-1">
            <p class="text-muted">职位</p>
            <p class="text-accent">{{ currentRank!.name }}</p>
          </div>
        </div>
        <div class="text-[10px] text-accent mt-2">
          宗门加成：{{ currentSect?.bonusDesc }}；职位加成：{{
            currentRank!.bonus
          }}
        </div>
        <div class="text-[10px] text-success mt-1">
          宗门特性：{{ currentSect?.identity }}
        </div>
        <div class="text-[10px] text-caution mt-1">
          实战加成：{{ sectBonusText }}
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">宗门公共建设</p>
          <span class="text-[10px] text-muted">{{
            longTerm.sectBuildBonusText
          }}</span>
        </div>
        <div
          class="h-2 bg-bg border border-accent/20 rounded-xs overflow-hidden"
        >
          <div
            class="h-full bg-accent"
            :style="{
              width:
                Math.min(
                  100,
                  Math.floor(
                    (longTerm.sectBuildExp /
                      Math.max(1, longTerm.sectBuildNeed)) *
                      100,
                  ),
                ) + '%',
            }"
          />
        </div>
        <div class="text-[10px] text-muted">
          建设度 {{ longTerm.sectBuildExp }}/{{ longTerm.sectBuildNeed }} ·
          本月贡献 {{ longTerm.sectBuildContributed }}
        </div>

        <div class="text-[10px] text-caution">
          三大工程：{{ longTerm.sectProjectBonusText }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
          <div
            v-for="project in longTerm.sectProjectCards"
            :key="project.id"
            class="border border-accent/10 rounded-xs p-2 space-y-1"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs text-accent"
                >{{ project.emoji }} {{ project.name }} Lv.{{
                  project.level
                }}</span
              ><span class="text-[10px] text-muted">{{ project.effect }}</span>
            </div>
            <p class="text-[10px] text-muted leading-relaxed">
              {{ project.desc }}
            </p>
            <div class="grid grid-cols-3 gap-1">
              <button
                class="mini-build-btn"
                @click="contributeProject(project.id, 'money')"
              >
                铜钱
              </button>
              <button
                class="mini-build-btn"
                @click="contributeProject(project.id, 'spirit')"
              >
                灵石
              </button>
              <button
                class="mini-build-btn"
                @click="contributeProject(project.id, 'material')"
              >
                灵墨
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button
            class="btn justify-center text-xs"
            @click="contributeBuild('money')"
          >
            捐铜钱1200
          </button>
          <button
            class="btn justify-center text-xs"
            @click="contributeBuild('spirit')"
          >
            捐灵石8
          </button>
          <button
            class="btn justify-center text-xs"
            @click="contributeBuild('material')"
          >
            捐灵墨1
          </button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 sect-card">
        <div class="flex justify-between items-center mb-1">
          <span class="text-xs text-accent">宗门远征队</span>
          <span class="text-[10px] text-muted"
            >每日一次 ·
            {{
              isDailyDone("sect_expedition") ? "今日已派遣" : "今日可派遣"
            }}</span
          >
        </div>
        <p class="text-[10px] text-muted mb-2">
          派遣宗门弟子探索秘境、护送商路或搜集灵材，消耗贡献换取功勋和材料。
        </p>
        <div class="grid grid-cols-3 gap-1">
          <button
            class="btn justify-center text-xs"
            :disabled="
              isDailyDone('sect_expedition') ||
              (cultivationStore.sectContribution || 0) < 80
            "
            @click="startSectExpedition('relic')"
          >
            遗府
          </button>
          <button
            class="btn justify-center text-xs"
            :disabled="
              isDailyDone('sect_expedition') ||
              (cultivationStore.sectContribution || 0) < 80
            "
            @click="startSectExpedition('escort')"
          >
            护商
          </button>
          <button
            class="btn justify-center text-xs"
            :disabled="
              isDailyDone('sect_expedition') ||
              (cultivationStore.sectContribution || 0) < 80
            "
            @click="startSectExpedition('material')"
          >
            采材
          </button>
        </div>
      </div>

      <div
        class="border border-accent/20 rounded-xs p-3 space-y-2 sect-dungeon-card"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">宗门副本 · 长老试炼</p>
          <span class="text-[10px] text-muted"
            >每日演武 ·
            {{ isDailyDone("sect_dungeon") ? "副本已清" : "副本可战" }}</span
          >
        </div>
        <p class="text-[10px] text-muted leading-relaxed">
          把宗门职位、百艺、三大工程和远征材料串成战斗闭环。亲传弟子可挑战宗门副本，长老候补额外开启长老试炼。
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button
            v-for="dungeon in SECT_DUNGEONS"
            :key="dungeon.id"
            class="sect-dungeon-btn"
            :disabled="!canChallengeSectDungeon(dungeon)"
            @click="challengeSectDungeon(dungeon)"
          >
            <span class="text-xs text-accent"
              >{{ dungeon.icon }} {{ dungeon.name }}</span
            >
            <span class="text-[10px] text-muted">{{ dungeon.desc }}</span>
            <span class="text-[10px] text-warning"
              >需职位{{ rankName(dungeon.needRank) }}｜贡献{{
                dungeon.cost
              }}｜战力{{ dungeon.needPower }}</span
            >
            <span class="text-[10px] text-success"
              >奖励：{{ dungeon.rewardText }}</span
            >
          </button>
        </div>
        <button
          class="btn w-full justify-center text-xs"
          :disabled="!canDoElderTrial"
          @click="challengeElderTrial"
        >
          {{
            isDailyDone("elder_trial")
              ? "今日长老试炼已完成"
              : "挑战长老试炼：消耗贡献180，检验宗门综合底蕴"
          }}
        </button>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">宗门专属委派</p>
          <span class="text-[10px] text-muted"
            >每日一次 ·
            {{
              isDailyDone(`commission_${cultivationStore.sect}`)
                ? "今日已完成"
                : "今日可完成"
            }}</span
          >
        </div>
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-xs">{{ currentCommission?.name }}</p>
          <p class="text-[10px] text-muted leading-relaxed">
            {{ currentCommission?.desc }}
          </p>
          <p class="text-[10px] text-accent">
            奖励：{{ currentCommission?.rewardText }}，并获得贡献{{
              currentCommission?.contribution
            }}、功勋{{ currentCommission?.merit }}
          </p>
          <button
            class="btn w-full justify-center text-xs mt-2"
            :disabled="
              !currentCommission ||
              isDailyDone(`commission_${cultivationStore.sect}`) ||
              !canDoCommission
            "
            @click="finishCommission"
          >
            执行委派
          </button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">宗门职位</p>
          <span class="text-[10px] text-muted">{{
            nextRank ? `下一阶：${nextRank.name}` : "已至当前最高职位"
          }}</span>
        </div>
        <div v-if="nextRank" class="text-[10px] text-muted leading-relaxed">
          晋升要求：功勋 {{ cultivationStore.sectMerit || 0 }}/{{
            nextRank.merit
          }}
          · 境界 {{ cultivationStore.realmIndex }}/{{ nextRank.realm }} ·
          消耗贡献 {{ nextRank.cost }}
        </div>
        <button
          class="btn w-full justify-center text-xs"
          :disabled="!canPromote"
          @click="promoteRank"
        >
          {{ nextRank ? `晋升${nextRank.name}` : "职位已满" }}
        </button>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs text-accent">今日宗门日课</p>
          <span class="text-[10px] text-muted"
            >每日重置 · 已完成 {{ doneDailyCount }}/{{
              DAILY_TASKS.length
            }}</span
          >
        </div>
        <div
          v-for="task in DAILY_TASKS"
          :key="task.id"
          class="border border-accent/10 rounded-xs p-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs">{{ task.name }}</p>
              <p class="text-[10px] text-muted leading-relaxed">
                {{ task.desc }}
              </p>
              <p class="text-[10px] text-accent">
                奖励：贡献{{ task.contribution }}、功勋{{ task.merit
                }}{{ task.rewardText ? `、${task.rewardText}` : "" }}
              </p>
            </div>
            <button
              class="btn text-[10px] shrink-0"
              :disabled="isDailyDone(task.id) || !canDoDaily(task)"
              @click="finishDaily(task)"
            >
              {{ isDailyDone(task.id) ? "已完成" : "完成" }}
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div
          v-for="(skill, i) in currentSect?.skills"
          :key="i"
          class="border border-accent/15 rounded-xs p-2 space-y-1"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold">{{ skill.name }}</span>
            <span class="text-[10px] text-accent"
              >Lv.{{ getSectSkillLevel(i) }} / {{ skillLevelCap }}</span
            >
          </div>
          <div class="text-[10px] text-muted min-h-[2.25rem]">
            {{ skill.desc }}
          </div>
          <div class="text-[10px]">升级费用：{{ getSkillCost(i) }} 贡献</div>
          <button
            class="btn w-full justify-center text-xs"
            @click="upgradeSkill(i)"
            :disabled="!canUpgradeSkill(i)"
          >
            升级百艺
          </button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 space-y-2">
        <p class="text-xs text-accent">宗门宝库</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div
            v-for="item in TREASURY"
            :key="item.id"
            class="border border-accent/10 rounded-xs p-2 space-y-1"
          >
            <p class="text-xs">{{ item.name }}</p>
            <p class="text-[10px] text-muted">{{ item.desc }}</p>
            <p class="text-[10px] text-accent">消耗贡献 {{ item.cost }}</p>
            <button
              class="btn w-full justify-center text-xs"
              :disabled="(cultivationStore.sectContribution || 0) < item.cost"
              @click="redeem(item)"
            >
              兑换
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Divider from "@/components/game/Divider.vue";
import { useCultivationStore } from "@/stores/useCultivationStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { useGameStore } from "@/stores/useGameStore";
import { useLongTermStore } from "@/stores/useLongTermStore";
import { addLog, showFloat } from "@/composables/useGameLog";

const cultivationStore = useCultivationStore();
const inventoryStore = useInventoryStore();
const gameStore = useGameStore();
const longTerm = useLongTermStore();

type SectId = "sword" | "alchemy" | "talisman";

const SECTS = [
  {
    id: "sword" as const,
    name: "剑宗",
    emoji: "⚔️",
    motto: "剑气纵横三万里，一剑光寒十九洲",
    desc: "以剑入道，重视历练、斩妖和剑意磨砺。",
    bonusDesc: "攻击与战斗成长更强",
    identity: "宗门百艺额外提升战力，适合主打秘境与登仙塔。",
    skills: [
      { name: "御剑术", desc: "飞剑与基础攻击成长提高，适合红尘历练。" },
      { name: "剑意", desc: "提升暴击与破防理解，强化秘境表现。" },
      { name: "万剑归宗", desc: "高阶群攻剑诀，职位越高越能发挥。" },
    ],
  },
  {
    id: "alchemy" as const,
    name: "丹宗",
    emoji: "⚗️",
    motto: "一炉定乾坤，丹成天下闻",
    desc: "炼丹圣地，重视灵植、丹房和药理积累。",
    bonusDesc: "炼丹、灵植与恢复收益更好",
    identity: "职位提升带来稳定战力，委派偏向丹药、灵植与材料循环。",
    skills: [
      { name: "丹火", desc: "提升炼丹火候，减少材料浪费。" },
      { name: "药理", desc: "提升丹药与灵植转化效果。" },
      { name: "造化丹术", desc: "高阶丹术，产出更稳定的修仙资源。" },
    ],
  },
  {
    id: "talisman" as const,
    name: "符宗",
    emoji: "📜",
    motto: "一符镇天地，万法皆可封",
    desc: "以符入道，重视灵力调度、阵法和防御。",
    bonusDesc: "灵力消耗与防御表现更优",
    identity: "宗门百艺与职位共同强化战力，委派偏向符材和防御资源。",
    skills: [
      { name: "灵符术", desc: "提升灵力运用效率，适合长期修行。" },
      { name: "封印术", desc: "削弱妖兽攻势，提高挑战容错。" },
      { name: "天罡符阵", desc: "强化防御阵势，降低高阶战斗压力。" },
    ],
  },
];

const RANKS = [
  {
    name: "外门弟子",
    merit: 0,
    realm: 10,
    cost: 0,
    bonus: "可接日课，百艺上限3",
  },
  {
    name: "内门弟子",
    merit: 80,
    realm: 11,
    cost: 120,
    bonus: "百艺上限4，宝库折扣雏形",
  },
  {
    name: "亲传弟子",
    merit: 220,
    realm: 13,
    cost: 260,
    bonus: "百艺上限5，日课收益更高",
  },
  {
    name: "执事",
    merit: 480,
    realm: 16,
    cost: 520,
    bonus: "宗门贡献转化战力更明显",
  },
  {
    name: "长老候补",
    merit: 900,
    realm: 19,
    cost: 900,
    bonus: "解锁长老试炼，宗门副本收益提升",
  },
];

const DAILY_TASKS = [
  {
    id: "lecture",
    name: "听道早课",
    desc: "在宗门听长老讲道，稳步积累功勋。",
    contribution: 30,
    merit: 8,
  },
  {
    id: "patrol",
    name: "山门巡守",
    desc: "巡守山门、驱散游妖，获得少量灵石。",
    contribution: 45,
    merit: 12,
    reward: () => inventoryStore.addItem("spirit_stone", 3),
    rewardText: "灵石×3",
  },
  {
    id: "donate",
    name: "上交灵材",
    desc: "上交灵石×5换取更高宗门评价。",
    contribution: 70,
    merit: 18,
    require: () => inventoryStore.getItemCount("spirit_stone") >= 5,
    consume: () => inventoryStore.removeItem("spirit_stone", 5),
    rewardText: "需灵石×5",
  },
];

const COMMISSIONS: Record<
  SectId,
  {
    name: string;
    desc: string;
    contribution: number;
    merit: number;
    rewardText: string;
    require?: () => boolean;
    consume?: () => void;
    reward: () => void;
  }
> = {
  sword: {
    name: "剑冢试剑",
    desc: "前往宗门剑冢磨砺剑意，适合战斗流弟子每日完成。",
    contribution: 65,
    merit: 20,
    rewardText: "星陨铁×1、灵石×4",
    reward: () => {
      inventoryStore.addItem("star_iron", 1);
      inventoryStore.addItem("spirit_stone", 4);
    },
  },
  alchemy: {
    name: "丹房看炉",
    desc: "协助丹房守炉调火，需要上交凝露草×2，回报灵植与丹材。",
    contribution: 70,
    merit: 22,
    rewardText: "蕴灵稻灵种×3、朱果灵种×1",
    require: () => inventoryStore.getItemCount("dew_grass") >= 2,
    consume: () => inventoryStore.removeItem("dew_grass", 2),
    reward: () => {
      inventoryStore.addItem("seed_spirit_rice", 3);
      inventoryStore.addItem("seed_vermilion_fruit", 1);
    },
  },
  talisman: {
    name: "符阵巡检",
    desc: "巡检山门符阵并补全阵脚，需要灵石×3，回报符材与魂晶。",
    contribution: 68,
    merit: 21,
    rewardText: "魂晶×1、木灵珠×1",
    require: () => inventoryStore.getItemCount("spirit_stone") >= 3,
    consume: () => inventoryStore.removeItem("spirit_stone", 3),
    reward: () => {
      inventoryStore.addItem("soul_crystal", 1);
      inventoryStore.addItem("wood_spirit", 1);
    },
  },
};

const TREASURY = [
  {
    id: "spirit_stone_pack",
    name: "灵石匣",
    desc: "领取灵石×10，补充修仙市集和功法消耗。",
    cost: 90,
    reward: () => inventoryStore.addItem("spirit_stone", 10),
  },
  {
    id: "spirit_seed_pack",
    name: "灵植种匣",
    desc: "蕴灵稻、凝露草、朱果灵种各×2。",
    cost: 150,
    reward: () => {
      inventoryStore.addItem("seed_spirit_rice", 2);
      inventoryStore.addItem("seed_dew_grass", 2);
      inventoryStore.addItem("seed_vermilion_fruit", 2);
    },
  },
  {
    id: "high_spirit_seed_pack",
    name: "高阶灵植种匣",
    desc: "冰魄雪莲灵种×2、紫韵灵芝孢子×2。",
    cost: 350,
    reward: () => {
      inventoryStore.addItem("seed_ice_soul_lotus", 2);
      inventoryStore.addItem("seed_purple_ganoderma", 2);
    },
  },
  {
    id: "secret_material",
    name: "秘境材料匣",
    desc: "木灵珠×1、魂晶×1，支撑宗门副本、炼丹与高阶养成。",
    cost: 220,
    reward: () => {
      inventoryStore.addItem("wood_spirit", 1);
      inventoryStore.addItem("soul_crystal", 1);
    },
  },
];

const SECT_DUNGEONS = [
  {
    id: "sword_tomb",
    sect: "sword" as const,
    icon: "⚔️",
    name: "剑冢镇妖",
    desc: "剑宗弟子入剑冢镇压妖魂，产出星陨铁与玉简。",
    needRank: 2,
    needPower: 18000,
    cost: 120,
    merit: 48,
    contribution: 30,
    aura: 520,
    rewardText: "功勋48、星陨铁×1、玉简×1",
    reward: () => {
      inventoryStore.addItem("star_iron", 1);
      inventoryStore.addItem("jade_slip", 1);
    },
  },
  {
    id: "alchemy_realm",
    sect: "alchemy" as const,
    icon: "⚗️",
    name: "丹霞药境",
    desc: "丹宗开启丹霞药境采炼灵药，补足炼丹与灵田材料。",
    needRank: 2,
    needPower: 16000,
    cost: 120,
    merit: 46,
    contribution: 34,
    aura: 620,
    rewardText: "功勋46、紫韵灵芝孢子×2、冰魄雪莲灵种×1",
    reward: () => {
      inventoryStore.addItem("seed_purple_ganoderma", 2);
      inventoryStore.addItem("seed_ice_soul_lotus", 1);
    },
  },
  {
    id: "talisman_array",
    sect: "talisman" as const,
    icon: "📜",
    name: "天罡符阵",
    desc: "符宗演算天罡符阵，沉淀灵墨、雷精与防御底蕴。",
    needRank: 2,
    needPower: 17000,
    cost: 120,
    merit: 47,
    contribution: 32,
    aura: 560,
    rewardText: "功勋47、灵墨×2、雷精×1",
    reward: () => {
      inventoryStore.addItem("spirit_ink", 2);
      inventoryStore.addItem("thunder_essence", 1);
    },
  },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;
const sectBonusText = computed(() => {
  if (cultivationStore.sect === "sword")
    return `剑宗攻击+${pct(cultivationStore.sectCombatAttackBonusRate || 0)}`;
  if (cultivationStore.sect === "alchemy")
    return `丹宗额外成丹率+${pct(cultivationStore.sectAlchemyExtraOutputChance || 0)}，灵植灵气+${pct(cultivationStore.sectSpiritCropAuraBonusRate || 0)}`;
  if (cultivationStore.sect === "talisman")
    return `符宗防御+${pct(cultivationStore.sectCombatDefenseBonusRate || 0)}，气血+${pct(cultivationStore.sectMaxHpBonusRate || 0)}，闭关心魔净化+${cultivationStore.sectDemonClearBonus || 0}`;
  return "未加入宗门";
});

const currentSect = computed(() =>
  SECTS.find((s) => s.id === cultivationStore.sect),
);
const currentCommission = computed(() =>
  cultivationStore.sect ? COMMISSIONS[cultivationStore.sect as SectId] : null,
);
const canDoCommission = computed(
  () => !currentCommission.value?.require || currentCommission.value.require(),
);
const currentRank = computed(
  () => RANKS[cultivationStore.sectRank || 0] ?? RANKS[0],
);
const nextRank = computed(
  () => RANKS[(cultivationStore.sectRank || 0) + 1] ?? null,
);
const rankName = (idx: number) => RANKS[idx]?.name ?? "亲传弟子";
const skillLevelCap = computed(() =>
  Math.min(5, 3 + (cultivationStore.sectRank || 0)),
);
const dailyKey = computed(
  () => `${gameStore.year}-${gameStore.season}-${gameStore.day}`,
);
const doneDailyCount = computed(() => {
  resetDailyIfNeeded();
  return cultivationStore.sectDailyDone.length;
});
const canPromote = computed(() => {
  const next = nextRank.value;
  if (!next) return false;
  return (
    (cultivationStore.sectMerit || 0) >= next.merit &&
    cultivationStore.realmIndex >= next.realm &&
    (cultivationStore.sectContribution || 0) >= next.cost
  );
});

const resetDailyIfNeeded = () => {
  if (cultivationStore.sectDailyKey !== dailyKey.value) {
    cultivationStore.sectDailyKey = dailyKey.value;
    cultivationStore.sectDailyDone = [];
  }
};
const isDailyDone = (id: string) => {
  resetDailyIfNeeded();
  return cultivationStore.sectDailyDone.includes(id);
};
const canDoDaily = (task: (typeof DAILY_TASKS)[number]) =>
  !task.require || task.require();

const joinSect = (id: SectId) => {
  cultivationStore.sect = id;
  cultivationStore.sectSkills = [0, 0, 0];
  cultivationStore.sectContribution = 80;
  cultivationStore.sectRank = 0;
  cultivationStore.sectMerit = 0;
  cultivationStore.sectDailyKey = dailyKey.value;
  cultivationStore.sectDailyDone = [];
  addLog(`加入${SECTS.find((s) => s.id === id)?.name}！获得入门贡献80。`);
  showFloat(`拜入${SECTS.find((s) => s.id === id)?.name}`, "success");
};

const contributeProject = (
  id: "spirit_array" | "craft_hall" | "sword_platform",
  kind: "money" | "spirit" | "material",
) => {
  const res = longTerm.contributeSectProject(id, kind);
  addLog(res.message);
  showFloat(res.message, res.success ? "success" : "danger");
};

const contributeBuild = (kind: "money" | "spirit" | "material") => {
  const res = longTerm.contributeSectBuild(kind);
  addLog(res.message);
  showFloat(res.message, res.success ? "success" : "danger");
};

const finishDaily = (task: (typeof DAILY_TASKS)[number]) => {
  resetDailyIfNeeded();
  if (isDailyDone(task.id) || !canDoDaily(task)) return;
  task.consume?.();
  const rankBonus = 1 + (cultivationStore.sectRank || 0) * 0.12;
  const contribution = Math.floor(task.contribution * rankBonus);
  const merit = Math.floor(task.merit * rankBonus);
  cultivationStore.sectContribution =
    (cultivationStore.sectContribution || 0) + contribution;
  cultivationStore.sectMerit = (cultivationStore.sectMerit || 0) + merit;
  task.reward?.();
  cultivationStore.sectDailyDone.push(task.id);
  addLog(`完成宗门日课「${task.name}」，贡献+${contribution}，功勋+${merit}。`);
  showFloat("宗门日课完成", "success");
};

const promoteRank = () => {
  const next = nextRank.value;
  if (!next || !canPromote.value) return;
  cultivationStore.sectContribution -= next.cost;
  cultivationStore.sectRank += 1;
  addLog(`宗门职位晋升为「${next.name}」！`);
  showFloat(`晋升${next.name}`, "success");
};

const startSectExpedition = (kind: "relic" | "escort" | "material") => {
  resetDailyIfNeeded();
  if (
    isDailyDone("sect_expedition") ||
    (cultivationStore.sectContribution || 0) < 80
  )
    return;
  cultivationStore.sectContribution -= 80;
  const rankBonus = 1 + (cultivationStore.sectRank || 0) * 0.15;
  const merit = Math.floor(
    (kind === "relic" ? 36 : kind === "escort" ? 28 : 24) * rankBonus,
  );
  cultivationStore.sectMerit = (cultivationStore.sectMerit || 0) + merit;
  if (kind === "relic") {
    inventoryStore.addItem("soul_crystal", 1);
    inventoryStore.addItem("jade_slip", 1);
  }
  if (kind === "escort") {
    inventoryStore.addItem("spirit_stone", 8);
  }
  if (kind === "material") {
    inventoryStore.addItem("wood_spirit", 1);
    inventoryStore.addItem("thunder_essence", 1);
  }
  cultivationStore.sectDailyDone.push("sect_expedition");
  addLog(`宗门远征队归来，功勋+${merit}。`);
  showFloat("宗门远征完成", "success");
};

const canChallengeSectDungeon = (dungeon: (typeof SECT_DUNGEONS)[number]) => {
  resetDailyIfNeeded();
  return (
    cultivationStore.sect === dungeon.sect &&
    !isDailyDone("sect_dungeon") &&
    (cultivationStore.sectRank || 0) >= dungeon.needRank &&
    (cultivationStore.combatPower || 0) >= dungeon.needPower &&
    (cultivationStore.sectContribution || 0) >= dungeon.cost
  );
};

const challengeSectDungeon = (dungeon: (typeof SECT_DUNGEONS)[number]) => {
  if (!canChallengeSectDungeon(dungeon)) return;
  const rankBonus = 1 + (cultivationStore.sectRank || 0) * 0.14;
  const projectBonus =
    1 +
    Math.min(0.25, ((longTerm.sectProjects?.sword_platform || 1) - 1) * 0.03);
  const merit = Math.floor(dungeon.merit * rankBonus * projectBonus);
  const contribution = Math.floor(dungeon.contribution * rankBonus);
  const aura = Math.floor(dungeon.aura * projectBonus);
  cultivationStore.sectContribution =
    (cultivationStore.sectContribution || 0) - dungeon.cost + contribution;
  cultivationStore.sectMerit = (cultivationStore.sectMerit || 0) + merit;
  cultivationStore.aura = (cultivationStore.aura || 0) + aura;
  dungeon.reward();
  cultivationStore.sectDailyDone.push("sect_dungeon");
  longTerm.addMonthlyProgress("sect_160", Math.floor(contribution / 2));
  addLog(
    `通关宗门副本「${dungeon.name}」，功勋+${merit}，贡献返还+${contribution}，灵气+${aura}。`,
  );
  showFloat("宗门副本通关", "success");
};

const canDoElderTrial = computed(() => {
  resetDailyIfNeeded();
  return (
    !isDailyDone("elder_trial") &&
    (cultivationStore.sectRank || 0) >= 4 &&
    (cultivationStore.sectContribution || 0) >= 180 &&
    (cultivationStore.sectMerit || 0) >= 900
  );
});

const challengeElderTrial = () => {
  if (!canDoElderTrial.value) return;
  const skillTotal = cultivationStore.sectSkills.reduce(
    (sum, lv) => sum + (Number(lv) || 0),
    0,
  );
  const buildLevel = longTerm.sectBuildLevel || 1;
  const rewardMerit = 72 + skillTotal * 4 + buildLevel * 3;
  const rewardAura = 900 + skillTotal * 90 + buildLevel * 80;
  cultivationStore.sectContribution =
    (cultivationStore.sectContribution || 0) - 180 + 60;
  cultivationStore.sectMerit = (cultivationStore.sectMerit || 0) + rewardMerit;
  cultivationStore.aura = (cultivationStore.aura || 0) + rewardAura;
  inventoryStore.addItem("jade_slip", 2);
  inventoryStore.addItem("artifact_shard", 1);
  cultivationStore.sectDailyDone.push("elder_trial");
  longTerm.addMonthlyProgress("sect_160", 40);
  addLog(
    `完成长老试炼：宗门综合底蕴通过考验，功勋+${rewardMerit}，灵气+${rewardAura}，玉简×2，法宝碎片×1。`,
  );
  showFloat("长老试炼通过", "success");
};

const finishCommission = () => {
  resetDailyIfNeeded();
  if (
    !cultivationStore.sect ||
    !currentCommission.value ||
    isDailyDone(`commission_${cultivationStore.sect}`) ||
    !canDoCommission.value
  )
    return;
  const commission = currentCommission.value;
  commission.consume?.();
  const rankBonus = 1 + (cultivationStore.sectRank || 0) * 0.12;
  const contribution = Math.floor(commission.contribution * rankBonus);
  const merit = Math.floor(commission.merit * rankBonus);
  cultivationStore.sectContribution =
    (cultivationStore.sectContribution || 0) + contribution;
  cultivationStore.sectMerit = (cultivationStore.sectMerit || 0) + merit;
  commission.reward();
  cultivationStore.sectDailyDone.push(`commission_${cultivationStore.sect}`);
  addLog(
    `完成宗门委派「${commission.name}」，贡献+${contribution}，功勋+${merit}。`,
  );
  showFloat("宗门委派完成", "success");
};

const getSectSkillLevel = (idx: number) =>
  cultivationStore.sectSkills?.[idx] || 0;
const getSkillCost = (idx: number) => {
  const level = getSectSkillLevel(idx);
  return (idx + 1) * 60 * (level + 1) + level * 40;
};
const canUpgradeSkill = (idx: number) => {
  const level = getSectSkillLevel(idx);
  if (level >= skillLevelCap.value) return false;
  return (cultivationStore.sectContribution || 0) >= getSkillCost(idx);
};
const upgradeSkill = (idx: number) => {
  if (!canUpgradeSkill(idx)) return;
  const level = getSectSkillLevel(idx);
  const cost = getSkillCost(idx);
  cultivationStore.sectContribution =
    (cultivationStore.sectContribution || 0) - cost;
  cultivationStore.sectSkills[idx] = level + 1;
  addLog(
    `${currentSect.value?.skills[idx]?.name ?? "百艺"} 升级到 Lv.${level + 1}！`,
  );
  showFloat("百艺升级！", "success");
};

const redeem = (item: (typeof TREASURY)[number]) => {
  if ((cultivationStore.sectContribution || 0) < item.cost) return;
  cultivationStore.sectContribution -= item.cost;
  item.reward();
  addLog(`在宗门宝库兑换了「${item.name}」。`);
  showFloat("宝库兑换成功", "success");
};
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

<style scoped>
.mini-build-btn {
  border: 1px solid rgba(200, 164, 92, 0.28);
  color: var(--accent);
  font-size: 10px;
  padding: 3px 4px;
  border-radius: 2px;
}
.mini-build-btn:hover {
  background: rgba(200, 164, 92, 0.12);
}
</style>

<style scoped>
.sect-dungeon-card {
  background: linear-gradient(
    135deg,
    rgba(200, 164, 92, 0.08),
    rgba(80, 180, 255, 0.04)
  );
}
.sect-dungeon-btn {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  border: 1px solid rgba(200, 164, 92, 0.18);
  border-radius: 4px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.12);
}
.sect-dungeon-btn:not(:disabled):hover {
  border-color: rgba(200, 164, 92, 0.55);
  box-shadow: 0 0 12px rgba(200, 164, 92, 0.12);
}
.sect-dungeon-btn:disabled {
  opacity: 0.48;
}
</style>
