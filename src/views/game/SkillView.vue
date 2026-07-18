<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <Star :size="14" class="inline" />
      百艺
    </h3>
    <div class="border border-water/20 rounded-xs p-3 mb-3 bg-water/5">
      <p class="text-xs text-water mb-1">百艺、宗门与道统</p>
      <p class="text-[10px] text-muted leading-relaxed">百艺提升日常生产效率与品质；加入宗门后，宗门百艺会按流派强化战斗、炼丹或符阵，并随职位开放日课、宝库和委派。飞升后的道统是更长期的传承路线，会进一步改变修炼、战斗与资源收益，可在「道统」及仙界界面查看当前传承效果。</p>
    </div>
    <div class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-accent">生活职业委托</p>
        <span class="text-[10px] text-muted"
          >每日一次 · 消耗产物换百艺经验</span
        >
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="order in skillStore.professionOrderCards"
          :key="order.id"
          class="border border-accent/10 rounded-xs p-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-accent">{{ order.name }}</span
            ><span class="text-[10px] text-muted"
              >{{ SKILL_NAMES[order.skill] }} Lv.{{ order.level }}</span
            >
          </div>
          <p class="text-[10px] text-muted leading-relaxed">{{ order.desc }}</p>
          <p class="text-[10px] text-warning">
            交付：{{ order.itemName }}×{{ order.quantity }} · 奖励
            {{ order.money }}文 / 经验{{ order.exp }}
          </p>
          <button
            class="btn w-full justify-center mt-1"
            :disabled="order.done"
            @click="skillStore.completeProfessionOrder(order.id)"
          >
            {{ order.done ? "今日已完成" : "完成委托" }}
          </button>
        </div>
      </div>
    </div>

    <div class="border border-water/20 rounded-xs p-3 mb-3 bg-water/5">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-water">生活百艺大师委托</p>
        <span class="text-[10px] text-muted">Lv7+解锁 · 消耗高阶材料</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="order in skillStore.masterOrderCards"
          :key="order.id"
          class="border border-water/10 rounded-xs p-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-water">{{ order.name }}</span
            ><span
              class="text-[10px]"
              :class="order.unlocked ? 'text-success' : 'text-muted'"
              >{{ SKILL_NAMES[order.skill] }} Lv.{{ order.levelNow }}/{{
                order.level
              }}</span
            >
          </div>
          <p class="text-[10px] text-muted leading-relaxed">{{ order.desc }}</p>
          <p class="text-[10px] text-warning">
            交付：{{
              order.items.map((i) => `${i.itemName}×${i.quantity}`).join(" / ")
            }}
          </p>
          <p class="text-[10px] text-muted">
            奖励：{{ order.money }}文 / 灵石×{{ order.spiritStone }} / 经验{{
              order.exp
            }}
          </p>
          <button
            class="btn w-full justify-center mt-1"
            :disabled="order.done || !order.unlocked"
            @click="skillStore.completeMasterOrder(order.id)"
          >
            {{
              order.done
                ? "今日已完成"
                : order.unlocked
                  ? "完成大师委托"
                  : "等级不足"
            }}
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div
        v-for="skill in skillStore.skills"
        :key="skill.type"
        class="game-panel"
      >
        <!-- 标题行：图标 + 名称等级 + 经验 -->
        <div class="flex justify-between items-center mb-1.5">
          <div class="flex items-center space-x-1.5">
            <component
              :is="SKILL_ICONS[skill.type]"
              :size="14"
              class="text-accent"
            />
            <span class="text-sm">{{ SKILL_NAMES[skill.type] }}</span>
            <span class="text-xs text-accent">Lv.{{ skill.level }}</span>
          </div>
          <p v-if="expInfo(skill.type)" class="text-[10px] text-muted">
            {{ expInfo(skill.type)!.current }}/{{
              expInfo(skill.type)!.required
            }}
          </p>
          <span
            v-else
            class="text-[10px] text-accent border border-accent/30 rounded-xs px-1"
            >MAX</span
          >
        </div>

        <!-- 经验条 -->
        <div class="bg-bg rounded-xs h-1.5 mb-2">
          <div
            class="h-full bg-accent rounded-xs transition-all"
            :style="{ width: expPercent(skill.type) + '%' }"
          />
        </div>

        <!-- 介绍 + 每级加成 -->
        <div class="border border-accent/20 rounded-xs px-2 py-1.5 mb-2">
          <p class="text-[10px] text-muted leading-relaxed">
            {{ SKILL_DESCS[skill.type] }}
          </p>
          <p class="text-[10px] text-muted mt-0.5">
            每级：体力消耗-1%，{{ SKILL_LEVEL_BONUS[skill.type] }}
          </p>
        </div>

        <!-- 天赋 -->
        <div v-if="skill.perk5 || skill.perk10" class="flex flex-col space-y-1">
          <div
            v-if="skill.perk5"
            class="flex items-center space-x-1.5 border border-water rounded-xs px-2 py-1"
          >
            <span class="text-[10px] text-water shrink-0">Lv5</span>
            <span class="text-xs text-water shrink-0">{{
              PERK_NAMES[skill.perk5]
            }}</span>
            <span class="text-[10px] text-muted">{{
              PERK_DESCS[skill.perk5]
            }}</span>
          </div>
          <div
            v-if="skill.perk10"
            class="flex items-center space-x-1.5 border border-water rounded-xs px-2 py-1"
          >
            <span class="text-[10px] text-water shrink-0">Lv10</span>
            <span class="text-xs text-water shrink-0">{{
              PERK_NAMES[skill.perk10]
            }}</span>
            <span class="text-[10px] text-muted">{{
              PERK_DESCS[skill.perk10]
            }}</span>
          </div>
        </div>
        <p v-else-if="skill.level < 5" class="text-[10px] text-muted">
          Lv5 / Lv10 时可选择专精天赋
        </p>
        <p v-else class="text-[10px] text-muted">
          升级到 Lv{{ !skill.perk5 ? 5 : 10 }} 后可选择天赋
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Component } from "vue";
import { Star, Wheat, TreePine, Fish, Pickaxe, Sword } from "lucide-vue-next";
import { useSkillStore } from "@/stores/useSkillStore";
import type { SkillType, SkillPerk5, SkillPerk10 } from "@/types";

const skillStore = useSkillStore();

const SKILL_ICONS: Record<SkillType, Component> = {
  farming: Wheat,
  foraging: TreePine,
  fishing: Fish,
  mining: Pickaxe,
  combat: Sword,
};

const SKILL_NAMES: Record<SkillType, string> = {
  farming: "灵耕",
  foraging: "采集",
  fishing: "垂钓",
  mining: "采玄矿",
  combat: "战斗",
};

const SKILL_DESCS: Record<SkillType, string> = {
  farming: "种植灵植、收获农产品。等级越高，灵植品质越好。",
  foraging: "采集野外资源、伐木。等级越高，采集品质越好。",
  fishing: "在各水域垂钓。等级越高，垂钓成功率越高。",
  mining: "在玄矿幽脉中采玄矿和战斗。等级越高，矿石产出越多。",
  combat: "与玄矿幽脉中的怪物战斗。等级越高，生命值上限越高。",
};

const SKILL_LEVEL_BONUS: Record<SkillType, string> = {
  farming: "灵植品质概率提升",
  foraging: "采集品质概率提升",
  fishing: "垂钓成功率提升",
  mining: "矿石产出提升",
  combat: "生命值上限+5",
};

const PERK_DESCS: Record<SkillPerk5 | SkillPerk10, string> = {
  harvester: "灵植售价+10%",
  rancher: "畜产品售价+20%",
  lumberjack: "采集时25%概率额外获得木材",
  herbalist: "采集物发现概率+20%",
  fisher: "鱼类售价+25%",
  trapper: "搏鱼成功率+15%",
  miner: "50%概率矿石+1",
  geologist: "稀有矿石概率大幅提升",
  fighter: "受伤减少15%，生命上限+25",
  defender: "防御时恢复5点生命",
  intensive: "20%概率双倍收获",
  artisan: "加工品售价+25%",
  coopmaster: "动物亲密度获取+50%",
  shepherd: "畜产品品质提升一级",
  forester: "采集时必定额外获得木材",
  tracker: "每次采集额外+1物品",
  botanist: "采集物品质必定为精品",
  alchemist: "食物恢复效果+50%",
  angler: "传说鱼出现概率大幅提升",
  aquaculture: "鱼类售价+50%",
  mariner: "钓到的鱼品质至少为优质",
  luremaster: "鱼饵效果翻倍",
  prospector: "15%概率矿石翻倍",
  blacksmith: "金属矿石售价+50%",
  excavator: "使用炸弹时30%概率不消耗",
  mineralogist: "击败怪物额外掉落矿石",
  warrior: "生命上限+40",
  brute: "攻击伤害+25%",
  acrobat: "25%概率闪避并反击",
  tank: "防御时伤害减免70%",
};

const PERK_NAMES: Record<SkillPerk5 | SkillPerk10, string> = {
  harvester: "丰收者",
  rancher: "牧人",
  lumberjack: "樵夫",
  herbalist: "药师",
  fisher: "渔夫",
  trapper: "捕手",
  miner: "矿工",
  geologist: "地质学家",
  fighter: "斗士",
  defender: "守护者",
  intensive: "精耕",
  artisan: "匠人",
  coopmaster: "灵牧苑主",
  shepherd: "牧羊人",
  botanist: "植物学家",
  alchemist: "炼金师",
  forester: "伐木工",
  tracker: "追踪者",
  angler: "垂钓大师",
  aquaculture: "水产商",
  mariner: "水手",
  luremaster: "诱饵师",
  prospector: "探矿者",
  blacksmith: "铁匠",
  excavator: "挖掘者",
  mineralogist: "宝石学家",
  warrior: "武者",
  brute: "蛮力者",
  acrobat: "杂技师",
  tank: "重甲者",
};

const expInfo = (type: SkillType) => {
  return skillStore.getExpToNextLevel(type);
};

const expPercent = (type: SkillType): number => {
  const info = skillStore.getExpToNextLevel(type);
  if (!info) return 100;
  return Math.round((info.current / info.required) * 100);
};
</script>
