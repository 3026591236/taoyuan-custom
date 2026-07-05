<template>
  <view class="loader">
    <text class="title">桃源乡</text>
    <text class="status">{{ statusText }}</text>
    <text class="hint">{{ detailText }}</text>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const GAME_URL = 'http://129.204.252.190:8084/'
const statusText = ref('正在打开游戏…')
const detailText = ref(GAME_URL)

function openGame () {
  // #ifdef APP-PLUS
  try {
    const current = plus.webview.currentWebview()
    const game = plus.webview.create(GAME_URL, 'taoyuan-game-webview', {
      top: '0px',
      bottom: '0px',
      width: '100%',
      height: '100%',
      plusrequire: 'none',
      popGesture: 'none',
      scrollIndicator: 'none',
      background: '#0d1117'
    })
    game.addEventListener('loaded', () => {
      statusText.value = '游戏已打开'
      detailText.value = 'loaded'
    }, false)
    game.addEventListener('error', (e) => {
      statusText.value = '网页加载失败'
      detailText.value = JSON.stringify(e || {})
    }, false)
    current.append(game)
    game.show('none', 0)
  } catch (e) {
    statusText.value = '客户端打开失败'
    detailText.value = e && e.message ? e.message : String(e)
  }
  // #endif
  // #ifndef APP-PLUS
  statusText.value = 'H5 调试模式'
  detailText.value = GAME_URL
  // #endif
}

onMounted(() => {
  // #ifdef APP-PLUS
  if (window.plus) openGame()
  else document.addEventListener('plusready', openGame, false)
  // #endif
  // #ifndef APP-PLUS
  openGame()
  // #endif
})
</script>

<style scoped>
.loader { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48rpx; box-sizing: border-box; background: #0d1117; color: #e6edf3; }
.title { color: #c8a45c; font-size: 56rpx; font-weight: 700; margin-bottom: 18rpx; }
.status { color: #e6edf3; font-size: 30rpx; text-align: center; line-height: 1.6; }
.hint { margin-top: 20rpx; color: #8b949e; font-size: 22rpx; text-align: center; line-height: 1.5; word-break: break-all; }
</style>
