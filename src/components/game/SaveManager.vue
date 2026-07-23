<template>
  <div
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div
      class="game-panel w-full max-w-md text-center relative max-h-[80vh] flex flex-col"
    >
      <button
        class="absolute top-2 right-2 text-muted hover:text-text"
        @click="$emit('close')"
      >
        <X :size="14" />
      </button>
      <Divider title class="my-4" label="存档管理" />
      <div class="border border-accent/20 rounded-xs p-3 mb-3 text-left">
        <p class="text-xs text-accent mb-1">服务器实时存档已启用</p>
        <p class="text-[10px] text-muted leading-relaxed">
          游戏数据变化后会立即保存到服务器，无需手动上传或下载。重新登录时从角色列表继续即可。
        </p>
      </div>
      <div class="flex-1 flex flex-col space-y-2 mb-3" @click="menuOpen = null">
        <div v-for="info in slots" :key="info.slot">
          <div v-if="info.exists" class="flex space-x-1 w-full">
            <button
              v-if="allowLoad"
              class="btn flex-1 !justify-between text-xs"
              @click="$emit('load', info.slot)"
            >
              <span class="inline-flex items-center space-x-1">
                <FolderOpen :size="12" />
                <span>存档 {{ info.slot + 1 }}</span>
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? "未命名" }} · 第{{ info.year }}年
                {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }}
                第{{ info.day }}天
              </span>
            </button>
            <div
              v-else
              class="btn flex-1 !justify-between text-xs cursor-default"
            >
              <span class="inline-flex items-center space-x-1">
                <FolderOpen :size="12" />
                <span>存档 {{ info.slot + 1 }}</span>
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? "未命名" }} · 第{{ info.year }}年
                {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }}
                第{{ info.day }}天
              </span>
            </div>
            <div class="relative">
              <Button
                class="px-2 h-full"
                :icon="Settings"
                :icon-size="12"
                @click.stop="
                  menuOpen = menuOpen === info.slot ? null : info.slot
                "
              />
              <div
                v-if="menuOpen === info.slot"
                class="absolute right-0 top-full mt-1 z-10 flex flex-col border border-accent/30 rounded-xs overflow-hidden w-30"
              >
                <Button
                  :icon="Trash2"
                  :icon-size="12"
                  class="btn-danger !rounded-none text-center justify-center text-sm"
                  @click="handleDelete(info.slot)"
                >
                  删除存档
                </Button>
              </div>
            </div>
          </div>
          <div v-else class="flex space-x-1 w-full">
            <div
              class="text-xs text-muted border border-accent/10 rounded-xs px-3 py-2 flex-1"
            >
              存档 {{ info.slot + 1 }} — 空
            </div>
          </div>
        </div>
      </div>

      <!-- 删除存档确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="deleteTargetSlot !== null"
          class="fixed inset-0 z-60 flex items-center justify-center bg-bg/80"
          @click.self="deleteTargetSlot = null"
        >
          <div class="game-panel w-full max-w-xs mx-4 text-center">
            <p class="text-danger text-sm mb-3">
              确定删除存档 {{ deleteTargetSlot + 1 }}？
            </p>
            <p class="text-xs text-muted mb-4">此操作不可恢复。</p>
            <div class="flex space-x-3 justify-center">
              <Button @click="deleteTargetSlot = null">取消</Button>
              <Button class="btn-danger" @click="confirmDelete"
                >确认删除</Button
              >
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  X,
  FolderOpen,
  Settings,
  Trash2,
} from "lucide-vue-next";
import Button from "@/components/game/Button.vue";
import Divider from "@/components/game/Divider.vue";
import { SEASON_NAMES } from "@/stores/useGameStore";
import { useSaveStore } from "@/stores/useSaveStore";

defineProps<{ allowLoad?: boolean }>();
const emit = defineEmits<{ close: []; load: [slot: number]; change: [] }>();

const saveStore = useSaveStore();

const slots = ref(saveStore.getSlots());
const menuOpen = ref<number | null>(null);

const refreshSlots = () => {
  slots.value = saveStore.getSlots();
};

const deleteTargetSlot = ref<number | null>(null);

const handleDelete = (slot: number) => {
  deleteTargetSlot.value = slot;
};

const confirmDelete = () => {
  if (deleteTargetSlot.value !== null) {
    saveStore.deleteSlot(deleteTargetSlot.value);
    refreshSlots();
    emit("change");
    deleteTargetSlot.value = null;
    menuOpen.value = null;
  }
};

</script>
