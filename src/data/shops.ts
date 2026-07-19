import type { Weather, Season, Weekday } from "@/types";
import { getWeekday } from "./timeConstants";

/** 商铺定义 */
export interface ShopDef {
  id: string;
  name: string;
  description: string;
  npcName: string;
  closedDays: Weekday[];
  openHour: number;
  closeHour: number;
  closedWeathers: Weather[];
  closedSeasons: Season[];
}

/** 六大商铺 */
export const SHOPS: ShopDef[] = [
  {
    id: "wanwupu",
    name: "万象行·田契柜",
    description: "顾百川主持的田契与集仓窗口，按四时供应灵种、基础生产资料并标注作物去向。",
    npcName: "顾百川",
    closedDays: ["wed"],
    openHour: 8,
    closeHour: 20,
    closedWeathers: [],
    closedSeasons: [],
  },
  {
    id: "tiejiangpu",
    name: "地火百工炉",
    description: "孙铁匠主持的百工炉房，核验矿材、锻制金属并承接工具工序。",
    npcName: "孙铁匠",
    closedDays: ["sun"],
    openHour: 7,
    closeHour: 18,
    closedWeathers: [],
    closedSeasons: [],
  },
  {
    id: "biaoju",
    name: "山门行旅署",
    description: "云飞主持的行旅整备点，提供护具、通行物资与野外风险告示。",
    npcName: "云飞",
    closedDays: [],
    openHour: 10,
    closeHour: 22,
    closedWeathers: ["stormy"],
    closedSeasons: [],
  },
  {
    id: "yugupu",
    name: "星澜河务所",
    description: "沈听澜管理的河务补给点，发布水情、巡汛安排并提供合规渔具。",
    npcName: "沈听澜",
    closedDays: ["mon", "tue"],
    openHour: 6,
    closeHour: 17,
    closedWeathers: ["stormy"],
    closedSeasons: [],
  },
  {
    id: "yaopu",
    name: "百草调养局",
    description: "林老主持的草药与土壤调养窗口，供应肥培、药材和牧养照护物资。",
    npcName: "林老",
    closedDays: [],
    openHour: 8,
    closeHour: 20,
    closedWeathers: ["stormy"],
    closedSeasons: ["winter"],
  },
  {
    id: "chouduanzhuang",
    name: "云梭织作局",
    description: "素素主持的织作与礼仪工坊，供应布材、合香用品和往来信物。",
    npcName: "素素",
    closedDays: ["sat", "sun"],
    openHour: 9,
    closeHour: 18,
    closedWeathers: [],
    closedSeasons: [],
  },
];

/** 根据 ID 查找商铺 */
export const getShopById = (id: string): ShopDef | undefined => {
  return SHOPS.find((s) => s.id === id);
};

/** 判断商铺是否营业中 */
export const isShopAvailable = (
  shop: ShopDef,
  day: number,
  hour: number,
  weather: Weather,
  season: Season,
): boolean => {
  const weekday = getWeekday(day);
  if (shop.closedDays.includes(weekday)) return false;
  if (hour < shop.openHour || hour >= shop.closeHour) return false;
  if (shop.closedWeathers.length > 0 && shop.closedWeathers.includes(weather))
    return false;
  if (shop.closedSeasons.length > 0 && shop.closedSeasons.includes(season))
    return false;
  return true;
};

/** 获取商铺关闭原因 */
export const getShopClosedReason = (
  shop: ShopDef,
  day: number,
  hour: number,
  weather: Weather,
  season: Season,
): string => {
  const weekday = getWeekday(day);
  if (shop.closedSeasons.length > 0 && shop.closedSeasons.includes(season)) {
    return "本季休业";
  }
  if (shop.closedWeathers.length > 0 && shop.closedWeathers.includes(weather)) {
    return "天气原因休息";
  }
  if (shop.closedDays.includes(weekday)) {
    return "今日休息";
  }
  if (hour < shop.openHour) {
    return `${shop.openHour}点开门`;
  }
  if (hour >= shop.closeHour) {
    return "已打烊";
  }
  return "";
};
