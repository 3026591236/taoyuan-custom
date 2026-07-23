<template>
  <Transition name="panel-fade">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      @click.self="$emit('close')"
    >
      <div class="game-panel w-full max-w-xs text-center relative">
        <button
          class="absolute top-2 right-2 text-muted hover:text-text"
          @click="$emit('close')"
        >
          <X :size="14" />
        </button>
        <Divider title class="my-4" label="设置" />
        <!-- 分类导航 -->
        <div class="grid grid-cols-3 justify-center gap-1 mb-3">
          <button
            v-for="tab in SETTINGS_TABS"
            :key="tab.key"
            class="text-xs py-1 px-3 border rounded-xs transition-colors"
            :class="
              activeTab === tab.key
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-accent/20 text-muted hover:text-text'
            "
            @click="activeTab = tab.key"
          >
            <component
              :is="tab.icon"
              :size="12"
              class="inline-block align-[-2px] mr-1"
            />
            {{ tab.label }}
          </button>
        </div>

        <div class="flex flex-col space-y-3">
          <!-- ===== 通用 ===== -->
          <template v-if="activeTab === 'general'">
            <div class="max-h-[40vh] overflow-y-auto">
              <!-- 时间控制 -->
              <div class="border border-accent/20 rounded-xs p-3 mr-1 mb-2">
                <p class="text-xs text-muted mb-2">时间控制</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button
                    :icon="isPaused ? Play : Pause"
                    :icon-size="12"
                    class="py-1 px-3"
                    @click="togglePause"
                  >
                    {{ isPaused ? "继续" : "暂停" }}
                  </Button>
                  <Button class="py-1 px-3" @click="cycleSpeed"
                    >速度 {{ gameSpeed }}×</Button
                  >
                </div>
              </div>

              <!-- 音频控制 -->
              <div class="border border-accent/20 rounded-xs p-3 mr-1 mb-2">
                <p class="text-xs text-muted mb-2">音频</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button
                    :icon="sfxEnabled ? Volume2 : VolumeX"
                    :icon-size="12"
                    class="py-1 px-3"
                    @click="toggleSfx"
                    >音效</Button
                  >
                  <Button
                    :icon="bgmEnabled ? Headphones : HeadphoneOff"
                    :icon-size="12"
                    class="py-1 px-3"
                    @click="toggleBgm"
                    >音乐</Button
                  >
                </div>
              </div>

              <!-- 新手提示 -->
              <div class="border border-accent/20 rounded-xs p-3 mr-1 mb-2">
                <p class="text-xs text-muted mb-2">新手提示</p>
                <p class="text-[10px] text-muted/50 mb-2">
                  陆镇岳的晨间建议和面板引导文字
                </p>
                <div class="flex items-center justify-center space-x-2">
                  <Button
                    class="py-1 px-3"
                    :class="{ '!bg-accent !text-bg': tutorialStore.enabled }"
                    @click="tutorialStore.enabled = true"
                  >
                    开
                  </Button>
                  <Button
                    class="py-1 px-3"
                    :class="{ '!bg-accent !text-bg': !tutorialStore.enabled }"
                    @click="tutorialStore.enabled = false"
                  >
                    关
                  </Button>
                </div>
              </div>

              <div class="border border-accent/20 rounded-xs p-3 mr-1">
                <p class="text-xs text-accent mb-1">服务器实时存档</p>
                <p class="text-[10px] text-muted leading-relaxed">
                  登录角色后，游戏数据变化会立即保存到服务器。旧 WebDAV
                  与手动云端上传、下载方式即将弃用，无需再连接第三方云盘。
                </p>
              </div>
            </div>
          </template>

          <!-- ===== 外观 ===== -->
          <template v-if="activeTab === 'display'">
            <!-- 字体大小 -->
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-xs text-muted mb-2">字体大小</p>
              <div class="flex items-center justify-center space-x-3">
                <Button
                  class="py-1 px-3"
                  :icon="Minus"
                  :icon-size="12"
                  :disabled="settingsStore.fontSize <= 12"
                  @click="settingsStore.changeFontSize(-1)"
                />
                <span class="text-sm w-8 text-center">{{
                  settingsStore.fontSize
                }}</span>
                <Button
                  class="py-1 px-3"
                  :icon="Plus"
                  :icon-size="12"
                  :disabled="settingsStore.fontSize >= 24"
                  @click="settingsStore.changeFontSize(1)"
                />
              </div>
            </div>

            <!-- 配色主题 -->
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-xs text-muted mb-2">配色主题</p>
              <div class="flex items-center justify-center space-x-2">
                <button
                  v-for="t in THEMES"
                  :key="t.key"
                  class="w-8 h-8 border rounded-xs flex items-center justify-center text-[10px] transition-colors"
                  :class="
                    settingsStore.theme === t.key
                      ? 'border-accent'
                      : 'border-accent/20'
                  "
                  :style="{ backgroundColor: t.bg, color: t.text }"
                  :title="t.name"
                  @click="settingsStore.changeTheme(t.key)"
                >
                  {{ t.name.charAt(0) }}
                </button>
              </div>
            </div>
          </template>

          <!-- ===== 通知 ===== -->
          <template v-if="activeTab === 'notification'">
            <div class="max-h-[40vh] overflow-y-auto flex flex-col space-y-3">
              <!-- 通知位置 -->
              <div class="border border-accent/20 rounded-xs p-3 mr-1">
                <p class="text-xs text-muted mb-2">弹出位置</p>
                <div class="grid grid-cols-3 gap-1 w-24 mx-auto">
                  <button
                    v-for="pos in QMSG_POSITIONS"
                    :key="pos.value"
                    class="w-8 h-6 border rounded-xs transition-colors flex items-center justify-center"
                    :class="
                      settingsStore.qmsgPosition === pos.value
                        ? 'border-accent bg-accent/20 text-accent'
                        : 'border-accent/20 text-muted'
                    "
                    :title="pos.label"
                    @click="settingsStore.changeQmsgPosition(pos.value)"
                  >
                    <component :is="pos.icon" :size="10" />
                  </button>
                </div>
              </div>

              <!-- 持续时间 -->
              <div class="border border-accent/20 rounded-xs p-3 mr-1">
                <p class="text-xs text-muted mb-2">持续时间</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button
                    class="py-0 px-1.5"
                    :icon="Minus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgTimeout <= 500"
                    @click="changeTimeout(-500)"
                  />
                  <span class="text-xs w-12 text-center"
                    >{{ (settingsStore.qmsgTimeout / 1000).toFixed(1) }}s</span
                  >
                  <Button
                    class="py-0 px-1.5"
                    :icon="Plus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgTimeout >= 10000"
                    @click="changeTimeout(500)"
                  />
                </div>
              </div>

              <!-- 最大数量 -->
              <div class="border border-accent/20 rounded-xs p-3 mr-1">
                <p class="text-xs text-muted mb-2">最大数量</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button
                    class="py-0 px-1.5"
                    :icon="Minus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgMaxNums <= 1"
                    @click="changeMaxNums(-1)"
                  />
                  <span class="text-xs w-6 text-center">{{
                    settingsStore.qmsgMaxNums
                  }}</span>
                  <Button
                    class="py-0 px-1.5"
                    :icon="Plus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgMaxNums >= 20"
                    @click="changeMaxNums(1)"
                  />
                </div>
              </div>

              <!-- 宽度限制 -->
              <div class="border border-accent/20 rounded-xs p-3 mr-1">
                <p class="text-xs text-muted mb-2">限制宽度</p>
                <div class="flex items-center justify-center space-x-1 mb-2">
                  <Button
                    class="py-0 px-2"
                    :class="
                      settingsStore.qmsgIsLimitWidth
                        ? '!bg-accent/20 !text-accent !border-accent'
                        : ''
                    "
                    @click="setBool('qmsgIsLimitWidth', true)"
                  >
                    开
                  </Button>
                  <Button
                    class="py-0 px-2"
                    :class="
                      !settingsStore.qmsgIsLimitWidth
                        ? '!bg-accent/20 !text-accent !border-accent'
                        : ''
                    "
                    @click="setBool('qmsgIsLimitWidth', false)"
                  >
                    关
                  </Button>
                </div>
                <template v-if="settingsStore.qmsgIsLimitWidth">
                  <p class="text-xs text-muted mb-2">宽度(px)</p>
                  <div class="flex items-center justify-center space-x-2 mb-2">
                    <Button
                      class="py-0 px-1.5"
                      :icon="Minus"
                      :icon-size="10"
                      :disabled="settingsStore.qmsgLimitWidthNum <= 100"
                      @click="changeLimitWidth(-50)"
                    />
                    <span class="text-xs w-10 text-center">{{
                      settingsStore.qmsgLimitWidthNum
                    }}</span>
                    <Button
                      class="py-0 px-1.5"
                      :icon="Plus"
                      :icon-size="10"
                      :disabled="settingsStore.qmsgLimitWidthNum >= 800"
                      @click="changeLimitWidth(50)"
                    />
                  </div>
                  <p class="text-xs text-muted mb-2">超出处理</p>
                  <div class="flex items-center justify-center space-x-1">
                    <Button
                      v-for="opt in WRAP_OPTIONS"
                      :key="opt.value"
                      class="!text-[10px] py-0 px-1.5"
                      :class="
                        settingsStore.qmsgLimitWidthWrap === opt.value
                          ? '!bg-accent/20 !text-accent !border-accent'
                          : ''
                      "
                      @click="changeWrap(opt.value)"
                    >
                      {{ opt.label }}
                    </Button>
                  </div>
                </template>
              </div>

              <!-- 开关选项 -->
              <div
                class="border border-accent/20 rounded-xs p-3 mr-1 flex flex-col space-y-2"
              >
                <div
                  v-for="opt in TOGGLE_OPTIONS"
                  :key="opt.key"
                  class="flex flex-col items-center space-y-1"
                >
                  <span class="text-xs text-muted">{{ opt.label }}</span>
                  <div class="flex items-center space-x-1">
                    <Button
                      class="py-0 px-2"
                      :class="
                        settingsStore[opt.key]
                          ? '!bg-accent/20 !text-accent !border-accent'
                          : ''
                      "
                      @click="setBool(opt.key, true)"
                    >
                      开
                    </Button>
                    <Button
                      class="py-0 px-2"
                      :class="
                        !settingsStore[opt.key]
                          ? '!bg-accent/20 !text-accent !border-accent'
                          : ''
                      "
                      @click="setBool(opt.key, false)"
                    >
                      关
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ===== 反馈 ===== -->
        <template v-if="activeTab === 'feedback'">
          <div class="max-h-[55vh] overflow-y-auto flex flex-col space-y-3">
            <div class="grid grid-cols-2 gap-1 mr-1">
              <button
                class="py-1.5 border rounded-xs text-xs transition-colors"
                :class="
                  feedbackPanel === 'submit'
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-accent/20 text-muted'
                "
                @click="feedbackPanel = 'submit'"
              >
                提交反馈
              </button>
              <button
                class="py-1.5 border rounded-xs text-xs transition-colors"
                :class="
                  feedbackPanel === 'mine'
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-accent/20 text-muted'
                "
                @click="openMyFeedbacks"
              >
                我的反馈
              </button>
            </div>

            <div
              v-if="feedbackPanel === 'submit'"
              class="border border-accent/20 rounded-xs p-3 mr-1"
            >
              <p class="text-xs text-muted mb-2">提交反馈</p>
              <div class="flex space-x-2 mb-3">
                <button
                  v-for="cat in FEEDBACK_CATEGORIES"
                  :key="cat.key"
                  class="flex-1 py-2 px-1 border rounded-xs text-xs transition-colors"
                  :class="
                    feedbackCategory === cat.key
                      ? 'border-accent bg-accent/20 text-accent'
                      : 'border-accent/20 text-muted hover:text-text'
                  "
                  @click="feedbackCategory = cat.key"
                >
                  <component
                    :is="cat.icon"
                    :size="14"
                    class="block mx-auto mb-1"
                  />
                  {{ cat.label }}
                </button>
              </div>
              <div class="flex flex-col space-y-2">
                <div>
                  <label class="text-[10px] text-muted mb-0.5 block"
                    >标题</label
                  >
                  <input
                    v-model="feedbackTitle"
                    placeholder="简要描述你的反馈"
                    maxlength="100"
                    class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors"
                  />
                </div>
                <div>
                  <label class="text-[10px] text-muted mb-0.5 block"
                    >详细内容</label
                  >
                  <textarea
                    v-model="feedbackContent"
                    placeholder="请详细描述..."
                    maxlength="2000"
                    rows="4"
                    class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors resize-none"
                  ></textarea>
                </div>
                <Button
                  class="py-1 px-3 w-full justify-center"
                  :disabled="
                    feedbackBusy ||
                    !feedbackTitle.trim() ||
                    !feedbackContent.trim()
                  "
                  @click="submitFeedback"
                >
                  {{ feedbackBusy ? "提交中..." : "提交反馈" }}
                </Button>
                <p
                  v-if="feedbackMsg"
                  class="text-xs text-center"
                  :class="feedbackOk ? 'text-success' : 'text-danger'"
                >
                  {{ feedbackMsg }}
                </p>
              </div>
            </div>

            <div
              v-else
              class="border border-accent/20 rounded-xs p-3 mr-1 text-left"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p class="text-xs text-muted">我的反馈</p>
                  <p class="text-[10px] text-muted/60 mt-0.5">
                    仅显示当前登录账号最近 50 条
                  </p>
                </div>
                <Button
                  class="py-1 px-2 text-[10px]"
                  :disabled="myFeedbacksBusy"
                  @click="loadMyFeedbacks"
                >
                  {{ myFeedbacksBusy ? "刷新中..." : "刷新" }}
                </Button>
              </div>
              <p
                v-if="!accountToken()"
                class="text-xs text-muted py-4 text-center"
              >
                请先登录账号后查看反馈记录。
              </p>
              <p
                v-else-if="myFeedbacksError"
                class="text-xs text-danger py-3 text-center"
              >
                {{ myFeedbacksError }}
              </p>
              <p
                v-else-if="myFeedbacksBusy && !myFeedbacks.length"
                class="text-xs text-muted py-4 text-center"
              >
                正在加载...
              </p>
              <p
                v-else-if="!myFeedbacks.length"
                class="text-xs text-muted py-4 text-center"
              >
                还没有提交过反馈。
              </p>
              <div v-else class="space-y-2">
                <details
                  v-for="item in myFeedbacks"
                  :key="item.id"
                  class="border border-accent/15 rounded-xs p-2"
                >
                  <summary class="cursor-pointer list-none">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-xs text-text truncate">
                          {{ item.title }}
                        </p>
                        <p class="text-[10px] text-muted mt-0.5">
                          {{ feedbackCategoryLabel(item.category) }} ·
                          {{ formatFeedbackTime(item.createdAt) }}
                        </p>
                      </div>
                      <span
                        class="shrink-0 px-1.5 py-0.5 rounded-xs text-[10px]"
                        :class="feedbackStatusClass(item.status)"
                        >{{ feedbackStatusLabel(item.status) }}</span
                      >
                    </div>
                    <p
                      class="text-[10px] text-muted/70 mt-1 line-clamp-2 whitespace-pre-wrap"
                    >
                      {{ item.content }}
                    </p>
                  </summary>
                  <div class="mt-2 pt-2 border-t border-accent/10">
                    <p class="text-xs whitespace-pre-wrap break-words">
                      {{ item.content }}
                    </p>
                    <div
                      v-if="item.adminReply"
                      class="mt-2 p-2 bg-accent/10 rounded-xs"
                    >
                      <p class="text-[10px] text-accent mb-1">处理回复</p>
                      <p class="text-xs whitespace-pre-wrap">
                        {{ item.adminReply }}
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </template>

        <!-- 全局底部操作 -->
        <div class="grid grid-cols-2 gap-2 mt-3">
          <Button
            :icon="Home"
            :icon-size="12"
            class="py-1 px-3 w-full justify-center"
            @click="goHome"
          >
            首页
          </Button>
          <Button
            :icon="FolderOpen"
            :icon-size="12"
            class="py-1 px-3 w-full justify-center"
            @click="showSaveManager = true"
          >
            存档管理
          </Button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 存档管理弹窗 -->
  <Transition name="panel-fade">
    <SaveManager v-if="showSaveManager" @close="showSaveManager = false" />
  </Transition>
</template>

<script setup lang="ts">
import { ref, type Component } from "vue";
import {
  X,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Headphones,
  HeadphoneOff,
  FolderOpen,
  Home,
  Minus,
  Plus,
  ArrowUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  Circle,
  ArrowRight,
  ArrowDownLeft,
  ArrowDown,
  ArrowDownRight,
  Settings,
  Palette,
  Bell,
  Bug,
  Lightbulb,
  MessageSquare,
} from "lucide-vue-next";
import Button from "@/components/game/Button.vue";
import Divider from "@/components/game/Divider.vue";
import { useAudio } from "@/composables/useAudio";
import { useGameClock } from "@/composables/useGameClock";
import {
  useSettingsStore,
  type QmsgPosition,
  type QmsgLimitWidthWrap,
} from "@/stores/useSettingsStore";
import { useTutorialStore } from "@/stores/useTutorialStore";
import { THEMES } from "@/data/themes";
import SaveManager from "@/components/game/SaveManager.vue";

type SettingsTab = "general" | "display" | "notification" | "feedback";

type BoolSettingKey =
  | "qmsgIsLimitWidth"
  | "qmsgAnimation"
  | "qmsgAutoClose"
  | "qmsgShowClose"
  | "qmsgShowIcon"
  | "qmsgShowReverse";

const SETTINGS_TABS: { key: SettingsTab; label: string; icon: Component }[] = [
  { key: "general", label: "通用", icon: Settings },
  { key: "display", label: "外观", icon: Palette },
  { key: "notification", label: "通知", icon: Bell },
  { key: "feedback", label: "反馈", icon: MessageSquare },
];

const QMSG_POSITIONS: {
  value: QmsgPosition;
  label: string;
  icon: Component;
}[] = [
  { value: "topleft", label: "左上", icon: ArrowUpLeft },
  { value: "top", label: "上", icon: ArrowUp },
  { value: "topright", label: "右上", icon: ArrowUpRight },
  { value: "left", label: "左", icon: ArrowLeft },
  { value: "center", label: "中", icon: Circle },
  { value: "right", label: "右", icon: ArrowRight },
  { value: "bottomleft", label: "左下", icon: ArrowDownLeft },
  { value: "bottom", label: "下", icon: ArrowDown },
  { value: "bottomright", label: "右下", icon: ArrowDownRight },
];

const WRAP_OPTIONS: { value: QmsgLimitWidthWrap; label: string }[] = [
  { value: "no-wrap", label: "不处理" },
  { value: "wrap", label: "换行" },
  { value: "ellipsis", label: "省略号" },
];

const TOGGLE_OPTIONS: { key: BoolSettingKey; label: string }[] = [
  { key: "qmsgAnimation", label: "弹出动画" },
  { key: "qmsgAutoClose", label: "自动关闭" },
  { key: "qmsgShowClose", label: "显示关闭图标" },
  { key: "qmsgShowIcon", label: "显示左侧图标" },
  { key: "qmsgShowReverse", label: "弹出方向逆反" },
];

import { useRouter } from "vue-router";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const router = useRouter();

const goHome = () => {
  emit("close");
  void router.push("/");
};

const activeTab = ref<SettingsTab>("general");
const { sfxEnabled, bgmEnabled, toggleSfx, toggleBgm } = useAudio();
const { isPaused, gameSpeed, togglePause, cycleSpeed } = useGameClock();
const settingsStore = useSettingsStore();
const tutorialStore = useTutorialStore();

const showSaveManager = ref(false);
const FEEDBACK_CATEGORIES: { key: string; label: string; icon: Component }[] = [
  { key: "feature", label: "功能建议", icon: Lightbulb },
  { key: "bug", label: "BUG反馈", icon: Bug },
  { key: "suggestion", label: "意见提交", icon: MessageSquare },
];
const feedbackCategory = ref("feature");
const feedbackTitle = ref("");
const feedbackContent = ref("");
const feedbackBusy = ref(false);
const feedbackMsg = ref("");
const feedbackOk = ref(false);
const feedbackPanel = ref<"submit" | "mine">("submit");
type MyFeedback = {
  id: number | string;
  category: string;
  title: string;
  content: string;
  status: string;
  adminReply?: string | null;
  createdAt: string;
};
const myFeedbacks = ref<MyFeedback[]>([]);
const myFeedbacksBusy = ref(false);
const myFeedbacksError = ref("");
const accountToken = () =>
  localStorage.getItem("taoyuan_account_token") ||
  localStorage.getItem("taoyuan_token") ||
  "";
const playerName = () => {
  try {
    const d: any = JSON.parse(localStorage.getItem("taoyuan_data_0") || "{}");
    return d.player?.playerName || d.playerName || "";
  } catch {
    return "";
  }
};

const feedbackCategoryLabel = (category: string) =>
  category === "feature"
    ? "功能建议"
    : category === "bug"
      ? "BUG反馈"
      : "意见提交";
const feedbackStatusLabel = (status: string) =>
  status === "resolved"
    ? "已解决"
    : status === "closed"
      ? "已关闭"
      : status === "read" || status === "reviewed" || status === "processing"
        ? "已查看"
        : "待查看";
const feedbackStatusClass = (status: string) =>
  status === "resolved"
    ? "bg-success/15 text-success"
    : status === "closed"
      ? "bg-muted/15 text-muted"
      : status === "read" || status === "reviewed" || status === "processing"
        ? "bg-accent/15 text-accent"
        : "bg-yellow-400/15 text-yellow-400";
const formatFeedbackTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "未知时间"
    : date.toLocaleString();
};
const loadMyFeedbacks = async () => {
  const t = accountToken();
  if (!t) {
    myFeedbacks.value = [];
    myFeedbacksError.value = "";
    return;
  }
  myFeedbacksBusy.value = true;
  myFeedbacksError.value = "";
  try {
    const res = await fetch("/api/feedbacks?limit=50", {
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "加载失败");
    myFeedbacks.value = Array.isArray(data.feedbacks) ? data.feedbacks : [];
  } catch (error) {
    myFeedbacksError.value =
      error instanceof Error ? error.message : "加载失败，请稍后重试。";
  } finally {
    myFeedbacksBusy.value = false;
  }
};
const openMyFeedbacks = () => {
  feedbackPanel.value = "mine";
  void loadMyFeedbacks();
};

const submitFeedback = async () => {
  if (feedbackBusy.value) return;
  feedbackBusy.value = true;
  feedbackMsg.value = "";
  try {
    const t = accountToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (t) headers["Authorization"] = "Bearer " + t;
    const res = await fetch("/api/feedbacks", {
      method: "POST",
      headers,
      body: JSON.stringify({
        category: feedbackCategory.value,
        title: feedbackTitle.value.trim(),
        content: feedbackContent.value.trim(),
        playerName: playerName(),
      }),
    });
    if (res.ok) {
      feedbackOk.value = true;
      feedbackMsg.value = "感谢反馈！管理员会尽快查看。";
      feedbackTitle.value = "";
      feedbackContent.value = "";
      feedbackCategory.value = "feature";
      void loadMyFeedbacks();
    } else {
      const d = await res.json().catch(() => ({}));
      feedbackOk.value = false;
      feedbackMsg.value = d.error || "提交失败，请稍后重试。";
    }
  } catch {
    feedbackOk.value = false;
    feedbackMsg.value = "网络错误，请稍后重试。";
  } finally {
    feedbackBusy.value = false;
  }
};

const changeTimeout = (delta: number) => {
  settingsStore.qmsgTimeout = Math.min(
    10000,
    Math.max(500, settingsStore.qmsgTimeout + delta),
  );
  settingsStore.syncQmsgConfig();
};

const changeMaxNums = (delta: number) => {
  settingsStore.qmsgMaxNums = Math.min(
    20,
    Math.max(1, settingsStore.qmsgMaxNums + delta),
  );
  settingsStore.syncQmsgConfig();
};

const changeLimitWidth = (delta: number) => {
  settingsStore.qmsgLimitWidthNum = Math.min(
    800,
    Math.max(100, settingsStore.qmsgLimitWidthNum + delta),
  );
  settingsStore.syncQmsgConfig();
};

const changeWrap = (value: QmsgLimitWidthWrap) => {
  settingsStore.qmsgLimitWidthWrap = value;
  settingsStore.syncQmsgConfig();
};

const setBool = (key: BoolSettingKey, value: boolean) => {
  settingsStore[key] = value;
  settingsStore.syncQmsgConfig();
};
</script>

<style scoped>
.yes-select {
  -webkit-user-select: unset;
  user-select: unset;
  -webkit-touch-callout: unset;
}
</style>
