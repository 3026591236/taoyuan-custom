/** 晨间提示定义 */
export interface MorningTipDef {
  id: string;
  priority: number;
  conditionKey: string;
  message: string;
}

/**
 * 18 条晨间提示，按优先级排序。
 * conditionKey 在 useEndDay 的晨间提示逻辑中映射为实际判断函数。
 */
export const MORNING_TIPS: MorningTipDef[] = [
  {
    id: "tip_welcome",
    priority: 1,
    conditionKey: "earlyFirstDay",
    message:
      "柳村长说：「欢迎来到万象仙乡！纳戒里有白菜灵种，去灵田界面开垦土地、播种吧。」",
  },
  {
    id: "tip_first_till",
    priority: 2,
    conditionKey: "allWasteland",
    message:
      "柳村长说：「灵畦要先开垦才能种东西。在灵田界面点击「一键操作」→「一键开垦」。」",
  },
  {
    id: "tip_first_plant",
    priority: 3,
    conditionKey: "tilledNoPlanted",
    message:
      "柳村长说：「地开垦好了，去灵田界面播种吧。「一键种植」可以批量播种。」",
  },
  {
    id: "tip_first_water",
    priority: 4,
    conditionKey: "plantedUnwatered",
    message:
      "柳村长说：「灵种种下后记得浇水，不浇水灵植不会生长。试试「一键浇水」。」",
  },
  {
    id: "tip_first_harvest",
    priority: 5,
    conditionKey: "hasHarvestable",
    message:
      "柳村长说：「灵植成熟了！去灵田界面收获吧，金色地块就是成熟的灵植。」",
  },
  {
    id: "tip_sell_crops",
    priority: 6,
    conditionKey: "harvestedNeverSold",
    message:
      "柳村长说：「收获的灵植放进灵田界面底部的出货灵匣，次日就能换钱了。」",
  },
  {
    id: "tip_check_weather",
    priority: 7,
    conditionKey: "earlyGame",
    message: "柳村长说：「每天注意看天气预报，提前安排一天的活计会事半功倍。」",
  },
  {
    id: "tip_stamina",
    priority: 8,
    conditionKey: "staminaWasLow",
    message:
      "柳村长说：「体力不够就早点休息，熬夜会影响次日恢复。吃东西也能补充体力。」",
  },
  {
    id: "tip_visit_shop",
    priority: 9,
    conditionKey: "neverVisitedShop",
    message: "柳村长说：「万象市集有各种灵种和道具出售，有空去逛逛吧。」",
  },
  {
    id: "tip_try_fishing",
    priority: 10,
    conditionKey: "neverFished",
    message: "柳村长说：「集东的灵溪鱼虾丰美，带上鱼竿去试试垂钓吧。」",
  },
  {
    id: "tip_try_mining",
    priority: 11,
    conditionKey: "neverMined",
    message:
      "柳村长说：「集北的玄矿幽脉里有矿石和宝物，不过也有怪物，小心些。」",
  },
  {
    id: "tip_talk_npc",
    priority: 12,
    conditionKey: "neverTalkedNpc",
    message: "柳村长说：「乡里集民的，多和大家聊聊天，送礼也能增进交情。」",
  },
  {
    id: "tip_quest_board",
    priority: 13,
    conditionKey: "neverCheckedQuests",
    message: "柳村长说：「天机榜上有集民们的委托，帮忙做做能赚点钱和人情。」",
  },
  {
    id: "tip_try_cooking",
    priority: 14,
    conditionKey: "neverCooked",
    message:
      "柳村长说：「学了食谱可以做菜，做出来的饭能恢复体力。去灵膳房试试。」",
  },
  {
    id: "tip_rain",
    priority: 15,
    conditionKey: "firstRainyDay",
    message:
      "柳村长说：「下雨天灵植会自动浇水，省了力气。正好可以去做别的事。」",
  },
  {
    id: "tip_season_change",
    priority: 16,
    conditionKey: "justChangedSeason",
    message:
      "柳村长说：「换季了，不同季节能种的灵植不一样，去万象市集看看新灵种吧。」",
  },
  {
    id: "tip_sprinkler",
    priority: 17,
    conditionKey: "hasCropNoSprinkler",
    message:
      "柳村长说：「种地面积大了浇水很累，百匠造台或铁匠铺可以做洒水器自动浇水。」",
  },
  {
    id: "tip_try_animal",
    priority: 18,
    conditionKey: "neverHadAnimal",
    message: "柳村长说：「养些鸡鸭牛羊也不错，先去商铺建个灵禽舍或灵牧苑吧。」",
  },
];
