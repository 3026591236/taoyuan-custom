<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="game-panel w-full max-w-md text-center relative max-h-[80vh] flex flex-col">
      <button class="absolute top-2 right-2 text-muted hover:text-text" @click="$emit('close')">
        <X :size="14" />
      </button>
      <Divider title class="my-4" label="存档管理" />
      <div class="grid grid-cols-1 gap-2 mb-3">
        <Button :icon="Download" class="text-center justify-center text-sm w-full" :disabled="accountBusy" @click="handleSaveCurrentLocal">
          保存当前进度
        </Button>
        <Button :icon="CloudUpload" class="text-center justify-center text-sm w-full" :disabled="accountBusy" @click="handleSaveCurrentToAccount">
          {{ accountBusy ? '保存中...' : '保存当前进度到账号' }}
        </Button>
        <p class="text-xs text-muted">保存到账号后，下次登录首页会显示“下载并继续”。</p>
      </div>
      <div class="flex-1 flex flex-col space-y-2 mb-3" @click="menuOpen = null">
        <div v-for="info in slots" :key="info.slot">
          <div v-if="info.exists" class="flex space-x-1 w-full">
            <button v-if="allowLoad" class="btn flex-1 !justify-between text-xs" @click="$emit('load', info.slot)">
              <span class="inline-flex items-center space-x-1">
                <FolderOpen :size="12" />
                <span>存档 {{ info.slot + 1 }}</span>
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </button>
            <div v-else class="btn flex-1 !justify-between text-xs cursor-default">
              <span class="inline-flex items-center space-x-1">
                <FolderOpen :size="12" />
                <span>存档 {{ info.slot + 1 }}</span>
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </div>
            <div class="relative">
              <Button
                class="px-2 h-full"
                :icon="Settings"
                :icon-size="12"
                @click.stop="menuOpen = menuOpen === info.slot ? null : info.slot"
              />
              <div
                v-if="menuOpen === info.slot"
                class="absolute right-0 top-full mt-1 z-10 flex flex-col border border-accent/30 rounded-xs overflow-hidden w-30"
              >
                <Button
                  v-if="webdavReady"
                  :icon="CloudUpload"
                  :icon-size="12"
                  class="text-center !rounded-none justify-center text-sm"
                  :disabled="uploading"
                  @click="handleUpload(info.slot)"
                >
                  {{ uploading ? '上传中...' : '上传云端' }}
                </Button>
                <Button
                  v-if="webdavReady"
                  :icon="CloudDownload"
                  :icon-size="12"
                  class="text-center !rounded-none justify-center text-sm"
                  :disabled="downloading"
                  @click="handleDownload(info.slot)"
                >
                  {{ downloading ? '下载中...' : '云端下载' }}
                </Button>
                <Button
                  :icon="CloudUpload"
                  :icon-size="12"
                  class="text-center !rounded-none justify-center text-sm"
                  :disabled="accountBusy"
                  @click="handleAccountUpload(info.slot)"
                >
                  {{ accountBusy ? '保存中...' : '保存到账号' }}
                </Button>
                <Button
                  :icon="CloudDownload"
                  :icon-size="12"
                  class="text-center !rounded-none justify-center text-sm"
                  :disabled="accountBusy"
                  @click="handleAccountDownload(info.slot)"
                >
                  {{ accountBusy ? '处理中...' : '账号下载' }}
                </Button>
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
            <div class="text-xs text-muted border border-accent/10 rounded-xs px-3 py-2 flex-1">存档 {{ info.slot + 1 }} — 空</div>
            <Button
              v-if="webdavReady"
              :icon="CloudDownload"
              :icon-size="12"
              class="px-2"
              :disabled="downloading"
              @click="handleDownload(info.slot)"
            >
              <span class="text-xs">{{ downloading ? '下载中...' : '云端' }}</span>
            </Button>
            <Button
              :icon="CloudDownload"
              :icon-size="12"
              class="px-2"
              :disabled="accountBusy"
              @click="handleAccountDownload(info.slot)"
            >
              <span class="text-xs">账号云端</span>
            </Button>
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
            <p class="text-danger text-sm mb-3">确定删除存档 {{ deleteTargetSlot + 1 }}？</p>
            <p class="text-xs text-muted mb-4">此操作不可恢复。</p>
            <div class="flex space-x-3 justify-center">
              <Button @click="deleteTargetSlot = null">取消</Button>
              <Button class="btn-danger" @click="confirmDelete">确认删除</Button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { X, FolderOpen, Settings, Download, Trash2, CloudUpload, CloudDownload } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import { SEASON_NAMES } from '@/stores/useGameStore'
  import { parseSaveData, useSaveStore } from '@/stores/useSaveStore'
  import { showFloat } from '@/composables/useGameLog'
  import { useWebdav } from '@/composables/useWebdav'

  defineProps<{ allowLoad?: boolean }>()
  const emit = defineEmits<{ close: []; load: [slot: number]; change: [] }>()

  const saveStore = useSaveStore()
  const { webdavReady, uploadSave, downloadSave } = useWebdav()

  const slots = ref(saveStore.getSlots())
  const menuOpen = ref<number | null>(null)
  const uploading = ref(false)
  const downloading = ref(false)
  const accountBusy = ref(false)

  const refreshSlots = () => {
    slots.value = saveStore.getSlots()
  }

  const deleteTargetSlot = ref<number | null>(null)

  const handleDelete = (slot: number) => {
    deleteTargetSlot.value = slot
  }

  const confirmDelete = () => {
    if (deleteTargetSlot.value !== null) {
      saveStore.deleteSlot(deleteTargetSlot.value)
      refreshSlots()
      emit('change')
      deleteTargetSlot.value = null
      menuOpen.value = null
    }
  }

  const handleUpload = async (slot: number) => {
    uploading.value = true
    const result = await uploadSave(slot)
    uploading.value = false
    showFloat(result.message, result.success ? 'success' : 'danger')
    menuOpen.value = null
  }

  const handleDownload = async (slot: number) => {
    downloading.value = true
    const result = await downloadSave(slot)
    downloading.value = false
    if (result.success) {
      refreshSlots()
      emit('change')
    }
    showFloat(result.message, result.success ? 'success' : 'danger')
    menuOpen.value = null
  }

  const accountToken = () => localStorage.getItem('taoyuan_account_token') || ''
  const accountHeaders = () => ({ 'content-type': 'application/json', authorization: `Bearer ${accountToken()}` })
  const accountApi = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(path, options)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '请求失败')
    return data
  }
  const saveKey = (slot: number) => `taoyuanxiang_save_${slot}`
  const currentSlot = () => {
    const slot = saveStore.activeSlot
    if (slot >= 0) return slot
    const existing = saveStore.getSlots().find(s => s.exists)
    return existing?.slot ?? 0
  }
  const handleSaveCurrentLocal = () => {
    const slot = currentSlot()
    if (saveStore.saveToSlot(slot)) {
      refreshSlots()
      emit('change')
      showFloat(`当前进度已保存到存档 ${slot + 1}。`, 'success')
    } else {
      showFloat('保存失败，请先进入游戏后再保存。', 'danger')
    }
  }
  const handleSaveCurrentToAccount = async () => {
    const slot = currentSlot()
    await handleAccountUpload(slot)
  }
  const handleAccountUpload = async (slot: number) => {
    accountBusy.value = true
    try {
      // 先把当前游戏状态写入本地槽位，再上传到账号数据库
      if (!saveStore.saveToSlot(slot)) throw new Error('本地存档失败，请先进入游戏后再保存')
      const raw = localStorage.getItem(saveKey(slot))
      if (!raw) throw new Error('本地没有这个存档')
      refreshSlots()
      const info = saveStore.getSlots().find(s => s.slot === slot)
      const data = parseSaveData(raw)
      await accountApi(`/api/saves/${slot}`, { method: 'PUT', headers: accountHeaders(), body: JSON.stringify({ raw, data, meta: info || {} }) })
      showFloat(`存档 ${slot + 1} 已保存到账号数据库。`, 'success')
    } catch (e: any) {
      showFloat(e.message || '保存到账号失败。', 'danger')
    } finally {
      accountBusy.value = false
      menuOpen.value = null
    }
  }
  const handleAccountDownload = async (slot: number) => {
    accountBusy.value = true
    try {
      const data = await accountApi(`/api/saves/${slot}`, { headers: accountHeaders() })
      if (!saveStore.importSave(slot, data.raw)) throw new Error('云端存档无效或已损坏')
      refreshSlots()
      emit('change')
      showFloat(`账号云端存档 ${slot + 1} 已下载。`, 'success')
    } catch (e: any) {
      showFloat(e.message || '账号云端下载失败。', 'danger')
    } finally {
      accountBusy.value = false
      menuOpen.value = null
    }
  }
</script>
