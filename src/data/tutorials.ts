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
      "陆镇岳说：「地契已经生效。纳戒里留有白菜灵种，先到灵田开一块地，让第一笔经营记录落下来。」",
  },
  {
    id: "tip_first_till",
    priority: 2,
    conditionKey: "allWasteland",
    message:
      "陆镇岳说：「荒地不直接认主。到灵田的「一键操作」中选择「一键开垦」，先把地脉梳理成可种灵畦。」",
  },
  {
    id: "tip_first_plant",
    priority: 3,
    conditionKey: "tilledNoPlanted",
    message:
      "陆镇岳说：「灵畦已经成形。用「一键种植」批量落种，省下的体力留给浇水和采集。」",
  },
  {
    id: "tip_first_water",
    priority: 4,
    conditionKey: "plantedUnwatered",
    message:
      "陆镇岳说：「今日水渠份额已经划给你。灵植缺水便会停长，用「一键浇水」完成这一轮灌溉。」",
  },
  {
    id: "tip_first_harvest",
    priority: 5,
    conditionKey: "hasHarvestable",
    message:
      "陆镇岳说：「灵植成熟时地块会泛金。及时收获，陆清和才能把首季产量记进乡志。」",
  },
  {
    id: "tip_sell_crops",
    priority: 6,
    conditionKey: "harvestedNeverSold",
    message:
      "陆镇岳说：「把准备出售的灵植放进出货灵匣。顾百川会在夜间统一核价，次日结算到你的账上。」",
  },
  {
    id: "tip_check_weather",
    priority: 7,
    conditionKey: "earlyGame",
    message: "陆镇岳说：「先看天气再排活计。水渠、采集和远行都受天候影响，临时硬改往往最耗体力。」",
  },
  {
    id: "tip_stamina",
    priority: 8,
    conditionKey: "staminaWasLow",
    message:
      "陆镇岳说：「体力见底就停工。透支会拖累次日恢复，吃些灵膳或及时休息都比硬撑划算。」",
  },
  {
    id: "tip_visit_shop",
    priority: 9,
    conditionKey: "neverVisitedShop",
    message: "陆镇岳说：「万象云集负责不同商铺的流通。先去顾百川的万象行看常备灵种，再按需要比较其他货源。」",
  },
  {
    id: "tip_try_fishing",
    priority: 10,
    conditionKey: "neverFished",
    message: "陆镇岳说：「星澜河东段已开放垂钓。带上鱼竿，别越过陆清和标出的护岸水线。」",
  },
  {
    id: "tip_try_mining",
    priority: 11,
    conditionKey: "neverMined",
    message:
      "陆镇岳说：「玄矿幽脉越深，矿材越好，风险也越高。带足补给，并给自己留下返程体力。」",
  },
  {
    id: "tip_talk_npc",
    priority: 12,
    conditionKey: "neverTalkedNpc",
    message: "陆镇岳说：「万象集的关系不是一张名单。先听每个人在意什么，再决定聊天、帮忙或送礼。」",
  },
  {
    id: "tip_quest_board",
    priority: 13,
    conditionKey: "neverCheckedQuests",
    message: "陆镇岳说：「天机榜收录集民公开委托。接单前看清数量和期限，承诺过的事要按时交付。」",
  },
  {
    id: "tip_try_cooking",
    priority: 14,
    conditionKey: "neverCooked",
    message:
      "陆镇岳说：「食谱学会后还要亲手开火。去灵膳房做一道菜，把原料变成可随身补充体力的灵膳。」",
  },
  {
    id: "tip_rain",
    priority: 15,
    conditionKey: "firstRainyDay",
    message:
      "陆镇岳说：「雨水会替你完成今日灌溉。把省下的时间用在加工、拜访或整理库存上。」",
  },
  {
    id: "tip_season_change",
    priority: 16,
    conditionKey: "justChangedSeason",
    message:
      "陆镇岳说：「换季后先核对灵种适生期。万象云集会调整当季货单，别把上一季的经验照搬过来。」",
  },
  {
    id: "tip_sprinkler",
    priority: 17,
    conditionKey: "hasCropNoSprinkler",
    message:
      "陆镇岳说：「灵田扩大后，逐格浇水会拖垮日程。到百匠造台或铁匠铺准备洒水器，把重复劳作交给器具。」",
  },
  {
    id: "tip_try_animal",
    priority: 18,
    conditionKey: "neverHadAnimal",
    message: "陆镇岳说：「若要发展牧养，先在商铺建好灵禽舍或灵牧苑。住处、饲料和照料时间都准备好，再迎动物进场。」",
  },
];
