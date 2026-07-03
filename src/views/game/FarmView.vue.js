/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Droplets, Droplet, TreePine, TreeDeciduous, ArrowUp, Wrench, Gift, CirclePlus, X, Shovel, Wheat, Sprout, Package, Warehouse, Store, Axe, Trash2, Bug, Leaf, Star, Bird, Zap, Square, Flower2 } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
import { useBreedingStore } from '@/stores/useBreedingStore';
import { useCookingStore } from '@/stores/useCookingStore';
import { useFarmStore } from '@/stores/useFarmStore';
import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore';
import { useHomeStore } from '@/stores/useHomeStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useShopStore } from '@/stores/useShopStore';
import { useSkillStore } from '@/stores/useSkillStore';
import { useTutorialStore } from '@/stores/useTutorialStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { getCropById, getCropsBySeason, getItemById } from '@/data';
import { getStarRating, shouldReturnBreedingSeed, generateGeneticsId } from '@/data/breeding';
import { FRUIT_TREE_DEFS, MAX_FRUIT_TREES } from '@/data/fruitTrees';
import { GREENHOUSE_UPGRADES } from '@/data/buildings';
import { WILD_TREE_DEFS, MAX_WILD_TREES, getWildTreeDef } from '@/data/wildTrees';
import { CROPS } from '@/data/crops';
import { FERTILIZERS, getFertilizerById } from '@/data/processing';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { addLog, showFloat } from '@/composables/useGameLog';
import { navigateToPanel } from '@/composables/useNavigation';
import { handleEndDay } from '@/composables/useEndDay';
import { getShopById, isShopAvailable, getShopClosedReason } from '@/data/shops';
import { handlePlotClick, useFarmActions, handleBatchWater, handleBatchTill, handleBatchHarvest, handleBatchPlant, handleBatchFertilize, handleRemoveCrop, handleCurePest, handleBatchCurePest, handleClearWeed, handleBatchClearWeed, QUALITY_NAMES, applyCropBlessing } from '@/composables/useFarmActions';
import { sfxHarvest, sfxPlant } from '@/composables/useAudio';
const { selectedSeed } = useFarmActions();
const farmTab = ref('field');
const farmStore = useFarmStore();
const inventoryStore = useInventoryStore();
const gameStore = useGameStore();
const homeStore = useHomeStore();
const playerStore = usePlayerStore();
const shopStore = useShopStore();
const breedingStore = useBreedingStore();
// === 田庄特殊功能 ===
const tutorialStore = useTutorialStore();
const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1)
        return null;
    if (farmStore.plots.every(p => p.state === 'wasteland'))
        return '点击下方「一键操作」→「一键开垦」来开垦荒地，或直接点击地块逐一操作。';
    const hasPlanted = farmStore.plots.some(p => p.state === 'planted' || p.state === 'growing' || p.state === 'harvestable');
    if (!hasPlanted && farmStore.plots.some(p => p.state === 'tilled'))
        return '已开垦的地块可以种植作物。使用「一键种植」可批量播种背包中的种子。';
    if (farmStore.plots.some(p => (p.state === 'planted' || p.state === 'growing') && !p.watered) && !gameStore.isRainy)
        return '作物需要每天浇水才会生长。「一键浇水」可一次浇完所有作物。';
    if (farmStore.plots.some(p => p.state === 'harvestable'))
        return '金色高亮的地块表示作物已成熟，点击「一键收获」即可批量收获。';
    return null;
});
const surfaceOreName = computed(() => {
    const patch = gameStore.surfaceOrePatch;
    if (!patch)
        return '';
    return getItemById(patch.oreId)?.name ?? '矿石';
});
const handleCollectCreekCatch = () => {
    const catches = gameStore.creekCatch;
    if (catches.length === 0)
        return;
    const names = [];
    const failed = [];
    for (const c of catches) {
        const added = inventoryStore.addItem(c.fishId, 1, c.quality);
        if (added) {
            const fishDef = getItemById(c.fishId);
            if (fishDef)
                names.push(fishDef.name);
        }
        else {
            failed.push(c);
        }
    }
    gameStore.creekCatch = failed;
    if (names.length > 0) {
        addLog(`收取了溪流鱼获：${names.join('、')}。`);
    }
    if (failed.length > 0) {
        addLog('背包已满，部分鱼获未能收取。');
    }
};
const handleMineSurfaceOre = () => {
    const patch = gameStore.surfaceOrePatch;
    if (!patch)
        return;
    if (!playerStore.consumeStamina(5)) {
        addLog('体力不足，无法开采。');
        return;
    }
    const added = inventoryStore.addItem(patch.oreId, patch.quantity);
    if (!added) {
        playerStore.restoreStamina(5);
        addLog('背包已满，无法开采。');
        return;
    }
    const oreName = getItemById(patch.oreId)?.name ?? '矿石';
    const skillStore = useSkillStore();
    skillStore.addExp('mining', 8);
    gameStore.surfaceOrePatch = null;
    addLog(`开采了地表矿脉，获得了${patch.quantity}个${oreName}。(+8挖矿经验)`);
    const tr = gameStore.advanceTime(1);
    if (tr.message)
        addLog(tr.message);
    if (tr.passedOut)
        handleEndDay();
};
// === 出货箱 ===
const showShippingBox = ref(false);
const showBatchPlant = ref(false);
const showBatchFertilize = ref(false);
const showBatchActions = ref(false);
const showGreenhouseModal = ref(false);
const showGhUpgradeModal = ref(false);
const showGhBatchPlant = ref(false);
const chopFruitTreeTarget = ref(null);
const chopWildTreeTarget = ref(null);
const goToShop = () => {
    if (!isWanwupuOpen.value) {
        showFloat(wanwupuClosedReason.value, 'danger');
        return;
    }
    activePlotId.value = null;
    activeGhPlotId.value = null;
    showBatchPlant.value = false;
    showBatchFertilize.value = false;
    showBatchActions.value = false;
    showGreenhouseModal.value = false;
    navigateToPanel('shop');
};
const wanwupu = getShopById('wanwupu');
const isWanwupuOpen = computed(() => {
    return isShopAvailable(wanwupu, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season);
});
const wanwupuClosedReason = computed(() => {
    return '万物铺' + getShopClosedReason(wanwupu, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season);
});
const getItemName = (itemId) => getItemById(itemId)?.name ?? itemId;
const shippableItems = computed(() => {
    return inventoryStore.items
        .map(inv => ({ ...inv, def: getItemById(inv.itemId) }))
        .filter(item => item.def && item.def.category !== 'seed' && item.def.category !== 'machine' && item.def.category !== 'sprinkler');
});
const shippingBoxTotal = computed(() => {
    return shopStore.shippingBox.reduce((sum, entry) => sum + shopStore.calculateSellPrice(entry.itemId, entry.quantity, entry.quality), 0);
});
const handleAddToBox = (itemId, quantity, quality) => {
    if (shopStore.addToShippingBox(itemId, quantity, quality)) {
        const name = getItemName(itemId);
        addLog(`将${name}×${quantity}放入了出货箱。`);
    }
};
const handleRemoveFromBox = (itemId, quantity, quality) => {
    if (shopStore.removeFromShippingBox(itemId, quantity, quality)) {
        const name = getItemName(itemId);
        addLog(`从出货箱取出了${name}×${quantity}。`);
    }
};
// === 地块弹窗状态 ===
const activePlotId = ref(null);
const activePlot = computed(() => (activePlotId.value !== null ? (farmStore.plots.find(p => p.id === activePlotId.value) ?? null) : null));
const activeGhPlotId = ref(null);
const activeGhPlot = computed(() => (activeGhPlotId.value !== null ? (farmStore.greenhousePlots[activeGhPlotId.value] ?? null) : null));
// === 弹窗显示辅助 ===
const STATE_LABELS = {
    wasteland: '荒地',
    tilled: '已耕',
    planted: '已种',
    growing: '生长中',
    harvestable: '可收获'
};
const plotStateLabel = computed(() => (activePlot.value ? (STATE_LABELS[activePlot.value.state] ?? '?') : ''));
const ghPlotStateLabel = computed(() => (activeGhPlot.value ? (STATE_LABELS[activeGhPlot.value.state] ?? '?') : ''));
const plotCropGrowthDays = computed(() => {
    if (!activePlot.value?.cropId)
        return '?';
    const baseDays = getCropById(activePlot.value.cropId)?.growthDays;
    if (!baseDays)
        return '?';
    const fertDef = activePlot.value.fertilizer ? getFertilizerById(activePlot.value.fertilizer) : null;
    const speedup = (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
    return speedup > 0 ? Math.max(1, Math.floor(baseDays * (1 - speedup))) : baseDays;
});
const plotCropRegrowth = computed(() => {
    if (!activePlot.value?.cropId)
        return false;
    return getCropById(activePlot.value.cropId)?.regrowth ?? false;
});
const plotCropMaxHarvests = computed(() => {
    if (!activePlot.value?.cropId)
        return 0;
    return getCropById(activePlot.value.cropId)?.maxHarvests ?? 0;
});
const ghPlotCropGrowthDays = computed(() => {
    if (!activeGhPlot.value?.cropId)
        return '?';
    const baseDays = getCropById(activeGhPlot.value.cropId)?.growthDays;
    if (!baseDays)
        return '?';
    const fertDef = activeGhPlot.value.fertilizer ? getFertilizerById(activeGhPlot.value.fertilizer) : null;
    const speedup = (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
    return speedup > 0 ? Math.max(1, Math.floor(baseDays * (1 - speedup))) : baseDays;
});
const ghPlotCropRegrowth = computed(() => {
    if (!activeGhPlot.value?.cropId)
        return false;
    return getCropById(activeGhPlot.value.cropId)?.regrowth ?? false;
});
const ghPlotCropMaxHarvests = computed(() => {
    if (!activeGhPlot.value?.cropId)
        return 0;
    return getCropById(activeGhPlot.value.cropId)?.maxHarvests ?? 0;
});
const plotFertName = computed(() => {
    if (!activePlot.value?.fertilizer)
        return '';
    return getFertilizerById(activePlot.value.fertilizer)?.name ?? activePlot.value.fertilizer;
});
const canWater = computed(() => {
    if (!activePlot.value)
        return false;
    return (activePlot.value.state === 'planted' || activePlot.value.state === 'growing') && !activePlot.value.watered;
});
const canFertilize = computed(() => {
    if (!activePlot.value)
        return false;
    return activePlot.value.state !== 'wasteland' && !activePlot.value.fertilizer;
});
// === 背包物品列表 ===
const sprinklerItems = computed(() => {
    const types = [
        { type: 'bamboo_sprinkler', itemId: 'bamboo_sprinkler', name: '竹筒洒水器', colorClass: '' },
        { type: 'copper_sprinkler', itemId: 'copper_sprinkler', name: '铜管洒水器', colorClass: 'text-quality-fine' },
        { type: 'gold_sprinkler', itemId: 'gold_sprinkler', name: '金管洒水器', colorClass: 'text-quality-supreme' }
    ];
    return types.map(s => ({ ...s, count: inventoryStore.getItemCount(s.itemId) })).filter(s => s.count > 0);
});
const fertilizerItems = computed(() => {
    return FERTILIZERS.map(f => ({
        type: f.id,
        itemId: f.id,
        name: f.name,
        count: inventoryStore.getItemCount(f.id),
        colorClass: itemValueColor(f.shopPrice ?? 0)
    })).filter(f => f.count > 0);
});
const QUALITY_ORDER = ['normal', 'fine', 'excellent', 'supreme'];
const plantableSeeds = computed(() => {
    const result = [];
    for (const crop of getCropsBySeason(gameStore.season)) {
        for (const q of QUALITY_ORDER) {
            const count = inventoryStore.getItemCount(crop.seedId, q);
            if (count > 0) {
                result.push({
                    cropId: crop.id,
                    seedId: crop.seedId,
                    name: crop.name,
                    quality: q,
                    count,
                    colorClass: cropValueColor(crop.sellPrice),
                    regrowth: crop.regrowth ?? false,
                    regrowthDays: crop.regrowthDays
                });
            }
        }
    }
    return result;
});
/** 当季可种的育种种子 */
const plantableBreedingSeeds = computed(() => {
    const season = gameStore.season;
    return breedingStore.breedingBox.filter(seed => {
        const crop = getCropById(seed.genetics.cropId);
        if (!crop)
            return false;
        return crop.season.includes(season);
    });
});
/** 根据作物售价返回品质颜色 */
const cropValueColor = (sellPrice) => {
    if (sellPrice >= 180)
        return 'text-quality-supreme';
    if (sellPrice >= 100)
        return 'text-quality-excellent';
    if (sellPrice >= 60)
        return 'text-quality-fine';
    return '';
};
/** 根据道具价格返回品质颜色 */
const itemValueColor = (price) => {
    if (price >= 100)
        return 'text-quality-supreme';
    if (price >= 75)
        return 'text-quality-excellent';
    if (price >= 40)
        return 'text-quality-fine';
    return '';
};
// === 地块显示 ===
const getCropName = (cropId) => {
    const crop = getCropById(cropId);
    return crop?.name ?? cropId;
};
const hasSprinkler = (plotId) => {
    return farmStore.sprinklers.some(s => s.plotId === plotId);
};
/** 洒水器覆盖范围（含放置洒水器的地块自身） */
const sprinklerCoverage = computed(() => farmStore.getAllWateredBySprinklers());
const isSprinklerCovered = (plotId) => sprinklerCoverage.value.has(plotId);
const needsWater = (plot) => {
    return (plot.state === 'planted' || plot.state === 'growing') && !plot.watered && !sprinklerCoverage.value.has(plot.id);
};
const unwateredCount = computed(() => farmStore.plots.filter(needsWater).length);
const wastelandCount = computed(() => farmStore.plots.filter(p => p.state === 'wasteland').length);
const harvestableCount = computed(() => farmStore.plots.filter(p => p.state === 'harvestable').length);
const tilledEmptyCount = computed(() => farmStore.plots.filter(p => p.state === 'tilled').length);
const fertilizableCount = computed(() => farmStore.plots.filter(p => p.state !== 'wasteland' && !p.fertilizer).length);
const infestedCount = computed(() => farmStore.plots.filter(p => p.infested).length);
const weedyCount = computed(() => farmStore.plots.filter(p => p.weedy).length);
const PLOT_LEGENDS = [
    { icon: Shovel, color: 'text-muted', label: '荒地' },
    { icon: Square, color: 'text-earth', label: '已耕' },
    { icon: Sprout, color: 'text-success/60', label: '已种' },
    { icon: Flower2, color: 'text-success', label: '生长中' },
    { icon: Droplets, color: 'text-water', label: '已浇水' },
    { icon: Wheat, color: 'text-accent', label: '可收获' },
    { icon: Star, color: 'text-accent', label: '巨型' },
    { icon: Droplet, color: 'text-water', label: '洒水器' },
    { icon: CirclePlus, color: 'text-success', label: '肥料' },
    { icon: Droplets, color: 'text-danger', label: '需浇水' },
    { icon: Bug, color: 'text-danger', label: '虫害' },
    { icon: Leaf, color: 'text-success', label: '杂草' }
];
const plotWarnings = computed(() => {
    const list = [];
    if (unwateredCount.value > 0)
        list.push({ color: 'text-danger', text: `还有${unwateredCount.value}块需浇水` });
    if (infestedCount.value > 0)
        list.push({ color: 'text-danger', text: `有${infestedCount.value}块虫害` });
    if (weedyCount.value > 0)
        list.push({ color: 'text-success', text: `有${weedyCount.value}块杂草` });
    return list;
});
const doBatchAction = (action) => {
    showBatchActions.value = false;
    if (action === 'water')
        handleBatchWater();
    else if (action === 'till')
        handleBatchTill();
    else if (action === 'harvest')
        handleBatchHarvest();
    else if (action === 'plant')
        showBatchPlant.value = true;
    else if (action === 'fertilize')
        showBatchFertilize.value = true;
    else if (action === 'curePest')
        handleBatchCurePest();
    else if (action === 'clearWeed')
        handleBatchClearWeed();
};
/** 按cropId分组的当季育种种子（用于一键种植弹窗） */
const batchBreedingSeedGroups = computed(() => {
    const groups = {};
    for (const seed of plantableBreedingSeeds.value) {
        const cid = seed.genetics.cropId;
        if (!groups[cid]) {
            groups[cid] = { cropId: cid, name: getCropName(cid), count: 0, minGen: seed.genetics.generation, maxGen: seed.genetics.generation };
        }
        groups[cid].count++;
        if (seed.genetics.generation < groups[cid].minGen)
            groups[cid].minGen = seed.genetics.generation;
        if (seed.genetics.generation > groups[cid].maxGen)
            groups[cid].maxGen = seed.genetics.generation;
    }
    return Object.values(groups);
});
const doBatchPlant = (cropId) => {
    handleBatchPlant(cropId);
    showBatchPlant.value = false;
};
const doBatchPlantBreeding = (cropId) => {
    const skillStore = useSkillStore();
    const cookingStore = useCookingStore();
    const targets = farmStore.plots.filter(p => p.state === 'tilled');
    if (targets.length === 0) {
        addLog('没有可种植的空耕地。');
        showBatchPlant.value = false;
        return;
    }
    const seeds = plantableBreedingSeeds.value.filter(s => s.genetics.cropId === cropId);
    let planted = 0;
    const plantRingFarmReduction = inventoryStore.getRingEffectValue('farming_stamina');
    const plantRingGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction');
    for (const plot of targets) {
        if (seeds.length === 0)
            break;
        const seed = seeds.shift();
        const farmingBuff = cookingStore.activeBuff?.type === 'farming' ? cookingStore.activeBuff.value / 100 : 0;
        const cost = Math.max(1, Math.floor(3 *
            inventoryStore.getToolStaminaMultiplier('hoe') *
            (1 - skillStore.getStaminaReduction('farming')) *
            (1 - farmingBuff) *
            (1 - plantRingFarmReduction) *
            (1 - plantRingGlobalReduction)));
        if (!playerStore.consumeStamina(cost))
            break;
        if (farmStore.plantGeneticSeed(plot.id, seed.genetics)) {
            breedingStore.removeFromBox(seed.genetics.id);
            planted++;
        }
    }
    if (planted > 0) {
        addLog(`一键种植了${planted}株育种种子（${getCropName(cropId)}）。(-${planted}体力)`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant * planted);
        if (tr.message)
            addLog(tr.message);
    }
    else {
        addLog('体力不足，无法种植。');
    }
    showBatchPlant.value = false;
};
const doBatchFertilize = (type) => {
    handleBatchFertilize(type);
    showBatchFertilize.value = false;
};
const doRemoveCrop = () => {
    if (activePlotId.value === null)
        return;
    handleRemoveCrop(activePlotId.value);
    activePlotId.value = null;
};
const doCurePest = () => {
    if (activePlotId.value === null)
        return;
    handleCurePest(activePlotId.value);
    activePlotId.value = null;
};
const doClearWeed = () => {
    if (activePlotId.value === null)
        return;
    handleClearWeed(activePlotId.value);
    activePlotId.value = null;
};
const getPlotDisplay = (plot) => {
    // 巨型作物特殊显示（仅在已成熟时才显示巨型图标）
    if (plot.giantCropGroup !== null && plot.state === 'harvestable') {
        return { icon: Star, color: 'text-accent', bg: 'bg-accent/10' };
    }
    // 虫害显示
    if (plot.infested) {
        return { icon: Bug, color: 'text-danger', bg: 'bg-danger/10' };
    }
    // 杂草显示
    if (plot.weedy) {
        return { icon: Leaf, color: 'text-success/70', bg: 'bg-success/10' };
    }
    switch (plot.state) {
        case 'wasteland':
            return { icon: Shovel, color: 'text-muted', bg: 'bg-panel/40' };
        case 'tilled':
            return { icon: Square, color: 'text-earth', bg: 'bg-earth/8' };
        case 'planted':
            return {
                icon: plot.watered ? Droplets : Sprout,
                color: plot.watered ? 'text-water' : 'text-success/60',
                bg: plot.watered ? 'bg-water/8' : 'bg-success/5'
            };
        case 'growing': {
            const crop = getCropById(plot.cropId);
            const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null;
            const speedup = (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
            const effectiveDays = crop ? (speedup > 0 ? Math.max(1, Math.floor(crop.growthDays * (1 - speedup))) : crop.growthDays) : 1;
            const progress = crop ? Math.floor((plot.growthDays / effectiveDays) * 100) : 0;
            return {
                icon: plot.watered ? Droplets : Leaf,
                color: plot.watered ? 'text-water' : progress > 60 ? 'text-success' : 'text-success/80',
                bg: plot.watered ? 'bg-water/8' : 'bg-success/8'
            };
        }
        case 'harvestable':
            return { icon: Wheat, color: 'text-accent', bg: 'bg-accent/15' };
        default:
            return { icon: Square, color: 'text-muted', bg: 'bg-panel/40' };
    }
};
const getPlotTooltip = (plot) => {
    let tip = '';
    if (plot.state === 'wasteland')
        tip = '荒地（点击开垦）';
    else if (plot.state === 'tilled')
        tip = '已耕地（点击播种）';
    else if (plot.state === 'harvestable') {
        const crop = getCropById(plot.cropId);
        tip = `${crop?.name ?? ''}已成熟（点击收获）`;
    }
    else if (plot.state === 'planted' || plot.state === 'growing') {
        const crop = getCropById(plot.cropId);
        const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null;
        const speedup = (fertDef?.growthSpeedup ?? 0) + useWalletStore().getCropGrowthBonus();
        const effectiveDays = crop ? (speedup > 0 ? Math.max(1, Math.floor(crop.growthDays * (1 - speedup))) : crop.growthDays) : '?';
        tip = `${crop?.name ?? ''} ${plot.growthDays}/${effectiveDays}天 ${plot.watered ? '已浇水' : '需浇水'}`;
    }
    if (hasSprinkler(plot.id))
        tip += ' [洒水器]';
    if (plot.fertilizer) {
        const fertDef = getFertilizerById(plot.fertilizer);
        tip += ` [${fertDef?.name ?? plot.fertilizer}]`;
    }
    if (plot.infested)
        tip += ` [虫害${plot.infestedDays}天]`;
    if (plot.weedy)
        tip += ` [杂草${plot.weedyDays}天]`;
    return tip;
};
// === 弹窗操作：农场 ===
const doTill = () => {
    if (activePlotId.value === null)
        return;
    selectedSeed.value = null;
    handlePlotClick(activePlotId.value);
    activePlotId.value = null;
};
const doPlant = (cropId, quality) => {
    if (activePlotId.value === null)
        return;
    selectedSeed.value = { cropId, quality };
    handlePlotClick(activePlotId.value);
    selectedSeed.value = null;
    activePlotId.value = null;
};
const doPlantGeneticSeed = (seedId) => {
    if (activePlotId.value === null)
        return;
    const seed = breedingStore.breedingBox.find(s => s.genetics.id === seedId);
    if (!seed)
        return;
    if (farmStore.plantGeneticSeed(activePlotId.value, seed.genetics)) {
        breedingStore.removeFromBox(seedId);
        addLog(`种下了育种种子：${getCropName(seed.genetics.cropId)} G${seed.genetics.generation}。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant);
        if (tr.message)
            addLog(tr.message);
    }
    activePlotId.value = null;
};
const doWater = () => {
    if (activePlotId.value === null)
        return;
    selectedSeed.value = null;
    handlePlotClick(activePlotId.value);
    activePlotId.value = null;
};
const doHarvest = () => {
    if (activePlotId.value === null)
        return;
    const plot = farmStore.plots.find(p => p.id === activePlotId.value);
    if (plot && plot.giantCropGroup !== null) {
        const result = farmStore.harvestGiantCrop(activePlotId.value);
        if (result) {
            inventoryStore.addItem(result.cropId, result.quantity);
            const cropName = getCropName(result.cropId);
            addLog(`收获了巨型${cropName}！获得了${result.quantity}个${cropName}！`);
            showFloat(`巨型${cropName} ×${result.quantity}`, 'accent');
            sfxHarvest();
        }
        activePlotId.value = null;
        return;
    }
    selectedSeed.value = null;
    handlePlotClick(activePlotId.value);
    activePlotId.value = null;
};
const doFertilize = (type) => {
    if (activePlotId.value === null)
        return;
    if (!inventoryStore.removeItem(type)) {
        addLog('没有该肥料了。');
        return;
    }
    if (farmStore.applyFertilizer(activePlotId.value, type)) {
        const fertDef = getFertilizerById(type);
        addLog(`施了${fertDef?.name ?? '肥料'}。`);
    }
    else {
        inventoryStore.addItem(type);
        addLog('无法在此施肥（需要已开垦且未施肥的地块）。');
    }
    activePlotId.value = null;
};
const doPlaceSprinkler = (type) => {
    if (activePlotId.value === null)
        return;
    if (!inventoryStore.removeItem(type)) {
        addLog('没有该洒水器了。');
        return;
    }
    if (farmStore.placeSprinkler(activePlotId.value, type)) {
        addLog('放置了洒水器，周围地块将自动浇水。');
    }
    else {
        inventoryStore.addItem(type);
        addLog('无法在此放置洒水器。');
    }
    activePlotId.value = null;
};
const doRemoveSprinkler = () => {
    if (activePlotId.value === null)
        return;
    const plotId = activePlotId.value;
    const type = farmStore.removeSprinkler(plotId);
    if (type) {
        if (inventoryStore.addItem(type)) {
            addLog('拆除了洒水器，已回收到背包。');
        }
        else {
            // 背包满，放回原处
            farmStore.placeSprinkler(plotId, type);
            addLog('背包已满，无法回收洒水器。');
        }
    }
    activePlotId.value = null;
};
// === 果树 ===
const getTreeName = (type) => {
    return FRUIT_TREE_DEFS.find(d => d.type === type)?.name ?? type;
};
const getTreeFruitSeason = (type) => {
    const def = FRUIT_TREE_DEFS.find(d => d.type === type);
    if (!def)
        return '?';
    return SEASON_NAMES[def.fruitSeason];
};
const plantableSaplings = computed(() => {
    return FRUIT_TREE_DEFS.filter(d => inventoryStore.hasItem(d.saplingId)).map(d => ({
        type: d.type,
        saplingId: d.saplingId,
        name: d.name,
        count: inventoryStore.getItemCount(d.saplingId)
    }));
});
const plantableWildSeeds = computed(() => {
    return WILD_TREE_DEFS.filter(d => inventoryStore.hasItem(d.seedItemId)).map(d => ({
        type: d.type,
        seedItemId: d.seedItemId,
        name: d.name,
        count: inventoryStore.getItemCount(d.seedItemId)
    }));
});
const hasTapper = computed(() => inventoryStore.getItemCount('tapper') > 0);
const handlePlantTree = (treeType) => {
    const def = FRUIT_TREE_DEFS.find(d => d.type === treeType);
    if (!def)
        return;
    if (!inventoryStore.removeItem(def.saplingId)) {
        addLog('背包中没有该树苗。');
        return;
    }
    if (farmStore.plantFruitTree(treeType)) {
        addLog(`种下了${def.name}苗，需28天成熟。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree);
        if (tr.message)
            addLog(tr.message);
    }
    else {
        inventoryStore.addItem(def.saplingId);
        addLog(`果树位已满（最多${MAX_FRUIT_TREES}棵）。`);
    }
};
const confirmChopFruitTree = () => {
    const target = chopFruitTreeTarget.value;
    if (!target)
        return;
    chopFruitTreeTarget.value = null;
    if (gameStore.isPastBedtime) {
        addLog('太晚了，没法砍伐了。');
        return;
    }
    if (!inventoryStore.isToolAvailable('axe')) {
        addLog('斧头正在升级中，无法砍伐。');
        return;
    }
    const skillStore = useSkillStore();
    const cost = Math.max(1, Math.floor(5 * inventoryStore.getToolStaminaMultiplier('axe') * (1 - skillStore.getStaminaReduction('foraging'))));
    if (!playerStore.consumeStamina(cost)) {
        addLog('体力不足，无法砍伐。');
        return;
    }
    const treeName = getTreeName(target.type);
    const woodQty = farmStore.removeFruitTree(target.id);
    if (woodQty > 0) {
        inventoryStore.addItem('wood', woodQty);
        addLog(`砍掉了${treeName}，获得${woodQty}个木材。（体力-${cost}）`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.chopTree);
        if (tr.message)
            addLog(tr.message);
    }
};
// === 野树 ===
const getWildTreeName = (type) => {
    return getWildTreeDef(type)?.name ?? type;
};
const handlePlantWildTree = (treeType) => {
    const def = WILD_TREE_DEFS.find(d => d.type === treeType);
    if (!def)
        return;
    if (!inventoryStore.removeItem(def.seedItemId)) {
        addLog('背包中没有该种子。');
        return;
    }
    if (farmStore.plantWildTree(treeType)) {
        addLog(`种下了${def.name}，需${def.growthDays}天成熟。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree);
        if (tr.message)
            addLog(tr.message);
    }
    else {
        inventoryStore.addItem(def.seedItemId);
        addLog(`野树位已满（最多${MAX_WILD_TREES}棵）。`);
    }
};
const handleAttachTapper = (treeId) => {
    if (!inventoryStore.removeItem('tapper')) {
        addLog('背包中没有采脂器。');
        return;
    }
    if (farmStore.attachTapper(treeId)) {
        addLog('安装了采脂器，将定期产出树脂。');
    }
    else {
        inventoryStore.addItem('tapper');
        addLog('无法安装采脂器（需要已成熟且未装采脂器的野树）。');
    }
};
const handleCollectTapProduct = (treeId) => {
    const productId = farmStore.collectTapProduct(treeId);
    if (productId) {
        inventoryStore.addItem(productId);
        const def = WILD_TREE_DEFS.find(d => d.tapProduct === productId);
        addLog(`收取了${def?.tapProductName ?? productId}！`);
    }
};
const handleChopTree = (treeId) => {
    const tree = farmStore.wildTrees.find(t => t.id === treeId);
    if (!tree)
        return;
    chopWildTreeTarget.value = { id: tree.id, type: tree.type, chopCount: tree.chopCount };
};
const confirmChopWildTree = () => {
    const target = chopWildTreeTarget.value;
    if (!target)
        return;
    chopWildTreeTarget.value = null;
    if (gameStore.isPastBedtime) {
        addLog('太晚了，没法伐木了。');
        return;
    }
    if (!inventoryStore.isToolAvailable('axe')) {
        addLog('斧头正在升级中，无法伐木。');
        return;
    }
    const skillStore = useSkillStore();
    const cost = Math.max(1, Math.floor(5 * inventoryStore.getToolStaminaMultiplier('axe') * (1 - skillStore.getStaminaReduction('foraging'))));
    if (!playerStore.consumeStamina(cost)) {
        addLog('体力不足，无法伐木。');
        return;
    }
    const baseQty = 2;
    const hasLumberjack = skillStore.getSkill('foraging').perk5 === 'lumberjack' || skillStore.getSkill('foraging').perk10 === 'forester';
    const qty = baseQty + (hasLumberjack ? 2 : Math.random() < 0.5 ? 1 : 0);
    inventoryStore.addItem('wood', qty);
    const { removed } = farmStore.chopWildTree(target.id);
    const treeName = getWildTreeName(target.type);
    if (removed) {
        addLog(`伐木获得了${qty}个木材，${treeName}已被砍倒消失了。（体力-${cost}）`);
    }
    else {
        addLog(`伐木获得了${qty}个木材。（体力-${cost}）`);
    }
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.chopTree);
    if (tr.message)
        addLog(tr.message);
};
// === 温室 ===
const showGreenhouse = computed(() => homeStore.greenhouseUnlocked);
const ghHarvestableCount = computed(() => farmStore.greenhousePlots.filter(p => p.state === 'harvestable').length);
const ghTilledEmptyCount = computed(() => farmStore.greenhousePlots.filter(p => p.state === 'tilled').length);
const ghGridCols = computed(() => {
    const upgradeDef = GREENHOUSE_UPGRADES[farmStore.greenhouseLevel - 1];
    return upgradeDef?.gridCols ?? 4;
});
const nextGhUpgrade = computed(() => GREENHOUSE_UPGRADES[farmStore.greenhouseLevel] ?? null);
const allSeeds = computed(() => {
    return CROPS.filter(crop => inventoryStore.hasItem(crop.seedId)).map(crop => ({
        cropId: crop.id,
        seedId: crop.seedId,
        name: crop.name,
        count: inventoryStore.getItemCount(crop.seedId),
        regrowth: crop.regrowth ?? false
    }));
});
// === 弹窗操作：温室 ===
const doGhPlant = (cropId) => {
    if (activeGhPlotId.value === null)
        return;
    const crop = getCropById(cropId);
    if (!crop)
        return;
    if (!inventoryStore.removeItem(crop.seedId)) {
        addLog('背包中没有该种子了。');
        return;
    }
    if (farmStore.greenhousePlantCrop(activeGhPlotId.value, cropId)) {
        addLog(`在温室中播种了${crop.name}。`);
    }
    else {
        inventoryStore.addItem(crop.seedId);
    }
    activeGhPlotId.value = null;
};
const doGhHarvest = () => {
    if (activeGhPlotId.value === null)
        return;
    if (!playerStore.consumeStamina(1)) {
        addLog('体力不足，无法收获。');
        return;
    }
    const result = farmStore.greenhouseHarvestPlot(activeGhPlotId.value);
    if (result.cropId) {
        const cropId = result.cropId;
        const genetics = result.genetics;
        const cropDef = getCropById(cropId);
        const skillStore = useSkillStore();
        let quality = skillStore.rollCropQualityWithBonus(0);
        quality = applyCropBlessing(quality);
        // 育种产量加成
        const yieldDouble = genetics && Math.random() < (genetics.yield / 100) * 0.3;
        const harvestQty = yieldDouble ? 2 : 1;
        inventoryStore.addItem(cropId, harvestQty, quality);
        const qualityLabel = quality !== 'normal' ? `(${QUALITY_NAMES[quality]})` : '';
        const qtyLabel = yieldDouble ? '×2' : '';
        sfxHarvest();
        showFloat(`+${cropDef?.name ?? cropId}${qtyLabel}${qualityLabel}`, 'success');
        let msg = `在温室收获了${cropDef?.name ?? cropId}${qtyLabel}${qualityLabel}！(-1体力)`;
        if (yieldDouble)
            msg += ' 育种产量加成！';
        // 育种甜度加成
        if (genetics && genetics.sweetness > 0 && cropDef) {
            const bonusMoney = Math.floor((cropDef.sellPrice * harvestQty * genetics.sweetness) / 200);
            if (bonusMoney > 0) {
                playerStore.earnMoney(bonusMoney);
                msg += ` 甜度加成+${bonusMoney}文`;
            }
        }
        // 杂交种记录
        if (genetics?.isHybrid && genetics.hybridId) {
            breedingStore.recordHybridGrown(genetics.hybridId);
        }
        // 育种种子回收
        if (genetics && shouldReturnBreedingSeed(quality)) {
            const returned = { ...genetics, id: generateGeneticsId() };
            if (breedingStore.addToBox(returned)) {
                msg += ' 育种种子已回收。';
            }
            else {
                msg += ' 种子箱已满，育种种子丢失！';
            }
        }
        addLog(msg);
    }
    activeGhPlotId.value = null;
};
const doGhBatchHarvest = () => {
    const skillStore = useSkillStore();
    const results = farmStore.greenhouseBatchHarvest();
    if (results.length === 0)
        return;
    let harvested = 0;
    let seedsReturned = 0;
    let totalBonusMoney = 0;
    for (const { cropId, genetics } of results) {
        if (!playerStore.consumeStamina(1))
            break;
        harvested++;
        let quality = skillStore.rollCropQualityWithBonus(0);
        quality = applyCropBlessing(quality);
        const yieldDouble = genetics && Math.random() < (genetics.yield / 100) * 0.3;
        const harvestQty = yieldDouble ? 2 : 1;
        inventoryStore.addItem(cropId, harvestQty, quality);
        // 育种甜度加成
        if (genetics && genetics.sweetness > 0) {
            const cropDef = getCropById(cropId);
            if (cropDef) {
                const bonusMoney = Math.floor((cropDef.sellPrice * harvestQty * genetics.sweetness) / 200);
                if (bonusMoney > 0) {
                    playerStore.earnMoney(bonusMoney);
                    totalBonusMoney += bonusMoney;
                }
            }
        }
        // 杂交种记录
        if (genetics?.isHybrid && genetics.hybridId) {
            breedingStore.recordHybridGrown(genetics.hybridId);
        }
        // 育种种子回收
        if (genetics && shouldReturnBreedingSeed(quality)) {
            const returned = { ...genetics, id: generateGeneticsId() };
            if (breedingStore.addToBox(returned))
                seedsReturned++;
        }
    }
    if (harvested > 0) {
        sfxHarvest();
        showFloat(`温室收获 ×${harvested}`, 'success');
        let msg = `在温室一键收获了${harvested}株作物。(-${harvested}体力)`;
        if (totalBonusMoney > 0)
            msg += ` 甜度加成+${totalBonusMoney}文`;
        addLog(msg);
    }
    if (seedsReturned > 0) {
        addLog(`${seedsReturned}颗育种种子已回收到种子箱。`);
    }
};
/** 温室可种育种种子（温室无季节限制，所有育种种子都可种） */
const ghPlantableBreedingSeeds = computed(() => {
    return breedingStore.breedingBox.filter(seed => {
        const crop = getCropById(seed.genetics.cropId);
        return !!crop;
    });
});
const doGhPlantGeneticSeed = (seedId) => {
    if (activeGhPlotId.value === null)
        return;
    const seed = breedingStore.breedingBox.find(s => s.genetics.id === seedId);
    if (!seed)
        return;
    if (farmStore.greenhousePlantGeneticSeed(activeGhPlotId.value, seed.genetics)) {
        breedingStore.removeFromBox(seedId);
        addLog(`在温室种下了育种种子：${getCropName(seed.genetics.cropId)} G${seed.genetics.generation}。`);
    }
    activeGhPlotId.value = null;
};
const doGhBatchPlant = (cropId) => {
    const crop = getCropById(cropId);
    if (!crop)
        return;
    const targets = farmStore.greenhousePlots.filter(p => p.state === 'tilled');
    if (targets.length === 0)
        return;
    let planted = 0;
    for (const plot of targets) {
        if (!inventoryStore.hasItem(crop.seedId))
            break;
        if (!playerStore.consumeStamina(1))
            break;
        inventoryStore.removeItem(crop.seedId);
        farmStore.greenhousePlantCrop(plot.id, cropId);
        planted++;
    }
    if (planted > 0) {
        sfxPlant();
        showFloat(`温室种植 ${crop.name} ×${planted}`, 'success');
        addLog(`在温室一键种植了${planted}株${crop.name}。(-${planted}体力)`);
    }
    else {
        addLog('体力不足或种子不够，无法种植。');
    }
    showGhBatchPlant.value = false;
};
const handleGhUpgrade = () => {
    const upgrade = nextGhUpgrade.value;
    if (!upgrade)
        return;
    for (const mat of upgrade.materialCost) {
        if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) {
            addLog('材料不足，无法升级温室。');
            return;
        }
    }
    if (!playerStore.spendMoney(upgrade.cost)) {
        addLog('铜钱不足，无法升级温室。');
        return;
    }
    for (const mat of upgrade.materialCost) {
        inventoryStore.removeItem(mat.itemId, mat.quantity);
    }
    farmStore.upgradeGreenhouse(upgrade.plotCount);
    addLog(`温室已升级至${upgrade.name}！（${upgrade.plotCount}个地块）`);
    showGhUpgradeModal.value = false;
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex space-x-1.5 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
const __VLS_0 = Button || Button;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.farmTab === 'field' }) },
    icon: (__VLS_ctx.Sprout),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.farmTab === 'field' }) },
    icon: (__VLS_ctx.Sprout),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = {
    /** @type {typeof __VLS_5.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.farmTab = 'field';
        // @ts-ignore
        [farmTab, farmTab, Sprout,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_7 } = __VLS_3.slots;
// @ts-ignore
[];
var __VLS_3;
var __VLS_4;
const __VLS_8 = Button || Button;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.farmTab === 'tree' }) },
    icon: (__VLS_ctx.TreeDeciduous),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.farmTab === 'tree' }) },
    icon: (__VLS_ctx.TreeDeciduous),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_13;
const __VLS_14 = {
    /** @type {typeof __VLS_13.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.farmTab = 'tree';
        // @ts-ignore
        [farmTab, farmTab, TreeDeciduous,];
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
if (__VLS_ctx.farmTab === 'field') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    let __VLS_16;
    /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
    Sprout;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        size: (14),
    }));
    const __VLS_18 = __VLS_17({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.farmStore.farmSize);
    (__VLS_ctx.farmStore.farmSize);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs text-muted flex space-x-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    if (__VLS_ctx.farmStore.scarecrows > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "inline-flex items-center space-x-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        let __VLS_21;
        /** @ts-ignore @type { | typeof __VLS_components.Bird} */
        Bird;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            size: (12),
        }));
        const __VLS_23 = __VLS_22({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.farmStore.scarecrows);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-danger/80 inline-flex items-center space-x-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger/80']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        let __VLS_26;
        /** @ts-ignore @type { | typeof __VLS_components.Bird} */
        Bird;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
            size: (12),
        }));
        const __VLS_28 = __VLS_27({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    if (__VLS_ctx.farmStore.lightningRods > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "inline-flex items-center space-x-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        let __VLS_31;
        /** @ts-ignore @type { | typeof __VLS_components.Zap} */
        Zap;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
            size: (12),
        }));
        const __VLS_33 = __VLS_32({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.farmStore.lightningRods);
    }
    if (__VLS_ctx.tutorialHint) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/50 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.tutorialHint);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const __VLS_36 = Button || Button;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        ...{ 'onClick': {} },
        ...{ class: "w-full md:w-auto" },
        iconSize: (12),
        icon: (__VLS_ctx.Wrench),
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onClick': {} },
        ...{ class: "w-full md:w-auto" },
        iconSize: (12),
        icon: (__VLS_ctx.Wrench),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_41;
    const __VLS_42 = {
        /** @type {typeof __VLS_41.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.farmTab === 'field'))
                throw 0;
            return __VLS_ctx.showBatchActions = true;
            // @ts-ignore
            [farmTab, farmStore, farmStore, farmStore, farmStore, farmStore, farmStore, tutorialHint, tutorialHint, Wrench, showBatchActions,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:w-auto']} */ ;
    const { default: __VLS_43 } = __VLS_39.slots;
    // @ts-ignore
    [];
    var __VLS_39;
    var __VLS_40;
    if (__VLS_ctx.gameStore.farmMapType === 'riverland' && __VLS_ctx.gameStore.creekCatch.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (__VLS_ctx.handleCollectCreekCatch) },
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
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.gameStore.creekCatch.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    if (__VLS_ctx.gameStore.farmMapType === 'hilltop' && __VLS_ctx.gameStore.surfaceOrePatch) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (__VLS_ctx.handleMineSurfaceOre) },
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
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.surfaceOreName);
        (__VLS_ctx.gameStore.surfaceOrePatch.quantity);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    let __VLS_44;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
        name: "panel-fade",
    }));
    const __VLS_46 = __VLS_45({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    const { default: __VLS_49 } = __VLS_47.slots;
    if (__VLS_ctx.showBatchActions) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.showBatchActions = false;
                    // @ts-ignore
                    [showBatchActions, showBatchActions, gameStore, gameStore, gameStore, gameStore, gameStore, gameStore, handleCollectCreekCatch, handleMineSurfaceOre, surfaceOreName,];
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
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.showBatchActions = false;
                    // @ts-ignore
                    [showBatchActions,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_50;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
            size: (14),
        }));
        const __VLS_52 = __VLS_51({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.doBatchAction('water');
                    // @ts-ignore
                    [doBatchAction,];
                } },
            ...{ class: "btn text-xs w-full justify-between" },
            disabled: (__VLS_ctx.unwateredCount === 0),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_55;
        /** @ts-ignore @type { | typeof __VLS_components.Droplets} */
        Droplets;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
            size: (12),
        }));
        const __VLS_57 = __VLS_56({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.unwateredCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.doBatchAction('till');
                    // @ts-ignore
                    [doBatchAction, unwateredCount, unwateredCount,];
                } },
            ...{ class: "btn text-xs w-full justify-between" },
            disabled: (__VLS_ctx.wastelandCount === 0),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_60;
        /** @ts-ignore @type { | typeof __VLS_components.Shovel} */
        Shovel;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
            size: (12),
        }));
        const __VLS_62 = __VLS_61({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.wastelandCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.doBatchAction('harvest');
                    // @ts-ignore
                    [doBatchAction, wastelandCount, wastelandCount,];
                } },
            ...{ class: "btn text-xs w-full justify-between" },
            disabled: (__VLS_ctx.harvestableCount === 0),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_65;
        /** @ts-ignore @type { | typeof __VLS_components.Wheat} */
        Wheat;
        // @ts-ignore
        const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
            size: (12),
        }));
        const __VLS_67 = __VLS_66({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_66));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.harvestableCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.doBatchAction('plant');
                    // @ts-ignore
                    [doBatchAction, harvestableCount, harvestableCount,];
                } },
            ...{ class: "btn text-xs w-full justify-between" },
            disabled: (__VLS_ctx.tilledEmptyCount === 0 || (__VLS_ctx.plantableSeeds.length === 0 && __VLS_ctx.plantableBreedingSeeds.length === 0)),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_70;
        /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
        Sprout;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
            size: (12),
        }));
        const __VLS_72 = __VLS_71({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.tilledEmptyCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.doBatchAction('fertilize');
                    // @ts-ignore
                    [doBatchAction, tilledEmptyCount, tilledEmptyCount, plantableSeeds, plantableBreedingSeeds,];
                } },
            ...{ class: "btn text-xs w-full justify-between" },
            disabled: (__VLS_ctx.fertilizableCount === 0 || __VLS_ctx.fertilizerItems.length === 0),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_75;
        /** @ts-ignore @type { | typeof __VLS_components.CirclePlus} */
        CirclePlus;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
            size: (12),
        }));
        const __VLS_77 = __VLS_76({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.fertilizableCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.doBatchAction('curePest');
                    // @ts-ignore
                    [doBatchAction, fertilizableCount, fertilizableCount, fertilizerItems,];
                } },
            ...{ class: "btn text-xs w-full justify-between" },
            disabled: (__VLS_ctx.infestedCount === 0),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_80;
        /** @ts-ignore @type { | typeof __VLS_components.Bug} */
        Bug;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
            size: (12),
        }));
        const __VLS_82 = __VLS_81({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.infestedCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchActions))
                        throw 0;
                    return __VLS_ctx.doBatchAction('clearWeed');
                    // @ts-ignore
                    [doBatchAction, infestedCount, infestedCount,];
                } },
            ...{ class: "btn text-xs w-full justify-between" },
            disabled: (__VLS_ctx.weedyCount === 0),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_85;
        /** @ts-ignore @type { | typeof __VLS_components.Leaf} */
        Leaf;
        // @ts-ignore
        const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
            size: (12),
        }));
        const __VLS_87 = __VLS_86({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.weedyCount);
    }
    // @ts-ignore
    [weedyCount, weedyCount,];
    var __VLS_47;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid gap-0.5 max-w-full md:max-w-md" },
        ...{ style: ({ gridTemplateColumns: `repeat(${__VLS_ctx.farmStore.farmSize}, minmax(0, 1fr))` }) },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:max-w-md']} */ ;
    for (const [plot] of __VLS_vFor((__VLS_ctx.farmStore.plots))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    return __VLS_ctx.activePlotId = plot.id;
                    // @ts-ignore
                    [farmStore, farmStore, activePlotId,];
                } },
            key: (plot.id),
            ...{ class: "farm-plot rounded-xs cursor-pointer transition-colors relative leading-tight" },
            ...{ class: ([
                    __VLS_ctx.getPlotDisplay(plot).color,
                    __VLS_ctx.getPlotDisplay(plot).bg,
                    __VLS_ctx.needsWater(plot)
                        ? 'border-2 border-danger/50'
                        : __VLS_ctx.isSprinklerCovered(plot.id)
                            ? 'border border-water/40'
                            : 'border border-accent/15',
                    plot.state === 'harvestable' ? 'hover:border-accent/60' : 'hover:border-accent/40'
                ]) },
            title: (__VLS_ctx.getPlotTooltip(plot)),
        });
        /** @type {__VLS_StyleScopedClasses['farm-plot']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const __VLS_90 = (__VLS_ctx.getPlotDisplay(plot).icon);
        // @ts-ignore
        const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
            size: (14),
        }));
        const __VLS_92 = __VLS_91({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        if (plot.cropId) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] opacity-60 truncate max-w-full px-0.5 mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            (__VLS_ctx.getCropName(plot.cropId));
        }
        if ((plot.state === 'planted' || plot.state === 'growing') && !plot.watered) {
            let __VLS_95;
            /** @ts-ignore @type { | typeof __VLS_components.Droplets} */
            Droplets;
            // @ts-ignore
            const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
                size: (8),
                ...{ class: "absolute bottom-0 right-0 text-danger drop-shadow-sm" },
            }));
            const __VLS_97 = __VLS_96({
                size: (8),
                ...{ class: "absolute bottom-0 right-0 text-danger drop-shadow-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_96));
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['drop-shadow-sm']} */ ;
        }
        if (__VLS_ctx.hasSprinkler(plot.id)) {
            let __VLS_100;
            /** @ts-ignore @type { | typeof __VLS_components.Droplet} */
            Droplet;
            // @ts-ignore
            const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
                size: (8),
                ...{ class: "absolute top-0 right-0 text-water drop-shadow-sm" },
            }));
            const __VLS_102 = __VLS_101({
                size: (8),
                ...{ class: "absolute top-0 right-0 text-water drop-shadow-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_101));
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-water']} */ ;
            /** @type {__VLS_StyleScopedClasses['drop-shadow-sm']} */ ;
        }
        if (plot.fertilizer) {
            let __VLS_105;
            /** @ts-ignore @type { | typeof __VLS_components.CirclePlus} */
            CirclePlus;
            // @ts-ignore
            const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
                size: (8),
                ...{ class: "absolute bottom-0 left-0 text-success drop-shadow-sm" },
            }));
            const __VLS_107 = __VLS_106({
                size: (8),
                ...{ class: "absolute bottom-0 left-0 text-success drop-shadow-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_106));
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['drop-shadow-sm']} */ ;
        }
        if (plot.infested) {
            let __VLS_110;
            /** @ts-ignore @type { | typeof __VLS_components.Bug} */
            Bug;
            // @ts-ignore
            const __VLS_111 = __VLS_asFunctionalComponent1(__VLS_110, new __VLS_110({
                size: (8),
                ...{ class: "absolute top-0 left-0 text-danger drop-shadow-sm" },
            }));
            const __VLS_112 = __VLS_111({
                size: (8),
                ...{ class: "absolute top-0 left-0 text-danger drop-shadow-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_111));
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['drop-shadow-sm']} */ ;
        }
        if (plot.weedy) {
            let __VLS_115;
            /** @ts-ignore @type { | typeof __VLS_components.Leaf} */
            Leaf;
            // @ts-ignore
            const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
                size: (8),
                ...{ class: "absolute top-0 left-0 text-success drop-shadow-sm" },
                ...{ class: ({ 'left-2': plot.infested }) },
            }));
            const __VLS_117 = __VLS_116({
                size: (8),
                ...{ class: "absolute top-0 left-0 text-success drop-shadow-sm" },
                ...{ class: ({ 'left-2': plot.infested }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_116));
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['drop-shadow-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['left-2']} */ ;
        }
        // @ts-ignore
        [getPlotDisplay, getPlotDisplay, getPlotDisplay, needsWater, isSprinklerCovered, getPlotTooltip, getCropName, hasSprinkler,];
    }
    let __VLS_120;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent1(__VLS_120, new __VLS_120({
        name: "panel-fade",
    }));
    const __VLS_122 = __VLS_121({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    const { default: __VLS_125 } = __VLS_123.slots;
    if (__VLS_ctx.activePlot) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.activePlot))
                        throw 0;
                    return __VLS_ctx.activePlotId = null;
                    // @ts-ignore
                    [activePlotId, activePlot,];
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
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.activePlot))
                        throw 0;
                    return __VLS_ctx.activePlotId = null;
                    // @ts-ignore
                    [activePlotId,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_126;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
            size: (14),
        }));
        const __VLS_128 = __VLS_127({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_127));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.activePlot.id + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.plotStateLabel);
        if (__VLS_ctx.activePlot.giantCropGroup !== null) {
        }
        if (__VLS_ctx.activePlot.cropId) {
            (__VLS_ctx.activePlot.giantCropGroup !== null ? '巨型' : '');
            (__VLS_ctx.getCropName(__VLS_ctx.activePlot.cropId));
            if (__VLS_ctx.plotCropRegrowth) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                (__VLS_ctx.activePlot.harvestCount);
                (__VLS_ctx.plotCropMaxHarvests);
            }
        }
        if (__VLS_ctx.activePlot.cropId && __VLS_ctx.activePlot.giantCropGroup === null) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (__VLS_ctx.activePlot.watered ? 'text-water' : 'text-danger') },
            });
            (__VLS_ctx.activePlot.watered ? '已浇水' : '未浇水');
        }
        if (__VLS_ctx.activePlot.fertilizer) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (__VLS_ctx.plotFertName);
        }
        if (__VLS_ctx.hasSprinkler(__VLS_ctx.activePlot.id)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-water" },
            });
            /** @type {__VLS_StyleScopedClasses['text-water']} */ ;
        }
        if (__VLS_ctx.activePlot.infested) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            (__VLS_ctx.activePlot.infestedDays);
        }
        if (__VLS_ctx.activePlot.weedy) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (__VLS_ctx.activePlot.weedyDays);
        }
        if (__VLS_ctx.activePlot.cropId && __VLS_ctx.activePlot.state !== 'harvestable') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex-1 h-1 bg-bg rounded-xs border border-accent/10" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "h-full rounded-xs bg-success transition-all" },
                ...{ style: ({ width: Math.min(100, Math.floor((__VLS_ctx.activePlot.growthDays / (Number(__VLS_ctx.plotCropGrowthDays) || 1)) * 100)) + '%' }) },
            });
            /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted whitespace-nowrap" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (Number(__VLS_ctx.activePlot.growthDays.toFixed(2)));
            (__VLS_ctx.plotCropGrowthDays);
        }
        if (__VLS_ctx.activePlot.giantCropGroup !== null) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        if (__VLS_ctx.activePlot.state === 'wasteland') {
            const __VLS_131 = Button || Button;
            // @ts-ignore
            const __VLS_132 = __VLS_asFunctionalComponent1(__VLS_131, new __VLS_131({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0" },
                iconSize: (12),
                icon: (__VLS_ctx.Shovel),
            }));
            const __VLS_133 = __VLS_132({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0" },
                iconSize: (12),
                icon: (__VLS_ctx.Shovel),
            }, ...__VLS_functionalComponentArgsRest(__VLS_132));
            let __VLS_136;
            const __VLS_137 = {
                /** @type {typeof __VLS_136.click} */
                onClick: (__VLS_ctx.doTill),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            const { default: __VLS_138 } = __VLS_134.slots;
            // @ts-ignore
            [getCropName, hasSprinkler, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, activePlot, plotStateLabel, plotCropRegrowth, plotCropMaxHarvests, plotFertName, plotCropGrowthDays, plotCropGrowthDays, Shovel, doTill,];
            var __VLS_134;
            var __VLS_135;
        }
        if (__VLS_ctx.canWater) {
            const __VLS_139 = Button || Button;
            // @ts-ignore
            const __VLS_140 = __VLS_asFunctionalComponent1(__VLS_139, new __VLS_139({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0" },
                iconSize: (12),
                icon: (__VLS_ctx.Droplets),
            }));
            const __VLS_141 = __VLS_140({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0" },
                iconSize: (12),
                icon: (__VLS_ctx.Droplets),
            }, ...__VLS_functionalComponentArgsRest(__VLS_140));
            let __VLS_144;
            const __VLS_145 = {
                /** @type {typeof __VLS_144.click} */
                onClick: (__VLS_ctx.doWater),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            const { default: __VLS_146 } = __VLS_142.slots;
            // @ts-ignore
            [canWater, Droplets, doWater,];
            var __VLS_142;
            var __VLS_143;
        }
        if (__VLS_ctx.activePlot.infested) {
            const __VLS_147 = Button || Button;
            // @ts-ignore
            const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0 !bg-danger !text-text" },
                iconSize: (12),
                icon: (__VLS_ctx.Bug),
            }));
            const __VLS_149 = __VLS_148({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0 !bg-danger !text-text" },
                iconSize: (12),
                icon: (__VLS_ctx.Bug),
            }, ...__VLS_functionalComponentArgsRest(__VLS_148));
            let __VLS_152;
            const __VLS_153 = {
                /** @type {typeof __VLS_152.click} */
                onClick: (__VLS_ctx.doCurePest),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-text']} */ ;
            const { default: __VLS_154 } = __VLS_150.slots;
            // @ts-ignore
            [activePlot, Bug, doCurePest,];
            var __VLS_150;
            var __VLS_151;
        }
        if (__VLS_ctx.activePlot.weedy) {
            const __VLS_155 = Button || Button;
            // @ts-ignore
            const __VLS_156 = __VLS_asFunctionalComponent1(__VLS_155, new __VLS_155({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0 !bg-success !text-bg" },
                iconSize: (12),
                icon: (__VLS_ctx.Leaf),
            }));
            const __VLS_157 = __VLS_156({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0 !bg-success !text-bg" },
                iconSize: (12),
                icon: (__VLS_ctx.Leaf),
            }, ...__VLS_functionalComponentArgsRest(__VLS_156));
            let __VLS_160;
            const __VLS_161 = {
                /** @type {typeof __VLS_160.click} */
                onClick: (__VLS_ctx.doClearWeed),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_162 } = __VLS_158.slots;
            // @ts-ignore
            [activePlot, Leaf, doClearWeed,];
            var __VLS_158;
            var __VLS_159;
        }
        if (__VLS_ctx.activePlot.state === 'harvestable') {
            const __VLS_163 = Button || Button;
            // @ts-ignore
            const __VLS_164 = __VLS_asFunctionalComponent1(__VLS_163, new __VLS_163({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0 !bg-accent !text-bg" },
                iconSize: (12),
                icon: (__VLS_ctx.Wheat),
            }));
            const __VLS_165 = __VLS_164({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0 !bg-accent !text-bg" },
                iconSize: (12),
                icon: (__VLS_ctx.Wheat),
            }, ...__VLS_functionalComponentArgsRest(__VLS_164));
            let __VLS_168;
            const __VLS_169 = {
                /** @type {typeof __VLS_168.click} */
                onClick: (__VLS_ctx.doHarvest),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_170 } = __VLS_166.slots;
            // @ts-ignore
            [activePlot, Wheat, doHarvest,];
            var __VLS_166;
            var __VLS_167;
        }
        if (__VLS_ctx.activePlot.state === 'planted' || __VLS_ctx.activePlot.state === 'growing' || __VLS_ctx.activePlot.state === 'harvestable') {
            const __VLS_171 = Button || Button;
            // @ts-ignore
            const __VLS_172 = __VLS_asFunctionalComponent1(__VLS_171, new __VLS_171({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0" },
                iconSize: (12),
                icon: (__VLS_ctx.Trash2),
            }));
            const __VLS_173 = __VLS_172({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center shrink-0" },
                iconSize: (12),
                icon: (__VLS_ctx.Trash2),
            }, ...__VLS_functionalComponentArgsRest(__VLS_172));
            let __VLS_176;
            const __VLS_177 = {
                /** @type {typeof __VLS_176.click} */
                onClick: (__VLS_ctx.doRemoveCrop),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            const { default: __VLS_178 } = __VLS_174.slots;
            // @ts-ignore
            [activePlot, activePlot, activePlot, Trash2, doRemoveCrop,];
            var __VLS_174;
            var __VLS_175;
        }
        if (__VLS_ctx.activePlot.state === 'tilled' && __VLS_ctx.plantableSeeds.length > 0) {
            const __VLS_179 = Divider;
            // @ts-ignore
            const __VLS_180 = __VLS_asFunctionalComponent1(__VLS_179, new __VLS_179({
                label: "种植",
            }));
            const __VLS_181 = __VLS_180({
                label: "种植",
            }, ...__VLS_functionalComponentArgsRest(__VLS_180));
            for (const [seed] of __VLS_vFor((__VLS_ctx.plantableSeeds))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.farmTab === 'field'))
                                throw 0;
                            if (!(__VLS_ctx.activePlot))
                                throw 0;
                            if (!(__VLS_ctx.activePlot.state === 'tilled' && __VLS_ctx.plantableSeeds.length > 0))
                                throw 0;
                            return __VLS_ctx.doPlant(seed.cropId, seed.quality);
                            // @ts-ignore
                            [plantableSeeds, plantableSeeds, activePlot, doPlant,];
                        } },
                    key: (seed.cropId + ':' + seed.quality),
                    ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (seed.colorClass) },
                });
                (seed.name);
                if (seed.quality !== 'normal') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: ({
                                'text-quality-fine': seed.quality === 'fine',
                                'text-quality-excellent': seed.quality === 'excellent',
                                'text-quality-supreme': seed.quality === 'supreme'
                            }) },
                        ...{ class: "ml-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
                    (__VLS_ctx.QUALITY_NAMES[seed.quality]);
                }
                if (seed.regrowth) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-success ml-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (seed.count);
                // @ts-ignore
                [QUALITY_NAMES,];
            }
        }
        if (__VLS_ctx.activePlot.state === 'tilled' && __VLS_ctx.plantableBreedingSeeds.length > 0) {
            const __VLS_184 = Divider;
            // @ts-ignore
            const __VLS_185 = __VLS_asFunctionalComponent1(__VLS_184, new __VLS_184({
                label: "育种种子",
                ...{ class: "!my-2" },
            }));
            const __VLS_186 = __VLS_185({
                label: "育种种子",
                ...{ class: "!my-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_185));
            /** @type {__VLS_StyleScopedClasses['!my-2']} */ ;
            for (const [seed] of __VLS_vFor((__VLS_ctx.plantableBreedingSeeds))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.farmTab === 'field'))
                                throw 0;
                            if (!(__VLS_ctx.activePlot))
                                throw 0;
                            if (!(__VLS_ctx.activePlot.state === 'tilled' && __VLS_ctx.plantableBreedingSeeds.length > 0))
                                throw 0;
                            return __VLS_ctx.doPlantGeneticSeed(seed.genetics.id);
                            // @ts-ignore
                            [plantableBreedingSeeds, plantableBreedingSeeds, activePlot, doPlantGeneticSeed,];
                        } },
                    key: (seed.genetics.id),
                    ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (__VLS_ctx.getCropName(seed.genetics.cropId));
                (seed.genetics.generation);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted flex items-center space-x-px" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
                for (const [n] of __VLS_vFor((__VLS_ctx.getStarRating(seed.genetics)))) {
                    let __VLS_189;
                    /** @ts-ignore @type { | typeof __VLS_components.Star} */
                    Star;
                    // @ts-ignore
                    const __VLS_190 = __VLS_asFunctionalComponent1(__VLS_189, new __VLS_189({
                        key: (n),
                        size: (10),
                    }));
                    const __VLS_191 = __VLS_190({
                        key: (n),
                        size: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_190));
                    // @ts-ignore
                    [getCropName, getStarRating,];
                }
                // @ts-ignore
                [];
            }
        }
        if (__VLS_ctx.activePlot.state === 'tilled' && __VLS_ctx.plantableSeeds.length === 0 && __VLS_ctx.plantableBreedingSeeds.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
            let __VLS_194;
            /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
            Sprout;
            // @ts-ignore
            const __VLS_195 = __VLS_asFunctionalComponent1(__VLS_194, new __VLS_194({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_196 = __VLS_195({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_195));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            if (__VLS_ctx.isWanwupuOpen) {
                const __VLS_199 = Button || Button;
                // @ts-ignore
                const __VLS_200 = __VLS_asFunctionalComponent1(__VLS_199, new __VLS_199({
                    ...{ 'onClick': {} },
                    ...{ class: "mt-2" },
                    iconSize: (12),
                    icon: (__VLS_ctx.Store),
                }));
                const __VLS_201 = __VLS_200({
                    ...{ 'onClick': {} },
                    ...{ class: "mt-2" },
                    iconSize: (12),
                    icon: (__VLS_ctx.Store),
                }, ...__VLS_functionalComponentArgsRest(__VLS_200));
                let __VLS_204;
                const __VLS_205 = {
                    /** @type {typeof __VLS_204.click} */
                    onClick: (__VLS_ctx.goToShop),
                };
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                const { default: __VLS_206 } = __VLS_202.slots;
                // @ts-ignore
                [plantableSeeds, plantableBreedingSeeds, activePlot, isWanwupuOpen, Store, goToShop,];
                var __VLS_202;
                var __VLS_203;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-muted/60 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                (__VLS_ctx.wanwupuClosedReason);
            }
        }
        if (__VLS_ctx.canFertilize && __VLS_ctx.fertilizerItems.length > 0) {
            const __VLS_207 = Divider;
            // @ts-ignore
            const __VLS_208 = __VLS_asFunctionalComponent1(__VLS_207, new __VLS_207({
                label: "施肥",
            }));
            const __VLS_209 = __VLS_208({
                label: "施肥",
            }, ...__VLS_functionalComponentArgsRest(__VLS_208));
            for (const [f] of __VLS_vFor((__VLS_ctx.fertilizerItems))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.farmTab === 'field'))
                                throw 0;
                            if (!(__VLS_ctx.activePlot))
                                throw 0;
                            if (!(__VLS_ctx.canFertilize && __VLS_ctx.fertilizerItems.length > 0))
                                throw 0;
                            return __VLS_ctx.doFertilize(f.type);
                            // @ts-ignore
                            [fertilizerItems, fertilizerItems, wanwupuClosedReason, canFertilize, doFertilize,];
                        } },
                    key: (f.itemId),
                    ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (f.colorClass) },
                });
                (f.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (f.count);
                // @ts-ignore
                [];
            }
        }
        if (!__VLS_ctx.hasSprinkler(__VLS_ctx.activePlot.id) && __VLS_ctx.sprinklerItems.length > 0) {
            const __VLS_212 = Divider;
            // @ts-ignore
            const __VLS_213 = __VLS_asFunctionalComponent1(__VLS_212, new __VLS_212({
                label: "洒水器",
            }));
            const __VLS_214 = __VLS_213({
                label: "洒水器",
            }, ...__VLS_functionalComponentArgsRest(__VLS_213));
            for (const [s] of __VLS_vFor((__VLS_ctx.sprinklerItems))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.farmTab === 'field'))
                                throw 0;
                            if (!(__VLS_ctx.activePlot))
                                throw 0;
                            if (!(!__VLS_ctx.hasSprinkler(__VLS_ctx.activePlot.id) && __VLS_ctx.sprinklerItems.length > 0))
                                throw 0;
                            return __VLS_ctx.doPlaceSprinkler(s.type);
                            // @ts-ignore
                            [hasSprinkler, activePlot, sprinklerItems, sprinklerItems, doPlaceSprinkler,];
                        } },
                    key: (s.itemId),
                    ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (s.colorClass) },
                });
                (s.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (s.count);
                // @ts-ignore
                [];
            }
        }
        if (__VLS_ctx.hasSprinkler(__VLS_ctx.activePlot.id)) {
            const __VLS_217 = Button || Button;
            // @ts-ignore
            const __VLS_218 = __VLS_asFunctionalComponent1(__VLS_217, new __VLS_217({
                ...{ 'onClick': {} },
                ...{ class: "mr-1 justify-center shrink-0" },
            }));
            const __VLS_219 = __VLS_218({
                ...{ 'onClick': {} },
                ...{ class: "mr-1 justify-center shrink-0" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_218));
            let __VLS_222;
            const __VLS_223 = {
                /** @type {typeof __VLS_222.click} */
                onClick: (__VLS_ctx.doRemoveSprinkler),
            };
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            const { default: __VLS_224 } = __VLS_220.slots;
            // @ts-ignore
            [hasSprinkler, activePlot, doRemoveSprinkler,];
            var __VLS_220;
            var __VLS_221;
        }
    }
    // @ts-ignore
    [];
    var __VLS_123;
    let __VLS_225;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_226 = __VLS_asFunctionalComponent1(__VLS_225, new __VLS_225({
        name: "panel-fade",
    }));
    const __VLS_227 = __VLS_226({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_226));
    const { default: __VLS_230 } = __VLS_228.slots;
    if (__VLS_ctx.showBatchPlant) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchPlant))
                        throw 0;
                    return __VLS_ctx.showBatchPlant = false;
                    // @ts-ignore
                    [showBatchPlant, showBatchPlant,];
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
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchPlant))
                        throw 0;
                    return __VLS_ctx.showBatchPlant = false;
                    // @ts-ignore
                    [showBatchPlant,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_231;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_232 = __VLS_asFunctionalComponent1(__VLS_231, new __VLS_231({
            size: (14),
        }));
        const __VLS_233 = __VLS_232({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_232));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.tilledEmptyCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-40 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-40']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [seed] of __VLS_vFor((__VLS_ctx.plantableSeeds))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'field'))
                            throw 0;
                        if (!(__VLS_ctx.showBatchPlant))
                            throw 0;
                        return __VLS_ctx.doBatchPlant(seed.cropId);
                        // @ts-ignore
                        [tilledEmptyCount, plantableSeeds, doBatchPlant,];
                    } },
                key: (seed.cropId),
                ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (seed.colorClass) },
            });
            (seed.name);
            if (seed.regrowth) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (seed.count);
            // @ts-ignore
            [];
        }
        if (__VLS_ctx.batchBreedingSeedGroups.length > 0) {
            const __VLS_236 = Divider;
            // @ts-ignore
            const __VLS_237 = __VLS_asFunctionalComponent1(__VLS_236, new __VLS_236({
                label: "育种种子",
                ...{ class: "!my-2" },
            }));
            const __VLS_238 = __VLS_237({
                label: "育种种子",
                ...{ class: "!my-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_237));
            /** @type {__VLS_StyleScopedClasses['!my-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1 max-h-40 overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-40']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            for (const [group] of __VLS_vFor((__VLS_ctx.batchBreedingSeedGroups))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.farmTab === 'field'))
                                throw 0;
                            if (!(__VLS_ctx.showBatchPlant))
                                throw 0;
                            if (!(__VLS_ctx.batchBreedingSeedGroups.length > 0))
                                throw 0;
                            return __VLS_ctx.doBatchPlantBreeding(group.cropId);
                            // @ts-ignore
                            [batchBreedingSeedGroups, batchBreedingSeedGroups, doBatchPlantBreeding,];
                        } },
                    key: (group.cropId),
                    ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (group.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (group.minGen);
                (group.minGen !== group.maxGen ? `~${group.maxGen}` : '');
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (group.count);
                // @ts-ignore
                [];
            }
        }
        if (__VLS_ctx.plantableSeeds.length === 0 && __VLS_ctx.batchBreedingSeedGroups.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
            let __VLS_241;
            /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
            Sprout;
            // @ts-ignore
            const __VLS_242 = __VLS_asFunctionalComponent1(__VLS_241, new __VLS_241({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_243 = __VLS_242({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_242));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            if (__VLS_ctx.isWanwupuOpen) {
                const __VLS_246 = Button || Button;
                // @ts-ignore
                const __VLS_247 = __VLS_asFunctionalComponent1(__VLS_246, new __VLS_246({
                    ...{ 'onClick': {} },
                    ...{ class: "mt-2" },
                    iconSize: (12),
                    icon: (__VLS_ctx.Store),
                }));
                const __VLS_248 = __VLS_247({
                    ...{ 'onClick': {} },
                    ...{ class: "mt-2" },
                    iconSize: (12),
                    icon: (__VLS_ctx.Store),
                }, ...__VLS_functionalComponentArgsRest(__VLS_247));
                let __VLS_251;
                const __VLS_252 = {
                    /** @type {typeof __VLS_251.click} */
                    onClick: (__VLS_ctx.goToShop),
                };
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                const { default: __VLS_253 } = __VLS_249.slots;
                // @ts-ignore
                [plantableSeeds, isWanwupuOpen, Store, goToShop, batchBreedingSeedGroups,];
                var __VLS_249;
                var __VLS_250;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-muted/60 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                (__VLS_ctx.wanwupuClosedReason);
            }
        }
    }
    // @ts-ignore
    [wanwupuClosedReason,];
    var __VLS_228;
    let __VLS_254;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_255 = __VLS_asFunctionalComponent1(__VLS_254, new __VLS_254({
        name: "panel-fade",
    }));
    const __VLS_256 = __VLS_255({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_255));
    const { default: __VLS_259 } = __VLS_257.slots;
    if (__VLS_ctx.showBatchFertilize) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchFertilize))
                        throw 0;
                    return __VLS_ctx.showBatchFertilize = false;
                    // @ts-ignore
                    [showBatchFertilize, showBatchFertilize,];
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
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showBatchFertilize))
                        throw 0;
                    return __VLS_ctx.showBatchFertilize = false;
                    // @ts-ignore
                    [showBatchFertilize,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_260;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_261 = __VLS_asFunctionalComponent1(__VLS_260, new __VLS_260({
            size: (14),
        }));
        const __VLS_262 = __VLS_261({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_261));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.fertilizableCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [f] of __VLS_vFor((__VLS_ctx.fertilizerItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'field'))
                            throw 0;
                        if (!(__VLS_ctx.showBatchFertilize))
                            throw 0;
                        return __VLS_ctx.doBatchFertilize(f.type);
                        // @ts-ignore
                        [fertilizableCount, fertilizerItems, doBatchFertilize,];
                    } },
                key: (f.itemId),
                ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (f.colorClass) },
            });
            (f.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (f.count);
            // @ts-ignore
            [];
        }
        if (__VLS_ctx.fertilizerItems.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
            let __VLS_265;
            /** @ts-ignore @type { | typeof __VLS_components.CirclePlus} */
            CirclePlus;
            // @ts-ignore
            const __VLS_266 = __VLS_asFunctionalComponent1(__VLS_265, new __VLS_265({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_267 = __VLS_266({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_266));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        }
    }
    // @ts-ignore
    [fertilizerItems,];
    var __VLS_257;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-2 border border-accent/10 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-4 md:space-x-3 md:flex md:flex-wrap text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    for (const [item, i] of __VLS_vFor((__VLS_ctx.PLOT_LEGENDS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (i),
        });
        const __VLS_270 = (item.icon);
        // @ts-ignore
        const __VLS_271 = __VLS_asFunctionalComponent1(__VLS_270, new __VLS_270({
            size: (10),
            ...{ class: ([item.color, 'inline']) },
        }));
        const __VLS_272 = __VLS_271({
            size: (10),
            ...{ class: ([item.color, 'inline']) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_271));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        (item.label);
        // @ts-ignore
        [PLOT_LEGENDS,];
    }
    if (__VLS_ctx.plotWarnings.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap space-x-2 mt-1.5 border border-accent/20 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        for (const [w, i] of __VLS_vFor((__VLS_ctx.plotWarnings))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (i),
                ...{ class: "inline-flex items-center space-x-0.5 text-xs" },
                ...{ class: (w.color) },
            });
            /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (w.text);
            // @ts-ignore
            [plotWarnings, plotWarnings,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.farmTab === 'field'))
                    throw 0;
                return __VLS_ctx.showShippingBox = true;
                // @ts-ignore
                [showShippingBox,];
            } },
        ...{ class: "mt-3 flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    let __VLS_275;
    /** @ts-ignore @type { | typeof __VLS_components.Package} */
    Package;
    // @ts-ignore
    const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({
        size: (14),
        ...{ class: "text-accent" },
    }));
    const __VLS_277 = __VLS_276({
        size: (14),
        ...{ class: "text-accent" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_276));
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    if (__VLS_ctx.shopStore.shippingBox.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.shopStore.shippingBox.length);
    }
    if (__VLS_ctx.shippingBoxTotal > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.shippingBoxTotal);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    let __VLS_280;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent1(__VLS_280, new __VLS_280({
        name: "panel-fade",
    }));
    const __VLS_282 = __VLS_281({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    const { default: __VLS_285 } = __VLS_283.slots;
    if (__VLS_ctx.showShippingBox) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showShippingBox))
                        throw 0;
                    return __VLS_ctx.showShippingBox = false;
                    // @ts-ignore
                    [showShippingBox, showShippingBox, shopStore, shopStore, shippingBoxTotal, shippingBoxTotal,];
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
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showShippingBox))
                        throw 0;
                    return __VLS_ctx.showShippingBox = false;
                    // @ts-ignore
                    [showShippingBox,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_286;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_287 = __VLS_asFunctionalComponent1(__VLS_286, new __VLS_286({
            size: (14),
        }));
        const __VLS_288 = __VLS_287({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_287));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1.5 text-sm text-accent mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        let __VLS_291;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_292 = __VLS_asFunctionalComponent1(__VLS_291, new __VLS_291({
            size: (14),
        }));
        const __VLS_293 = __VLS_292({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_292));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        if (__VLS_ctx.inventoryStore.getRingEffectValue('sell_price_bonus') > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-success text-xs mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (Math.round(__VLS_ctx.inventoryStore.getRingEffectValue('sell_price_bonus') * 100));
        }
        if (__VLS_ctx.shopStore.shippingBox.length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1 max-h-36 overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-36']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            for (const [entry, idx] of __VLS_vFor((__VLS_ctx.shopStore.shippingBox))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.farmTab === 'field'))
                                throw 0;
                            if (!(__VLS_ctx.showShippingBox))
                                throw 0;
                            if (!(__VLS_ctx.shopStore.shippingBox.length > 0))
                                throw 0;
                            return __VLS_ctx.handleRemoveFromBox(entry.itemId, entry.quantity, entry.quality);
                            // @ts-ignore
                            [shopStore, shopStore, inventoryStore, inventoryStore, handleRemoveFromBox,];
                        } },
                    key: (idx),
                    ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-2 py-1 cursor-pointer hover:bg-accent/5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "min-w-0" },
                });
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: ({
                            'text-quality-fine': entry.quality === 'fine',
                            'text-quality-excellent': entry.quality === 'excellent',
                            'text-quality-supreme': entry.quality === 'supreme'
                        }) },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
                (__VLS_ctx.getItemName(entry.itemId));
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted text-xs ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                (entry.quantity);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-accent whitespace-nowrap ml-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
                (__VLS_ctx.shopStore.calculateSellPrice(entry.itemId, entry.quantity, entry.quality));
                // @ts-ignore
                [shopStore, getItemName,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mt-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
            (__VLS_ctx.shippingBoxTotal);
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-4 text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            let __VLS_296;
            /** @ts-ignore @type { | typeof __VLS_components.Package} */
            Package;
            // @ts-ignore
            const __VLS_297 = __VLS_asFunctionalComponent1(__VLS_296, new __VLS_296({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_298 = __VLS_297({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_297));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        }
        if (__VLS_ctx.shippableItems.length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1 overflow-auto max-h-48" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
            for (const [item] of __VLS_vFor((__VLS_ctx.shippableItems))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (item.itemId + item.quality),
                    ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1 mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "min-w-0 flex items-center space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: ({
                            'text-quality-fine': item.quality === 'fine',
                            'text-quality-excellent': item.quality === 'excellent',
                            'text-quality-supreme': item.quality === 'supreme'
                        }) },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
                (item.def?.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (item.quantity);
                if (__VLS_ctx.shopStore.shippedItems.includes(item.itemId)) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-success/60" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-success/60']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                const __VLS_301 = Button || Button;
                // @ts-ignore
                const __VLS_302 = __VLS_asFunctionalComponent1(__VLS_301, new __VLS_301({
                    ...{ 'onClick': {} },
                }));
                const __VLS_303 = __VLS_302({
                    ...{ 'onClick': {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_302));
                let __VLS_306;
                const __VLS_307 = {
                    /** @type {typeof __VLS_306.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'field'))
                            throw 0;
                        if (!(__VLS_ctx.showShippingBox))
                            throw 0;
                        if (!(__VLS_ctx.shippableItems.length > 0))
                            throw 0;
                        return __VLS_ctx.handleAddToBox(item.itemId, 1, item.quality);
                        // @ts-ignore
                        [shopStore, shippingBoxTotal, shippableItems, shippableItems, handleAddToBox,];
                    },
                };
                const { default: __VLS_308 } = __VLS_304.slots;
                // @ts-ignore
                [];
                var __VLS_304;
                var __VLS_305;
                if (item.quantity > 1) {
                    const __VLS_309 = Button || Button;
                    // @ts-ignore
                    const __VLS_310 = __VLS_asFunctionalComponent1(__VLS_309, new __VLS_309({
                        ...{ 'onClick': {} },
                    }));
                    const __VLS_311 = __VLS_310({
                        ...{ 'onClick': {} },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_310));
                    let __VLS_314;
                    const __VLS_315 = {
                        /** @type {typeof __VLS_314.click} */
                        onClick: (...[$event]) => {
                            if (!(__VLS_ctx.farmTab === 'field'))
                                throw 0;
                            if (!(__VLS_ctx.showShippingBox))
                                throw 0;
                            if (!(__VLS_ctx.shippableItems.length > 0))
                                throw 0;
                            if (!(item.quantity > 1))
                                throw 0;
                            return __VLS_ctx.handleAddToBox(item.itemId, item.quantity, item.quality);
                            // @ts-ignore
                            [handleAddToBox,];
                        },
                    };
                    const { default: __VLS_316 } = __VLS_312.slots;
                    // @ts-ignore
                    [];
                    var __VLS_312;
                    var __VLS_313;
                }
                // @ts-ignore
                [];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center py-3 text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            let __VLS_317;
            /** @ts-ignore @type { | typeof __VLS_components.Wheat} */
            Wheat;
            // @ts-ignore
            const __VLS_318 = __VLS_asFunctionalComponent1(__VLS_317, new __VLS_317({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_319 = __VLS_318({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_318));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        }
    }
    // @ts-ignore
    [];
    var __VLS_283;
    if (__VLS_ctx.showGreenhouse) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'field'))
                        throw 0;
                    if (!(__VLS_ctx.showGreenhouse))
                        throw 0;
                    return __VLS_ctx.showGreenhouseModal = true;
                    // @ts-ignore
                    [showGreenhouse, showGreenhouseModal,];
                } },
            ...{ class: "mt-3 flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        let __VLS_322;
        /** @ts-ignore @type { | typeof __VLS_components.Warehouse} */
        Warehouse;
        // @ts-ignore
        const __VLS_323 = __VLS_asFunctionalComponent1(__VLS_322, new __VLS_322({
            size: (14),
            ...{ class: "text-accent" },
        }));
        const __VLS_324 = __VLS_323({
            size: (14),
            ...{ class: "text-accent" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_323));
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-sm text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        if (__VLS_ctx.ghHarvestableCount > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.ghHarvestableCount);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.farmStore.greenhousePlots.length);
    }
}
if (__VLS_ctx.farmTab === 'tree') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    let __VLS_327;
    /** @ts-ignore @type { | typeof __VLS_components.TreeDeciduous} */
    TreeDeciduous;
    // @ts-ignore
    const __VLS_328 = __VLS_asFunctionalComponent1(__VLS_327, new __VLS_327({
        size: (14),
    }));
    const __VLS_329 = __VLS_328({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_328));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.farmStore.fruitTrees.length);
    (__VLS_ctx.MAX_FRUIT_TREES);
    if (__VLS_ctx.farmStore.fruitTrees.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        for (const [tree] of __VLS_vFor((__VLS_ctx.farmStore.fruitTrees))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (tree.id),
                ...{ class: "border border-accent/10 rounded-xs px-3 py-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs font-bold" },
                ...{ class: (tree.mature ? 'text-accent' : 'text-muted') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.getTreeName(tree.type));
            if (tree.mature) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (tree.yearAge);
            }
            if (!tree.mature) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-2 mb-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex-1 h-1 bg-bg rounded-xs border border-accent/10" },
                });
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                    ...{ class: "h-full rounded-xs bg-success transition-all" },
                    ...{ style: ({ width: Math.min(100, Math.floor((tree.growthDays / 28) * 100)) + '%' }) },
                });
                /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted whitespace-nowrap" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                (tree.growthDays);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex justify-end" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
                const __VLS_332 = Button || Button;
                // @ts-ignore
                const __VLS_333 = __VLS_asFunctionalComponent1(__VLS_332, new __VLS_332({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Axe),
                }));
                const __VLS_334 = __VLS_333({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Axe),
                }, ...__VLS_functionalComponentArgsRest(__VLS_333));
                let __VLS_337;
                const __VLS_338 = {
                    /** @type {typeof __VLS_337.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'tree'))
                            throw 0;
                        if (!(__VLS_ctx.farmStore.fruitTrees.length > 0))
                            throw 0;
                        if (!(!tree.mature))
                            throw 0;
                        return __VLS_ctx.chopFruitTreeTarget = { id: tree.id, type: tree.type };
                        // @ts-ignore
                        [farmTab, farmStore, farmStore, farmStore, farmStore, ghHarvestableCount, ghHarvestableCount, MAX_FRUIT_TREES, getTreeName, Axe, chopFruitTreeTarget,];
                    },
                };
                const { default: __VLS_339 } = __VLS_335.slots;
                // @ts-ignore
                [];
                var __VLS_335;
                var __VLS_336;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                if (tree.todayFruit) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-accent" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-success" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                    (__VLS_ctx.getTreeFruitSeason(tree.type));
                }
                const __VLS_340 = Button || Button;
                // @ts-ignore
                const __VLS_341 = __VLS_asFunctionalComponent1(__VLS_340, new __VLS_340({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Axe),
                }));
                const __VLS_342 = __VLS_341({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Axe),
                }, ...__VLS_functionalComponentArgsRest(__VLS_341));
                let __VLS_345;
                const __VLS_346 = {
                    /** @type {typeof __VLS_345.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'tree'))
                            throw 0;
                        if (!(__VLS_ctx.farmStore.fruitTrees.length > 0))
                            throw 0;
                        if (!!(!tree.mature))
                            throw 0;
                        return __VLS_ctx.chopFruitTreeTarget = { id: tree.id, type: tree.type };
                        // @ts-ignore
                        [Axe, chopFruitTreeTarget, getTreeFruitSeason,];
                    },
                };
                const { default: __VLS_347 } = __VLS_343.slots;
                // @ts-ignore
                [];
                var __VLS_343;
                var __VLS_344;
            }
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-4 text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        let __VLS_348;
        /** @ts-ignore @type { | typeof __VLS_components.TreeDeciduous} */
        TreeDeciduous;
        // @ts-ignore
        const __VLS_349 = __VLS_asFunctionalComponent1(__VLS_348, new __VLS_348({
            size: (32),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_350 = __VLS_349({
            size: (32),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_349));
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/60 mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    }
    if (__VLS_ctx.plantableSaplings.length > 0 && __VLS_ctx.farmStore.fruitTrees.length < __VLS_ctx.MAX_FRUIT_TREES) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1.5 flex-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        for (const [s] of __VLS_vFor((__VLS_ctx.plantableSaplings))) {
            const __VLS_353 = Button || Button;
            // @ts-ignore
            const __VLS_354 = __VLS_asFunctionalComponent1(__VLS_353, new __VLS_353({
                ...{ 'onClick': {} },
                key: (s.saplingId),
                iconSize: (12),
                icon: (__VLS_ctx.TreePine),
            }));
            const __VLS_355 = __VLS_354({
                ...{ 'onClick': {} },
                key: (s.saplingId),
                iconSize: (12),
                icon: (__VLS_ctx.TreePine),
            }, ...__VLS_functionalComponentArgsRest(__VLS_354));
            let __VLS_358;
            const __VLS_359 = {
                /** @type {typeof __VLS_358.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'tree'))
                        throw 0;
                    if (!(__VLS_ctx.plantableSaplings.length > 0 && __VLS_ctx.farmStore.fruitTrees.length < __VLS_ctx.MAX_FRUIT_TREES))
                        throw 0;
                    return __VLS_ctx.handlePlantTree(s.type);
                    // @ts-ignore
                    [farmStore, MAX_FRUIT_TREES, plantableSaplings, plantableSaplings, TreePine, handlePlantTree,];
                },
            };
            const { default: __VLS_360 } = __VLS_356.slots;
            (s.name);
            (s.count);
            // @ts-ignore
            [];
            var __VLS_356;
            var __VLS_357;
            // @ts-ignore
            [];
        }
    }
    let __VLS_361;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_362 = __VLS_asFunctionalComponent1(__VLS_361, new __VLS_361({
        name: "panel-fade",
    }));
    const __VLS_363 = __VLS_362({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_362));
    const { default: __VLS_366 } = __VLS_364.slots;
    if (__VLS_ctx.chopFruitTreeTarget) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'tree'))
                        throw 0;
                    if (!(__VLS_ctx.chopFruitTreeTarget))
                        throw 0;
                    return __VLS_ctx.chopFruitTreeTarget = null;
                    // @ts-ignore
                    [chopFruitTreeTarget, chopFruitTreeTarget,];
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
                    if (!(__VLS_ctx.farmTab === 'tree'))
                        throw 0;
                    if (!(__VLS_ctx.chopFruitTreeTarget))
                        throw 0;
                    return __VLS_ctx.chopFruitTreeTarget = null;
                    // @ts-ignore
                    [chopFruitTreeTarget,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_367;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_368 = __VLS_asFunctionalComponent1(__VLS_367, new __VLS_367({
            size: (14),
        }));
        const __VLS_369 = __VLS_368({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_368));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-text mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.getTreeName(__VLS_ctx.chopFruitTreeTarget.type));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_372 = Button || Button;
        // @ts-ignore
        const __VLS_373 = __VLS_asFunctionalComponent1(__VLS_372, new __VLS_372({
            ...{ 'onClick': {} },
            ...{ class: "flex-1" },
        }));
        const __VLS_374 = __VLS_373({
            ...{ 'onClick': {} },
            ...{ class: "flex-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_373));
        let __VLS_377;
        const __VLS_378 = {
            /** @type {typeof __VLS_377.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.farmTab === 'tree'))
                    throw 0;
                if (!(__VLS_ctx.chopFruitTreeTarget))
                    throw 0;
                return __VLS_ctx.chopFruitTreeTarget = null;
                // @ts-ignore
                [getTreeName, chopFruitTreeTarget, chopFruitTreeTarget,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        const { default: __VLS_379 } = __VLS_375.slots;
        // @ts-ignore
        [];
        var __VLS_375;
        var __VLS_376;
        const __VLS_380 = Button || Button;
        // @ts-ignore
        const __VLS_381 = __VLS_asFunctionalComponent1(__VLS_380, new __VLS_380({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 !bg-danger !text-text" },
            iconSize: (12),
            icon: (__VLS_ctx.Axe),
        }));
        const __VLS_382 = __VLS_381({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 !bg-danger !text-text" },
            iconSize: (12),
            icon: (__VLS_ctx.Axe),
        }, ...__VLS_functionalComponentArgsRest(__VLS_381));
        let __VLS_385;
        const __VLS_386 = {
            /** @type {typeof __VLS_385.click} */
            onClick: (__VLS_ctx.confirmChopFruitTree),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-text']} */ ;
        const { default: __VLS_387 } = __VLS_383.slots;
        // @ts-ignore
        [Axe, confirmChopFruitTree,];
        var __VLS_383;
        var __VLS_384;
    }
    // @ts-ignore
    [];
    var __VLS_364;
    let __VLS_388;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_389 = __VLS_asFunctionalComponent1(__VLS_388, new __VLS_388({
        name: "panel-fade",
    }));
    const __VLS_390 = __VLS_389({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_389));
    const { default: __VLS_393 } = __VLS_391.slots;
    if (__VLS_ctx.chopWildTreeTarget) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'tree'))
                        throw 0;
                    if (!(__VLS_ctx.chopWildTreeTarget))
                        throw 0;
                    return __VLS_ctx.chopWildTreeTarget = null;
                    // @ts-ignore
                    [chopWildTreeTarget, chopWildTreeTarget,];
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
                    if (!(__VLS_ctx.farmTab === 'tree'))
                        throw 0;
                    if (!(__VLS_ctx.chopWildTreeTarget))
                        throw 0;
                    return __VLS_ctx.chopWildTreeTarget = null;
                    // @ts-ignore
                    [chopWildTreeTarget,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_394;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_395 = __VLS_asFunctionalComponent1(__VLS_394, new __VLS_394({
            size: (14),
        }));
        const __VLS_396 = __VLS_395({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_395));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-text mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.getWildTreeName(__VLS_ctx.chopWildTreeTarget.type));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        (__VLS_ctx.chopWildTreeTarget.chopCount);
        (3 - __VLS_ctx.chopWildTreeTarget.chopCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_399 = Button || Button;
        // @ts-ignore
        const __VLS_400 = __VLS_asFunctionalComponent1(__VLS_399, new __VLS_399({
            ...{ 'onClick': {} },
            ...{ class: "flex-1" },
        }));
        const __VLS_401 = __VLS_400({
            ...{ 'onClick': {} },
            ...{ class: "flex-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_400));
        let __VLS_404;
        const __VLS_405 = {
            /** @type {typeof __VLS_404.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.farmTab === 'tree'))
                    throw 0;
                if (!(__VLS_ctx.chopWildTreeTarget))
                    throw 0;
                return __VLS_ctx.chopWildTreeTarget = null;
                // @ts-ignore
                [chopWildTreeTarget, chopWildTreeTarget, chopWildTreeTarget, chopWildTreeTarget, getWildTreeName,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        const { default: __VLS_406 } = __VLS_402.slots;
        // @ts-ignore
        [];
        var __VLS_402;
        var __VLS_403;
        const __VLS_407 = Button || Button;
        // @ts-ignore
        const __VLS_408 = __VLS_asFunctionalComponent1(__VLS_407, new __VLS_407({
            ...{ 'onClick': {} },
            ...{ class: "flex-1" },
            ...{ class: (__VLS_ctx.chopWildTreeTarget.chopCount >= 2 ? '!bg-danger !text-text' : '!bg-accent !text-bg') },
            iconSize: (12),
            icon: (__VLS_ctx.Axe),
        }));
        const __VLS_409 = __VLS_408({
            ...{ 'onClick': {} },
            ...{ class: "flex-1" },
            ...{ class: (__VLS_ctx.chopWildTreeTarget.chopCount >= 2 ? '!bg-danger !text-text' : '!bg-accent !text-bg') },
            iconSize: (12),
            icon: (__VLS_ctx.Axe),
        }, ...__VLS_functionalComponentArgsRest(__VLS_408));
        let __VLS_412;
        const __VLS_413 = {
            /** @type {typeof __VLS_412.click} */
            onClick: (__VLS_ctx.confirmChopWildTree),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        const { default: __VLS_414 } = __VLS_410.slots;
        (__VLS_ctx.chopWildTreeTarget.chopCount >= 2 ? '确认' : '确认伐木');
        // @ts-ignore
        [Axe, chopWildTreeTarget, chopWildTreeTarget, confirmChopWildTree,];
        var __VLS_410;
        var __VLS_411;
    }
    // @ts-ignore
    [];
    var __VLS_391;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-3 border border-accent/20 rounded-xs p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    let __VLS_415;
    /** @ts-ignore @type { | typeof __VLS_components.TreePine} */
    TreePine;
    // @ts-ignore
    const __VLS_416 = __VLS_asFunctionalComponent1(__VLS_415, new __VLS_415({
        size: (14),
    }));
    const __VLS_417 = __VLS_416({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_416));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.farmStore.wildTrees.length);
    (__VLS_ctx.MAX_WILD_TREES);
    if (__VLS_ctx.farmStore.wildTrees.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        for (const [tree] of __VLS_vFor((__VLS_ctx.farmStore.wildTrees))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (tree.id),
                ...{ class: "border border-accent/10 rounded-xs px-3 py-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs font-bold" },
                ...{ class: (tree.mature ? 'text-accent' : 'text-muted') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.getWildTreeName(tree.type));
            if (tree.chopCount > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-danger" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                (tree.chopCount);
            }
            if (!tree.mature) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
            else if (tree.hasTapper && tree.tapReady) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            }
            else if (tree.hasTapper) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            }
            if (!tree.mature) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-2 mb-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex-1 h-1 bg-bg rounded-xs border border-accent/10" },
                });
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                    ...{ class: "h-full rounded-xs bg-success transition-all" },
                    ...{ style: ({
                            width: Math.min(100, Math.floor((tree.growthDays / (__VLS_ctx.getWildTreeDef(tree.type)?.growthDays ?? 28)) * 100)) + '%'
                        }) },
                });
                /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted whitespace-nowrap" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                (tree.growthDays);
                (__VLS_ctx.getWildTreeDef(tree.type)?.growthDays ?? '?');
            }
            else if (tree.hasTapper) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-2 mb-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex-1 h-1 bg-bg rounded-xs border border-accent/10" },
                });
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                    ...{ class: "h-full rounded-xs transition-all" },
                    ...{ class: (tree.tapReady ? 'bg-accent' : 'bg-success') },
                    ...{ style: ({
                            width: tree.tapReady
                                ? '100%'
                                : Math.floor((tree.tapDaysElapsed / (__VLS_ctx.getWildTreeDef(tree.type)?.tapCycleDays ?? 7)) * 100) + '%'
                        }) },
                });
                /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted whitespace-nowrap" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                (tree.tapReady ? '已完成' : `${tree.tapDaysElapsed}/${__VLS_ctx.getWildTreeDef(tree.type)?.tapCycleDays ?? '?'}天`);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-end space-x-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
            if (tree.mature && tree.hasTapper && tree.tapReady) {
                const __VLS_420 = Button || Button;
                // @ts-ignore
                const __VLS_421 = __VLS_asFunctionalComponent1(__VLS_420, new __VLS_420({
                    ...{ 'onClick': {} },
                    ...{ class: "!bg-accent !text-bg" },
                    iconSize: (12),
                    icon: (__VLS_ctx.Gift),
                }));
                const __VLS_422 = __VLS_421({
                    ...{ 'onClick': {} },
                    ...{ class: "!bg-accent !text-bg" },
                    iconSize: (12),
                    icon: (__VLS_ctx.Gift),
                }, ...__VLS_functionalComponentArgsRest(__VLS_421));
                let __VLS_425;
                const __VLS_426 = {
                    /** @type {typeof __VLS_425.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'tree'))
                            throw 0;
                        if (!(__VLS_ctx.farmStore.wildTrees.length > 0))
                            throw 0;
                        if (!(tree.mature && tree.hasTapper && tree.tapReady))
                            throw 0;
                        return __VLS_ctx.handleCollectTapProduct(tree.id);
                        // @ts-ignore
                        [farmStore, farmStore, farmStore, getWildTreeName, MAX_WILD_TREES, getWildTreeDef, getWildTreeDef, getWildTreeDef, getWildTreeDef, Gift, handleCollectTapProduct,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
                const { default: __VLS_427 } = __VLS_423.slots;
                // @ts-ignore
                [];
                var __VLS_423;
                var __VLS_424;
            }
            if (tree.mature && !tree.hasTapper && __VLS_ctx.hasTapper) {
                const __VLS_428 = Button || Button;
                // @ts-ignore
                const __VLS_429 = __VLS_asFunctionalComponent1(__VLS_428, new __VLS_428({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Wrench),
                }));
                const __VLS_430 = __VLS_429({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Wrench),
                }, ...__VLS_functionalComponentArgsRest(__VLS_429));
                let __VLS_433;
                const __VLS_434 = {
                    /** @type {typeof __VLS_433.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'tree'))
                            throw 0;
                        if (!(__VLS_ctx.farmStore.wildTrees.length > 0))
                            throw 0;
                        if (!(tree.mature && !tree.hasTapper && __VLS_ctx.hasTapper))
                            throw 0;
                        return __VLS_ctx.handleAttachTapper(tree.id);
                        // @ts-ignore
                        [Wrench, hasTapper, handleAttachTapper,];
                    },
                };
                const { default: __VLS_435 } = __VLS_431.slots;
                // @ts-ignore
                [];
                var __VLS_431;
                var __VLS_432;
            }
            if (tree.mature && !tree.hasTapper && !__VLS_ctx.hasTapper) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
            if (tree.mature) {
                const __VLS_436 = Button || Button;
                // @ts-ignore
                const __VLS_437 = __VLS_asFunctionalComponent1(__VLS_436, new __VLS_436({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Axe),
                }));
                const __VLS_438 = __VLS_437({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                    icon: (__VLS_ctx.Axe),
                }, ...__VLS_functionalComponentArgsRest(__VLS_437));
                let __VLS_441;
                const __VLS_442 = {
                    /** @type {typeof __VLS_441.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.farmTab === 'tree'))
                            throw 0;
                        if (!(__VLS_ctx.farmStore.wildTrees.length > 0))
                            throw 0;
                        if (!(tree.mature))
                            throw 0;
                        return __VLS_ctx.handleChopTree(tree.id);
                        // @ts-ignore
                        [Axe, hasTapper, handleChopTree,];
                    },
                };
                const { default: __VLS_443 } = __VLS_439.slots;
                // @ts-ignore
                [];
                var __VLS_439;
                var __VLS_440;
            }
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-4 text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        let __VLS_444;
        /** @ts-ignore @type { | typeof __VLS_components.TreePine} */
        TreePine;
        // @ts-ignore
        const __VLS_445 = __VLS_asFunctionalComponent1(__VLS_444, new __VLS_444({
            size: (32),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_446 = __VLS_445({
            size: (32),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_445));
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/60 mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    }
    if (__VLS_ctx.plantableWildSeeds.length > 0 && __VLS_ctx.farmStore.wildTrees.length < __VLS_ctx.MAX_WILD_TREES) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1.5 flex-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        for (const [s] of __VLS_vFor((__VLS_ctx.plantableWildSeeds))) {
            const __VLS_449 = Button || Button;
            // @ts-ignore
            const __VLS_450 = __VLS_asFunctionalComponent1(__VLS_449, new __VLS_449({
                ...{ 'onClick': {} },
                key: (s.type),
                iconSize: (12),
                icon: (__VLS_ctx.TreePine),
            }));
            const __VLS_451 = __VLS_450({
                ...{ 'onClick': {} },
                key: (s.type),
                iconSize: (12),
                icon: (__VLS_ctx.TreePine),
            }, ...__VLS_functionalComponentArgsRest(__VLS_450));
            let __VLS_454;
            const __VLS_455 = {
                /** @type {typeof __VLS_454.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.farmTab === 'tree'))
                        throw 0;
                    if (!(__VLS_ctx.plantableWildSeeds.length > 0 && __VLS_ctx.farmStore.wildTrees.length < __VLS_ctx.MAX_WILD_TREES))
                        throw 0;
                    return __VLS_ctx.handlePlantWildTree(s.type);
                    // @ts-ignore
                    [farmStore, TreePine, MAX_WILD_TREES, plantableWildSeeds, plantableWildSeeds, handlePlantWildTree,];
                },
            };
            const { default: __VLS_456 } = __VLS_452.slots;
            (s.name);
            (s.count);
            // @ts-ignore
            [];
            var __VLS_452;
            var __VLS_453;
            // @ts-ignore
            [];
        }
    }
}
let __VLS_457;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_458 = __VLS_asFunctionalComponent1(__VLS_457, new __VLS_457({
    name: "panel-fade",
}));
const __VLS_459 = __VLS_458({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_458));
const { default: __VLS_462 } = __VLS_460.slots;
if (__VLS_ctx.showGreenhouseModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showGreenhouseModal))
                    throw 0;
                return __VLS_ctx.showGreenhouseModal = false;
                // @ts-ignore
                [showGreenhouseModal, showGreenhouseModal,];
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
        ...{ class: "game-panel max-w-sm w-full relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showGreenhouseModal))
                    throw 0;
                return __VLS_ctx.showGreenhouseModal = false;
                // @ts-ignore
                [showGreenhouseModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_463;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_464 = __VLS_asFunctionalComponent1(__VLS_463, new __VLS_463({
        size: (14),
    }));
    const __VLS_465 = __VLS_464({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_464));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 text-sm text-accent mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    let __VLS_468;
    /** @ts-ignore @type { | typeof __VLS_components.Warehouse} */
    Warehouse;
    // @ts-ignore
    const __VLS_469 = __VLS_asFunctionalComponent1(__VLS_468, new __VLS_468({
        size: (14),
    }));
    const __VLS_470 = __VLS_469({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_469));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.farmStore.greenhousePlots.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const __VLS_473 = Button || Button;
    // @ts-ignore
    const __VLS_474 = __VLS_asFunctionalComponent1(__VLS_473, new __VLS_473({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.ghHarvestableCount > 0 }) },
        disabled: (__VLS_ctx.ghHarvestableCount === 0),
        iconSize: (12),
        icon: (__VLS_ctx.Wheat),
    }));
    const __VLS_475 = __VLS_474({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.ghHarvestableCount > 0 }) },
        disabled: (__VLS_ctx.ghHarvestableCount === 0),
        iconSize: (12),
        icon: (__VLS_ctx.Wheat),
    }, ...__VLS_functionalComponentArgsRest(__VLS_474));
    let __VLS_478;
    const __VLS_479 = {
        /** @type {typeof __VLS_478.click} */
        onClick: (__VLS_ctx.doGhBatchHarvest),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_480 } = __VLS_476.slots;
    (__VLS_ctx.ghHarvestableCount > 0 ? ` (${__VLS_ctx.ghHarvestableCount}块)` : '');
    // @ts-ignore
    [farmStore, Wheat, ghHarvestableCount, ghHarvestableCount, ghHarvestableCount, ghHarvestableCount, doGhBatchHarvest,];
    var __VLS_476;
    var __VLS_477;
    const __VLS_481 = Button || Button;
    // @ts-ignore
    const __VLS_482 = __VLS_asFunctionalComponent1(__VLS_481, new __VLS_481({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.ghTilledEmptyCount === 0 || __VLS_ctx.allSeeds.length === 0),
        iconSize: (12),
        icon: (__VLS_ctx.Sprout),
    }));
    const __VLS_483 = __VLS_482({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.ghTilledEmptyCount === 0 || __VLS_ctx.allSeeds.length === 0),
        iconSize: (12),
        icon: (__VLS_ctx.Sprout),
    }, ...__VLS_functionalComponentArgsRest(__VLS_482));
    let __VLS_486;
    const __VLS_487 = {
        /** @type {typeof __VLS_486.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showGreenhouseModal))
                throw 0;
            return __VLS_ctx.showGhBatchPlant = true;
            // @ts-ignore
            [Sprout, ghTilledEmptyCount, allSeeds, showGhBatchPlant,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_488 } = __VLS_484.slots;
    (__VLS_ctx.ghTilledEmptyCount > 0 ? ` (${__VLS_ctx.ghTilledEmptyCount}块)` : '');
    // @ts-ignore
    [ghTilledEmptyCount, ghTilledEmptyCount,];
    var __VLS_484;
    var __VLS_485;
    if (__VLS_ctx.nextGhUpgrade) {
        const __VLS_489 = Button || Button;
        // @ts-ignore
        const __VLS_490 = __VLS_asFunctionalComponent1(__VLS_489, new __VLS_489({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            iconSize: (12),
            icon: (__VLS_ctx.ArrowUp),
        }));
        const __VLS_491 = __VLS_490({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            iconSize: (12),
            icon: (__VLS_ctx.ArrowUp),
        }, ...__VLS_functionalComponentArgsRest(__VLS_490));
        let __VLS_494;
        const __VLS_495 = {
            /** @type {typeof __VLS_494.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showGreenhouseModal))
                    throw 0;
                if (!(__VLS_ctx.nextGhUpgrade))
                    throw 0;
                return __VLS_ctx.showGhUpgradeModal = true;
                // @ts-ignore
                [nextGhUpgrade, ArrowUp, showGhUpgradeModal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_496 } = __VLS_492.slots;
        // @ts-ignore
        [];
        var __VLS_492;
        var __VLS_493;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid gap-1 max-w-full" },
        ...{ style: ({ gridTemplateColumns: `repeat(${__VLS_ctx.ghGridCols}, minmax(0, 1fr))` }) },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-full']} */ ;
    for (const [plot] of __VLS_vFor((__VLS_ctx.farmStore.greenhousePlots))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showGreenhouseModal))
                        throw 0;
                    return __VLS_ctx.activeGhPlotId = plot.id;
                    // @ts-ignore
                    [farmStore, ghGridCols, activeGhPlotId,];
                } },
            key: (plot.id),
            ...{ class: "aspect-square border border-accent/20 rounded-xs flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-accent/60 hover:bg-panel/80 leading-tight" },
            ...{ class: (__VLS_ctx.getPlotDisplay(plot).color) },
            title: (__VLS_ctx.getPlotTooltip(plot)),
        });
        /** @type {__VLS_StyleScopedClasses['aspect-square']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-accent/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-panel/80']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
        const __VLS_497 = (__VLS_ctx.getPlotDisplay(plot).icon);
        // @ts-ignore
        const __VLS_498 = __VLS_asFunctionalComponent1(__VLS_497, new __VLS_497({
            size: (14),
        }));
        const __VLS_499 = __VLS_498({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_498));
        if (plot.cropId) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] opacity-70 truncate max-w-full px-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['opacity-70']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-0.5']} */ ;
            (__VLS_ctx.getCropName(plot.cropId));
        }
        // @ts-ignore
        [getPlotDisplay, getPlotDisplay, getPlotTooltip, getCropName,];
    }
}
// @ts-ignore
[];
var __VLS_460;
let __VLS_502;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_503 = __VLS_asFunctionalComponent1(__VLS_502, new __VLS_502({
    name: "panel-fade",
}));
const __VLS_504 = __VLS_503({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_503));
const { default: __VLS_507 } = __VLS_505.slots;
if (__VLS_ctx.showGhUpgradeModal && __VLS_ctx.nextGhUpgrade) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showGhUpgradeModal && __VLS_ctx.nextGhUpgrade))
                    throw 0;
                return __VLS_ctx.showGhUpgradeModal = false;
                // @ts-ignore
                [nextGhUpgrade, showGhUpgradeModal, showGhUpgradeModal,];
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
                if (!(__VLS_ctx.showGhUpgradeModal && __VLS_ctx.nextGhUpgrade))
                    throw 0;
                return __VLS_ctx.showGhUpgradeModal = false;
                // @ts-ignore
                [showGhUpgradeModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_508;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_509 = __VLS_asFunctionalComponent1(__VLS_508, new __VLS_508({
        size: (14),
    }));
    const __VLS_510 = __VLS_509({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_509));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.nextGhUpgrade.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.nextGhUpgrade.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between text-xs mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.nextGhUpgrade.cost ? 'text-success' : 'text-danger') },
    });
    (__VLS_ctx.nextGhUpgrade.cost);
    for (const [mat] of __VLS_vFor((__VLS_ctx.nextGhUpgrade.materialCost))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (mat.itemId),
            ...{ class: "flex items-center justify-between text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.getItemName(mat.itemId));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (__VLS_ctx.inventoryStore.getItemCount(mat.itemId) >= mat.quantity ? 'text-success' : 'text-danger') },
        });
        (__VLS_ctx.inventoryStore.getItemCount(mat.itemId));
        (mat.quantity);
        // @ts-ignore
        [inventoryStore, inventoryStore, getItemName, nextGhUpgrade, nextGhUpgrade, nextGhUpgrade, nextGhUpgrade, nextGhUpgrade, playerStore,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    const __VLS_513 = Button || Button;
    // @ts-ignore
    const __VLS_514 = __VLS_asFunctionalComponent1(__VLS_513, new __VLS_513({
        ...{ 'onClick': {} },
        ...{ class: "flex-1" },
    }));
    const __VLS_515 = __VLS_514({
        ...{ 'onClick': {} },
        ...{ class: "flex-1" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_514));
    let __VLS_518;
    const __VLS_519 = {
        /** @type {typeof __VLS_518.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showGhUpgradeModal && __VLS_ctx.nextGhUpgrade))
                throw 0;
            return __VLS_ctx.showGhUpgradeModal = false;
            // @ts-ignore
            [showGhUpgradeModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    const { default: __VLS_520 } = __VLS_516.slots;
    // @ts-ignore
    [];
    var __VLS_516;
    var __VLS_517;
    const __VLS_521 = Button || Button;
    // @ts-ignore
    const __VLS_522 = __VLS_asFunctionalComponent1(__VLS_521, new __VLS_521({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 !bg-accent !text-bg" },
        iconSize: (12),
        icon: (__VLS_ctx.ArrowUp),
    }));
    const __VLS_523 = __VLS_522({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 !bg-accent !text-bg" },
        iconSize: (12),
        icon: (__VLS_ctx.ArrowUp),
    }, ...__VLS_functionalComponentArgsRest(__VLS_522));
    let __VLS_526;
    const __VLS_527 = {
        /** @type {typeof __VLS_526.click} */
        onClick: (__VLS_ctx.handleGhUpgrade),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_528 } = __VLS_524.slots;
    // @ts-ignore
    [ArrowUp, handleGhUpgrade,];
    var __VLS_524;
    var __VLS_525;
}
// @ts-ignore
[];
var __VLS_505;
let __VLS_529;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_530 = __VLS_asFunctionalComponent1(__VLS_529, new __VLS_529({
    name: "panel-fade",
}));
const __VLS_531 = __VLS_530({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_530));
const { default: __VLS_534 } = __VLS_532.slots;
if (__VLS_ctx.showGhBatchPlant) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showGhBatchPlant))
                    throw 0;
                return __VLS_ctx.showGhBatchPlant = false;
                // @ts-ignore
                [showGhBatchPlant, showGhBatchPlant,];
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
                if (!(__VLS_ctx.showGhBatchPlant))
                    throw 0;
                return __VLS_ctx.showGhBatchPlant = false;
                // @ts-ignore
                [showGhBatchPlant,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_535;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_536 = __VLS_asFunctionalComponent1(__VLS_535, new __VLS_535({
        size: (14),
    }));
    const __VLS_537 = __VLS_536({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_536));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.ghTilledEmptyCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [seed] of __VLS_vFor((__VLS_ctx.allSeeds))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showGhBatchPlant))
                        throw 0;
                    return __VLS_ctx.doGhBatchPlant(seed.cropId);
                    // @ts-ignore
                    [ghTilledEmptyCount, allSeeds, doGhBatchPlant,];
                } },
            key: (seed.cropId),
            ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (seed.name);
        if (seed.regrowth) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success ml-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (seed.count);
        // @ts-ignore
        [];
    }
    if (__VLS_ctx.allSeeds.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center py-4" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        let __VLS_540;
        /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
        Sprout;
        // @ts-ignore
        const __VLS_541 = __VLS_asFunctionalComponent1(__VLS_540, new __VLS_540({
            size: (32),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_542 = __VLS_541({
            size: (32),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_541));
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    }
}
// @ts-ignore
[allSeeds,];
var __VLS_532;
let __VLS_545;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_546 = __VLS_asFunctionalComponent1(__VLS_545, new __VLS_545({
    name: "panel-fade",
}));
const __VLS_547 = __VLS_546({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_546));
const { default: __VLS_550 } = __VLS_548.slots;
if (__VLS_ctx.activeGhPlot) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeGhPlot))
                    throw 0;
                return __VLS_ctx.activeGhPlotId = null;
                // @ts-ignore
                [activeGhPlotId, activeGhPlot,];
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
                if (!(__VLS_ctx.activeGhPlot))
                    throw 0;
                return __VLS_ctx.activeGhPlotId = null;
                // @ts-ignore
                [activeGhPlotId,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_551;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_552 = __VLS_asFunctionalComponent1(__VLS_551, new __VLS_551({
        size: (14),
    }));
    const __VLS_553 = __VLS_552({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_552));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeGhPlot.id + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
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
    (__VLS_ctx.ghPlotStateLabel);
    if (__VLS_ctx.activeGhPlot.cropId) {
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
        (__VLS_ctx.getCropName(__VLS_ctx.activeGhPlot.cropId));
        if (__VLS_ctx.ghPlotCropRegrowth) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success ml-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            (__VLS_ctx.activeGhPlot.harvestCount);
            (__VLS_ctx.ghPlotCropMaxHarvests);
        }
    }
    if (__VLS_ctx.activeGhPlot.cropId && __VLS_ctx.activeGhPlot.state !== 'harvestable') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 h-1 bg-bg rounded-xs border border-accent/10" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "h-full rounded-xs bg-success transition-all" },
            ...{ style: ({
                    width: Math.min(100, Math.floor((__VLS_ctx.activeGhPlot.growthDays / (Number(__VLS_ctx.ghPlotCropGrowthDays) || 1)) * 100)) + '%'
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (__VLS_ctx.activeGhPlot.growthDays);
        (__VLS_ctx.ghPlotCropGrowthDays);
    }
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
        ...{ class: "text-xs text-water" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-water']} */ ;
    if (__VLS_ctx.activeGhPlot.seedGenetics) {
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
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.activeGhPlot.seedGenetics.generation);
        (__VLS_ctx.activeGhPlot.seedGenetics.sweetness);
        (__VLS_ctx.activeGhPlot.seedGenetics.yield);
        (__VLS_ctx.activeGhPlot.seedGenetics.resistance);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    if (__VLS_ctx.activeGhPlot.state === 'tilled' && __VLS_ctx.allSeeds.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        for (const [seed] of __VLS_vFor((__VLS_ctx.allSeeds))) {
            const __VLS_556 = Button || Button;
            // @ts-ignore
            const __VLS_557 = __VLS_asFunctionalComponent1(__VLS_556, new __VLS_556({
                ...{ 'onClick': {} },
                key: (seed.cropId),
            }));
            const __VLS_558 = __VLS_557({
                ...{ 'onClick': {} },
                key: (seed.cropId),
            }, ...__VLS_functionalComponentArgsRest(__VLS_557));
            let __VLS_561;
            const __VLS_562 = {
                /** @type {typeof __VLS_561.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeGhPlot))
                        throw 0;
                    if (!(__VLS_ctx.activeGhPlot.state === 'tilled' && __VLS_ctx.allSeeds.length > 0))
                        throw 0;
                    return __VLS_ctx.doGhPlant(seed.cropId);
                    // @ts-ignore
                    [getCropName, allSeeds, allSeeds, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, activeGhPlot, ghPlotStateLabel, ghPlotCropRegrowth, ghPlotCropMaxHarvests, ghPlotCropGrowthDays, ghPlotCropGrowthDays, doGhPlant,];
                },
            };
            const { default: __VLS_563 } = __VLS_559.slots;
            (seed.name);
            if (seed.regrowth) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-success ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            (seed.count);
            // @ts-ignore
            [];
            var __VLS_559;
            var __VLS_560;
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.activeGhPlot.state === 'tilled' && __VLS_ctx.ghPlantableBreedingSeeds.length > 0) {
        const __VLS_564 = Divider;
        // @ts-ignore
        const __VLS_565 = __VLS_asFunctionalComponent1(__VLS_564, new __VLS_564({
            label: "育种种子",
            ...{ class: "!my-2" },
        }));
        const __VLS_566 = __VLS_565({
            label: "育种种子",
            ...{ class: "!my-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_565));
        /** @type {__VLS_StyleScopedClasses['!my-2']} */ ;
        for (const [seed] of __VLS_vFor((__VLS_ctx.ghPlantableBreedingSeeds))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeGhPlot))
                            throw 0;
                        if (!(__VLS_ctx.activeGhPlot.state === 'tilled' && __VLS_ctx.ghPlantableBreedingSeeds.length > 0))
                            throw 0;
                        return __VLS_ctx.doGhPlantGeneticSeed(seed.genetics.id);
                        // @ts-ignore
                        [activeGhPlot, ghPlantableBreedingSeeds, ghPlantableBreedingSeeds, doGhPlantGeneticSeed,];
                    } },
                key: (seed.genetics.id),
                ...{ class: "btn text-xs justify-between mr-1 shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.getCropName(seed.genetics.cropId));
            (seed.genetics.generation);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted flex items-center space-x-px" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
            for (const [n] of __VLS_vFor((__VLS_ctx.getStarRating(seed.genetics)))) {
                let __VLS_569;
                /** @ts-ignore @type { | typeof __VLS_components.Star} */
                Star;
                // @ts-ignore
                const __VLS_570 = __VLS_asFunctionalComponent1(__VLS_569, new __VLS_569({
                    key: (n),
                    size: (10),
                }));
                const __VLS_571 = __VLS_570({
                    key: (n),
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_570));
                // @ts-ignore
                [getCropName, getStarRating,];
            }
            // @ts-ignore
            [];
        }
    }
    else if (__VLS_ctx.activeGhPlot.state === 'tilled' && __VLS_ctx.allSeeds.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center py-4" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        let __VLS_574;
        /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
        Sprout;
        // @ts-ignore
        const __VLS_575 = __VLS_asFunctionalComponent1(__VLS_574, new __VLS_574({
            size: (32),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_576 = __VLS_575({
            size: (32),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_575));
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        if (__VLS_ctx.isWanwupuOpen) {
            const __VLS_579 = Button || Button;
            // @ts-ignore
            const __VLS_580 = __VLS_asFunctionalComponent1(__VLS_579, new __VLS_579({
                ...{ 'onClick': {} },
                ...{ class: "mt-2" },
                iconSize: (12),
                icon: (__VLS_ctx.Store),
            }));
            const __VLS_581 = __VLS_580({
                ...{ 'onClick': {} },
                ...{ class: "mt-2" },
                iconSize: (12),
                icon: (__VLS_ctx.Store),
            }, ...__VLS_functionalComponentArgsRest(__VLS_580));
            let __VLS_584;
            const __VLS_585 = {
                /** @type {typeof __VLS_584.click} */
                onClick: (__VLS_ctx.goToShop),
            };
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            const { default: __VLS_586 } = __VLS_582.slots;
            // @ts-ignore
            [isWanwupuOpen, Store, goToShop, allSeeds, activeGhPlot,];
            var __VLS_582;
            var __VLS_583;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted/60 mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            (__VLS_ctx.wanwupuClosedReason);
        }
    }
    if (__VLS_ctx.activeGhPlot.state === 'harvestable') {
        const __VLS_587 = Button || Button;
        // @ts-ignore
        const __VLS_588 = __VLS_asFunctionalComponent1(__VLS_587, new __VLS_587({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
            iconSize: (12),
            icon: (__VLS_ctx.Wheat),
        }));
        const __VLS_589 = __VLS_588({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
            iconSize: (12),
            icon: (__VLS_ctx.Wheat),
        }, ...__VLS_functionalComponentArgsRest(__VLS_588));
        let __VLS_592;
        const __VLS_593 = {
            /** @type {typeof __VLS_592.click} */
            onClick: (__VLS_ctx.doGhHarvest),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_594 } = __VLS_590.slots;
        // @ts-ignore
        [Wheat, wanwupuClosedReason, activeGhPlot, doGhHarvest,];
        var __VLS_590;
        var __VLS_591;
    }
}
// @ts-ignore
[];
var __VLS_548;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
