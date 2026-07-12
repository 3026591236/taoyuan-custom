<template>
  <div class="space-y-3">
    <Divider title label="💬 仙盟传音" />

    <div v-if="!isLoggedIn" class="text-xs text-muted text-center py-4">
      <p>需要登录账号才能参与聊天</p>
      <p class="text-[10px] mt-1">在设置中登录或注册账号</p>
    </div>

    <template v-else>
      <!-- 频道切换 -->
      <div class="flex gap-1 mb-2">
        <button
          v-for="ch in channels"
          :key="ch.key"
          class="btn flex-1 justify-center text-xs"
          :class="{ '!bg-accent !text-bg': activeChannel === ch.key }"
          @click="switchChannel(ch.key)"
        >
          {{ ch.label }}
        </button>
      </div>

      <!-- 在线人数 -->
      <div class="text-[10px] text-muted text-center">
        🌐 世界频道 · {{ messages.length > 0 ? "有新消息" : "暂无消息" }}
      </div>

      <!-- 消息列表 -->
      <div
        ref="chatListRef"
        class="border border-accent/15 rounded-xs p-2 bg-bg/40 max-h-72 overflow-y-auto space-y-1"
        @scroll="onScroll"
      >
        <div
          v-if="loading && messages.length === 0"
          class="text-xs text-muted text-center py-4"
        >
          加载中...
        </div>
        <div
          v-else-if="messages.length === 0"
          class="text-xs text-muted text-center py-4"
        >
          还没有消息，来说点什么吧！
        </div>
        <template v-for="msg in messages" :key="msg.id">
          <div
            class="text-xs leading-relaxed py-0.5"
            :class="msg.isMine ? 'text-right' : ''"
          >
            <template v-if="!msg.isMine">
              <span
                class="text-accent/80 font-bold cursor-pointer hover:text-accent"
                @click="handleNameClick(msg)"
                >{{ msg.fromPlayerName || msg.fromUsername }}</span
              >
              <span
                v-if="msg.fromRealmName"
                class="text-[10px] text-muted/60 ml-0.5"
                >[{{ msg.fromRealmName }}]</span
              >
              <span class="text-muted mx-0.5">:</span>
            </template>
            <span :class="msg.isMine ? 'text-accent/90' : 'text-text/85'">{{
              msg.content
            }}</span>
            <template v-if="msg.isMine">
              <span class="text-muted mx-0.5">:</span>
              <span class="text-accent/80 font-bold">我</span>
            </template>
            <span class="text-[8px] text-muted/40 ml-1">{{
              formatTime(msg.createdAt)
            }}</span>
          </div>
        </template>
      </div>

      <!-- 输入框 -->
      <div class="flex gap-1.5">
        <input
          v-model="inputText"
          class="flex-1 border border-accent/20 rounded-xs px-2.5 py-1.5 text-xs bg-bg/60 text-text placeholder:text-muted/40 outline-none focus:border-accent/40"
          placeholder="说点什么..."
          maxlength="200"
          @keydown.enter="sendMessage"
        />
        <button
          class="btn text-xs shrink-0"
          :disabled="!inputText.trim() || sending"
          @click="sendMessage"
        >
          {{ sending ? "..." : "发送" }}
        </button>
      </div>

      <p class="text-[10px] text-muted/40 text-center">
        文明聊天 · 每条200字以内 · 每10秒5条
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import Divider from "@/components/game/Divider.vue";
import { showFloat } from "@/composables/useGameLog";

const accountToken = () => localStorage.getItem("taoyuan_account_token") || "";

const channels = [{ key: "world", label: "🌍 世界" }];

const activeChannel = ref("world");
const messages = ref<any[]>([]);
const inputText = ref("");
const loading = ref(false);
const sending = ref(false);
const chatListRef = ref<HTMLElement | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastMsgId = 0;
let myUsername = "";

const isLoggedIn = computed(() => !!accountToken());

const authHeaders = (): Record<string, string> => {
  const t = accountToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
};

const switchChannel = (key: string) => {
  activeChannel.value = key;
  lastMsgId = 0;
  messages.value = [];
  fetchMessages();
};

const fetchMessages = async () => {
  if (!isLoggedIn.value) return;
  loading.value = true;
  try {
    const params = new URLSearchParams({
      channel: activeChannel.value,
      limit: "50",
    });
    if (lastMsgId) params.set("after", String(lastMsgId));
    const res = await fetch(`/api/chat?${params}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) return; // silently skip if not logged in
      throw new Error(data.error || "加载失败");
    }
    if (data.messages && data.messages.length) {
      const newMsgs = data.messages.map((m: any) => ({
        ...m,
        isMine: m.fromUsername === myUsername,
      }));
      if (lastMsgId === 0) {
        messages.value = newMsgs;
      } else {
        messages.value = [...messages.value, ...newMsgs];
      }
      lastMsgId = data.messages[data.messages.length - 1].id;
      if (messages.value.length > 200) {
        messages.value = messages.value.slice(-200);
      }
      await nextTick();
      scrollToBottom();
    }
  } catch (e: any) {
    console.error("chat fetch err", e.message);
  } finally {
    loading.value = false;
  }
};

const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text || sending.value) return;
  sending.value = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ channel: activeChannel.value, content: text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "发送失败");
    // Store my username from first successful send
    inputText.value = "";
    await fetchMessages();
  } catch (e: any) {
    showFloat(e.message || "发送失败", "danger");
  } finally {
    sending.value = false;
  }
};

const handleNameClick = (_msg: any) => {
  // Future: open private chat
};

const scrollToBottom = () => {
  const el = chatListRef.value;
  if (el) el.scrollTop = el.scrollHeight;
};

const onScroll = () => {
  // Could load older messages on scroll to top
};

const formatTime = (t: string) => {
  if (!t) return "";
  const d = new Date(t);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Get my username for highlighting own messages
const fetchMyInfo = async () => {
  try {
    const res = await fetch("/api/me", { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.user) myUsername = data.user.username;
  } catch {}
};

onMounted(() => {
  fetchMyInfo();
  fetchMessages();
  pollTimer = setInterval(fetchMessages, 5000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>
