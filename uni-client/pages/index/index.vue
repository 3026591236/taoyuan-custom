<template>
  <view class="shell">
    <!-- #ifdef APP-PLUS -->
    <web-view :src="GAME_URL" class="game-webview" />
    <!-- #endif -->

    <!-- #ifndef APP-PLUS -->
    <view class="loader">
      <text class="title">桃源乡客户端壳</text>
      <text class="status">App 内将直接加载线上游戏：{{ GAME_URL }}</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
const GAME_URL = 'http://129.204.252.190:8084/'
</script>

<style scoped>
.shell { width: 100vw; height: 100vh; background: #0d1117; color: #e6edf3; }
.game-webview { width: 100vw; height: 100vh; }
.loader { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48rpx; box-sizing: border-box; }
.title { color: #c8a45c; font-size: 56rpx; font-weight: 700; margin-bottom: 18rpx; }
.status { color: #8b949e; font-size: 24rpx; text-align: center; line-height: 1.6; }
</style>
