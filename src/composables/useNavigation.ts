import type { Component } from "vue";
import router from "@/router";
import { useGameStore } from "@/stores/useGameStore";
import { isShopOpen, TAB_TO_LOCATION_GROUP } from "@/data/timeConstants";
import { addLog, showFloat } from "./useGameLog";
import { handleEndDay } from "./useEndDay";
import { sfxClick, useAudio } from "./useAudio";
import { useGameClock } from "./useGameClock";
import { useTutorialStore } from "@/stores/useTutorialStore";
import {
  Wheat,
  Egg,
  Home,
  Heart,
  Building,
  Users,
  Store,
  TreePine,
  Fish,
  Pickaxe,
  Flame,
  Cog,
  Wrench,
  Package,
  Star,
  BookOpen,
  Wallet,
  ScrollText,
  User,
  FlaskConical,
  Tent,
  Waves,
  Sparkles,
  Trophy,
  Landmark,
  Swords,
  Gift,
} from "lucide-vue-next";
import { useNpcStore } from "@/stores/useNpcStore";

export type PanelKey =
  | "farm"
  | "shop"
  | "inventory"
  | "fishing"
  | "mining"
  | "village"
  | "cooking"
  | "forage"
  | "upgrade"
  | "skills"
  | "workshop"
  | "achievement"
  | "animal"
  | "home"
  | "wallet"
  | "quest"
  | "charinfo"
  | "breeding"
  | "museum"
  | "guild"
  | "hanhai"
  | "fishpond"
  | "cottage"
  | "cultivation"
  | "alchemy"
  | "cave"
  | "destined-artifact"
  | "talisman"
  | "yuan-shen"
  | "divine-beast"
  | "leaderboard"
  | "events"
  | "combat"
  | "chat"
  | "forge"
  | "sect";

export const TABS: {
  key: PanelKey;
  label: string;
  icon: Component;
  getIcon?: () => Component;
}[] = [
  { key: "farm", label: "灵田", icon: Wheat },
  { key: "animal", label: "灵牧苑", icon: Egg },
  {
    key: "cottage",
    label: "仙居",
    icon: Home,
    getIcon: () => (useNpcStore().getSpouse() ? Heart : Home),
  },
  { key: "home", label: "洞天基建", icon: Building },
  { key: "breeding", label: "育种", icon: FlaskConical },
  { key: "fishpond", label: "灵泉鱼池", icon: Waves },
  { key: "village", label: "万象集", icon: Users },
  { key: "shop", label: "万象市集", icon: Store },
  { key: "forage", label: "青篁秘林", icon: TreePine },
  { key: "fishing", label: "灵溪垂钓", icon: Fish },
  { key: "mining", label: "玄矿幽脉", icon: Pickaxe },
  { key: "cooking", label: "灵膳房", icon: Flame },
  { key: "workshop", label: "百匠造台", icon: Cog },
  { key: "upgrade", label: "匠造台", icon: Wrench },
  { key: "charinfo", label: "仙籍", icon: User },
  { key: "cultivation", label: "问道", icon: Sparkles },
  { key: "alchemy", label: "丹炉", icon: Sparkles },
  { key: "cave", label: "洞天", icon: Building },
  { key: "destined-artifact", label: "本命宝", icon: Star },
  { key: "talisman", label: "符箓", icon: ScrollText },
  { key: "yuan-shen", label: "神魂", icon: Sparkles },
  { key: "divine-beast", label: "仙兽", icon: Heart },
  { key: "leaderboard", label: "天榜", icon: Trophy },
  { key: "events", label: "天时活动", icon: Gift },
  { key: "combat", label: "万象秘境", icon: Flame },
  { key: "forge", label: "器阁", icon: Cog },
  { key: "sect", label: "道统", icon: Users },
  { key: "inventory", label: "纳戒", icon: Package },
  { key: "skills", label: "百艺", icon: Star },
  { key: "achievement", label: "万象录", icon: BookOpen },
  { key: "wallet", label: "财库", icon: Wallet },
  { key: "quest", label: "天机榜", icon: ScrollText },
  { key: "museum", label: "藏珍阁", icon: Landmark },
  { key: "guild", label: "仙盟", icon: Swords },
  { key: "hanhai", label: "瀚海", icon: Tent },
];

/** 导航到游戏面板，检查旅行时间、就寝时间和万象铺营业时间 */
export const navigateToPanel = (panelKey: PanelKey) => {
  const gameStore = useGameStore();
  const { startBgm } = useAudio();

  if (gameStore.isPastBedtime) {
    addLog("已经凌晨2点了，你必须休息。");
    handleEndDay();
    // 确保新一天时钟恢复运转
    const { resumeClock: resumeAfterEnd } = useGameClock();
    resumeAfterEnd();
    return;
  }

  // 万象铺营业检查
  const shopCheck = isShopOpen(panelKey, gameStore.day, gameStore.hour);
  if (!shopCheck.open) {
    showFloat(shopCheck.reason!, "danger");
    return;
  }

  // 旅行时间
  const travelResult = gameStore.travelTo(panelKey);
  if (travelResult.timeCost > 0) {
    addLog(travelResult.message);
  }
  if (travelResult.passedOut) {
    handleEndDay();
    return;
  }

  sfxClick();
  startBgm();
  void router.push({ name: panelKey });
  useTutorialStore().markPanelVisited(panelKey);

  // UI 面板（无地点）暂停时钟，游戏面板恢复
  const { pauseClock, resumeClock } = useGameClock();
  const targetGroup = TAB_TO_LOCATION_GROUP[panelKey];
  if (targetGroup === null || targetGroup === undefined) {
    pauseClock();
  } else {
    resumeClock();
  }
};

export const useNavigation = () => {
  return {
    TABS,
    navigateToPanel,
  };
};
