import type { Season } from "@/types";

/** 季节事件定义 */
export interface SeasonEventDef {
  id: string;
  name: string;
  season: Season;
  day: number; // 触发日期
  description: string;
  /** 事件效果 */
  effects: {
    friendshipBonus?: number; // 所有NPC好感加成
    moneyReward?: number; // 铜钱奖励
    itemReward?: { itemId: string; quantity: number }[];
    staminaBonus?: number; // 额外体力恢复
  };
  /** 事件文案 */
  narrative: string[];
  /** 是否为互动节日（有小游戏） */
  interactive?: boolean;
  /** 互动节日类型 */
  festivalType?:
    | "fishing_contest"
    | "harvest_fair"
    | "dragon_boat"
    | "lantern_riddle"
    | "pot_throwing"
    | "dumpling_making"
    | "firework_show"
    | "tea_contest"
    | "kite_flying";
}

export const SEASON_EVENTS: SeasonEventDef[] = [
  {
    id: "spring_festival",
    name: "启耕公议",
    season: "spring",
    day: 8,
    description: "核定水渠、灵种与轮作安排，为新一季共同启耕。",
    effects: {
      friendshipBonus: 5,
      itemReward: [{ itemId: "seed_cabbage", quantity: 5 }],
    },
    narrative: [
      "启耕公议在万象集广场开始了。",
      "陆镇岳先公布水渠轮值和公共田界，邀请每户当场校正。",
      "陆清和展开去年的丰歉图，将星澜河水位与各片灵田收成逐一对应。",
      "顾百川按集仓余量分发应急灵种，并把每笔领用记入可查的公账。",
      "你领到5枚白菜灵种，也在新一年的公议簿上留下了名字。",
      "所有集民好感度+5。",
    ],
  },
  {
    id: "summer_lantern",
    name: "荷灯节·垂钓大赛",
    season: "summer",
    day: 15,
    description: "河边放灯祈福，还有激动人心的垂钓大赛！",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "夏夜的灵溪边，集民们聚在一起放荷灯。",
      "秋月早早准备了各式各样的荷花灯。",
      "「快来快来！今年加了垂钓大赛环节！」",
      "柔和的灯光在水面上漂流，映着满天星斗。",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "fishing_contest",
  },
  {
    id: "autumn_harvest",
    name: "丰收宴·农展会",
    season: "autumn",
    day: 22,
    description: "比拼收成，看谁的展品最出色！",
    effects: {
      friendshipBonus: 5,
      staminaBonus: 30,
    },
    narrative: [
      "秋天的万象仙乡充满了丰收的气息。",
      "集民们带着自己最好的收成齐聚广场。",
      "陆镇岳宣布：「今年不只比品相，也要说清楚展品如何种成、耗了多少水肥。」",
      "丰盛的宴席让你恢复了额外30点体力。",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "harvest_fair",
  },
  {
    id: "winter_new_year",
    name: "除夕守岁",
    season: "winter",
    day: 28,
    description: "年终团聚，辞旧迎新。",
    effects: {
      friendshipBonus: 10,
      moneyReward: 300,
      itemReward: [
        { itemId: "herb", quantity: 3 },
        { itemId: "firewood", quantity: 5 },
      ],
    },
    narrative: [
      "冬季第28天——除夕之夜。",
      "万象仙乡家家户户张灯结彩，炊烟袅袅。",
      "陆清和把你请到乡志房后的旧宅：「年终记录封卷前，也该让记录里的人坐到一张桌上。」",
      "顾百川送来了集仓备下的年节食材，王大婶端上热气腾腾的年夜饭，林老递上一杯暖酒。",
      "阿石笨拙地递过一个红包：「……新年快乐。」",
      "秋月和小满在院子里放起了鞭炮，欢笑声响彻夜空。",
      "「新的一年，万象仙乡会越来越好的。」林老说。",
      "这是你在万象仙乡度过的第{year}个新年。",
      "收到红包300文和集民的礼物。所有集民好感度+10。",
    ],
  },

  // ==================== 新增节日 (10) ====================

  // --- 被动节日 ---
  {
    id: "yuan_ri",
    name: "元日",
    season: "spring",
    day: 1,
    description: "新年伊始，万象更新。",
    effects: {
      friendshipBonus: 5,
      moneyReward: 300,
      itemReward: [{ itemId: "seed_cabbage", quantity: 3 }],
    },
    narrative: [
      "春季第1天——元日。",
      "清晨的万象仙乡，家家户户门前挂上了新春联。",
      "顾百川把新旧两本账册并排封好，又递来一块蒸糕：「旧账有交代，新年才走得稳。」",
      "陆清和在乡志房门前挂起一串空白木牌，请集民写下今年最想被记住的一件小事。",
      "林老站在桃花树下，目光温和：「又是一年好光景。」",
      "收到了新春红包300文和灵种。所有集民好感度+5。",
    ],
  },
  {
    id: "hua_chao",
    name: "花朝节",
    season: "spring",
    day: 15,
    description: "百花生日，赏花祈福。",
    effects: {
      friendshipBonus: 5,
      itemReward: [
        { itemId: "peach", quantity: 3 },
        { itemId: "seed_chrysanthemum", quantity: 2 },
      ],
    },
    narrative: [
      "春季第15天——花朝节。",
      "万象仙乡的桃花开得正盛，花瓣随风纷飞。",
      "秋月编了一个花环戴在头上：「今天是百花的生日呢！」",
      "陆清和给盛放最早的花木挂上观察牌，记录花期、水分与授粉虫群，邀请大家认领一株照料。",
      "小满在花间追蝴蝶，笑声不断。",
      "你收到了桃花和花种。所有集民好感度+5。",
    ],
  },
  {
    id: "shang_si",
    name: "上巳踏青",
    season: "spring",
    day: 24,
    description: "踏春郊游，亲近自然。",
    effects: {
      friendshipBonus: 3,
      staminaBonus: 40,
      itemReward: [{ itemId: "wild_berry", quantity: 3 }],
    },
    narrative: [
      "春季第24天——上巳节。",
      "全村人一起去山间踏青，溪水潺潺，鸟语花香。",
      "阿石难得露出笑容，在溪边默默洗手祈福。",
      "秋月和小满在草地上编草环，你也加入了他们。",
      "林老采了一篮野果分给大家，清风拂面，身心舒畅。",
      "踏青让你精神焕发，体力恢复了40点。所有集民好感度+3。",
    ],
  },
  {
    id: "zhong_qiu",
    name: "中秋赏月",
    season: "autumn",
    day: 8,
    description: "月圆人圆，共赏明月。",
    effects: {
      friendshipBonus: 8,
      moneyReward: 500,
      itemReward: [{ itemId: "lotus_seed", quantity: 3 }],
    },
    narrative: [
      "秋季第8天——中秋节。",
      "入夜后，一轮明月高悬天际。",
      "集民们聚在广场上，桌上摆满了莲子糕和瓜果。",
      "顾百川公开核完节庆公账，把余下的钱换成月饼与莲子分给独居集民。",
      "陆清和架起一面月影尺，记录今夜星澜河的潮线，也请每个人写下一句远方来信。",
      "秋月静静望着月亮，似乎想起了什么。",
      "「谢谢你们，在万象仙乡的每一天都很开心。」她轻声说。",
      "收到500文和莲子。所有集民好感度+8。",
    ],
  },
  {
    id: "la_ba",
    name: "腊八粥会",
    season: "winter",
    day: 8,
    description: "腊八煮粥，驱寒暖胃。",
    effects: {
      friendshipBonus: 5,
      staminaBonus: 50,
      itemReward: [{ itemId: "rice", quantity: 5 }],
    },
    narrative: [
      "冬季第8天——腊八节。",
      "寒冬腊月，但村里的灶火烧得旺旺的。",
      "王大婶从清早就开始熬腊八粥，各家各户贡献了自己的食材。",
      "花生、红枣、莲子、稻米……满满一大锅粥咕嘟咕嘟冒着热气。",
      "陆清和替每一味食材标上提供者和产地：「一锅粥也有来路，记清楚才知道这个冬天是谁托住了谁。」",
      "一碗热粥下肚，浑身暖洋洋的。体力恢复50点。",
      "收到稻米。所有集民好感度+5。",
    ],
  },

  // --- 互动节日 ---
  {
    id: "duan_wu",
    name: "端午赛龙舟",
    season: "summer",
    day: 5,
    description: "龙舟竞渡，奋勇争先！",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "夏季第5天——端午节。",
      "星澜河上热闹非凡，三条龙舟一字排开！",
      "顾百川核对完各队器材与押注，封好账匣：「规则和赔付都贴在岸边，现在——开桨！」",
      "阿石和小满已经在船上摩拳擦掌了。",
      "「快上船！龙舟赛马上开始了！」秋月向你招手。",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "dragon_boat",
  },
  {
    id: "qi_xi",
    name: "七夕猜灯谜",
    season: "summer",
    day: 22,
    description: "七夕佳节，巧解灯谜。",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "夏季第22天——七夕节。",
      "夜幕降临，村里的广场上挂满了五彩灯笼。",
      "每个灯笼下面都系着一条灯谜，猜对了有奖！",
      "周秀才捋着胡须：「今年的灯谜可是老夫精心准备的。」",
      "秋月的眼睛亮晶晶的：「我们来比比谁猜得多！」",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "lantern_riddle",
  },
  {
    id: "chong_yang",
    name: "重阳投壶",
    season: "autumn",
    day: 15,
    description: "重阳登高，投壶竞技。",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "秋季第15天——重阳节。",
      "秋高气爽，集民们在广场上摆好了投壶的铜壶。",
      "林老笑道：「投壶乃古之雅事，今日大家一试身手。」",
      "阿石一言不发地拿起箭矢，眼神认真。",
      "小满跃跃欲试：「我一定能投中的！」",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "pot_throwing",
  },
  {
    id: "dong_zhi",
    name: "冬至包饺子",
    season: "winter",
    day: 15,
    description: "冬至大如年，饺子暖人间。",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "冬季第15天——冬至。",
      "北风呼号，但村里的堂屋热气腾腾。",
      "王大婶早早和好了面：「冬至不端饺子碗，冻掉耳朵没人管！」",
      "陆清和、秋月已经围在桌前擀皮包馅。桌边还放着一本记录各家馅料来历的小册。",
      "「别只比快。」陆清和向你招手，「包一个你家真正会在冬天做的味道。」",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "dumpling_making",
  },
  {
    id: "nian_mo",
    name: "年末烟花会",
    season: "winter",
    day: 22,
    description: "岁末将至，烟花照亮夜空。",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "冬季第22天——年末烟花会。",
      "这是除夕前最盛大的庆典。",
      "阿石搬来了好几箱烟花：「……我来放。」",
      "小满兴奋地跳来跳去：「烟花烟花！我最喜欢了！」",
      "秋月拉着你：「一起来记住这些美丽的烟花吧！」",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "firework_show",
  },
  {
    id: "dou_cha",
    name: "斗茶大会",
    season: "summer",
    day: 18,
    description: "以茶会友，品茗论道！",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "夏季第18天——斗茶大会。",
      "炎炎夏日，最宜品茗。",
      "林老在广场上架起茶台，清泉甘洌，茶器齐备。",
      "「好茶须好水、好火、好手。今日比的就是这个好字。」",
      "秋月已经磨好了茶具，阿石搬来了山泉水。",
      "春兰笑道：「都来试试身手，看谁泡出的茶最好！」",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "tea_contest",
  },
  {
    id: "qiu_yuan",
    name: "秋风筝会",
    season: "autumn",
    day: 18,
    description: "秋高气爽，放飞纸鸢！",
    effects: {
      friendshipBonus: 5,
    },
    narrative: [
      "秋季第18天——秋风筝会。",
      "天高云淡，正是放风筝的好时节。",
      "小满一大早就扎好了一个蝴蝶风筝：「快看快看！」",
      "阿石默默拿出一个鹰形风筝，做工精细。",
      "秋月红着脸递过一个花朵形状的：「我……我第一次做。」",
      "陆清和在每只纸鸢尾部系上测风纸条：「不只比高，也看看哪一种骨架最懂今天的风。」",
      "所有集民好感度+5。",
    ],
    interactive: true,
    festivalType: "kite_flying",
  },
];

/** 根据季节和日期获取当天事件 */
export const getTodayEvent = (
  season: Season,
  day: number,
): SeasonEventDef | undefined => {
  return SEASON_EVENTS.find((e) => e.season === season && e.day === day);
};
