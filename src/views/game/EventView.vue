<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h1 class="text-accent text-xl">活动中心</h1>
        <p class="text-xs text-muted mt-1">
          每日活跃、连续满勤、周修行令、月度修行令、奇遇回流与全服讨伐已整合，先把每天上线后的目标串起来。
        </p>
      </div>
      <span
        class="text-xs px-2 py-1 border border-accent/30 rounded-xs text-accent"
        >V1.6.4 全量留存玩法</span
      >
    </div>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">世界剧情与季节事件</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            把村庄、宗门、公会、家族、秘境和天气节令串成长期世界线。{{
              retention.seasonEventBuffText
            }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl">🌏</p>
          <p class="text-[10px] text-muted">世界在运转</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="ch in retention.worldStoryChapters"
          :key="ch.id"
          class="reward-card"
          :class="ch.claimed ? 'claimed' : ch.done() ? 'ready' : ''"
        >
          <p class="text-sm text-accent">{{ ch.title }}</p>
          <p class="text-[10px] text-muted mt-1 leading-relaxed">
            {{ ch.desc }}
          </p>
          <p class="text-[10px] text-warning mt-1">
            条件：{{ ch.requirement }}
          </p>
          <p class="text-[10px] text-muted mt-1">{{ rewardText(ch.reward) }}</p>
          <button
            class="mini-btn mt-2"
            :disabled="!ch.done() || ch.claimed"
            @click="claimWorldStory(ch.id)"
          >
            {{ ch.claimed ? "已推进" : ch.done() ? "推进剧情" : "未达成" }}
          </button>
        </div>
      </div>
      <div
        v-if="retention.activeSeasonalEvents.length"
        class="grid grid-cols-1 md:grid-cols-2 gap-2"
      >
        <div
          v-for="ev in retention.activeSeasonalEvents"
          :key="ev.id"
          class="reward-card"
          :class="ev.claimed ? 'claimed' : 'ready'"
        >
          <p class="text-sm text-accent">{{ ev.title }}</p>
          <p class="text-[10px] text-muted mt-1 leading-relaxed">
            {{ ev.desc }}
          </p>
          <p class="text-[10px] text-warning mt-1">{{ ev.condition }}</p>
          <p class="text-[10px] text-muted mt-1">{{ rewardText(ev.reward) }}</p>
          <button
            class="mini-btn mt-2"
            :disabled="ev.claimed"
            @click="claimSeasonalEvent(ev.id)"
          >
            {{ ev.claimed ? "本周期已完成" : "完成事件" }}
          </button>
        </div>
      </div>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">今日活跃度</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            完成修行志里的每日目标即可累积活跃度。宝箱每天刷新，形成「上线有事做、做完有奖励」的固定节奏。
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl text-accent font-bold">
            {{ retention.activityScore }}
          </p>
          <p class="text-[10px] text-muted">/100 活跃</p>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between text-xs text-muted">
          <span
            >今日完成 {{ retention.dailyDoneCount }}/{{
              retention.dailyTasks.length
            }}
            项，已领取 {{ retention.dailyClaimedCount }} 项</span
          >
          <span>{{ retention.activityScore }}%</span>
        </div>
        <div
          class="h-3 bg-bg border border-accent/20 rounded-xs overflow-hidden"
        >
          <div
            class="h-full bg-accent transition-all"
            :style="{ width: retention.activityScore + '%' }"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div
          v-for="box in retention.activityBoxes"
          :key="box.score"
          class="reward-card"
          :class="box.claimed ? 'claimed' : box.done ? 'ready' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm text-accent">{{ box.score }}活跃</p>
              <p class="text-xs font-bold mt-1">{{ box.title }}</p>
              <p class="text-[10px] text-muted mt-1 leading-relaxed">
                {{ box.desc }}
              </p>
            </div>
            <span>{{ box.claimed ? "✅" : box.done ? "🎁" : "🔒" }}</span>
          </div>
          <p class="text-[10px] text-muted mt-2">
            {{ rewardText(box.reward) }}
          </p>
          <button
            class="mini-btn mt-2"
            :disabled="!box.done || box.claimed"
            @click="claimActivity(box.score)"
          >
            {{ box.claimed ? "已领取" : box.done ? "领取" : "未达成" }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button class="btn justify-center" @click="goQuest">
          查看每日目标
        </button>
        <button class="btn justify-center" @click="goCombat">
          去秘境/登塔提升活跃
        </button>
      </div>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">连续满勤</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            每天领取100活跃宝箱后计入连续满勤。连续3/5/7天可领取额外修仙材料，给回访玩家一个明确周目标。
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl text-accent font-bold">
            {{ retention.visibleFullActivityStreak }}
          </p>
          <p class="text-[10px] text-muted">连续满勤天</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div
          v-for="gift in retention.streakGifts"
          :key="gift.day"
          class="reward-card"
          :class="gift.claimed ? 'claimed' : gift.unlocked ? 'ready' : ''"
        >
          <p class="text-sm text-accent">连续{{ gift.day }}天</p>
          <p class="text-xs font-bold mt-1">
            {{ gift.title.replace(/^.*：/, "") }}
          </p>
          <p class="text-[10px] text-muted mt-1 leading-relaxed">
            {{ gift.desc }}
          </p>
          <p class="text-[10px] text-muted mt-2">
            {{ rewardText(gift.reward) }}
          </p>
          <button
            class="mini-btn mt-2"
            :disabled="!gift.unlocked || gift.claimed"
            @click="claimStreak(gift.day)"
          >
            {{ gift.claimed ? "已领" : gift.unlocked ? "领取" : "未达成" }}
          </button>
        </div>
      </div>
      <p class="text-[10px] text-muted">
        已完成 {{ longTerm.adventureStory.completed }} 段；已触发隐藏结局
        {{ longTerm.adventureStory.endings.length }} 个。
      </p>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">周修行令</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            每7个游戏日重置一次，用周目标把秘境、烹饪、博物馆、公会、瀚海、育种和钓鱼串起来。
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl text-accent font-bold">
            {{ retention.weeklyDoneCount }}
          </p>
          <p class="text-[10px] text-muted">
            /{{ retention.weeklyTasks.length }} 周令完成
          </p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="task in retention.weeklyTasks"
          :key="task.id"
          class="reward-card"
          :class="task.claimed ? 'claimed' : task.done ? 'ready' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm text-accent">{{ task.title }}</p>
              <p class="text-[10px] text-muted mt-1 leading-relaxed">
                {{ task.desc }}
              </p>
            </div>
            <span>{{ task.claimed ? "✅" : task.done ? "🎁" : "📜" }}</span>
          </div>
          <div
            class="mt-2 h-2 bg-bg border border-accent/20 rounded-xs overflow-hidden"
          >
            <div
              class="h-full bg-accent transition-all"
              :style="{
                width:
                  Math.min(
                    100,
                    Math.floor(
                      (task.progress / Math.max(1, task.target)) * 100,
                    ),
                  ) + '%',
              }"
            />
          </div>
          <div class="flex justify-between text-[10px] text-muted mt-1">
            <span>{{ task.progress }}/{{ task.target }}</span>
            <span>{{ rewardText(task.reward) }}</span>
          </div>
          <button
            class="mini-btn mt-2"
            :disabled="!task.done || task.claimed"
            @click="claimWeekly(task.id)"
          >
            {{ task.claimed ? "已领" : task.done ? "领取" : "进行中" }}
          </button>
        </div>
      </div>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">月度修行令</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            在周修行令之上增加月目标，把每日、镇魔、宗门建设和奇遇串成更长周期。
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl">🎫</p>
          <p class="text-[10px] text-muted">{{ longTerm.monthKeyNow }}</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="task in longTerm.seasonTasks"
          :key="task.id"
          class="reward-card"
          :class="task.claimed ? 'claimed' : task.done ? 'ready' : ''"
        >
          <p class="text-sm text-accent">{{ task.title }}</p>
          <p class="text-[10px] text-muted mt-1">{{ task.desc }}</p>
          <div
            class="mt-2 h-2 bg-bg border border-accent/20 rounded-xs overflow-hidden"
          >
            <div
              class="h-full bg-accent"
              :style="{
                width:
                  Math.min(
                    100,
                    Math.floor(
                      (task.progress / Math.max(1, task.target)) * 100,
                    ),
                  ) + '%',
              }"
            />
          </div>
          <div class="flex justify-between text-[10px] text-muted mt-1">
            <span>{{ task.progress }}/{{ task.target }}</span
            ><span>{{ longTerm.rewardText(task.reward) }}</span>
          </div>
          <button
            class="mini-btn mt-2"
            :disabled="!task.done || task.claimed"
            @click="claimSeason(task.id)"
          >
            {{ task.claimed ? "已领" : task.done ? "领取" : "进行中" }}
          </button>
        </div>
      </div>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">闭关归来</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            离线多日后回归，可领取一次闭关归来礼包，降低流失后的回坑成本。
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl">🌙</p>
          <p class="text-[10px] text-muted">离线 {{ longTerm.daysAway }} 日</p>
        </div>
      </div>
      <button
        class="btn justify-center w-full"
        :disabled="!longTerm.canClaimReturnGift"
        @click="claimReturnGift"
      >
        {{
          longTerm.canClaimReturnGift ? "领取闭关归来礼包" : "暂未触发回流礼包"
        }}
      </button>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">奇遇链</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            奇遇升级为连续剧情：选择会留下旗标，影响后续奖励与隐藏结局，并与宗门、瀚海和秘境材料联动。
          </p>
        </div>
        <div class="text-4xl">🧭</div>
      </div>
      <div v-if="longTerm.currentAdventure" class="reward-card ready">
        <p class="text-sm text-accent">
          {{ longTerm.currentAdventure.title }}
          <span class="text-[10px] text-muted"
            >第{{ longTerm.currentAdventure.stage }}段 ·
            {{ longTerm.currentAdventure.arc }}</span
          >
        </p>
        <p class="text-xs text-muted mt-1 leading-relaxed">
          {{ longTerm.currentAdventure.desc }}
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <button
            v-for="choice in longTerm.currentAdventure.choices"
            :key="choice.id"
            class="mini-btn"
            @click="finishAdventure(choice.id)"
          >
            {{ choice.label }} · {{ longTerm.rewardText(choice.reward) }}
          </button>
        </div>
      </div>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-accent text-lg">七日豪礼</h2>
          <p class="text-xs text-muted leading-relaxed mt-1">
            新角色前七个游戏日逐步解锁，给新手一个明确的第7日目标。
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl">📅</p>
          <p class="text-[10px] text-muted">
            当前第 {{ retention.installDayIndex }} 日
          </p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-7 gap-2">
        <div
          v-for="gift in retention.sevenDayGifts"
          :key="gift.day"
          class="reward-card"
          :class="gift.claimed ? 'claimed' : gift.unlocked ? 'ready' : ''"
        >
          <p class="text-sm text-accent">第{{ gift.day }}日</p>
          <p class="text-xs font-bold mt-1">
            {{ gift.title.replace(/^第\d日：/, "") }}
          </p>
          <p class="text-[10px] text-muted mt-1 leading-relaxed">
            {{ gift.desc }}
          </p>
          <p class="text-[10px] text-muted mt-2">
            {{ rewardText(gift.reward) }}
          </p>
          <button
            class="mini-btn mt-2"
            :disabled="!gift.unlocked || gift.claimed"
            @click="claimSeven(gift.day)"
          >
            {{ gift.claimed ? "已领" : gift.unlocked ? "领取" : "未解锁" }}
          </button>
        </div>
      </div>
    </section>

    <section class="event-hero game-panel space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-lg text-accent font-bold">全服镇魔</p>
          <p class="text-sm text-muted leading-relaxed mt-1">
            山外妖魔躁动，全服玩家的秘境/登塔进度会汇入讨伐进度。个人击败怪物也有每日阶段奖励。
          </p>
        </div>
        <div class="text-4xl">🐺</div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div class="event-stat">
          <span>全服状态</span><b>{{ worldBoss.statusText }}</b>
        </div>
        <div class="event-stat">
          <span>全服贡献</span
          ><b>{{ worldBoss.progress }}/{{ worldBoss.target }}</b>
        </div>
        <div class="event-stat">
          <span>参与人数</span><b>{{ worldBoss.participants }}</b>
        </div>
        <div class="event-stat">
          <span>个人讨伐</span><b>{{ retention.yaochaoPersonalKills }}</b>
        </div>
        <div class="event-stat">
          <span>本期战报</span><b>{{ worldBoss.cycleKey }}</b>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between text-xs text-muted">
          <span>全服镇妖进度</span>
          <span>{{ worldBossPercent }}%</span>
        </div>
        <div
          class="h-3 bg-bg border border-accent/20 rounded-xs overflow-hidden"
        >
          <div
            class="h-full bg-red-500 transition-all"
            :style="{ width: worldBossPercent + '%' }"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div
          v-for="reward in retention.yaochaoRewards"
          :key="reward.score"
          class="reward-card"
          :class="reward.claimed ? 'claimed' : reward.done ? 'ready' : ''"
        >
          <p class="text-sm text-accent">{{ reward.title }}</p>
          <p class="text-[10px] text-muted mt-1">{{ reward.desc }}</p>
          <p class="text-[10px] text-muted mt-2">
            {{ rewardText(reward.reward) }}
          </p>
          <button
            class="mini-btn mt-2"
            :disabled="!reward.done || reward.claimed"
            @click="claimYaochao(reward.score)"
          >
            {{ reward.claimed ? "已领" : reward.done ? "领取" : "讨伐不足" }}
          </button>
        </div>
      </div>

      <div class="reward-card ready space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-accent">镇魔周期战报</p>
            <p class="text-[10px] text-muted mt-1">
              本期按个人镇魔贡献生成镇魔司邮件奖励。邮件只发放一次，奖励需到邮箱领取。
            </p>
          </div>
          <span class="text-xs text-muted">{{ worldBoss.cycleKey }}</span>
        </div>
        <div
          class="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-muted"
        >
          <span>评级：{{ cyclePreview.tier }}</span>
          <span>铜钱：{{ cyclePreview.rewards.money }}</span>
          <span>灵石：{{ cyclePreview.rewards.spiritStone }}</span>
          <span>灵气：{{ cyclePreview.rewards.aura }}</span>
        </div>
        <button
          class="mini-btn"
          :disabled="cycleClaiming || retention.yaochaoPersonalKills <= 0"
          @click="claimWorldBossCycle"
        >
          {{
            cycleClaiming
              ? "结算中..."
              : retention.yaochaoPersonalKills > 0
                ? "领取本期结算邮件"
                : "暂无贡献"
          }}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div
          v-for="tier in longTerm.worldBossTiers"
          :key="tier.score"
          class="reward-card"
          :class="tier.claimed ? 'claimed' : tier.done ? 'ready' : ''"
        >
          <p class="text-sm text-accent">{{ tier.title }}</p>
          <p class="text-[10px] text-muted mt-1">{{ tier.desc }}</p>
          <p class="text-[10px] text-muted mt-2">
            {{ longTerm.rewardText(tier.reward) }}
          </p>
          <button
            class="mini-btn mt-2"
            :disabled="!tier.done || tier.claimed"
            @click="claimWorldBoss(tier.score)"
          >
            {{ tier.claimed ? "已领" : tier.done ? "领取" : "贡献不足" }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button class="btn justify-center" @click="goCombat">
          前往秘境讨伐
        </button>
        <button class="btn justify-center" @click="loadWorldBoss">
          刷新全服进度
        </button>
      </div>
    </section>

    <section class="game-panel space-y-2">
      <h2 class="text-accent">活动说明</h2>
      <ul
        class="text-xs text-muted list-disc list-inside space-y-1 leading-relaxed"
      >
        <li>每日活跃度基于修行志每日目标，活跃宝箱每天按游戏日刷新。</li>
        <li>
          七日豪礼按当前存档的游戏日推进，新老存档都会从首次进入新版活动中心开始计算。
        </li>
        <li>
          全服镇魔现在包含个人贡献档位与周期战报，可按本期贡献发放镇魔司邮件奖励。
        </li>
        <li>
          月度修行令、闭关归来和奇遇链均保存到本地/云存档，旧存档自动兼容。
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useRetentionStore } from "@/stores/useRetentionStore";
import { useLongTermStore } from "@/stores/useLongTermStore";
import { useSaveStore } from "@/stores/useSaveStore";
import { addLog, showFloat } from "@/composables/useGameLog";

const router = useRouter();
const retention = useRetentionStore();
const longTerm = useLongTermStore();
const saveStore = useSaveStore();
function accountToken() {
  return (
    localStorage.getItem("taoyuan_account_token") ||
    localStorage.getItem("taoyuan_token") ||
    ""
  );
}

const worldBoss = reactive({
  progress: 0,
  target: 300,
  participants: 0,
  statusText: "统计中",
  cycleKey: "本周",
});
const cycleClaiming = ref(false);
const worldBossPercent = computed(() =>
  Math.min(
    100,
    Math.floor((worldBoss.progress / Math.max(1, worldBoss.target)) * 100),
  ),
);

function rewardText(reward: any): string {
  const parts: string[] = [];
  if (reward.money) parts.push(`铜钱+${reward.money}`);
  if (reward.aura) parts.push(`灵气+${reward.aura}`);
  if (reward.spiritStone) parts.push(`灵石×${reward.spiritStone}`);
  if (reward.items)
    parts.push(
      ...reward.items.map(
        (item: any) => `${item.name || item.itemId}×${item.quantity}`,
      ),
    );
  if (reward.attributeExp)
    parts.push(
      "资质经验+" +
        Object.values(reward.attributeExp).reduce(
          (a: number, b: any) => a + (Number(b) || 0),
          0,
        ),
    );
  return parts.join(" / ");
}

function persist() {
  const slot =
    saveStore.activeSlot >= 0
      ? saveStore.activeSlot
      : saveStore.assignNewSlot();
  if (slot >= 0) saveStore.saveToSlot(slot);
}

function handleClaim(res: { success: boolean; message: string }) {
  addLog(res.message);
  showFloat(res.message, res.success ? "success" : "danger");
  if (res.success) persist();
}

function claimActivity(score: number) {
  const res = retention.claimActivityBox(score);
  if (res.success) longTerm.recordDailyClaim();
  handleClaim(res);
}
function claimSeven(day: number) {
  handleClaim(retention.claimSevenDayGift(day));
}
function claimStreak(day: number) {
  handleClaim(retention.claimStreakGift(day));
}
function claimWeekly(taskId: string) {
  handleClaim(retention.claimWeeklyTask(taskId));
}
function claimWorldStory(id: string) {
  handleClaim(retention.claimWorldStoryChapter(id));
}
function claimSeasonalEvent(id: string) {
  handleClaim(retention.claimSeasonalEvent(id));
}
function claimYaochao(score: number) {
  const res = retention.claimYaochaoReward(score);
  if (res.success) longTerm.recordCombatContribution(score);
  handleClaim(res);
}

const cyclePreview = computed(() => {
  const score = retention.yaochaoPersonalKills;
  const globalBonus =
    worldBoss.progress >= worldBoss.target
      ? 1.25
      : worldBoss.progress >= worldBoss.target * 0.6
        ? 1.1
        : 1;
  const base =
    score >= 120
      ? { tier: "镇魔功臣", money: 6800, spiritStone: 36, aura: 1200 }
      : score >= 60
        ? { tier: "伏魔主力", money: 3600, spiritStone: 20, aura: 640 }
        : score >= 20
          ? { tier: "镇魔先锋", money: 1800, spiritStone: 10, aura: 280 }
          : { tier: "参与奖", money: 800, spiritStone: 4, aura: 120 };
  return {
    tier: base.tier,
    rewards: {
      money: Math.floor(base.money * globalBonus),
      spiritStone: Math.floor(base.spiritStone * globalBonus),
      aura: Math.floor(base.aura * globalBonus),
    },
  };
});

async function claimWorldBossCycle() {
  if (cycleClaiming.value) return;
  cycleClaiming.value = true;
  try {
    const playerName =
      saveStore.getSlots().find((s) => s.slot === saveStore.activeSlot)
        ?.playerName || "";
    const token = accountToken();
    if (!token) throw new Error("请先登录账号后再领取结算邮件");
    const res = await fetch("/api/events/world-boss/claim-cycle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        playerName,
        personalScore: retention.yaochaoPersonalKills,
        globalProgress: worldBoss.progress,
        globalTarget: worldBoss.target,
        participants: worldBoss.participants,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "结算失败");
    addLog(`镇魔司已发放结算邮件：${data.tier}`);
    showFloat("镇魔结算邮件已发放，请到邮箱领取", "success");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "结算失败";
    addLog(msg);
    showFloat(msg, "danger");
  } finally {
    cycleClaiming.value = false;
  }
}

function claimWorldBoss(score: number) {
  handleClaim(longTerm.claimWorldBossTier(score));
}
function claimSeason(id: string) {
  handleClaim(longTerm.claimSeasonTask(id));
}
function claimReturnGift() {
  handleClaim(longTerm.claimReturnGift());
}
function finishAdventure(choiceId: string) {
  handleClaim(longTerm.finishAdventure(choiceId));
}
function goCombat() {
  router.push("/game/combat");
}
function goQuest() {
  router.push("/game/quest");
}

async function loadWorldBoss() {
  try {
    const res = await fetch("/api/events/world-boss");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "load failed");
    worldBoss.progress = Number(data.progress || 0);
    worldBoss.target = Number(data.target || 300);
    worldBoss.participants = Number(data.participants || 0);
    worldBoss.statusText =
      data.statusText ||
      (worldBoss.progress >= worldBoss.target ? "已镇压" : "进行中");
    worldBoss.cycleKey = data.cycleKey || "本周";
  } catch {
    worldBoss.statusText = "本地进行中";
    worldBoss.progress = retention.yaochaoPersonalKills;
    worldBoss.target = 30;
    worldBoss.participants = 1;
    worldBoss.cycleKey = "本地";
  }
}

onMounted(loadWorldBoss);
</script>

<style scoped>
.event-hero {
  border-color: rgba(239, 68, 68, 0.35);
  background: linear-gradient(
    135deg,
    rgba(127, 29, 29, 0.18),
    rgba(24, 24, 27, 0.72)
  );
}
.event-stat {
  border: 1px solid rgba(200, 164, 92, 0.22);
  background: rgba(0, 0, 0, 0.18);
  padding: 8px;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.event-stat span {
  color: var(--muted);
}
.event-stat b {
  color: var(--accent);
  font-weight: 600;
}
.reward-card {
  border: 1px solid rgba(200, 164, 92, 0.18);
  background: rgba(0, 0, 0, 0.16);
  padding: 10px;
  border-radius: 2px;
}
.reward-card.ready {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.08);
}
.reward-card.claimed {
  opacity: 0.68;
  border-color: rgba(200, 164, 92, 0.1);
}
.mini-btn {
  width: 100%;
  border: 1px solid rgba(200, 164, 92, 0.35);
  color: var(--accent);
  padding: 4px 8px;
  border-radius: 2px;
  font-size: 11px;
}
.mini-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mini-btn:not(:disabled) {
  background: var(--accent);
  color: var(--bg);
}
</style>
