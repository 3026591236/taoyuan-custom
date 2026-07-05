<template>
  <view class="shell">
    <!-- #ifdef APP-PLUS -->
    <web-view v-if="webUrl" :src="webUrl" class="game-webview" />
    <!-- #endif -->

    <view v-if="!webUrl" class="loader">
      <text class="title">桃源乡</text>
      <text class="subtitle">正在连接服务器同步客户端资源</text>
      <view class="bar"><view class="bar-inner" :style="{ width: progress + '%' }" /></view>
      <text class="status">{{ statusText }}</text>
      <button v-if="failed" class="retry" @click="startSync">重新连接</button>
    </view>

    <!-- #ifndef APP-PLUS -->
    <view class="loader">
      <text class="title">桃源乡客户端壳</text>
      <text class="status">请使用 uni-app 云打包 Android/iOS 运行。H5 调试模式不执行资源热更新。</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const SERVER_BASE = 'http://129.204.252.190:3001'
const MANIFEST_URL = `${SERVER_BASE}/api/client/manifest`
const BUNDLE_DIR = '_doc/taoyuan-web'
const ZIP_PATH = '_doc/taoyuan-web.zip'
const VERSION_PATH = `${BUNDLE_DIR}/manifest.json`

const webUrl = ref('')
const statusText = ref('准备连接服务器…')
const progress = ref(4)
const failed = ref(false)

type ClientManifest = {
  version: string
  build: string
  builtAt?: string
  entry: string
  zipUrl: string
  sha256?: string
  size?: number
  required?: boolean
}

const plusReady = () => new Promise<void>(resolve => {
  // #ifdef APP-PLUS
  if ((window as any).plus) return resolve()
  document.addEventListener('plusready', () => resolve(), false)
  // #endif
  // #ifndef APP-PLUS
  resolve()
  // #endif
})

const requestJson = <T,>(url: string) => new Promise<T>((resolve, reject) => {
  uni.request({
    url,
    method: 'GET',
    timeout: 15000,
    success: res => {
      if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data as T)
      else reject(new Error(`服务器返回 ${res.statusCode}`))
    },
    fail: err => reject(new Error(err.errMsg || '网络请求失败'))
  })
})

const readLocalManifest = () => new Promise<ClientManifest | null>(resolve => {
  // #ifdef APP-PLUS
  plus.io.resolveLocalFileSystemURL(VERSION_PATH, entry => {
    ;(entry as any).file(file => {
      const reader = new plus.io.FileReader()
      reader.onloadend = e => {
        try { resolve(JSON.parse(String(e.target?.result || ''))) } catch { resolve(null) }
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }, () => resolve(null))
  }, () => resolve(null))
  // #endif
  // #ifndef APP-PLUS
  resolve(null)
  // #endif
})

const removeDir = (path: string) => new Promise<void>(resolve => {
  // #ifdef APP-PLUS
  plus.io.resolveLocalFileSystemURL(path, entry => {
    ;(entry as any).removeRecursively(() => resolve(), () => resolve())
  }, () => resolve())
  // #endif
  // #ifndef APP-PLUS
  resolve()
  // #endif
})

const ensureDir = (path: string) => new Promise<void>((resolve, reject) => {
  // #ifdef APP-PLUS
  plus.io.resolveLocalFileSystemURL('_doc/', root => {
    ;(root as any).getDirectory(path.replace(/^_doc\//, ''), { create: true }, () => resolve(), err => reject(new Error(err.message)))
  }, err => reject(new Error(err.message)))
  // #endif
  // #ifndef APP-PLUS
  resolve()
  // #endif
})

const downloadZip = (manifest: ClientManifest) => new Promise<string>((resolve, reject) => {
  // #ifdef APP-PLUS
  const url = manifest.zipUrl.startsWith('http') ? manifest.zipUrl : `${SERVER_BASE}${manifest.zipUrl}`
  const task = plus.downloader.createDownload(url, { filename: ZIP_PATH, timeout: 30 }, (download, status) => {
    if (status === 200 && download.filename) resolve(download.filename)
    else reject(new Error(`资源下载失败：${status}`))
  })
  task.addEventListener('statechanged', d => {
    if (d.totalSize && d.downloadedSize) {
      progress.value = Math.max(15, Math.min(85, Math.round(d.downloadedSize / d.totalSize * 70) + 15))
      statusText.value = `正在下载资源包 ${progress.value}%`
    }
  })
  task.start()
  // #endif
  // #ifndef APP-PLUS
  reject(new Error('非 App 环境不支持下载资源包'))
  // #endif
})

const unzipBundle = (zipPath: string) => new Promise<void>((resolve, reject) => {
  // #ifdef APP-PLUS
  plus.zip.decompress(zipPath, BUNDLE_DIR, () => resolve(), err => reject(new Error(err.message || '解压失败')))
  // #endif
  // #ifndef APP-PLUS
  resolve()
  // #endif
})

const localEntryUrl = () => new Promise<string>((resolve, reject) => {
  // #ifdef APP-PLUS
  const target = `${BUNDLE_DIR}/index.html`
  plus.io.resolveLocalFileSystemURL(target, entry => resolve((entry as any).toLocalURL()), err => reject(new Error(err.message || '本地资源入口不存在')))
  // #endif
  // #ifndef APP-PLUS
  reject(new Error('非 App 环境'))
  // #endif
})

const sameBundle = (a: ClientManifest | null, b: ClientManifest) => !!a && a.version === b.version && a.build === b.build && (!b.sha256 || a.sha256 === b.sha256)

const startSync = async () => {
  failed.value = false
  webUrl.value = ''
  progress.value = 6
  statusText.value = '正在连接服务器…'
  try {
    await plusReady()
    const remoteManifest = await requestJson<ClientManifest>(MANIFEST_URL)
    if (!remoteManifest?.zipUrl || !remoteManifest?.entry) throw new Error('服务器资源清单无效')
    progress.value = 12
    statusText.value = `发现资源版本 ${remoteManifest.version} / ${remoteManifest.build}`

    const localManifest = await readLocalManifest()
    if (!sameBundle(localManifest, remoteManifest)) {
      statusText.value = '正在更新客户端资源…'
      await removeDir(BUNDLE_DIR)
      await ensureDir(BUNDLE_DIR)
      const zip = await downloadZip(remoteManifest)
      progress.value = 88
      statusText.value = '正在解压资源包…'
      await unzipBundle(zip)
      progress.value = 96
    } else {
      progress.value = 92
      statusText.value = '本地资源已是最新，正在进入游戏…'
    }

    webUrl.value = await localEntryUrl()
    progress.value = 100
  } catch (e: any) {
    failed.value = true
    progress.value = 0
    statusText.value = e?.message || '连接服务器失败，无法进入游戏'
  }
}

onMounted(() => { startSync() })
</script>

<style scoped>
.shell { width: 100vw; height: 100vh; background: #0d1117; color: #e6edf3; }
.game-webview { width: 100vw; height: 100vh; }
.loader { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48rpx; box-sizing: border-box; }
.title { color: #c8a45c; font-size: 56rpx; font-weight: 700; margin-bottom: 16rpx; }
.subtitle { color: #8b949e; font-size: 26rpx; margin-bottom: 56rpx; }
.bar { width: 520rpx; max-width: 76vw; height: 12rpx; border-radius: 999rpx; overflow: hidden; background: rgba(200,164,92,.18); margin-bottom: 24rpx; }
.bar-inner { height: 100%; background: #c8a45c; transition: width .25s ease; }
.status { color: #8b949e; font-size: 24rpx; text-align: center; line-height: 1.6; }
.retry { margin-top: 36rpx; color: #0d1117; background: #c8a45c; border-radius: 10rpx; font-size: 28rpx; padding: 0 42rpx; }
</style>
