<template>
  <span class="pixel-icon inline-flex items-center justify-center" :class="[sizeClass, colorClass, effectClass]" :title="label">
    <svg v-if="icon" :width="px" :height="px" :viewBox="icon.viewBox || `0 0 24 24`" fill="currentColor" class="pixel-svg">
      <path v-for="(d,i) in icon.paths" :key="i" :d="d"/>
    </svg>
    <span v-else-if="emoji" class="pixel-emoji">{{ emoji }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(defineProps<{
  icon?: { viewBox?: string; paths: string[] }
  emoji?: string
  label?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl"
  color?: "accent" | "gold" | "red" | "green" | "blue" | "purple" | "white" | "muted"
  effect?: "none" | "pulse" | "shine" | "spin"
}>(), {
  size: "md",
  color: "accent",
  effect: "none"
})

const px = computed(() => ({ xs:12, sm:16, md:24, lg:32, xl:48, xxl:64 }[props.size] || 24))
const sizeClass = computed(() => "pi-" + props.size)
const colorClass = computed(() => "pi-" + props.color)
const effectClass = computed(() => props.effect !== "none" ? "pi-" + props.effect : "")
</script>

<style scoped>
.pixel-icon { vertical-align: middle; image-rendering: pixelated; }
.pixel-svg { display: block; }
.pixel-emoji { line-height: 1; }

/* sizes */
.pi-xs { width: 12px; height: 12px; font-size: 10px; }
.pi-sm { width: 16px; height: 16px; font-size: 12px; }
.pi-md { width: 24px; height: 24px; font-size: 16px; }
.pi-lg { width: 32px; height: 32px; font-size: 22px; }
.pi-xl { width: 48px; height: 48px; font-size: 32px; }
.pi-xxl { width: 64px; height: 64px; font-size: 48px; }

/* colors */
.pi-accent { color: var(--c-accent, #ffd700); }
.pi-gold { color: #ffd700; filter: drop-shadow(0 0 2px #ff8c00); }
.pi-red { color: #ff4444; }
.pi-green { color: #44ff44; }
.pi-blue { color: #44aaff; }
.pi-purple { color: #aa44ff; }
.pi-white { color: #fff; }
.pi-muted { color: #888; }

/* effects */
.pi-pulse { animation: pi-pulse 2s ease-in-out infinite; }
@keyframes pi-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
.pi-shine {
  animation: pi-shine 2s ease-in-out infinite;
  filter: drop-shadow(0 0 4px currentColor);
}
@keyframes pi-shine {
  0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
  50% { filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor); }
}
.pi-spin { animation: pi-spin 4s linear infinite; }
@keyframes pi-spin { to { transform: rotate(360deg); } }
</style>
