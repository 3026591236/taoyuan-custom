/** 藏珍阁物品分类 */
export type MuseumCategory =
  "ore" | "gem" | "bar" | "fossil" | "artifact" | "spirit";

/** 藏珍阁可捐赠物品定义 */
export interface MuseumItemDef {
  id: string;
  name: string;
  category: MuseumCategory;
  /** 来源提示（未获得时显示） */
  sourceHint: string;
}

/** 藏珍阁里程碑奖励 */
export interface MuseumMilestone {
  count: number;
  name: string;
  reward: {
    money?: number;
    items?: { itemId: string; quantity: number }[];
  };
}

/** 藏珍阁主题收藏 */
export interface MuseumThemeCollection {
  id: string;
  name: string;
  desc: string;
  itemIds: string[];
  reward: {
    fame: number;
    money?: number;
    items?: { itemId: string; quantity: number }[];
  };
}

/** 文物修复项目 */
export interface MuseumRestorationDef {
  id: string;
  name: string;
  desc: string;
  requiredDonations: number;
  cost: {
    money: number;
    items?: { itemId: string; quantity: number }[];
  };
  reward: {
    fame: number;
    itemId?: string;
    quantity?: number;
  };
}
