import { createApp, toRaw } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from './App.vue'
import './app.css'

const app = createApp(App)
const pinia = createPinia()

// 为 setup store 添加 $reset() 支持（Pinia 默认仅 option store 支持 $reset）
// 使用 JSON 深拷贝而非 structuredClone，因为后者无法处理 Vue 的 reactive Proxy
pinia.use(({ store }) => {
  const initialState = JSON.parse(JSON.stringify(toRaw(store.$state)))
  store.$reset = () => {
    store.$patch($state => {
      Object.assign($state, JSON.parse(JSON.stringify(initialState)))
    })
  }

  // 玩家状态一旦变化就通知云存档链路；不再依赖固定周期轮询。
  // save store 只保存槽位控制状态，排除它可避免写档动作自身再次触发写档。
  if (store.$id !== 'save') {
    store.$subscribe((mutation: any) => {
      const events = Array.isArray(mutation.events)
        ? mutation.events
        : mutation.events
          ? [mutation.events]
          : []
      const keys = events
        .map((event: any) => String(event?.key ?? ''))
        .filter(Boolean)
      window.dispatchEvent(new CustomEvent('taoyuan:player-state-changed', {
        detail: { storeId: store.$id, keys },
      }))
    }, { detached: true, flush: 'sync' })
  }
})

app.use(pinia)
app.use(router)
app.mount('#app')
