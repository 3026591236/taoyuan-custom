import { getWeekday } from './timeConstants';
import { CROPS } from './crops';
import { getItemById } from './items';
/** 旅行商人商品池 */
export const TRAVELING_MERCHANT_POOL = [
    // 稀有宝石
    { itemId: 'dragon_jade', name: '龙玉', basePrice: 800 },
    { itemId: 'prismatic_shard', name: '五彩碎片', basePrice: 1200 },
    { itemId: 'moonstone', name: '月光石', basePrice: 400 },
    // 稀有采集物
    { itemId: 'ginseng', name: '人参', basePrice: 500 },
    { itemId: 'wintersweet', name: '腊梅', basePrice: 150 },
    // 特殊材料
    { itemId: 'iridium_ore', name: '铱矿', basePrice: 700 },
    { itemId: 'cloth', name: '布匹', basePrice: 1000 },
    // 稀有动物产品
    { itemId: 'rabbit_foot', name: '幸运兔脚', basePrice: 1200 },
    { itemId: 'truffle', name: '松露', basePrice: 1400 },
    // 特殊物品
    { itemId: 'rain_totem', name: '雨图腾', basePrice: 500 },
    { itemId: 'silk_ribbon', name: '丝帕', basePrice: 500 }
];
/** 判断某天是否为旅行商人出摊日（周五/周日） */
export const isTravelingMerchantDay = (day) => {
    const weekday = getWeekday(day);
    return weekday === 'fri' || weekday === 'sun';
};
/** 简单确定性伪随机数生成器 */
const seededRandom = (seed) => {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
};
/** 根据游戏日期生成旅行商人当日库存 */
export const generateMerchantStock = (year, seasonIndex, day, currentSeason) => {
    const seed = year * 10000 + seasonIndex * 1000 + day * 37;
    const rng = seededRandom(seed);
    const stock = [];
    // 从通用池随机选取 3-4 件
    const shuffled = [...TRAVELING_MERCHANT_POOL].sort(() => rng() - 0.5);
    const generalCount = 3 + Math.floor(rng() * 2); // 3 或 4
    for (let i = 0; i < Math.min(generalCount, shuffled.length); i++) {
        const item = shuffled[i];
        const priceVariation = 0.85 + rng() * 0.3; // ±15% 价格浮动
        let price = Math.floor(item.basePrice * priceVariation);
        // 防套利：商人售价不低于物品出售价的 2 倍
        const def = getItemById(item.itemId);
        if (def && def.sellPrice > 0)
            price = Math.max(price, def.sellPrice * 2);
        stock.push({
            itemId: item.itemId,
            name: item.name,
            price,
            quantity: 1 + Math.floor(rng() * 2) // 1-2 个
        });
    }
    // 从反季作物中选 1-2 种子
    const otherSeasonCrops = CROPS.filter(c => !c.season.includes(currentSeason) && c.seedPrice > 0);
    if (otherSeasonCrops.length > 0) {
        const shuffledCrops = [...otherSeasonCrops].sort(() => rng() - 0.5);
        const seedCount = 1 + Math.floor(rng() * 2); // 1 或 2
        for (let i = 0; i < Math.min(seedCount, shuffledCrops.length); i++) {
            const crop = shuffledCrops[i];
            stock.push({
                itemId: crop.seedId,
                name: `${crop.name}种子`,
                price: Math.max(Math.floor(crop.seedPrice * 4), crop.sellPrice * 2), // 4 倍反季溢价，且不低于作物售价×2
                quantity: 3 + Math.floor(rng() * 3) // 3-5 个
            });
        }
    }
    return stock;
};
