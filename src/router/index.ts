import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'menu', component: () => import('@/views/MainMenu.vue') },
    { path: '/admin', name: 'admin', component: () => import('@/views/AdminView.vue') },
    { path: '/tutorial', name: 'tutorial', component: () => import('@/views/TutorialView.vue') },
    {
      path: '/game',
      component: () => import('@/views/GameLayout.vue'),
      redirect: '/game/farm',
      children: [
        { path: 'farm', name: 'farm', component: () => import('@/views/game/FarmView.vue') },
        { path: 'animal', name: 'animal', component: () => import('@/views/game/AnimalView.vue') },
        { path: 'home', name: 'home', component: () => import('@/views/game/HomeView.vue') },
        { path: 'cottage', name: 'cottage', component: () => import('@/views/game/CottageView.vue') },
        { path: 'village', name: 'village', component: () => import('@/views/game/NpcView.vue') },
        { path: 'shop', name: 'shop', component: () => import('@/views/game/ShopView.vue') },
        { path: 'forage', name: 'forage', component: () => import('@/views/game/ForageView.vue') },
        { path: 'fishing', name: 'fishing', component: () => import('@/views/game/FishingView.vue') },
        { path: 'mining', name: 'mining', component: () => import('@/views/game/MiningView.vue') },
        { path: 'cooking', name: 'cooking', component: () => import('@/views/game/CookingView.vue') },
        { path: 'workshop', name: 'workshop', component: () => import('@/views/game/ProcessingView.vue') },
        { path: 'upgrade', name: 'upgrade', component: () => import('@/views/game/ToolUpgradeView.vue') },
        { path: 'inventory', name: 'inventory', component: () => import('@/views/game/InventoryView.vue') },
        { path: 'quick-use', name: 'quick-use', component: () => import('@/views/game/QuickUseView.vue') },
        { path: 'skills', name: 'skills', component: () => import('@/views/game/SkillView.vue') },
        { path: 'achievement', name: 'achievement', component: () => import('@/views/game/AchievementView.vue') },
        { path: 'wallet', name: 'wallet', component: () => import('@/views/game/WalletView.vue') },
        { path: 'quest', name: 'quest', component: () => import('@/views/game/QuestView.vue') },
        { path: 'charinfo', name: 'charinfo', component: () => import('@/views/game/CharInfoView.vue') },
        { path: 'cultivation', name: 'cultivation', component: () => import('@/views/game/CultivationView.vue') },
        { path: 'alchemy', name: 'alchemy', component: () => import('@/views/game/AlchemyView.vue') },
        { path: 'cave', name: 'cave', component: () => import('@/views/game/CaveView.vue') },
        { path: 'destined-artifact', name: 'destined-artifact', component: () => import('@/views/game/DestinedArtifactView.vue') },
        { path: 'talisman', name: 'talisman', component: () => import('@/views/game/TalismanView.vue') },
        { path: 'yuan-shen', name: 'yuan-shen', component: () => import('@/views/game/YuanShenView.vue') },
        { path: 'divine-beast', name: 'divine-beast', component: () => import('@/views/game/DivineBeastView.vue') },
        { path: 'leaderboard', name: 'leaderboard', component: () => import('@/views/game/LeaderboardView.vue') },
        { path: 'events', name: 'events', component: () => import('@/views/game/EventView.vue') },
        { path: 'combat', name: 'combat', component: () => import('@/views/game/CombatView.vue') },
        { path: 'chat', name: 'chat', component: () => import('@/views/game/ChatView.vue') },
        { path: 'forge', name: 'forge', component: () => import('@/views/game/ForgeView.vue') },
        { path: 'sect', name: 'sect', component: () => import('@/views/game/SectView.vue') },
        { path: 'breeding', name: 'breeding', component: () => import('@/views/game/BreedingView.vue') },
        { path: 'museum', name: 'museum', component: () => import('@/views/game/MuseumView.vue') },
        { path: 'guild', name: 'guild', component: () => import('@/views/game/GuildView.vue') },
        { path: 'hanhai', name: 'hanhai', component: () => import('@/views/game/HanhaiView.vue') },
        { path: 'fishpond', name: 'fishpond', component: () => import('@/views/game/FishPondView.vue') },
        { path: 'ascension', name: 'ascension', component: () => import('@/views/game/AscensionView.vue') },
        { path: 'immortal-world', name: 'immortal-world', component: () => import('@/views/game/ImmortalWorldView.vue') }
      ]
    }
  ]
})

export default router
