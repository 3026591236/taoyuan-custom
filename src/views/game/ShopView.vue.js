/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { ShoppingCart, Coins, Sprout, Package, TrendingUp, Fish, Leaf, Sword, MapPin, ChevronRight, ChevronLeft, Store, CircleDot, Hammer, X, Crown, Footprints, Filter } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useFarmStore } from '@/stores/useFarmStore';
import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useShopStore } from '@/stores/useShopStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useWarehouseStore } from '@/stores/useWarehouseStore';
import { getItemById } from '@/data';
import { getCropBySeedId } from '@/data/crops';
import { SHOPS, isShopAvailable, getShopClosedReason } from '@/data/shops';
import { SHOP_WEAPONS, WEAPON_TYPE_NAMES } from '@/data/weapons';
import { FRUIT_TREE_DEFS } from '@/data/fruitTrees';
import { CRAFTABLE_RINGS } from '@/data/rings';
import { SHOP_HATS, CRAFTABLE_HATS } from '@/data/hats';
import { SHOP_SHOES, CRAFTABLE_SHOES } from '@/data/shoes';
import { HAY_PRICE } from '@/data/animals';
import { addLog } from '@/composables/useGameLog';
import { sfxBuy } from '@/composables/useAudio';
import { showFloat } from '@/composables/useGameLog';
import { handleBuySeed, handleSellItem, handleSellItemAll, handleSellAll, QUALITY_NAMES } from '@/composables/useFarmActions';
import { getDailyMarketInfo, MARKET_CATEGORY_NAMES, TREND_NAMES } from '@/data/market';
import { useTutorialStore } from '@/stores/useTutorialStore';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { defineComponent, h } from 'vue';
const ShopHeader = defineComponent({
    name: 'ShopHeader',
    props: {
        name: { type: String, required: true },
        npc: { type: String, required: true }
    },
    setup(props) {
        return () => h('div', { class: 'flex items-center space-x-2 mb-3' }, [
            h('h3', { class: 'text-accent text-sm' }, [`${props.name} · ${props.npc}`])
        ]);
    }
});
export default {};
const __VLS_self = (await import('vue')).defineComponent({ components: { ShopHeader } });
const __VLS_export = await (async () => {
    const RAIN_TOTEM_PRICE = 300;
    const WOOD_PRICE = 50;
    const shopStore = useShopStore();
    const playerStore = usePlayerStore();
    const inventoryStore = useInventoryStore();
    const farmStore = useFarmStore();
    const warehouseStore = useWarehouseStore();
    const walletStore = useWalletStore();
    const gameStore = useGameStore();
    const tutorialStore = useTutorialStore();
    const achievementStore = useAchievementStore();
    const tutorialHint = computed(() => {
        if (!tutorialStore.enabled || gameStore.year > 1)
            return null;
        if (achievementStore.stats.totalCropsHarvested === 0)
            return '万物铺出售各种种子，购买后去农场种植。上方可以切换「买入」和「卖出」。';
        return null;
    });
    // === 行情系统 ===
    const todayMarket = computed(() => getDailyMarketInfo(gameStore.year, gameStore.seasonIndex, gameStore.day, shopStore.getRecentShipping()));
    const getItemTrend = (itemId) => {
        const def = getItemById(itemId);
        if (!def)
            return null;
        const info = todayMarket.value.find(m => m.category === def.category);
        return info?.trend ?? null;
    };
    const getItemMultiplier = (itemId) => {
        const def = getItemById(itemId);
        if (!def)
            return 1;
        return todayMarket.value.find(m => m.category === def.category)?.multiplier ?? 1;
    };
    const trendColor = (trend) => {
        if (trend === 'boom')
            return 'text-danger';
        if (trend === 'rising')
            return 'text-success';
        if (trend === 'falling')
            return 'text-warning';
        if (trend === 'crash')
            return 'text-danger';
        return 'text-muted/40';
    };
    // 每次进入商圈页面，重置到商圈总览（避免跳过营业时间检查）
    shopStore.currentShopId = null;
    // === 移动端切换 ===
    const mobileTab = ref('buy');
    // === 一键出售确认 ===
    const showSellAllConfirm = ref(false);
    const confirmSellAll = () => {
        showSellAllConfirm.value = false;
        handleSellAll(sellFilter.value);
    };
    const shopModal = ref(null);
    const buyModalData = computed(() => {
        if (!shopModal.value || shopModal.value.type !== 'buy')
            return null;
        return shopModal.value;
    });
    const sellModalData = computed(() => {
        if (!shopModal.value || shopModal.value.type !== 'sell')
            return null;
        return shopModal.value;
    });
    const sellModalItem = computed(() => {
        const data = sellModalData.value;
        if (!data)
            return null;
        const item = inventoryStore.items[data.inventoryIndex];
        if (item && item.itemId === data.itemId && item.quality === data.quality)
            return item;
        return inventoryStore.items.find(i => i.itemId === data.itemId && i.quality === data.quality) ?? null;
    });
    const sellModalDef = computed(() => {
        const data = sellModalData.value;
        if (!data)
            return null;
        return getItemById(data.itemId) ?? null;
    });
    const buyQuantity = ref(1);
    const buyTotalPrice = computed(() => {
        if (!buyModalData.value)
            return 0;
        return buyModalData.value.price * buyQuantity.value;
    });
    const maxBuyQuantity = computed(() => {
        if (!buyModalData.value?.batchBuy)
            return 1;
        return Math.max(1, buyModalData.value.batchBuy.maxCount());
    });
    const setBuyQuantity = (val) => {
        buyQuantity.value = Math.max(1, Math.min(val, maxBuyQuantity.value));
    };
    const addBuyQuantity = (delta) => {
        setBuyQuantity(buyQuantity.value + delta);
    };
    const onBuyQuantityInput = (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val))
            setBuyQuantity(val);
    };
    const getMaxBuyable = (unitPrice, stockLimit) => {
        const affordable = unitPrice > 0 ? Math.floor(playerStore.money / unitPrice) : 0;
        let max = Math.max(1, affordable);
        if (stockLimit !== undefined)
            max = Math.min(max, stockLimit);
        return Math.min(max, 999);
    };
    const openBuyModal = (name, description, price, onBuy, canBuy, extraLines, buttonText, itemId) => {
        shopModal.value = { type: 'buy', name, description, price, onBuy, canBuy, extraLines, buttonText, itemId };
    };
    const openBatchBuyModal = (name, description, unitPrice, onBuySingle, canBuy, batchOnBuy, batchMaxCount, itemId) => {
        buyQuantity.value = 1;
        shopModal.value = {
            type: 'buy',
            name,
            description,
            price: unitPrice,
            onBuy: onBuySingle,
            canBuy,
            batchBuy: { onBuy: batchOnBuy, maxCount: batchMaxCount },
            itemId
        };
    };
    const sellQuantity = ref(1);
    const sellUnitPrice = computed(() => {
        const data = sellModalData.value;
        if (!data)
            return 0;
        return shopStore.calculateSellPrice(data.itemId, 1, data.quality);
    });
    const sellTotalPrice = computed(() => {
        return sellUnitPrice.value * sellQuantity.value;
    });
    const maxSellQuantity = computed(() => {
        const item = sellModalItem.value;
        if (!item)
            return 1;
        return item.quantity;
    });
    const setSellQuantity = (val) => {
        sellQuantity.value = Math.max(1, Math.min(val, maxSellQuantity.value));
    };
    const addSellQuantity = (delta) => {
        setSellQuantity(sellQuantity.value + delta);
    };
    const onSellQuantityInput = (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val))
            setSellQuantity(val);
    };
    const openSellModal = (itemId, quality, inventoryIndex) => {
        sellQuantity.value = 1;
        shopModal.value = { type: 'sell', itemId, quality, inventoryIndex };
    };
    const openWeaponModal = (w) => {
        const lines = [`${WEAPON_TYPE_NAMES[w.type]} · 攻击${w.attack} · 暴击${Math.round(w.critRate * 100)}%`];
        if (w.shopMaterials.length > 0) {
            lines.push('需要材料：' + w.shopMaterials.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、'));
        }
        openBuyModal(w.name, w.description, discounted(w.shopPrice), () => handleBuyWeapon(w), () => !inventoryStore.hasWeapon(w.id) && playerStore.money >= discounted(w.shopPrice) && hasWeaponMaterials(w), lines);
    };
    const openRingModal = (ring) => {
        const lines = [
            '效果：' +
                ring.effects
                    .map(eff => RING_EFFECT_LABELS[eff.type] + (eff.value > 0 && eff.value < 1 ? Math.round(eff.value * 100) + '%' : '+' + eff.value))
                    .join('、'),
            '材料：' +
                (ring.recipe?.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、') ?? '') +
                ` + ${ring.recipeMoney}文`
        ];
        openBuyModal(ring.name, ring.description, ring.recipeMoney, () => handleCraftRing(ring.id), () => canCraftRing(ring), lines, '合成');
    };
    const handleModalSell = (count) => {
        const modal = shopModal.value;
        if (!modal || modal.type !== 'sell')
            return;
        if (count === 1) {
            handleSellItem(modal.itemId, modal.quality);
        }
        else {
            handleSellItemAll(modal.itemId, count, modal.quality);
        }
        // 物品消耗完则关闭弹窗，否则修正出售数量
        const remaining = inventoryStore.items.find(i => i.itemId === modal.itemId && i.quality === modal.quality);
        if (!remaining) {
            shopModal.value = null;
        }
        else if (sellQuantity.value > remaining.quantity) {
            sellQuantity.value = remaining.quantity;
        }
    };
    // === 折扣系统 ===
    const hasDiscount = computed(() => walletStore.getShopDiscount() > 0 || inventoryStore.getRingEffectValue('shop_discount') > 0);
    const discountPercent = computed(() => {
        const w = walletStore.getShopDiscount();
        const r = inventoryStore.getRingEffectValue('shop_discount');
        return Math.round((1 - (1 - w) * (1 - r)) * 100);
    });
    const discounted = (price) => {
        const walletDiscount = walletStore.getShopDiscount();
        const ringDiscount = inventoryStore.getRingEffectValue('shop_discount');
        return Math.floor(price * (1 - walletDiscount) * (1 - ringDiscount));
    };
    // === 售价加成 ===
    const hasSellBonus = computed(() => inventoryStore.getRingEffectValue('sell_price_bonus') > 0);
    const sellBonusPercent = computed(() => Math.round(inventoryStore.getRingEffectValue('sell_price_bonus') * 100));
    // === 商铺开放状态 ===
    const isOpen = (shop) => {
        return isShopAvailable(shop, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season);
    };
    const closedReason = (shop) => {
        return getShopClosedReason(shop, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season);
    };
    const enterShop = (shopId) => {
        shopStore.currentShopId = shopId;
    };
    // === 旅行商人 ===
    if (shopStore.isMerchantHere) {
        shopStore.refreshMerchantStock();
    }
    const handleBuyFromTraveler = (itemId, name, originalPrice) => {
        const actualPrice = discounted(originalPrice);
        if (shopStore.buyFromTraveler(itemId)) {
            sfxBuy();
            showFloat(`-${actualPrice}文`, 'danger');
            addLog(`从旅行商人处购买了${name}。(-${actualPrice}文)`);
        }
        else {
            addLog('铜钱不足或背包已满。');
        }
    };
    // === 万物铺 ===
    const bagPrice = computed(() => {
        const level = (inventoryStore.capacity - 24) / 4;
        return 500 + level * 500;
    });
    const farmExpandInfo = computed(() => {
        const prices = {
            4: { newSize: 6, price: 2000 },
            6: { newSize: 8, price: 5000 }
        };
        if (gameStore.farmMapType === 'standard') {
            prices[8] = { newSize: 10, price: 10000 };
        }
        return prices[farmStore.farmSize] ?? null;
    });
    const handleBuyBag = () => {
        const actualPrice = discounted(bagPrice.value);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        if (inventoryStore.expandCapacity()) {
            addLog(`背包扩容至${inventoryStore.capacity}格！(-${actualPrice}文)`);
        }
        else {
            playerStore.earnMoney(actualPrice);
            addLog('背包已满级。');
        }
    };
    const warehouseExpandPrice = computed(() => {
        const level = warehouseStore.maxChests - 3;
        return 2000 + level * 2000;
    });
    const handleBuyWarehouseExpand = () => {
        const actualPrice = discounted(warehouseExpandPrice.value);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        if (warehouseStore.expandMaxChests()) {
            addLog(`仓库扩建至${warehouseStore.maxChests}个箱子槽位！(-${actualPrice}文)`);
        }
        else {
            playerStore.earnMoney(actualPrice);
            addLog('仓库已满级。');
        }
    };
    const handleBuyFarmExpand = () => {
        const info = farmExpandInfo.value;
        if (!info)
            return;
        const actualPrice = discounted(info.price);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        const newSize = farmStore.expandFarm();
        if (newSize) {
            addLog(`农场扩建至${newSize}×${newSize}！(-${actualPrice}文)`);
        }
        else {
            playerStore.earnMoney(actualPrice);
            addLog('农场已满级。');
        }
    };
    const seasonName = (season) => {
        return SEASON_NAMES[season] ?? season;
    };
    const getTravelerItemDesc = (itemId, quantity) => {
        const crop = getCropBySeedId(itemId);
        if (crop) {
            return `${crop.season.map(s => SEASON_NAMES[s]).join('/')}季 · ${crop.growthDays}天成熟 · 剩余${quantity}个`;
        }
        return `剩余${quantity}个`;
    };
    const handleBuySapling = (saplingId, price, treeName) => {
        const actualPrice = discounted(price);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        if (!inventoryStore.addItem(saplingId)) {
            playerStore.earnMoney(actualPrice);
            addLog('背包已满，无法购买。');
            return;
        }
        addLog(`购买了${treeName}苗。(-${actualPrice}文)`);
    };
    const handleBuyHay = () => {
        const actualPrice = discounted(HAY_PRICE);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        if (!inventoryStore.addItem('hay')) {
            playerStore.earnMoney(actualPrice);
            addLog('背包已满，无法购买。');
            return;
        }
        addLog(`购买了干草。(-${actualPrice}文)`);
    };
    // === 批量购买处理 ===
    const handleBatchBuySeed = (seedId, count) => {
        const seed = shopStore.availableSeeds.find(s => s.seedId === seedId);
        if (!seed)
            return;
        const unitPrice = discounted(seed.price);
        if (shopStore.buySeed(seedId, count)) {
            sfxBuy();
            showFloat(`-${unitPrice * count}文`, 'danger');
            addLog(`购买了${count}个${seed.cropName}种子。(-${unitPrice * count}文)`);
        }
        else {
            addLog('铜钱不足或背包已满。');
        }
    };
    const handleBatchBuyItem = (itemId, price, name, count) => {
        const unitPrice = discounted(price);
        if (shopStore.buyItem(itemId, price, count)) {
            sfxBuy();
            showFloat(`-${unitPrice * count}文`, 'danger');
            addLog(`购买了${count}个${name}。(-${unitPrice * count}文)`);
        }
        else {
            addLog('铜钱不足或背包已满。');
        }
    };
    const handleBatchBuySapling = (saplingId, price, treeName, count) => {
        const unitPrice = discounted(price);
        let bought = 0;
        for (let i = 0; i < count; i++) {
            if (!playerStore.spendMoney(unitPrice))
                break;
            if (!inventoryStore.addItem(saplingId)) {
                playerStore.earnMoney(unitPrice);
                break;
            }
            bought++;
        }
        if (bought > 0) {
            sfxBuy();
            showFloat(`-${unitPrice * bought}文`, 'danger');
            addLog(`购买了${bought}个${treeName}苗。(-${unitPrice * bought}文)`);
        }
        else {
            addLog('铜钱不足或背包已满。');
        }
    };
    const handleBatchBuyFromTraveler = (itemId, name, originalPrice, count) => {
        const unitPrice = discounted(originalPrice);
        let bought = 0;
        for (let i = 0; i < count; i++) {
            if (!shopStore.buyFromTraveler(itemId))
                break;
            bought++;
        }
        if (bought > 0) {
            sfxBuy();
            showFloat(`-${unitPrice * bought}文`, 'danger');
            addLog(`从旅行商人处购买了${bought}个${name}。(-${unitPrice * bought}文)`);
        }
        else {
            addLog('铜钱不足或背包已满。');
        }
    };
    // === 镖局 ===
    const hasWeaponMaterials = (w) => {
        for (const mat of w.shopMaterials) {
            if (inventoryStore.getItemCount(mat.itemId) < mat.quantity)
                return false;
        }
        return true;
    };
    const handleBuyWeapon = (w) => {
        if (inventoryStore.hasWeapon(w.id)) {
            addLog('你已经拥有这把武器了。');
            return;
        }
        if (w.shopPrice === null)
            return;
        const actualPrice = discounted(w.shopPrice);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        for (const mat of w.shopMaterials) {
            if (!inventoryStore.removeItem(mat.itemId, mat.quantity)) {
                playerStore.earnMoney(actualPrice);
                addLog('材料不足。');
                return;
            }
        }
        inventoryStore.addWeapon(w.id);
        const matStr = w.shopMaterials.length > 0 ? ' + ' + w.shopMaterials.map(m => `${getItemById(m.itemId)?.name}×${m.quantity}`).join(' + ') : '';
        addLog(`购买了${w.name}。(-${actualPrice}文${matStr})`);
    };
    // === 戒指合成 ===
    const RING_EFFECT_LABELS = {
        attack_bonus: '攻击',
        crit_rate_bonus: '暴击',
        defense_bonus: '减伤',
        vampiric: '吸血',
        max_hp_bonus: '生命',
        stamina_reduction: '全局体力减免',
        mining_stamina: '挖矿体力减免',
        farming_stamina: '农耕体力减免',
        fishing_stamina: '钓鱼体力减免',
        crop_quality_bonus: '作物品质',
        crop_growth_bonus: '生长加速',
        fish_quality_bonus: '鱼品质',
        fishing_calm: '鱼速降低',
        sell_price_bonus: '售价加成',
        shop_discount: '商店折扣',
        gift_friendship: '送礼好感',
        monster_drop_bonus: '怪物掉落',
        exp_bonus: '经验加成',
        treasure_find: '宝箱概率',
        ore_bonus: '矿石额外',
        luck: '幸运',
        travel_speed: '旅行加速'
    };
    const craftableRings = computed(() => CRAFTABLE_RINGS);
    const canCraftRing = (ring) => {
        if (!ring.recipe)
            return false;
        if (playerStore.money < ring.recipeMoney)
            return false;
        for (const mat of ring.recipe) {
            if (inventoryStore.getItemCount(mat.itemId) < mat.quantity)
                return false;
        }
        return true;
    };
    const handleCraftRing = (defId) => {
        const result = inventoryStore.craftRing(defId);
        if (result.success) {
            sfxBuy();
            showFloat(result.message, 'success');
            addLog(result.message);
        }
        else {
            addLog(result.message);
        }
    };
    // === 帽子/鞋子商店 ===
    const formatEffectLabel = (eff) => {
        const label = RING_EFFECT_LABELS[eff.type];
        return label + (eff.value > 0 && eff.value < 1 ? Math.round(eff.value * 100) + '%' : '+' + eff.value);
    };
    const openHatShopModal = (hat) => {
        const lines = ['效果：' + hat.effects.map(formatEffectLabel).join('、')];
        openBuyModal(hat.name, hat.description, discounted(hat.shopPrice), () => handleBuyHat(hat), () => !inventoryStore.hasHat(hat.id) && playerStore.money >= discounted(hat.shopPrice), lines);
    };
    const openShoeShopModal = (shoe) => {
        const lines = ['效果：' + shoe.effects.map(formatEffectLabel).join('、')];
        openBuyModal(shoe.name, shoe.description, discounted(shoe.shopPrice), () => handleBuyShoe(shoe), () => !inventoryStore.hasShoe(shoe.id) && playerStore.money >= discounted(shoe.shopPrice), lines);
    };
    const openHatCraftModal = (hat) => {
        const lines = [
            '效果：' + hat.effects.map(formatEffectLabel).join('、'),
            '材料：' +
                (hat.recipe?.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、') ?? '') +
                ` + ${hat.recipeMoney}文`
        ];
        openBuyModal(hat.name, hat.description, hat.recipeMoney, () => handleCraftHat(hat.id), () => canCraftHat(hat), lines, '合成');
    };
    const openShoeCraftModal = (shoe) => {
        const lines = [
            '效果：' + shoe.effects.map(formatEffectLabel).join('、'),
            '材料：' +
                (shoe.recipe?.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、') ?? '') +
                ` + ${shoe.recipeMoney}文`
        ];
        openBuyModal(shoe.name, shoe.description, shoe.recipeMoney, () => handleCraftShoe(shoe.id), () => canCraftShoe(shoe), lines, '合成');
    };
    const handleBuyHat = (hat) => {
        if (inventoryStore.hasHat(hat.id)) {
            addLog('你已经拥有这顶帽子了。');
            return;
        }
        if (hat.shopPrice === null)
            return;
        const actualPrice = discounted(hat.shopPrice);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        inventoryStore.addHat(hat.id);
        sfxBuy();
        showFloat(`-${actualPrice}文`, 'danger');
        addLog(`购买了${hat.name}。(-${actualPrice}文)`);
    };
    const handleBuyShoe = (shoe) => {
        if (inventoryStore.hasShoe(shoe.id)) {
            addLog('你已经拥有这双鞋子了。');
            return;
        }
        if (shoe.shopPrice === null)
            return;
        const actualPrice = discounted(shoe.shopPrice);
        if (!playerStore.spendMoney(actualPrice)) {
            addLog('铜钱不足。');
            return;
        }
        inventoryStore.addShoe(shoe.id);
        sfxBuy();
        showFloat(`-${actualPrice}文`, 'danger');
        addLog(`购买了${shoe.name}。(-${actualPrice}文)`);
    };
    const canCraftHat = (hat) => {
        if (!hat.recipe)
            return false;
        if (playerStore.money < hat.recipeMoney)
            return false;
        for (const mat of hat.recipe) {
            if (inventoryStore.getItemCount(mat.itemId) < mat.quantity)
                return false;
        }
        return true;
    };
    const canCraftShoe = (shoe) => {
        if (!shoe.recipe)
            return false;
        if (playerStore.money < shoe.recipeMoney)
            return false;
        for (const mat of shoe.recipe) {
            if (inventoryStore.getItemCount(mat.itemId) < mat.quantity)
                return false;
        }
        return true;
    };
    const handleCraftHat = (defId) => {
        const result = inventoryStore.craftHat(defId);
        if (result.success) {
            sfxBuy();
            showFloat(result.message, 'success');
            addLog(result.message);
        }
        else {
            addLog(result.message);
        }
    };
    const handleCraftShoe = (defId) => {
        const result = inventoryStore.craftShoe(defId);
        if (result.success) {
            sfxBuy();
            showFloat(result.message, 'success');
            addLog(result.message);
        }
        else {
            addLog(result.message);
        }
    };
    // === 通用 ===
    const handleBuyItem = (itemId, price, name) => {
        const actualPrice = discounted(price);
        if (shopStore.buyItem(itemId, price)) {
            addLog(`购买了${name}。(-${actualPrice}文)`);
        }
        else {
            addLog('铜钱不足或背包已满。');
        }
    };
    const qualityTextClass = (q, fallback = '') => {
        if (q === 'fine')
            return 'text-quality-fine';
        if (q === 'excellent')
            return 'text-quality-excellent';
        if (q === 'supreme')
            return 'text-quality-supreme';
        return fallback;
    };
    // === 出售筛选 ===
    const SELL_FILTER_CATEGORIES = [
        'crop',
        'fruit',
        'fish',
        'animal_product',
        'processed',
        'food',
        'ore',
        'gem',
        'material',
        'gift',
        'fossil',
        'artifact',
        'misc'
    ];
    const SELL_CATEGORY_NAMES = {
        crop: '作物',
        fruit: '水果',
        fish: '鱼类',
        animal_product: '畜产',
        processed: '加工品',
        food: '料理',
        ore: '矿石',
        gem: '宝石',
        material: '材料',
        gift: '礼物',
        fossil: '化石',
        artifact: '文物',
        misc: '杂货'
    };
    const showSellFilterModal = ref(false);
    const sellFilter = ref([]);
    const tempSellFilter = ref(new Set());
    const isSellFilterActive = computed(() => sellFilter.value.length > 0);
    const openSellFilterModal = () => {
        tempSellFilter.value = new Set(sellFilter.value);
        showSellFilterModal.value = true;
    };
    const toggleSellCategory = (cat) => {
        if (tempSellFilter.value.has(cat)) {
            tempSellFilter.value.delete(cat);
        }
        else {
            tempSellFilter.value.add(cat);
        }
    };
    const handleSaveSellFilter = () => {
        sellFilter.value = [...tempSellFilter.value];
        showSellFilterModal.value = false;
    };
    const handleClearSellFilter = () => {
        tempSellFilter.value = new Set();
    };
    const sellableItems = computed(() => {
        const allowed = sellFilter.value.length > 0 ? new Set(sellFilter.value) : null;
        return inventoryStore.items
            .map((inv, index) => {
            const def = getItemById(inv.itemId);
            return { ...inv, def, originalIndex: index };
        })
            .filter(item => item.def && !item.locked && (!allowed || allowed.has(item.def.category)));
    });
    const __VLS_ctx = {
        ...{},
        ...{},
    };
    const __VLS_componentsOption = { ShopHeader };
    let __VLS_components;
    let __VLS_intrinsics;
    let __VLS_directives;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    if (__VLS_ctx.tutorialHint) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/50 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.tutorialHint);
    }
    if (__VLS_ctx.shopStore.currentShopId) {
        const __VLS_0 = Button || Button;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            ...{ class: "mb-3 w-full md:w-auto" },
            icon: (__VLS_ctx.ChevronLeft),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            ...{ class: "mb-3 w-full md:w-auto" },
            icon: (__VLS_ctx.ChevronLeft),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_5;
        const __VLS_6 = {
            /** @type {typeof __VLS_5.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopStore.currentShopId))
                    throw 0;
                return __VLS_ctx.shopStore.currentShopId = null;
                // @ts-ignore
                [tutorialHint, tutorialHint, shopStore, shopStore, ChevronLeft,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:w-auto']} */ ;
        const { default: __VLS_7 } = __VLS_3.slots;
        // @ts-ignore
        [];
        var __VLS_3;
        var __VLS_4;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5 mb-3 md:hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
    const __VLS_8 = Button || Button;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.mobileTab === 'buy' }) },
        icon: (__VLS_ctx.ShoppingCart),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.mobileTab === 'buy' }) },
        icon: (__VLS_ctx.ShoppingCart),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_13;
    const __VLS_14 = {
        /** @type {typeof __VLS_13.click} */
        onClick: (...[$event]) => {
            return __VLS_ctx.mobileTab = 'buy';
            // @ts-ignore
            [mobileTab, mobileTab, ShoppingCart,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_15 } = __VLS_11.slots;
    // @ts-ignore
    [];
    var __VLS_11;
    var __VLS_12;
    const __VLS_16 = Button || Button;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.mobileTab === 'sell' }) },
        icon: (__VLS_ctx.Coins),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.mobileTab === 'sell' }) },
        icon: (__VLS_ctx.Coins),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_21;
    const __VLS_22 = {
        /** @type {typeof __VLS_21.click} */
        onClick: (...[$event]) => {
            return __VLS_ctx.mobileTab = 'sell';
            // @ts-ignore
            [mobileTab, mobileTab, Coins,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_23 } = __VLS_19.slots;
    // @ts-ignore
    [];
    var __VLS_19;
    var __VLS_20;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col md:flex-row space-x-0 md:space-x-4 md:space-y-6" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:space-x-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:space-y-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1" },
        ...{ class: ({ 'hidden md:block': __VLS_ctx.mobileTab === 'sell' }) },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:block']} */ ;
    if (__VLS_ctx.hasDiscount) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-success text-xs mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        (__VLS_ctx.discountPercent);
    }
    if (!__VLS_ctx.shopStore.currentShopId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "text-accent text-sm mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        let __VLS_24;
        /** @ts-ignore @type { | typeof __VLS_components.Store} */
        Store;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_26 = __VLS_25({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        if (__VLS_ctx.shopStore.isMerchantHere) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "text-accent text-sm mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            let __VLS_29;
            /** @ts-ignore @type { | typeof __VLS_components.MapPin} */
            MapPin;
            // @ts-ignore
            const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
                size: (14),
                ...{ class: "inline" },
            }));
            const __VLS_31 = __VLS_30({
                size: (14),
                ...{ class: "inline" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_30));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            for (const [item] of __VLS_vFor((__VLS_ctx.shopStore.travelingStock))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(!__VLS_ctx.shopStore.currentShopId))
                                throw 0;
                            if (!(__VLS_ctx.shopStore.isMerchantHere))
                                throw 0;
                            return;
                            item.quantity > 0 &&
                                __VLS_ctx.openBatchBuyModal(item.name, __VLS_ctx.getTravelerItemDesc(item.itemId, item.quantity), __VLS_ctx.discounted(item.price), () => __VLS_ctx.handleBuyFromTraveler(item.itemId, item.name, item.price), () => item.quantity > 0 && __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(item.price), count => __VLS_ctx.handleBatchBuyFromTraveler(item.itemId, item.name, item.price, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(item.price), item.quantity), item.itemId);
                            // @ts-ignore
                            [shopStore, shopStore, shopStore, mobileTab, hasDiscount, discountPercent, openBatchBuyModal, getTravelerItemDesc, discounted, discounted, discounted, handleBuyFromTraveler, playerStore, handleBatchBuyFromTraveler, getMaxBuyable,];
                        } },
                    key: (item.itemId),
                    ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2" },
                    ...{ class: (item.quantity > 0 ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50') },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (item.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-muted text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (__VLS_ctx.getTravelerItemDesc(item.itemId, item.quantity));
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-accent whitespace-nowrap" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                (__VLS_ctx.discounted(item.price));
                // @ts-ignore
                [getTravelerItemDesc, discounted,];
            }
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [shop] of __VLS_vFor((__VLS_ctx.SHOPS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        return __VLS_ctx.isOpen(shop) && __VLS_ctx.enterShop(shop.id);
                        // @ts-ignore
                        [SHOPS, isOpen, enterShop,];
                    } },
                key: (shop.id),
                ...{ class: "flex items-center justify-between border rounded-xs px-3 py-2" },
                ...{ class: (__VLS_ctx.isOpen(shop) ? 'border-accent/30 cursor-pointer hover:bg-accent/5' : 'border-accent/10 opacity-50') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (shop.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted text-xs ml-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            (shop.npcName);
            if (!__VLS_ctx.isOpen(shop)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-danger text-xs ml-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
                (__VLS_ctx.closedReason(shop));
            }
            if (__VLS_ctx.isOpen(shop)) {
                let __VLS_34;
                /** @ts-ignore @type { | typeof __VLS_components.ChevronRight} */
                ChevronRight;
                // @ts-ignore
                const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
                    size: (14),
                    ...{ class: "text-muted" },
                }));
                const __VLS_36 = __VLS_35({
                    size: (14),
                    ...{ class: "text-muted" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_35));
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
            // @ts-ignore
            [isOpen, isOpen, isOpen, closedReason,];
        }
    }
    else if (__VLS_ctx.shopStore.currentShopId === 'wanwupu') {
        let __VLS_39;
        /** @ts-ignore @type { | typeof __VLS_components.ShopHeader} */
        ShopHeader;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
            name: "万物铺",
            npc: "陈伯",
        }));
        const __VLS_41 = __VLS_40({
            name: "万物铺",
            npc: "陈伯",
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        let __VLS_44;
        /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
        Sprout;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_46 = __VLS_45({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [seed] of __VLS_vFor((__VLS_ctx.shopStore.availableSeeds))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(seed.cropName + '种子', `${seed.season.map(s => __VLS_ctx.SEASON_NAMES[s]).join('/')}季 · ${seed.growthDays}天成熟 → 售${seed.sellPrice}文`, __VLS_ctx.discounted(seed.price), () => __VLS_ctx.handleBuySeed(seed.seedId), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(seed.price), count => __VLS_ctx.handleBatchBuySeed(seed.seedId, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(seed.price)), seed.seedId);
                        // @ts-ignore
                        [shopStore, shopStore, openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, SEASON_NAMES, handleBuySeed, handleBatchBuySeed,];
                    } },
                key: (seed.seedId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (seed.cropName);
            if (seed.regrowth) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (seed.season.map(s => __VLS_ctx.SEASON_NAMES[s]).join('/'));
            (seed.growthDays);
            (seed.regrowth ? ` · 每${seed.regrowthDays}天再收` : '');
            (seed.sellPrice);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(seed.price));
            // @ts-ignore
            [discounted, SEASON_NAMES,];
        }
        if (__VLS_ctx.shopStore.availableSeeds.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            let __VLS_49;
            /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
            Sprout;
            // @ts-ignore
            const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
                size: (24),
                ...{ class: "text-muted/30 mb-2" },
            }));
            const __VLS_51 = __VLS_50({
                size: (24),
                ...{ class: "text-muted/30 mb-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_50));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_54;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_56 = __VLS_55({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_55));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        if (__VLS_ctx.inventoryStore.capacity < 60) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!(__VLS_ctx.inventoryStore.capacity < 60))
                            throw 0;
                        return;
                        __VLS_ctx.openBuyModal('背包扩容', `当前${__VLS_ctx.inventoryStore.capacity}格 → ${__VLS_ctx.inventoryStore.capacity + 4}格`, __VLS_ctx.discounted(__VLS_ctx.bagPrice), __VLS_ctx.handleBuyBag, () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(__VLS_ctx.bagPrice));
                        // @ts-ignore
                        [shopStore, discounted, discounted, playerStore, inventoryStore, inventoryStore, inventoryStore, openBuyModal, bagPrice, bagPrice, handleBuyBag,];
                    } },
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.inventoryStore.capacity);
            (__VLS_ctx.inventoryStore.capacity + 4);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(__VLS_ctx.bagPrice));
        }
        if (__VLS_ctx.warehouseStore.unlocked && __VLS_ctx.warehouseStore.maxChests < __VLS_ctx.warehouseStore.MAX_CHESTS_CAP) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!(__VLS_ctx.warehouseStore.unlocked && __VLS_ctx.warehouseStore.maxChests < __VLS_ctx.warehouseStore.MAX_CHESTS_CAP))
                            throw 0;
                        return;
                        __VLS_ctx.openBuyModal('仓库扩建', `箱子槽位 ${__VLS_ctx.warehouseStore.maxChests} → ${__VLS_ctx.warehouseStore.maxChests + 1}`, __VLS_ctx.discounted(__VLS_ctx.warehouseExpandPrice), __VLS_ctx.handleBuyWarehouseExpand, () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(__VLS_ctx.warehouseExpandPrice));
                        // @ts-ignore
                        [discounted, discounted, discounted, playerStore, inventoryStore, inventoryStore, openBuyModal, bagPrice, warehouseStore, warehouseStore, warehouseStore, warehouseStore, warehouseStore, warehouseExpandPrice, warehouseExpandPrice, handleBuyWarehouseExpand,];
                    } },
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.warehouseStore.maxChests);
            (__VLS_ctx.warehouseStore.maxChests + 1);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(__VLS_ctx.warehouseExpandPrice));
        }
        if (__VLS_ctx.farmExpandInfo) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!(__VLS_ctx.farmExpandInfo))
                            throw 0;
                        return;
                        __VLS_ctx.openBuyModal('农场扩建', `${__VLS_ctx.farmStore.farmSize}×${__VLS_ctx.farmStore.farmSize} → ${__VLS_ctx.farmExpandInfo.newSize}×${__VLS_ctx.farmExpandInfo.newSize}`, __VLS_ctx.discounted(__VLS_ctx.farmExpandInfo.price), __VLS_ctx.handleBuyFarmExpand, () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(__VLS_ctx.farmExpandInfo.price));
                        // @ts-ignore
                        [discounted, discounted, discounted, playerStore, openBuyModal, warehouseStore, warehouseStore, warehouseExpandPrice, farmExpandInfo, farmExpandInfo, farmExpandInfo, farmExpandInfo, farmExpandInfo, farmStore, farmStore, handleBuyFarmExpand,];
                    } },
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.farmStore.farmSize);
            (__VLS_ctx.farmStore.farmSize);
            (__VLS_ctx.farmExpandInfo.newSize);
            (__VLS_ctx.farmExpandInfo.newSize);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(__VLS_ctx.farmExpandInfo.price));
        }
        for (const [tree] of __VLS_vFor((__VLS_ctx.FRUIT_TREE_DEFS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(tree.name + '苗', `28天成熟 · ${__VLS_ctx.seasonName(tree.fruitSeason)}季产${tree.fruitName}`, __VLS_ctx.discounted(tree.saplingPrice), () => __VLS_ctx.handleBuySapling(tree.saplingId, tree.saplingPrice, tree.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(tree.saplingPrice), count => __VLS_ctx.handleBatchBuySapling(tree.saplingId, tree.saplingPrice, tree.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(tree.saplingPrice)), tree.saplingId);
                        // @ts-ignore
                        [openBatchBuyModal, discounted, discounted, discounted, discounted, playerStore, getMaxBuyable, farmExpandInfo, farmExpandInfo, farmExpandInfo, farmStore, farmStore, FRUIT_TREE_DEFS, seasonName, handleBuySapling, handleBatchBuySapling,];
                    } },
                key: (tree.saplingId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (tree.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.seasonName(tree.fruitSeason));
            (tree.fruitName);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(tree.saplingPrice));
            // @ts-ignore
            [discounted, seasonName,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.shopStore.currentShopId))
                        throw 0;
                    if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                        throw 0;
                    return;
                    __VLS_ctx.openBatchBuyModal('干草', '喂养牲畜用', __VLS_ctx.discounted(__VLS_ctx.HAY_PRICE), __VLS_ctx.handleBuyHay, () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(__VLS_ctx.HAY_PRICE), count => __VLS_ctx.handleBatchBuyItem('hay', __VLS_ctx.HAY_PRICE, '干草', count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(__VLS_ctx.HAY_PRICE)), 'hay');
                    // @ts-ignore
                    [openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, HAY_PRICE, HAY_PRICE, HAY_PRICE, HAY_PRICE, handleBuyHay, handleBatchBuyItem,];
                } },
            ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (__VLS_ctx.discounted(__VLS_ctx.HAY_PRICE));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.shopStore.currentShopId))
                        throw 0;
                    if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                        throw 0;
                    return;
                    __VLS_ctx.openBatchBuyModal('木材', '建筑和加工的基础材料', __VLS_ctx.discounted(__VLS_ctx.WOOD_PRICE), () => __VLS_ctx.handleBuyItem('wood', __VLS_ctx.WOOD_PRICE, '木材'), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(__VLS_ctx.WOOD_PRICE), count => __VLS_ctx.handleBatchBuyItem('wood', __VLS_ctx.WOOD_PRICE, '木材', count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(__VLS_ctx.WOOD_PRICE)), 'wood');
                    // @ts-ignore
                    [openBatchBuyModal, discounted, discounted, discounted, discounted, playerStore, getMaxBuyable, HAY_PRICE, handleBatchBuyItem, WOOD_PRICE, WOOD_PRICE, WOOD_PRICE, WOOD_PRICE, WOOD_PRICE, handleBuyItem,];
                } },
            ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (__VLS_ctx.discounted(__VLS_ctx.WOOD_PRICE));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.shopStore.currentShopId))
                        throw 0;
                    if (!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                        throw 0;
                    return;
                    __VLS_ctx.openBatchBuyModal('雨图腾', '使用后可以让明天下雨', __VLS_ctx.discounted(__VLS_ctx.RAIN_TOTEM_PRICE), () => __VLS_ctx.handleBuyItem('rain_totem', __VLS_ctx.RAIN_TOTEM_PRICE, '雨图腾'), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(__VLS_ctx.RAIN_TOTEM_PRICE), count => __VLS_ctx.handleBatchBuyItem('rain_totem', __VLS_ctx.RAIN_TOTEM_PRICE, '雨图腾', count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(__VLS_ctx.RAIN_TOTEM_PRICE)), 'rain_totem');
                    // @ts-ignore
                    [openBatchBuyModal, discounted, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, WOOD_PRICE, handleBuyItem, RAIN_TOTEM_PRICE, RAIN_TOTEM_PRICE, RAIN_TOTEM_PRICE, RAIN_TOTEM_PRICE, RAIN_TOTEM_PRICE,];
                } },
            ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (__VLS_ctx.discounted(__VLS_ctx.RAIN_TOTEM_PRICE));
    }
    else if (__VLS_ctx.shopStore.currentShopId === 'tiejiangpu') {
        let __VLS_59;
        /** @ts-ignore @type { | typeof __VLS_components.ShopHeader} */
        ShopHeader;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
            name: "铁匠铺",
            npc: "孙铁匠",
        }));
        const __VLS_61 = __VLS_60({
            name: "铁匠铺",
            npc: "孙铁匠",
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.shopStore.blacksmithItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(item.name, item.description, __VLS_ctx.discounted(item.price), () => __VLS_ctx.handleBuyItem(item.itemId, item.price, item.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(item.price), count => __VLS_ctx.handleBatchBuyItem(item.itemId, item.price, item.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(item.price)), item.itemId);
                        // @ts-ignore
                        [shopStore, shopStore, openBatchBuyModal, discounted, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, handleBuyItem, RAIN_TOTEM_PRICE,];
                    } },
                key: (item.itemId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (item.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (item.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(item.price));
            // @ts-ignore
            [discounted,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_64;
        /** @ts-ignore @type { | typeof __VLS_components.CircleDot} */
        CircleDot;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent1(__VLS_64, new __VLS_64({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_66 = __VLS_65({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [ring] of __VLS_vFor((__VLS_ctx.craftableRings))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        return __VLS_ctx.openRingModal(ring);
                        // @ts-ignore
                        [craftableRings, openRingModal,];
                    } },
                key: (ring.id),
                ...{ class: "flex items-center justify-between border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
                ...{ class: (__VLS_ctx.canCraftRing(ring) ? 'border-success/50 bg-success/5' : 'border-accent/20') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (ring.name);
            if (__VLS_ctx.inventoryStore.hasRing(ring.id)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (ring.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (ring.recipeMoney);
            // @ts-ignore
            [inventoryStore, canCraftRing,];
        }
        if (__VLS_ctx.craftableRings.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            let __VLS_69;
            /** @ts-ignore @type { | typeof __VLS_components.CircleDot} */
            CircleDot;
            // @ts-ignore
            const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
                size: (24),
                ...{ class: "text-muted/30 mb-2" },
            }));
            const __VLS_71 = __VLS_70({
                size: (24),
                ...{ class: "text-muted/30 mb-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_70));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_74;
        /** @ts-ignore @type { | typeof __VLS_components.Crown} */
        Crown;
        // @ts-ignore
        const __VLS_75 = __VLS_asFunctionalComponent1(__VLS_74, new __VLS_74({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_76 = __VLS_75({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_75));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [hat] of __VLS_vFor((__VLS_ctx.CRAFTABLE_HATS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        return __VLS_ctx.openHatCraftModal(hat);
                        // @ts-ignore
                        [craftableRings, CRAFTABLE_HATS, openHatCraftModal,];
                    } },
                key: (hat.id),
                ...{ class: "flex items-center justify-between border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
                ...{ class: (__VLS_ctx.canCraftHat(hat) ? 'border-success/50 bg-success/5' : 'border-accent/20') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (hat.name);
            if (__VLS_ctx.inventoryStore.hasHat(hat.id)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (hat.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (hat.recipeMoney);
            // @ts-ignore
            [inventoryStore, canCraftHat,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_79;
        /** @ts-ignore @type { | typeof __VLS_components.Footprints} */
        Footprints;
        // @ts-ignore
        const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_81 = __VLS_80({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_80));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [shoe] of __VLS_vFor((__VLS_ctx.CRAFTABLE_SHOES))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        return __VLS_ctx.openShoeCraftModal(shoe);
                        // @ts-ignore
                        [CRAFTABLE_SHOES, openShoeCraftModal,];
                    } },
                key: (shoe.id),
                ...{ class: "flex items-center justify-between border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
                ...{ class: (__VLS_ctx.canCraftShoe(shoe) ? 'border-success/50 bg-success/5' : 'border-accent/20') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (shoe.name);
            if (__VLS_ctx.inventoryStore.hasShoe(shoe.id)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (shoe.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (shoe.recipeMoney);
            // @ts-ignore
            [inventoryStore, canCraftShoe,];
        }
    }
    else if (__VLS_ctx.shopStore.currentShopId === 'biaoju') {
        let __VLS_84;
        /** @ts-ignore @type { | typeof __VLS_components.ShopHeader} */
        ShopHeader;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
            name: "镖局",
            npc: "云飞",
        }));
        const __VLS_86 = __VLS_85({
            name: "镖局",
            npc: "云飞",
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        let __VLS_89;
        /** @ts-ignore @type { | typeof __VLS_components.Sword} */
        Sword;
        // @ts-ignore
        const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_91 = __VLS_90({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_90));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [w] of __VLS_vFor((__VLS_ctx.SHOP_WEAPONS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        return __VLS_ctx.openWeaponModal(w);
                        // @ts-ignore
                        [shopStore, SHOP_WEAPONS, openWeaponModal,];
                    } },
                key: (w.id),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (w.name);
            if (__VLS_ctx.inventoryStore.hasWeapon(w.id)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.WEAPON_TYPE_NAMES[w.type]);
            (w.attack);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(w.shopPrice));
            // @ts-ignore
            [discounted, inventoryStore, WEAPON_TYPE_NAMES,];
        }
    }
    else if (__VLS_ctx.shopStore.currentShopId === 'yugupu') {
        let __VLS_94;
        /** @ts-ignore @type { | typeof __VLS_components.ShopHeader} */
        ShopHeader;
        // @ts-ignore
        const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({
            name: "渔具铺",
            npc: "秋月",
        }));
        const __VLS_96 = __VLS_95({
            name: "渔具铺",
            npc: "秋月",
        }, ...__VLS_functionalComponentArgsRest(__VLS_95));
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        let __VLS_99;
        /** @ts-ignore @type { | typeof __VLS_components.Fish} */
        Fish;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_101 = __VLS_100({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [b] of __VLS_vFor((__VLS_ctx.shopStore.shopBaits))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(b.name, b.description, __VLS_ctx.discounted(b.price), () => __VLS_ctx.handleBuyItem(b.id, b.price, b.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(b.price), count => __VLS_ctx.handleBatchBuyItem(b.id, b.price, b.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(b.price)), b.id);
                        // @ts-ignore
                        [shopStore, shopStore, openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, handleBuyItem,];
                    } },
                key: (b.id),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (b.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (b.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(b.price));
            // @ts-ignore
            [discounted,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_104;
        /** @ts-ignore @type { | typeof __VLS_components.Fish} */
        Fish;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent1(__VLS_104, new __VLS_104({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_106 = __VLS_105({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [t] of __VLS_vFor((__VLS_ctx.shopStore.shopTackles))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(t.name, t.description, __VLS_ctx.discounted(t.price), () => __VLS_ctx.handleBuyItem(t.id, t.price, t.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(t.price), count => __VLS_ctx.handleBatchBuyItem(t.id, t.price, t.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(t.price)), t.id);
                        // @ts-ignore
                        [shopStore, openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, handleBuyItem,];
                    } },
                key: (t.id),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (t.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (t.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(t.price));
            // @ts-ignore
            [discounted,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_109;
        /** @ts-ignore @type { | typeof __VLS_components.Fish} */
        Fish;
        // @ts-ignore
        const __VLS_110 = __VLS_asFunctionalComponent1(__VLS_109, new __VLS_109({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_111 = __VLS_110({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_110));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.shopStore.fishingShopItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(item.name, item.description, __VLS_ctx.discounted(item.price), () => __VLS_ctx.handleBuyItem(item.itemId, item.price, item.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(item.price), count => __VLS_ctx.handleBatchBuyItem(item.itemId, item.price, item.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(item.price)), item.itemId);
                        // @ts-ignore
                        [shopStore, openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, handleBuyItem,];
                    } },
                key: (item.itemId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (item.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (item.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(item.price));
            // @ts-ignore
            [discounted,];
        }
    }
    else if (__VLS_ctx.shopStore.currentShopId === 'yaopu') {
        let __VLS_114;
        /** @ts-ignore @type { | typeof __VLS_components.ShopHeader} */
        ShopHeader;
        // @ts-ignore
        const __VLS_115 = __VLS_asFunctionalComponent1(__VLS_114, new __VLS_114({
            name: "药铺",
            npc: "林老",
        }));
        const __VLS_116 = __VLS_115({
            name: "药铺",
            npc: "林老",
        }, ...__VLS_functionalComponentArgsRest(__VLS_115));
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        let __VLS_119;
        /** @ts-ignore @type { | typeof __VLS_components.Leaf} */
        Leaf;
        // @ts-ignore
        const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_121 = __VLS_120({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_120));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [f] of __VLS_vFor((__VLS_ctx.shopStore.shopFertilizers))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'yaopu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(f.name, f.description, __VLS_ctx.discounted(f.price), () => __VLS_ctx.handleBuyItem(f.id, f.price, f.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(f.price), count => __VLS_ctx.handleBatchBuyItem(f.id, f.price, f.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(f.price)), f.id);
                        // @ts-ignore
                        [shopStore, shopStore, openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, handleBuyItem,];
                    } },
                key: (f.id),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (f.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (f.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(f.price));
            // @ts-ignore
            [discounted,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_124;
        /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
        Sprout;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_126 = __VLS_125({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.shopStore.apothecaryItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'yaopu'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(item.name, item.description, __VLS_ctx.discounted(item.price), () => __VLS_ctx.handleBuyItem(item.itemId, item.price, item.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(item.price), count => __VLS_ctx.handleBatchBuyItem(item.itemId, item.price, item.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(item.price)), item.itemId);
                        // @ts-ignore
                        [shopStore, openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, handleBuyItem,];
                    } },
                key: (item.itemId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (item.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (item.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(item.price));
            // @ts-ignore
            [discounted,];
        }
    }
    else if (__VLS_ctx.shopStore.currentShopId === 'chouduanzhuang') {
        let __VLS_129;
        /** @ts-ignore @type { | typeof __VLS_components.ShopHeader} */
        ShopHeader;
        // @ts-ignore
        const __VLS_130 = __VLS_asFunctionalComponent1(__VLS_129, new __VLS_129({
            name: "绸缎庄",
            npc: "素素",
        }));
        const __VLS_131 = __VLS_130({
            name: "绸缎庄",
            npc: "素素",
        }, ...__VLS_functionalComponentArgsRest(__VLS_130));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.shopStore.textileItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yaopu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'chouduanzhuang'))
                            throw 0;
                        return;
                        __VLS_ctx.openBatchBuyModal(item.name, item.description, __VLS_ctx.discounted(item.price), () => __VLS_ctx.handleBuyItem(item.itemId, item.price, item.name), () => __VLS_ctx.playerStore.money >= __VLS_ctx.discounted(item.price), count => __VLS_ctx.handleBatchBuyItem(item.itemId, item.price, item.name, count), () => __VLS_ctx.getMaxBuyable(__VLS_ctx.discounted(item.price)), item.itemId);
                        // @ts-ignore
                        [shopStore, shopStore, openBatchBuyModal, discounted, discounted, discounted, playerStore, getMaxBuyable, handleBatchBuyItem, handleBuyItem,];
                    } },
                key: (item.itemId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (item.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (item.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(item.price));
            // @ts-ignore
            [discounted,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_134;
        /** @ts-ignore @type { | typeof __VLS_components.Crown} */
        Crown;
        // @ts-ignore
        const __VLS_135 = __VLS_asFunctionalComponent1(__VLS_134, new __VLS_134({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_136 = __VLS_135({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_135));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [hat] of __VLS_vFor((__VLS_ctx.SHOP_HATS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yaopu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'chouduanzhuang'))
                            throw 0;
                        return __VLS_ctx.openHatShopModal(hat);
                        // @ts-ignore
                        [SHOP_HATS, openHatShopModal,];
                    } },
                key: (hat.id),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (hat.name);
            if (__VLS_ctx.inventoryStore.hasHat(hat.id)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (hat.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(hat.shopPrice));
            // @ts-ignore
            [discounted, inventoryStore,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "text-accent text-sm mb-2 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        let __VLS_139;
        /** @ts-ignore @type { | typeof __VLS_components.Footprints} */
        Footprints;
        // @ts-ignore
        const __VLS_140 = __VLS_asFunctionalComponent1(__VLS_139, new __VLS_139({
            size: (14),
            ...{ class: "inline" },
        }));
        const __VLS_141 = __VLS_140({
            size: (14),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_140));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [shoe] of __VLS_vFor((__VLS_ctx.SHOP_SHOES))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.shopStore.currentShopId))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'wanwupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'tiejiangpu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'biaoju'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yugupu'))
                            throw 0;
                        if (!!(__VLS_ctx.shopStore.currentShopId === 'yaopu'))
                            throw 0;
                        if (!(__VLS_ctx.shopStore.currentShopId === 'chouduanzhuang'))
                            throw 0;
                        return __VLS_ctx.openShoeShopModal(shoe);
                        // @ts-ignore
                        [SHOP_SHOES, openShoeShopModal,];
                    } },
                key: (shoe.id),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (shoe.name);
            if (__VLS_ctx.inventoryStore.hasShoe(shoe.id)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-muted text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (shoe.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (__VLS_ctx.discounted(shoe.shopPrice));
            // @ts-ignore
            [discounted, inventoryStore,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1" },
        ...{ class: ({ 'hidden md:block': __VLS_ctx.mobileTab === 'buy' }) },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-accent text-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    let __VLS_144;
    /** @ts-ignore @type { | typeof __VLS_components.TrendingUp} */
    TrendingUp;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent1(__VLS_144, new __VLS_144({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_146 = __VLS_145({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    const __VLS_149 = Button || Button;
    // @ts-ignore
    const __VLS_150 = __VLS_asFunctionalComponent1(__VLS_149, new __VLS_149({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.isSellFilterActive }) },
        icon: (__VLS_ctx.Filter),
        iconSize: (12),
    }));
    const __VLS_151 = __VLS_150({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.isSellFilterActive }) },
        icon: (__VLS_ctx.Filter),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_150));
    let __VLS_154;
    const __VLS_155 = {
        /** @type {typeof __VLS_154.click} */
        onClick: (__VLS_ctx.openSellFilterModal),
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_156 } = __VLS_152.slots;
    // @ts-ignore
    [mobileTab, isSellFilterActive, Filter, openSellFilterModal,];
    var __VLS_152;
    var __VLS_153;
    if (__VLS_ctx.sellableItems.length > 0) {
        const __VLS_157 = Button || Button;
        // @ts-ignore
        const __VLS_158 = __VLS_asFunctionalComponent1(__VLS_157, new __VLS_157({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Coins),
        }));
        const __VLS_159 = __VLS_158({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Coins),
        }, ...__VLS_functionalComponentArgsRest(__VLS_158));
        let __VLS_162;
        const __VLS_163 = {
            /** @type {typeof __VLS_162.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.sellableItems.length > 0))
                    throw 0;
                return __VLS_ctx.showSellAllConfirm = true;
                // @ts-ignore
                [Coins, sellableItems, showSellAllConfirm,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
        const { default: __VLS_164 } = __VLS_160.slots;
        // @ts-ignore
        [];
        var __VLS_160;
        var __VLS_161;
    }
    if (__VLS_ctx.hasSellBonus) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-success text-xs mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.sellBonusPercent);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/30 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-4" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-4']} */ ;
    for (const [m] of __VLS_vFor((__VLS_ctx.todayMarket))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (m.category),
            ...{ class: "text-[10px] whitespace-nowrap mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.MARKET_CATEGORY_NAMES[m.category]);
        if (m.trend === 'stable') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted/40 ml-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "ml-0.5" },
                ...{ class: (__VLS_ctx.trendColor(m.trend)) },
            });
            /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
            (m.multiplier >= 1 ? '↑' : '↓');
            (Math.round(Math.abs(m.multiplier - 1) * 100));
        }
        // @ts-ignore
        [hasSellBonus, sellBonusPercent, todayMarket, MARKET_CATEGORY_NAMES, trendColor,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.sellableItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    return __VLS_ctx.openSellModal(item.itemId, item.quality, item.originalIndex);
                    // @ts-ignore
                    [sellableItems, openSellModal,];
                } },
            key: (item.originalIndex),
            ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-sm" },
            ...{ class: (__VLS_ctx.qualityTextClass(item.quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (item.def?.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted text-xs ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (item.quantity);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (__VLS_ctx.shopStore.calculateSellPrice(item.itemId, 1, item.quality));
        if (__VLS_ctx.getItemTrend(item.itemId) === 'rising' || __VLS_ctx.getItemTrend(item.itemId) === 'boom') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (Math.round((__VLS_ctx.getItemMultiplier(item.itemId) - 1) * 100));
        }
        else if (__VLS_ctx.getItemTrend(item.itemId) === 'falling' || __VLS_ctx.getItemTrend(item.itemId) === 'crash') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px]" },
                ...{ class: (__VLS_ctx.getItemTrend(item.itemId) === 'crash' ? 'text-danger' : 'text-warning') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            (Math.round((1 - __VLS_ctx.getItemMultiplier(item.itemId)) * 100));
        }
        // @ts-ignore
        [shopStore, qualityTextClass, getItemTrend, getItemTrend, getItemTrend, getItemTrend, getItemTrend, getItemMultiplier, getItemMultiplier,];
    }
    if (__VLS_ctx.sellableItems.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_165;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_166 = __VLS_asFunctionalComponent1(__VLS_165, new __VLS_165({
            size: (100),
            ...{ class: "text-muted/30 my-4" },
        }));
        const __VLS_167 = __VLS_166({
            size: (100),
            ...{ class: "text-muted/30 my-4" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_166));
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['my-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    let __VLS_170;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_171 = __VLS_asFunctionalComponent1(__VLS_170, new __VLS_170({
        name: "panel-fade",
    }));
    const __VLS_172 = __VLS_171({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_171));
    const { default: __VLS_175 } = __VLS_173.slots;
    if (__VLS_ctx.showSellFilterModal) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showSellFilterModal))
                        throw 0;
                    return __VLS_ctx.showSellFilterModal = false;
                    // @ts-ignore
                    [sellableItems, showSellFilterModal, showSellFilterModal,];
                } },
            ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel max-w-xs w-full relative" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showSellFilterModal))
                        throw 0;
                    return __VLS_ctx.showSellFilterModal = false;
                    // @ts-ignore
                    [showSellFilterModal,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_176;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({
            size: (14),
        }));
        const __VLS_178 = __VLS_177({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_177));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-3 gap-1.5 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        for (const [cat] of __VLS_vFor((__VLS_ctx.SELL_FILTER_CATEGORIES))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showSellFilterModal))
                            throw 0;
                        return __VLS_ctx.toggleSellCategory(cat);
                        // @ts-ignore
                        [SELL_FILTER_CATEGORIES, toggleSellCategory,];
                    } },
                key: (cat),
                ...{ class: "border rounded-xs px-1.5 py-1 text-center text-xs cursor-pointer transition-colors" },
                ...{ class: (__VLS_ctx.tempSellFilter.has(cat) ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/20 text-muted hover:bg-accent/5') },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            (__VLS_ctx.SELL_CATEGORY_NAMES[cat]);
            // @ts-ignore
            [tempSellFilter, SELL_CATEGORY_NAMES,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        const __VLS_181 = Button || Button;
        // @ts-ignore
        const __VLS_182 = __VLS_asFunctionalComponent1(__VLS_181, new __VLS_181({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }));
        const __VLS_183 = __VLS_182({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_182));
        let __VLS_186;
        const __VLS_187 = {
            /** @type {typeof __VLS_186.click} */
            onClick: (__VLS_ctx.handleClearSellFilter),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_188 } = __VLS_184.slots;
        // @ts-ignore
        [handleClearSellFilter,];
        var __VLS_184;
        var __VLS_185;
        const __VLS_189 = Button || Button;
        // @ts-ignore
        const __VLS_190 = __VLS_asFunctionalComponent1(__VLS_189, new __VLS_189({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
        }));
        const __VLS_191 = __VLS_190({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_190));
        let __VLS_194;
        const __VLS_195 = {
            /** @type {typeof __VLS_194.click} */
            onClick: (__VLS_ctx.handleSaveSellFilter),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_196 } = __VLS_192.slots;
        // @ts-ignore
        [handleSaveSellFilter,];
        var __VLS_192;
        var __VLS_193;
    }
    // @ts-ignore
    [];
    var __VLS_173;
    let __VLS_197;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_198 = __VLS_asFunctionalComponent1(__VLS_197, new __VLS_197({
        name: "panel-fade",
    }));
    const __VLS_199 = __VLS_198({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_198));
    const { default: __VLS_202 } = __VLS_200.slots;
    if (__VLS_ctx.showSellAllConfirm) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showSellAllConfirm))
                        throw 0;
                    return __VLS_ctx.showSellAllConfirm = false;
                    // @ts-ignore
                    [showSellAllConfirm, showSellAllConfirm,];
                } },
            ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel max-w-xs w-full" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        (__VLS_ctx.sellableItems.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        const __VLS_203 = Button || Button;
        // @ts-ignore
        const __VLS_204 = __VLS_asFunctionalComponent1(__VLS_203, new __VLS_203({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }));
        const __VLS_205 = __VLS_204({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_204));
        let __VLS_208;
        const __VLS_209 = {
            /** @type {typeof __VLS_208.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showSellAllConfirm))
                    throw 0;
                return __VLS_ctx.showSellAllConfirm = false;
                // @ts-ignore
                [sellableItems, showSellAllConfirm,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_210 } = __VLS_206.slots;
        // @ts-ignore
        [];
        var __VLS_206;
        var __VLS_207;
        const __VLS_211 = Button || Button;
        // @ts-ignore
        const __VLS_212 = __VLS_asFunctionalComponent1(__VLS_211, new __VLS_211({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center btn-danger" },
            icon: (__VLS_ctx.Coins),
        }));
        const __VLS_213 = __VLS_212({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center btn-danger" },
            icon: (__VLS_ctx.Coins),
        }, ...__VLS_functionalComponentArgsRest(__VLS_212));
        let __VLS_216;
        const __VLS_217 = {
            /** @type {typeof __VLS_216.click} */
            onClick: (__VLS_ctx.confirmSellAll),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
        const { default: __VLS_218 } = __VLS_214.slots;
        // @ts-ignore
        [Coins, confirmSellAll,];
        var __VLS_214;
        var __VLS_215;
    }
    // @ts-ignore
    [];
    var __VLS_200;
    let __VLS_219;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_220 = __VLS_asFunctionalComponent1(__VLS_219, new __VLS_219({
        name: "panel-fade",
    }));
    const __VLS_221 = __VLS_220({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_220));
    const { default: __VLS_224 } = __VLS_222.slots;
    if (__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                        throw 0;
                    return __VLS_ctx.shopModal = null;
                    // @ts-ignore
                    [buyModalData, sellModalData, sellModalItem, shopModal,];
                } },
            ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-40']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        if (__VLS_ctx.buyModalData) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "game-panel max-w-xs w-full relative" },
            });
            /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['relative']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData))
                            throw 0;
                        return __VLS_ctx.shopModal = null;
                        // @ts-ignore
                        [buyModalData, shopModal,];
                    } },
                ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
            });
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
            let __VLS_225;
            /** @ts-ignore @type { | typeof __VLS_components.X} */
            X;
            // @ts-ignore
            const __VLS_226 = __VLS_asFunctionalComponent1(__VLS_225, new __VLS_225({
                size: (14),
            }));
            const __VLS_227 = __VLS_226({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_226));
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm text-accent mb-2 pr-6" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['pr-6']} */ ;
            (__VLS_ctx.buyModalData.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.buyModalData.description);
            for (const [line, i] of __VLS_vFor((__VLS_ctx.buyModalData.extraLines))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    key: (i),
                    ...{ class: "text-xs text-muted mt-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                (line);
                // @ts-ignore
                [buyModalData, buyModalData, buyModalData,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.buyModalData.batchBuy ? '单价' : '价格');
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.buyModalData.price);
            if (__VLS_ctx.buyModalData.itemId) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mt-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (__VLS_ctx.inventoryStore.getItemCount(__VLS_ctx.buyModalData.itemId));
            }
            if (__VLS_ctx.buyModalData.batchBuy) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                const __VLS_230 = Button || Button;
                // @ts-ignore
                const __VLS_231 = __VLS_asFunctionalComponent1(__VLS_230, new __VLS_230({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.buyQuantity <= 1),
                }));
                const __VLS_232 = __VLS_231({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.buyQuantity <= 1),
                }, ...__VLS_functionalComponentArgsRest(__VLS_231));
                let __VLS_235;
                const __VLS_236 = {
                    /** @type {typeof __VLS_235.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData.batchBuy))
                            throw 0;
                        return __VLS_ctx.addBuyQuantity(-1);
                        // @ts-ignore
                        [inventoryStore, buyModalData, buyModalData, buyModalData, buyModalData, buyModalData, buyQuantity, addBuyQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_237 } = __VLS_233.slots;
                // @ts-ignore
                [];
                var __VLS_233;
                var __VLS_234;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ onInput: (__VLS_ctx.onBuyQuantityInput) },
                    type: "number",
                    value: (__VLS_ctx.buyQuantity),
                    min: "1",
                    max: (__VLS_ctx.maxBuyQuantity),
                    ...{ class: "w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors" },
                });
                /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                const __VLS_238 = Button || Button;
                // @ts-ignore
                const __VLS_239 = __VLS_asFunctionalComponent1(__VLS_238, new __VLS_238({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.buyQuantity >= __VLS_ctx.maxBuyQuantity),
                }));
                const __VLS_240 = __VLS_239({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.buyQuantity >= __VLS_ctx.maxBuyQuantity),
                }, ...__VLS_functionalComponentArgsRest(__VLS_239));
                let __VLS_243;
                const __VLS_244 = {
                    /** @type {typeof __VLS_243.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData.batchBuy))
                            throw 0;
                        return __VLS_ctx.addBuyQuantity(1);
                        // @ts-ignore
                        [buyQuantity, buyQuantity, addBuyQuantity, onBuyQuantityInput, maxBuyQuantity, maxBuyQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_245 } = __VLS_241.slots;
                // @ts-ignore
                [];
                var __VLS_241;
                var __VLS_242;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                const __VLS_246 = Button || Button;
                // @ts-ignore
                const __VLS_247 = __VLS_asFunctionalComponent1(__VLS_246, new __VLS_246({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.buyQuantity <= 1),
                }));
                const __VLS_248 = __VLS_247({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.buyQuantity <= 1),
                }, ...__VLS_functionalComponentArgsRest(__VLS_247));
                let __VLS_251;
                const __VLS_252 = {
                    /** @type {typeof __VLS_251.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData.batchBuy))
                            throw 0;
                        return __VLS_ctx.setBuyQuantity(1);
                        // @ts-ignore
                        [buyQuantity, setBuyQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_253 } = __VLS_249.slots;
                // @ts-ignore
                [];
                var __VLS_249;
                var __VLS_250;
                const __VLS_254 = Button || Button;
                // @ts-ignore
                const __VLS_255 = __VLS_asFunctionalComponent1(__VLS_254, new __VLS_254({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.buyQuantity >= __VLS_ctx.maxBuyQuantity),
                }));
                const __VLS_256 = __VLS_255({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.buyQuantity >= __VLS_ctx.maxBuyQuantity),
                }, ...__VLS_functionalComponentArgsRest(__VLS_255));
                let __VLS_259;
                const __VLS_260 = {
                    /** @type {typeof __VLS_259.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData.batchBuy))
                            throw 0;
                        return __VLS_ctx.setBuyQuantity(__VLS_ctx.maxBuyQuantity);
                        // @ts-ignore
                        [buyQuantity, maxBuyQuantity, maxBuyQuantity, setBuyQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_261 } = __VLS_257.slots;
                // @ts-ignore
                [];
                var __VLS_257;
                var __VLS_258;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mt-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                (__VLS_ctx.buyTotalPrice);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            if (__VLS_ctx.buyModalData.batchBuy) {
                const __VLS_262 = Button || Button;
                // @ts-ignore
                const __VLS_263 = __VLS_asFunctionalComponent1(__VLS_262, new __VLS_262({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full justify-center" },
                    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.buyModalData.canBuy() }) },
                    disabled: (!__VLS_ctx.buyModalData.canBuy()),
                    icon: (__VLS_ctx.ShoppingCart),
                }));
                const __VLS_264 = __VLS_263({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full justify-center" },
                    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.buyModalData.canBuy() }) },
                    disabled: (!__VLS_ctx.buyModalData.canBuy()),
                    icon: (__VLS_ctx.ShoppingCart),
                }, ...__VLS_functionalComponentArgsRest(__VLS_263));
                let __VLS_267;
                const __VLS_268 = {
                    /** @type {typeof __VLS_267.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData.batchBuy))
                            throw 0;
                        return __VLS_ctx.buyModalData.batchBuy.onBuy(__VLS_ctx.buyQuantity);
                        // @ts-ignore
                        [ShoppingCart, buyModalData, buyModalData, buyModalData, buyModalData, buyQuantity, buyTotalPrice,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
                const { default: __VLS_269 } = __VLS_265.slots;
                (__VLS_ctx.buyQuantity);
                // @ts-ignore
                [buyQuantity,];
                var __VLS_265;
                var __VLS_266;
            }
            else {
                const __VLS_270 = Button || Button;
                // @ts-ignore
                const __VLS_271 = __VLS_asFunctionalComponent1(__VLS_270, new __VLS_270({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full justify-center" },
                    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.buyModalData.canBuy() }) },
                    disabled: (!__VLS_ctx.buyModalData.canBuy()),
                    icon: (__VLS_ctx.buyModalData.buttonText ? __VLS_ctx.Hammer : __VLS_ctx.ShoppingCart),
                }));
                const __VLS_272 = __VLS_271({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full justify-center" },
                    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.buyModalData.canBuy() }) },
                    disabled: (!__VLS_ctx.buyModalData.canBuy()),
                    icon: (__VLS_ctx.buyModalData.buttonText ? __VLS_ctx.Hammer : __VLS_ctx.ShoppingCart),
                }, ...__VLS_functionalComponentArgsRest(__VLS_271));
                let __VLS_275;
                const __VLS_276 = {
                    /** @type {typeof __VLS_275.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!!(__VLS_ctx.buyModalData.batchBuy))
                            throw 0;
                        return __VLS_ctx.buyModalData.onBuy();
                        // @ts-ignore
                        [ShoppingCart, buyModalData, buyModalData, buyModalData, buyModalData, Hammer,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
                const { default: __VLS_277 } = __VLS_273.slots;
                (__VLS_ctx.buyModalData.buttonText ?? '购买');
                // @ts-ignore
                [buyModalData,];
                var __VLS_273;
                var __VLS_274;
            }
        }
        else if (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem && __VLS_ctx.sellModalDef) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "game-panel max-w-xs w-full relative" },
            });
            /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['relative']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem && __VLS_ctx.sellModalDef))
                            throw 0;
                        return __VLS_ctx.shopModal = null;
                        // @ts-ignore
                        [sellModalData, sellModalItem, shopModal, sellModalDef,];
                    } },
                ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
            });
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
            let __VLS_278;
            /** @ts-ignore @type { | typeof __VLS_components.X} */
            X;
            // @ts-ignore
            const __VLS_279 = __VLS_asFunctionalComponent1(__VLS_278, new __VLS_278({
                size: (14),
            }));
            const __VLS_280 = __VLS_279({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_279));
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm mb-2 pr-6" },
                ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.sellModalItem.quality, 'text-accent')) },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['pr-6']} */ ;
            (__VLS_ctx.sellModalDef.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.sellModalDef.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.sellModalItem.quantity);
            if (__VLS_ctx.sellModalItem.quality !== 'normal') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mt-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.sellModalItem.quality)) },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (__VLS_ctx.QUALITY_NAMES[__VLS_ctx.sellModalItem.quality]);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            if (__VLS_ctx.getItemTrend(__VLS_ctx.sellModalData.itemId) && __VLS_ctx.getItemTrend(__VLS_ctx.sellModalData.itemId) !== 'stable') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "line-through text-muted/40" },
                });
                /** @type {__VLS_StyleScopedClasses['line-through']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
                (__VLS_ctx.shopStore.calculateBaseSellPrice(__VLS_ctx.sellModalData.itemId, 1, __VLS_ctx.sellModalData.quality));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.shopStore.calculateSellPrice(__VLS_ctx.sellModalData.itemId, 1, __VLS_ctx.sellModalData.quality));
            if (__VLS_ctx.getItemTrend(__VLS_ctx.sellModalData.itemId) && __VLS_ctx.getItemTrend(__VLS_ctx.sellModalData.itemId) !== 'stable') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mt-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: (__VLS_ctx.trendColor(__VLS_ctx.getItemTrend(__VLS_ctx.sellModalData.itemId))) },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (__VLS_ctx.TREND_NAMES[__VLS_ctx.getItemTrend(__VLS_ctx.sellModalData.itemId)]);
                (__VLS_ctx.getItemMultiplier(__VLS_ctx.sellModalData.itemId));
            }
            if (__VLS_ctx.hasSellBonus) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mt-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                (__VLS_ctx.sellBonusPercent);
            }
            if (__VLS_ctx.sellModalItem.quantity > 1) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                const __VLS_283 = Button || Button;
                // @ts-ignore
                const __VLS_284 = __VLS_asFunctionalComponent1(__VLS_283, new __VLS_283({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.sellQuantity <= 1),
                }));
                const __VLS_285 = __VLS_284({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.sellQuantity <= 1),
                }, ...__VLS_functionalComponentArgsRest(__VLS_284));
                let __VLS_288;
                const __VLS_289 = {
                    /** @type {typeof __VLS_288.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem && __VLS_ctx.sellModalDef))
                            throw 0;
                        if (!(__VLS_ctx.sellModalItem.quantity > 1))
                            throw 0;
                        return __VLS_ctx.addSellQuantity(-1);
                        // @ts-ignore
                        [shopStore, shopStore, hasSellBonus, sellBonusPercent, trendColor, qualityTextClass, qualityTextClass, getItemTrend, getItemTrend, getItemTrend, getItemTrend, getItemTrend, getItemTrend, getItemMultiplier, sellModalData, sellModalData, sellModalData, sellModalData, sellModalData, sellModalData, sellModalData, sellModalData, sellModalData, sellModalData, sellModalData, sellModalItem, sellModalItem, sellModalItem, sellModalItem, sellModalItem, sellModalItem, sellModalDef, sellModalDef, QUALITY_NAMES, TREND_NAMES, sellQuantity, addSellQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_290 } = __VLS_286.slots;
                // @ts-ignore
                [];
                var __VLS_286;
                var __VLS_287;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ onInput: (__VLS_ctx.onSellQuantityInput) },
                    type: "number",
                    value: (__VLS_ctx.sellQuantity),
                    min: "1",
                    max: (__VLS_ctx.maxSellQuantity),
                    ...{ class: "w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors" },
                });
                /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                const __VLS_291 = Button || Button;
                // @ts-ignore
                const __VLS_292 = __VLS_asFunctionalComponent1(__VLS_291, new __VLS_291({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.sellQuantity >= __VLS_ctx.maxSellQuantity),
                }));
                const __VLS_293 = __VLS_292({
                    ...{ 'onClick': {} },
                    ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
                    disabled: (__VLS_ctx.sellQuantity >= __VLS_ctx.maxSellQuantity),
                }, ...__VLS_functionalComponentArgsRest(__VLS_292));
                let __VLS_296;
                const __VLS_297 = {
                    /** @type {typeof __VLS_296.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem && __VLS_ctx.sellModalDef))
                            throw 0;
                        if (!(__VLS_ctx.sellModalItem.quantity > 1))
                            throw 0;
                        return __VLS_ctx.addSellQuantity(1);
                        // @ts-ignore
                        [sellQuantity, sellQuantity, addSellQuantity, onSellQuantityInput, maxSellQuantity, maxSellQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_298 } = __VLS_294.slots;
                // @ts-ignore
                [];
                var __VLS_294;
                var __VLS_295;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                const __VLS_299 = Button || Button;
                // @ts-ignore
                const __VLS_300 = __VLS_asFunctionalComponent1(__VLS_299, new __VLS_299({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.sellQuantity <= 1),
                }));
                const __VLS_301 = __VLS_300({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.sellQuantity <= 1),
                }, ...__VLS_functionalComponentArgsRest(__VLS_300));
                let __VLS_304;
                const __VLS_305 = {
                    /** @type {typeof __VLS_304.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem && __VLS_ctx.sellModalDef))
                            throw 0;
                        if (!(__VLS_ctx.sellModalItem.quantity > 1))
                            throw 0;
                        return __VLS_ctx.setSellQuantity(1);
                        // @ts-ignore
                        [sellQuantity, setSellQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_306 } = __VLS_302.slots;
                // @ts-ignore
                [];
                var __VLS_302;
                var __VLS_303;
                const __VLS_307 = Button || Button;
                // @ts-ignore
                const __VLS_308 = __VLS_asFunctionalComponent1(__VLS_307, new __VLS_307({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.sellQuantity >= __VLS_ctx.maxSellQuantity),
                }));
                const __VLS_309 = __VLS_308({
                    ...{ 'onClick': {} },
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.sellQuantity >= __VLS_ctx.maxSellQuantity),
                }, ...__VLS_functionalComponentArgsRest(__VLS_308));
                let __VLS_312;
                const __VLS_313 = {
                    /** @type {typeof __VLS_312.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                            throw 0;
                        if (!!(__VLS_ctx.buyModalData))
                            throw 0;
                        if (!(__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem && __VLS_ctx.sellModalDef))
                            throw 0;
                        if (!(__VLS_ctx.sellModalItem.quantity > 1))
                            throw 0;
                        return __VLS_ctx.setSellQuantity(__VLS_ctx.maxSellQuantity);
                        // @ts-ignore
                        [sellQuantity, maxSellQuantity, maxSellQuantity, setSellQuantity,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_314 } = __VLS_310.slots;
                // @ts-ignore
                [];
                var __VLS_310;
                var __VLS_311;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mt-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                (__VLS_ctx.sellTotalPrice);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            const __VLS_315 = Button || Button;
            // @ts-ignore
            const __VLS_316 = __VLS_asFunctionalComponent1(__VLS_315, new __VLS_315({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                icon: (__VLS_ctx.Coins),
            }));
            const __VLS_317 = __VLS_316({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                icon: (__VLS_ctx.Coins),
            }, ...__VLS_functionalComponentArgsRest(__VLS_316));
            let __VLS_320;
            const __VLS_321 = {
                /** @type {typeof __VLS_320.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.buyModalData || (__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem)))
                        throw 0;
                    if (!!(__VLS_ctx.buyModalData))
                        throw 0;
                    if (!(__VLS_ctx.sellModalData && __VLS_ctx.sellModalItem && __VLS_ctx.sellModalDef))
                        throw 0;
                    return __VLS_ctx.handleModalSell(__VLS_ctx.sellQuantity);
                    // @ts-ignore
                    [Coins, sellQuantity, sellTotalPrice, handleModalSell,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_322 } = __VLS_318.slots;
            (__VLS_ctx.sellQuantity);
            // @ts-ignore
            [sellQuantity,];
            var __VLS_318;
            var __VLS_319;
        }
    }
    // @ts-ignore
    [];
    var __VLS_222;
    // @ts-ignore
    [];
    return (await import('vue')).defineComponent({});
})();
