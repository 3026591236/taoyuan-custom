import type { MainQuestDef } from "@/types";

/** 章节标题 */
export const CHAPTER_TITLES: Record<number, string> = {
  1: "初入仙乡",
  2: "扎根大地",
  3: "名扬四乡",
  4: "风云际会",
  5: "仙乡之主",
};

/** 50个主线委托定义，分5章每章10个 */
export const STORY_QUESTS: MainQuestDef[] = [
  // ============================================================
  // 第1章「初入仙乡」— 新手引导
  // ============================================================
  {
    id: "main_1_1",
    chapter: 1,
    order: 1,
    title: "地契第一行",
    description:
      "陆镇岳将新地契交给你：万象集只认亲手经营出的根基。先完成5次灵植收获，让这片灵田重新进入公议簿。",
    npcId: "liu_cunzhang",
    objectives: [{ type: "harvestCrops", label: "累计收获5次灵植", target: 5 }],
    moneyReward: 300,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 20 }],
  },
  {
    id: "main_1_2",
    chapter: 1,
    order: 2,
    title: "万象行立账",
    description: "顾百川愿意为新经营者单独开一页往来账。先与他成为相识，了解万象行如何周转灵种与日用物资。",
    npcId: "chen_bo",
    objectives: [
      {
        type: "npcFriendship",
        label: "与顾百川成为相识",
        npcId: "chen_bo",
        friendshipLevel: "acquaintance",
      },
    ],
    moneyReward: 200,
    friendshipReward: [{ npcId: "chen_bo", amount: 20 }],
  },
  {
    id: "main_1_3",
    chapter: 1,
    order: 3,
    title: "溪边垂钓",
    description: "沈听澜邀请你参加星澜河基础巡汛：先学会辨认水段与鱼情，再累计钓到5条合规渔获。",
    npcId: "qiu_yue",
    objectives: [{ type: "catchFish", label: "累计钓到5条鱼", target: 5 }],
    moneyReward: 300,
    itemReward: [{ itemId: "standard_bait", quantity: 10 }],
    friendshipReward: [{ npcId: "qiu_yue", amount: 20 }],
  },
  {
    id: "main_1_4",
    chapter: 1,
    order: 4,
    title: "初探玄矿幽脉",
    description: "裴砚川要求新入矿者先熟悉返程标、落石声与警戒线。到达玄矿幽脉第5层后安全返回。",
    npcId: "a_shi",
    objectives: [
      { type: "reachMineFloor", label: "玄矿幽脉到达第5层", target: 5 },
    ],
    moneyReward: 500,
    friendshipReward: [{ npcId: "a_shi", amount: 20 }],
  },
  {
    id: "main_1_5",
    chapter: 1,
    order: 5,
    title: "乡间美味",
    description: "王大婶说，种地辛苦，学做几道菜犒劳自己吧。",
    npcId: "wang_dashen",
    objectives: [{ type: "cookRecipes", label: "累计烹饪3道菜", target: 3 }],
    moneyReward: 300,
    friendshipReward: [{ npcId: "wang_dashen", amount: 20 }],
  },
  {
    id: "main_1_6",
    chapter: 1,
    order: 6,
    title: "公议簿初记",
    description: "陆镇岳把三件待办写进公议簿：真正的落脚不靠一句欢迎，而靠你是否愿意回应集民的实际难处。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "completeQuests", label: "累计完成3个委托", target: 3 },
    ],
    moneyReward: 500,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 20 }],
  },
  {
    id: "main_1_7",
    chapter: 1,
    order: 7,
    title: "木匠的考验",
    description: "小满说他师父赵木匠急需一批木材，帮忙送去30个木材吧。",
    npcId: "xiao_man",
    objectives: [
      {
        type: "deliverItem",
        label: "交付木材×30",
        itemId: "wood",
        itemQuantity: 30,
      },
    ],
    moneyReward: 500,
    itemReward: [{ itemId: "basic_fertilizer", quantity: 5 }],
    friendshipReward: [{ npcId: "xiao_man", amount: 30 }],
  },
  {
    id: "main_1_8",
    chapter: 1,
    order: 8,
    title: "林老的嘱托",
    description: "林老要配一副药方，需要一些草药，帮他收集10个草药吧。",
    npcId: "lin_lao",
    objectives: [
      {
        type: "deliverItem",
        label: "交付草药×10",
        itemId: "herb",
        itemQuantity: 10,
      },
    ],
    moneyReward: 500,
    friendshipReward: [{ npcId: "lin_lao", amount: 30 }],
  },
  {
    id: "main_1_9",
    chapter: 1,
    order: 9,
    title: "自立账目",
    description: "陆镇岳提醒你，善意要由稳定经营支撑。累计获得5000文，证明灵田已经具备独立周转的能力。",
    npcId: "liu_cunzhang",
    objectives: [{ type: "earnMoney", label: "累计获得5000文", target: 5000 }],
    moneyReward: 800,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 20 }],
  },
  {
    id: "main_1_10",
    chapter: 1,
    order: 10,
    title: "扎根仙乡",
    description:
      "要在万象仙乡真正站稳脚跟，灵耕百艺必须过硬。把灵耕练到3级吧。",
    npcId: "liu_cunzhang",
    objectives: [
      {
        type: "skillLevel",
        label: "灵耕百艺达到3级",
        skillType: "farming",
        target: 3,
      },
    ],
    moneyReward: 1000,
    itemReward: [{ itemId: "quality_fertilizer", quantity: 5 }],
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },

  // ============================================================
  // 第2章「扎根大地」— 中前期
  // ============================================================
  {
    id: "main_2_1",
    chapter: 2,
    order: 1,
    title: "丰收之路",
    description: "陆清和正在补绘灵田轮作图。累计完成50次收获，让她记录下土质、季节与产量如何彼此回应。",
    npcId: "liu_niang",
    objectives: [
      { type: "harvestCrops", label: "累计收获50次灵植", target: 50 },
    ],
    moneyReward: 800,
    friendshipReward: [{ npcId: "liu_niang", amount: 20 }],
  },
  {
    id: "main_2_2",
    chapter: 2,
    order: 2,
    title: "玄矿幽脉深处",
    description: "裴砚川在20层附近标出稳定铁矿带，同时提醒你记录支护和气流变化。安全抵达第20层。",
    npcId: "a_shi",
    objectives: [
      { type: "reachMineFloor", label: "玄矿幽脉到达第20层", target: 20 },
    ],
    moneyReward: 1000,
    itemReward: [{ itemId: "iron_ore", quantity: 10 }],
    friendshipReward: [{ npcId: "a_shi", amount: 20 }],
  },
  {
    id: "main_2_3",
    chapter: 2,
    order: 3,
    title: "渔翁之道",
    description: "李渔翁说，垂钓讲究心境。多钓几条鱼，领悟其中奥妙。",
    npcId: "li_yu",
    objectives: [{ type: "catchFish", label: "累计钓到30条鱼", target: 30 }],
    moneyReward: 800,
    friendshipReward: [{ npcId: "li_yu", amount: 20 }],
  },
  {
    id: "main_2_4",
    chapter: 2,
    order: 4,
    title: "公仓补缺",
    description:
      "陆镇岳将旧祠堂的储物间改作公共物资点。完成1个祠堂委托，把集民共同需要的物资真正补进公仓。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "completeBundles", label: "完成1个祠堂委托", target: 1 },
    ],
    moneyReward: 1000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },
  {
    id: "main_2_5",
    chapter: 2,
    order: 5,
    title: "铁匠的友谊",
    description: "孙铁匠需要一批铁矿来打造农具，送去15个铁矿表达心意。",
    npcId: "sun_tiejiang",
    objectives: [
      {
        type: "npcFriendship",
        label: "与孙铁匠成为相识",
        npcId: "sun_tiejiang",
        friendshipLevel: "acquaintance",
      },
      {
        type: "deliverItem",
        label: "交付铁矿×15",
        itemId: "iron_ore",
        itemQuantity: 15,
      },
    ],
    moneyReward: 1000,
    friendshipReward: [{ npcId: "sun_tiejiang", amount: 30 }],
  },
  {
    id: "main_2_6",
    chapter: 2,
    order: 6,
    title: "灵牧苑之梦",
    description: "大牛说养动物是件快乐的事，试着养3只牲畜吧。",
    npcId: "da_niu",
    objectives: [{ type: "ownAnimals", label: "拥有3只牲畜", target: 3 }],
    moneyReward: 1000,
    friendshipReward: [{ npcId: "da_niu", amount: 30 }],
  },
  {
    id: "main_2_7",
    chapter: 2,
    order: 7,
    title: "厨艺精进",
    description: "王大婶对你的厨艺赞不绝口，再多学几道菜吧。",
    npcId: "wang_dashen",
    objectives: [{ type: "cookRecipes", label: "累计烹饪15道菜", target: 15 }],
    moneyReward: 800,
    friendshipReward: [{ npcId: "wang_dashen", amount: 20 }],
  },
  {
    id: "main_2_8",
    chapter: 2,
    order: 8,
    title: "十件回音",
    description: "陆镇岳说公议簿上的每一件完成记录，背后都是一户人家的回音。累计完成10个委托。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "completeQuests", label: "累计完成10个委托", target: 10 },
    ],
    moneyReward: 1000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 20 }],
  },
  {
    id: "main_2_9",
    chapter: 2,
    order: 9,
    title: "四季物产",
    description: "顾百川要为万象行重编货目。发现30种不同物品，帮助他区分本地常产、季节货与稀缺物资。",
    npcId: "chen_bo",
    objectives: [
      { type: "discoverItems", label: "发现30种不同物品", target: 30 },
    ],
    moneyReward: 1200,
    friendshipReward: [{ npcId: "chen_bo", amount: 20 }],
  },
  {
    id: "main_2_10",
    chapter: 2,
    order: 10,
    title: "小有名气",
    description: "你在万象仙乡已经小有名气了。继续积累财富，证明自己的实力。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "earnMoney", label: "累计获得15000文", target: 15000 },
    ],
    moneyReward: 1500,
    itemReward: [{ itemId: "seed_peach", quantity: 3 }],
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },

  // ============================================================
  // 第3章「名扬四乡」— 中期
  // ============================================================
  {
    id: "main_3_1",
    chapter: 3,
    order: 1,
    title: "深渊挑战",
    description: "裴砚川的勘验图显示40层后矿压与生物活动同时增强。带足补给，抵达第40层并保留返程余力。",
    npcId: "a_shi",
    objectives: [
      { type: "reachMineFloor", label: "玄矿幽脉到达第40层", target: 40 },
    ],
    moneyReward: 1500,
    itemReward: [{ itemId: "gold_ore", quantity: 10 }],
    friendshipReward: [{ npcId: "a_shi", amount: 20 }],
  },
  {
    id: "main_3_2",
    chapter: 3,
    order: 2,
    title: "公议常席",
    description: "陆镇岳为你在公议堂留了一席。累计完成25个委托，证明你能听见不同集民的需要，也能把承诺落到实处。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "completeQuests", label: "累计完成25个委托", target: 25 },
    ],
    moneyReward: 1500,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 20 }],
  },
  {
    id: "main_3_3",
    chapter: 3,
    order: 3,
    title: "万物通鉴",
    description: "周秀才对你的见识很感兴趣，希望你能发现更多万象仙乡的物产。",
    npcId: "zhou_xiucai",
    objectives: [
      { type: "discoverItems", label: "发现50种不同物品", target: 50 },
    ],
    moneyReward: 1500,
    friendshipReward: [{ npcId: "zhou_xiucai", amount: 20 }],
  },
  {
    id: "main_3_4",
    chapter: 3,
    order: 4,
    title: "美食家",
    description: "胖婶说你的厨艺越来越好了，再接再厉！",
    npcId: "pang_shen",
    objectives: [{ type: "cookRecipes", label: "累计烹饪30道菜", target: 30 }],
    moneyReward: 1200,
    friendshipReward: [{ npcId: "pang_shen", amount: 20 }],
  },
  {
    id: "main_3_5",
    chapter: 3,
    order: 5,
    title: "一集之信",
    description: "陆镇岳认为秩序不能只靠章程，还要靠人与人之间可被验证的信任。与所有集民成为相识。",
    npcId: "liu_cunzhang",
    objectives: [
      {
        type: "npcAllFriendly",
        label: "与所有集民成为相识",
        friendshipLevel: "acquaintance",
      },
    ],
    moneyReward: 2000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },
  {
    id: "main_3_6",
    chapter: 3,
    order: 6,
    title: "灵牧苑扩张",
    description: "大牛对你的灵牧苑很感兴趣，把牲畜养到8只吧。",
    npcId: "da_niu",
    objectives: [{ type: "ownAnimals", label: "拥有8只牲畜", target: 8 }],
    moneyReward: 1500,
    friendshipReward: [{ npcId: "da_niu", amount: 20 }],
  },
  {
    id: "main_3_7",
    chapter: 3,
    order: 7,
    title: "渔王初成",
    description: "沈听澜认为熟练不只看数量，也看是否能迅速放回不合规渔获。累计钓到100条鱼，完善个人鱼汛记录。",
    npcId: "qiu_yue",
    objectives: [{ type: "catchFish", label: "累计钓到80条鱼", target: 80 }],
    moneyReward: 1500,
    friendshipReward: [{ npcId: "qiu_yue", amount: 20 }],
  },
  {
    id: "main_3_8",
    chapter: 3,
    order: 8,
    title: "出货达人",
    description: "何掌柜说你的出货种类越来越多，继续拓展销路。",
    npcId: "he_zhanggui",
    objectives: [{ type: "shipItems", label: "出货15种不同物品", target: 15 }],
    moneyReward: 2000,
    friendshipReward: [{ npcId: "he_zhanggui", amount: 20 }],
  },
  {
    id: "main_3_9",
    chapter: 3,
    order: 9,
    title: "技艺精通",
    description: "林老说人要有一技之长，把任意一项百艺练到7级。",
    npcId: "lin_lao",
    objectives: [{ type: "skillLevel", label: "任意百艺达到7级", target: 7 }],
    moneyReward: 2000,
    friendshipReward: [{ npcId: "lin_lao", amount: 20 }],
  },
  {
    id: "main_3_10",
    chapter: 3,
    order: 10,
    title: "声名远播",
    description: "外来商队开始主动询问你的货期。陆镇岳建议先稳住40000文累计收益，让名声建立在持续履约之上。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "earnMoney", label: "累计获得40000文", target: 40000 },
    ],
    moneyReward: 2500,
    itemReward: [{ itemId: "jade", quantity: 2 }],
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },

  // ============================================================
  // 第4章「风云际会」— 中后期
  // ============================================================
  {
    id: "main_4_1",
    chapter: 4,
    order: 1,
    title: "深渊征服者",
    description: "裴砚川确认80层附近存在高灵压活动区。抵达前完成装备与退场准备，不要把未知区域当成寻宝捷径。",
    npcId: "a_shi",
    objectives: [
      { type: "reachMineFloor", label: "玄矿幽脉到达第80层", target: 80 },
    ],
    moneyReward: 3000,
    itemReward: [{ itemId: "gold_ore", quantity: 15 }],
    friendshipReward: [{ npcId: "a_shi", amount: 20 }],
  },
  {
    id: "main_4_2",
    chapter: 4,
    order: 2,
    title: "降妖除魔",
    description: "云飞说山里的怪物越来越多了，需要有人出手清理。",
    npcId: "yun_fei",
    objectives: [
      { type: "killMonsters", label: "累计击杀150只怪物", target: 150 },
    ],
    moneyReward: 2500,
    friendshipReward: [{ npcId: "yun_fei", amount: 30 }],
  },
  {
    id: "main_4_3",
    chapter: 4,
    order: 3,
    title: "四簿合验",
    description:
      "陆镇岳准备核验水渠、集仓、医馆与百工四类公用记录。完成4个祠堂委托，让四项公共供给都能正常运转。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "completeBundles", label: "完成4个祠堂委托", target: 4 },
    ],
    moneyReward: 3000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },
  {
    id: "main_4_4",
    chapter: 4,
    order: 4,
    title: "百年好合",
    description: "陆镇岳说明万象集尊重每个人对伴侣与生活的选择。若你已找到愿意共同经营岁月的人，便完成一场由双方确认的婚礼。",
    npcId: "liu_cunzhang",
    objectives: [{ type: "married", label: "与心仪之人结婚" }],
    moneyReward: 2000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },
  {
    id: "main_4_5",
    chapter: 4,
    order: 5,
    title: "大厨之路",
    description: "王大婶说你的厨艺已经超过她了，继续挑战更多菜品。",
    npcId: "wang_dashen",
    objectives: [{ type: "cookRecipes", label: "累计烹饪50道菜", target: 50 }],
    moneyReward: 2500,
    friendshipReward: [{ npcId: "wang_dashen", amount: 20 }],
  },
  {
    id: "main_4_6",
    chapter: 4,
    order: 6,
    title: "博物全才",
    description: "周秀才说你的见识已经超越了大部分人，继续探索。",
    npcId: "zhou_xiucai",
    objectives: [
      { type: "discoverItems", label: "发现80种不同物品", target: 80 },
    ],
    moneyReward: 3000,
    friendshipReward: [{ npcId: "zhou_xiucai", amount: 20 }],
  },
  {
    id: "main_4_7",
    chapter: 4,
    order: 7,
    title: "物流大亨",
    description: "何掌柜惊叹于你的出货规模，继续扩大出货种类。",
    npcId: "he_zhanggui",
    objectives: [{ type: "shipItems", label: "出货30种不同物品", target: 30 }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: "he_zhanggui", amount: 20 }],
  },
  {
    id: "main_4_8",
    chapter: 4,
    order: 8,
    title: "知己之交",
    description: "人生得一知己足矣。和一位集民成为挚友吧。",
    npcId: "lin_lao",
    objectives: [
      {
        type: "npcFriendship",
        label: "与任意集民成为挚友",
        npcId: "_any",
        friendshipLevel: "bestFriend",
      },
    ],
    moneyReward: 2500,
    friendshipReward: [{ npcId: "lin_lao", amount: 20 }],
  },
  {
    id: "main_4_9",
    chapter: 4,
    order: 9,
    title: "丰收大亨",
    description: "陆清和将你的灵田列为乡志中的长期样本。累计收获300次灵植，为后来者留下完整的丰歉与轮作记录。",
    npcId: "liu_niang",
    objectives: [
      { type: "harvestCrops", label: "累计收获300次灵植", target: 300 },
    ],
    moneyReward: 3000,
    friendshipReward: [{ npcId: "liu_niang", amount: 20 }],
  },
  {
    id: "main_4_10",
    chapter: 4,
    order: 10,
    title: "富甲一方",
    description: "你的经营规模已足以影响万象集的物价与用工。陆镇岳要求你先建立100000文的稳定底盘，再参与更大的公共决策。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "earnMoney", label: "累计获得100000文", target: 100000 },
    ],
    moneyReward: 5000,
    itemReward: [{ itemId: "prismatic_shard", quantity: 1 }],
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },

  // ============================================================
  // 第5章「仙乡之主」— 后期/终章
  // ============================================================
  {
    id: "main_5_1",
    chapter: 5,
    order: 1,
    title: "玄矿幽脉之底",
    description: "裴砚川准备复核120层的旧封井记录。抵达目标层，为玄矿幽脉总图补上最深段的实测数据。",
    npcId: "a_shi",
    objectives: [
      { type: "reachMineFloor", label: "玄矿幽脉到达第120层", target: 120 },
    ],
    moneyReward: 5000,
    friendshipReward: [{ npcId: "a_shi", amount: 30 }],
  },
  {
    id: "main_5_2",
    chapter: 5,
    order: 2,
    title: "骷髅深渊",
    description: "裴砚川发现玄矿幽脉尽头与幽骨矿窟存在气流联系。进入前先确认新区域的支护、矿压与撤离路线。",
    npcId: "a_shi",
    objectives: [
      { type: "reachSkullFloor", label: "幽骨矿窟到达第50层", target: 50 },
    ],
    moneyReward: 5000,
    itemReward: [{ itemId: "iridium_ore", quantity: 5 }],
    friendshipReward: [{ npcId: "a_shi", amount: 30 }],
  },
  {
    id: "main_5_3",
    chapter: 5,
    order: 3,
    title: "万魔之敌",
    description: "云飞说你已经是万象仙乡最强的战士了，但怪物还在不断出现。",
    npcId: "yun_fei",
    objectives: [
      { type: "killMonsters", label: "累计击杀500只怪物", target: 500 },
    ],
    moneyReward: 5000,
    friendshipReward: [{ npcId: "yun_fei", amount: 30 }],
  },
  {
    id: "main_5_4",
    chapter: 5,
    order: 4,
    title: "全能大师",
    description: "林老说真正的大师是样样精通。把所有百艺都提升到8级。",
    npcId: "lin_lao",
    objectives: [
      { type: "allSkillsLevel", label: "所有百艺达到8级", target: 8 },
    ],
    moneyReward: 5000,
    friendshipReward: [{ npcId: "lin_lao", amount: 30 }],
  },
  {
    id: "main_5_5",
    chapter: 5,
    order: 5,
    title: "御厨",
    description: "王大婶说你的厨艺已臻化境，向着百菜目标前进！",
    npcId: "wang_dashen",
    objectives: [{ type: "cookRecipes", label: "累计烹饪80道菜", target: 80 }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: "wang_dashen", amount: 30 }],
  },
  {
    id: "main_5_6",
    chapter: 5,
    order: 6,
    title: "天伦之乐",
    description: "陆镇岳把家族新成员登记为独立的人，而不是家业的附属。若你与伴侣都已准备好，迎接第一个孩子。",
    npcId: "liu_cunzhang",
    objectives: [{ type: "hasChild", label: "迎来第一个孩子" }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },
  {
    id: "main_5_7",
    chapter: 5,
    order: 7,
    title: "仙乡知交",
    description: "陆镇岳邀请你参与年度共识会。与所有集民达到相知，理解他们各自的选择，而不只是完成他们的委托。",
    npcId: "liu_cunzhang",
    objectives: [
      {
        type: "npcAllFriendly",
        label: "与所有集民成为相知",
        friendshipLevel: "friendly",
      },
    ],
    moneyReward: 5000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },
  {
    id: "main_5_8",
    chapter: 5,
    order: 8,
    title: "出货全鉴",
    description: "何掌柜希望你能把万象仙乡所有物产都出货一遍。",
    npcId: "he_zhanggui",
    objectives: [{ type: "shipItems", label: "出货50种不同物品", target: 50 }],
    moneyReward: 5000,
    friendshipReward: [{ npcId: "he_zhanggui", amount: 30 }],
  },
  {
    id: "main_5_9",
    chapter: 5,
    order: 9,
    title: "公仓全录",
    description:
      "陆镇岳准备封存本年度公仓总录。完成全部6个祠堂委托，让每一类公共物资都有来源、有去向、有交代。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "completeBundles", label: "完成全部6个祠堂委托", target: 6 },
    ],
    moneyReward: 8000,
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 30 }],
  },
  {
    id: "main_5_10",
    chapter: 5,
    order: 10,
    title: "仙乡之主",
    description:
      "陆镇岳将最终公议交给你：财富与百艺不是统治他人的凭据，而是承担更大责任的能力。完成经营与百艺的最终检验。",
    npcId: "liu_cunzhang",
    objectives: [
      { type: "earnMoney", label: "累计获得300000文", target: 300000 },
      { type: "allSkillsLevel", label: "所有百艺达到10级", target: 10 },
    ],
    moneyReward: 10000,
    itemReward: [{ itemId: "prismatic_shard", quantity: 1 }],
    friendshipReward: [{ npcId: "liu_cunzhang", amount: 50 }],
  },
];

/** 根据ID获取主线委托 */
export const getStoryQuestById = (id: string): MainQuestDef | undefined => {
  return STORY_QUESTS.find((q) => q.id === id);
};

/** 根据章节和序号获取主线委托 */
export const getStoryQuestByOrder = (
  chapter: number,
  order: number,
): MainQuestDef | undefined => {
  return STORY_QUESTS.find((q) => q.chapter === chapter && q.order === order);
};

/** 获取下一个主线委托 */
export const getNextStoryQuest = (
  currentId: string,
): MainQuestDef | undefined => {
  const idx = STORY_QUESTS.findIndex((q) => q.id === currentId);
  if (idx === -1 || idx >= STORY_QUESTS.length - 1) return undefined;
  return STORY_QUESTS[idx + 1];
};

/** 获取某章的所有主线委托 */
export const getChapterQuests = (chapter: number): MainQuestDef[] => {
  return STORY_QUESTS.filter((q) => q.chapter === chapter);
};

/** 获取第一个主线委托 */
export const getFirstStoryQuest = (): MainQuestDef => {
  return STORY_QUESTS[0]!;
};
