import type { Weather } from "@/types";

/** 李渔翁 - 次日水情与鱼汛提示 */
export const WEATHER_TIPS: Record<Weather, string> = {
  sunny: "明日天晴，浅水升温较快，鱼群可能提早转入深水段。",
  rainy: "明日有雨，支流入水会变浑。垂钓前先看水位牌与放流区。",
  stormy: "明日雷雨强，河岸湿滑且水位可能急变，暂停临水观察。",
  snowy: "明日有雪，近岸可能结薄冰，不要踏冰取样。",
  windy: "明日起风，水面观察受扰，记录鱼情时注明风向和浪况。",
  green_rain: "明日水色可能异常。老朽会加测水温与鱼群活动，先别在陌生水段下竿。",
};

/** 周秀才 - 运势台词阈值 */
export const FORTUNE_TIERS: { min: number; message: string }[] = [
  { min: 0.07, message: "紫气东来，今日大吉！诸事皆宜。" },
  { min: 0.03, message: "今日运势不错，宜出门办事。" },
  { min: -0.03, message: "今日运势平平，一切照常便好。" },
  { min: -0.07, message: "今日运势欠佳，做事需小心谨慎。" },
  { min: -Infinity, message: "今日诸事不宜，建议在家休息。" },
];

/** 根据 dailyLuck 获取运势台词 */
export const getFortuneTip = (luck: number): string => {
  for (const tier of FORTUNE_TIERS) {
    if (luck >= tier.min) return tier.message;
  }
  return FORTUNE_TIERS[FORTUNE_TIERS.length - 1]!.message;
};

/** 陆镇岳 - 生活提示 (25条循环) */
export const LIVING_TIPS: string[] = [
  "春初先查灵种适生期，再看集仓价格；能种不等于此刻值得种。",
  "施肥要记成本和地块，品质提高若抵不过投入，就该换方案。",
  "雨天省下的是灌溉体力，不是整日时间；把加工和拜访排进去。",
  "去青篁秘林采集前清出背包，满载折返比沿路丢弃更稳妥。",
  "垂钓先看时段与天气，星澜河的鱼不会按人的空闲出现。",
  "进入玄矿幽脉前定好返程线，最后一份体力永远留给退路。",
  "送礼不是用物品换关系；先听清对方真正重视什么。",
  "工具升级会占用材料与工期，最好避开最忙的播种和收获日。",
  "夏季高价作物诱人，但别让同一种收成压满仓库。",
  "洒水器节省的是每天重复投入的体力，越早规划覆盖越划算。",
  "秋季适合验证多季灵植的稳定性，把一部分田留作对照。",
  "冬季不能露天耕种时，正好清账、修器具、下矿和补人情。",
  "新食谱是关系留下的经验，不妨做一次，也记下原料是否好取得。",
  "藏珍阁收的是可核验的发现；来历不明的古物先别急着捐。",
  "仙盟讨伐回报高，风险也高；补给、装备和退场条件要先想好。",
  "鱼饵与浮标各管一段效率，别只看稀有度，要看是否适合目标鱼。",
  "加工提高价值也占用时间，机器空转和原料积压都是损失。",
  "节庆当天常有公共安排，前一晚先收好成熟灵植和待加工物。",
  "矿用炸药提高速度，也会改变落石范围；站位比省几分钟重要。",
  "装备加成应服务当天计划，下矿、垂钓和战斗不必戴同一套。",
  "高品质灵植优先留给高收益食谱，普通日常不必件件追求极品。",
  "牧养是长期承诺，扩栏前先算饲料、空间与每日照料时间。",
  "偏僻采集点的稀有物不会天天出现，顺路查看比专程空跑更稳。",
  "经营做大后更要留应急库存，账面富足不等于手上有可用物资。",
  "秘密笔记只提供线索，遇到与乡志冲突的说法，最好亲自核验。",
];

/** 获取当天的生活提示 */
export const getLivingTip = (day: number, year: number): string => {
  const index = ((year - 1) * 112 + day - 1) % LIVING_TIPS.length;
  return LIVING_TIPS[index]!;
};

/** 王大婶 - 万象食案工序推荐台词模板 */
export const getRecipeTipMessage = (
  recipeName: string,
  ingredientNames: string[],
): string => {
  return `今天校录万象食案的${recipeName}，备料为${ingredientNames.join("、")}。先核批次，再看火候。`;
};

/** 王大婶 - 无可校录食案时的通用台词 */
export const NO_RECIPE_TIP = "今日没有新增食案，先把已学料理的份量与火候做稳。";

/** 有每日提示功能的NPC ID列表 */
export const TIP_NPC_IDS = [
  "li_yu",
  "zhou_xiucai",
  "wang_dashen",
  "liu_cunzhang",
] as const;

/** NPC提示类型 */
export type TipNpcId = (typeof TIP_NPC_IDS)[number];

/** NPC提示标签 */
export const TIP_NPC_LABELS: Record<TipNpcId, string> = {
  li_yu: "水情鱼汛",
  zhou_xiucai: "今日运势",
  wang_dashen: "食案校录",
  liu_cunzhang: "生活提示",
};
