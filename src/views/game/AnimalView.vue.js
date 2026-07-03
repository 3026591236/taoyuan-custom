/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Hammer, ShoppingCart, Hand, Apple, Home, ArrowUp, Egg, X, Coins, Syringe, Pencil } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useAnimalStore } from '@/stores/useAnimalStore';
import { useGameStore } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ANIMAL_BUILDINGS, ANIMAL_DEFS, HAY_ITEM_ID, getItemById, getBuildingUpgrade, INCUBATION_MAP, FEED_DEFS } from '@/data';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
import { useTutorialStore } from '@/stores/useTutorialStore';
const animalStore = useAnimalStore();
const inventoryStore = useInventoryStore();
const playerStore = usePlayerStore();
const gameStore = useGameStore();
const tutorialStore = useTutorialStore();
const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1)
        return null;
    const coopBuilt = animalStore.buildings.find(b => b.type === 'coop')?.built ?? false;
    const barnBuilt = animalStore.buildings.find(b => b.type === 'barn')?.built ?? false;
    if (!coopBuilt && !barnBuilt)
        return '先去商铺的万物铺建造鸡舍或牧场，然后就可以购买和饲养动物了。';
    if (animalStore.animals.length > 0 && animalStore.animals.every(a => !a.wasPetted))
        return '每天抚摸动物可以增进友好度，「一键抚摸」可以批量操作。';
    return null;
});
const buyModal = ref(null);
const buyListBuilding = ref(null);
const handleSelectAnimalToBuy = (aDef) => {
    if (!buyListBuilding.value)
        return;
    openBuyModal(aDef, buyListBuilding.value);
    buyListBuilding.value = null;
};
const openBuyModal = (aDef, buildingType) => {
    buyModal.value = {
        name: aDef.name,
        productName: aDef.productName,
        produceDays: aDef.produceDays,
        cost: aDef.cost,
        onBuy: () => handleBuyAnimal(aDef.type),
        canBuy: () => {
            if (buildingType === 'stable')
                return !animalStore.getHorse && playerStore.money >= aDef.cost;
            return getAnimalsInBuilding(buildingType).length < getBuildingCapacity(buildingType) && playerStore.money >= aDef.cost;
        }
    };
};
const handleBuyFromModal = () => {
    if (!buyModal.value)
        return;
    buyModal.value.onBuy();
    buyModal.value = null;
};
// === 出售确认弹窗 ===
const sellTarget = ref(null);
const sellTargetRefund = computed(() => {
    if (!sellTarget.value)
        return 0;
    const def = ANIMAL_DEFS.find(d => d.type === sellTarget.value.type);
    return Math.floor((def?.cost ?? 0) / 2);
});
const confirmSellAnimal = () => {
    if (!sellTarget.value)
        return;
    const result = animalStore.sellAnimal(sellTarget.value.id);
    sellTarget.value = null;
    if (result.success) {
        addLog(`卖掉了${result.name}，获得${result.refund}文。`);
    }
};
// === 数据计算 ===
/** 只显示鸡舍和牲口棚（马厩单独渲染） */
const mainBuildings = computed(() => ANIMAL_BUILDINGS.filter(b => b.type !== 'stable'));
/** 马厩建筑定义 */
const stableDef = computed(() => ANIMAL_BUILDINGS.find(b => b.type === 'stable'));
/** 当前选择的饲料类型 */
const selectedFeed = ref(HAY_ITEM_ID);
/** 各类饲料库存数量 */
const feedCounts = computed(() => FEED_DEFS.map(f => ({
    ...f,
    count: inventoryStore.getItemCount(f.id)
})));
/** 当前选中饲料的名称 */
const selectedFeedName = computed(() => FEED_DEFS.find(f => f.id === selectedFeed.value)?.name ?? '干草');
/** 当前选中饲料的库存 */
const selectedFeedCount = computed(() => inventoryStore.getItemCount(selectedFeed.value));
/** 当前选中饲料的价格 */
const selectedFeedPrice = computed(() => FEED_DEFS.find(f => f.id === selectedFeed.value)?.price ?? 50);
/** 未喂食动物数量 */
const unfedCount = computed(() => animalStore.animals.filter(a => !a.wasFed).length);
/** 兽药库存数量 */
const medicineCount = computed(() => inventoryStore.getItemCount('animal_medicine'));
/** 生病动物数量 */
const sickCount = computed(() => animalStore.animals.filter(a => a.sick).length);
/** 可在鸡舍孵化的蛋列表 */
const coopIncubatableEggs = computed(() => {
    const result = [];
    for (const [itemId, mapping] of Object.entries(INCUBATION_MAP)) {
        if (mapping.building !== 'coop')
            continue;
        const count = inventoryStore.getItemCount(itemId);
        if (count > 0) {
            const itemDef = getItemById(itemId);
            result.push({ itemId, name: itemDef?.name ?? itemId, count });
        }
    }
    return result;
});
/** 可在牲口棚孵化的蛋列表 */
const barnIncubatableEggs = computed(() => {
    const result = [];
    for (const [itemId, mapping] of Object.entries(INCUBATION_MAP)) {
        if (mapping.building !== 'barn')
            continue;
        const count = inventoryStore.getItemCount(itemId);
        if (count > 0) {
            const itemDef = getItemById(itemId);
            result.push({ itemId, name: itemDef?.name ?? itemId, count });
        }
    }
    return result;
});
// === 工具函数 ===
const getAnimalName = (type) => {
    return ANIMAL_DEFS.find(d => d.type === type)?.name ?? type;
};
const getItemName = (itemId) => {
    return getItemById(itemId)?.name ?? itemId;
};
const isBuildingBuilt = (type) => {
    return animalStore.buildings.find(b => b.type === type)?.built ?? false;
};
const getAnimalsInBuilding = (type) => {
    return animalStore.animals.filter(a => {
        const def = ANIMAL_DEFS.find(d => d.type === a.type);
        return def?.building === type;
    });
};
const getAnimalDefsForBuilding = (type) => {
    return ANIMAL_DEFS.filter(d => d.building === type);
};
const getBuildingLevel = (type) => {
    return animalStore.buildings.find(b => b.type === type)?.level ?? 0;
};
const getBuildingDisplayName = (type) => {
    const level = getBuildingLevel(type);
    if (level >= 2) {
        const upgrade = getBuildingUpgrade(type, level);
        if (upgrade)
            return upgrade.name;
    }
    return ANIMAL_BUILDINGS.find(b => b.type === type)?.name ?? type;
};
const getBuildingCapacity = (type) => {
    const level = getBuildingLevel(type);
    if (type === 'stable')
        return 1;
    return level * 4;
};
const getMoodText = (mood) => {
    if (mood > 200)
        return '开心';
    if (mood > 100)
        return '一般';
    return '低落';
};
const getMoodBarColor = (mood) => {
    if (mood > 200)
        return 'bg-success';
    if (mood > 100)
        return 'bg-accent';
    return 'bg-danger';
};
// === 放牧 ===
const canGraze = computed(() => {
    if (animalStore.grazedToday)
        return false;
    if (gameStore.isRainy)
        return false;
    if (gameStore.season === 'winter') {
        return animalStore.animals.some(a => a.wasFed && a.type === 'yak');
    }
    const hasGrazeableAnimals = animalStore.animals.some(a => a.wasFed && a.type !== 'horse');
    return hasGrazeableAnimals;
});
const grazeDisabledReason = computed(() => {
    if (animalStore.animals.filter(a => a.type !== 'horse').length === 0)
        return '没有牲畜';
    if (animalStore.grazedToday)
        return '今天已放牧';
    if (gameStore.isRainy)
        return '雨天不能放牧';
    if (gameStore.season === 'winter') {
        const hasYak = animalStore.animals.some(a => a.wasFed && a.type === 'yak');
        return hasYak ? '' : '冬天只有牦牛可放牧';
    }
    if (!animalStore.animals.some(a => a.wasFed && a.type !== 'horse'))
        return '先喂食再放牧';
    return '';
});
const upgradeModal = ref(null);
const openUpgradeModal = (type) => {
    const level = getBuildingLevel(type);
    const upgrade = getBuildingUpgrade(type, level + 1);
    if (!upgrade)
        return;
    upgradeModal.value = {
        buildingType: type,
        currentName: getBuildingDisplayName(type),
        currentLevel: level,
        currentCapacity: level * 4,
        targetName: upgrade.name,
        targetLevel: upgrade.level,
        targetCapacity: upgrade.capacity,
        cost: upgrade.cost,
        materials: upgrade.materialCost.map(m => ({
            itemId: m.itemId,
            name: getItemName(m.itemId),
            need: m.quantity,
            have: inventoryStore.getItemCount(m.itemId)
        }))
    };
};
const canConfirmUpgrade = computed(() => {
    if (!upgradeModal.value)
        return false;
    if (playerStore.money < upgradeModal.value.cost)
        return false;
    return upgradeModal.value.materials.every(m => inventoryStore.getItemCount(m.itemId) >= m.need);
});
const confirmUpgradeBuilding = () => {
    if (!upgradeModal.value)
        return;
    const type = upgradeModal.value.buildingType;
    const targetName = upgradeModal.value.targetName;
    const targetCapacity = upgradeModal.value.targetCapacity;
    upgradeModal.value = null;
    const success = animalStore.upgradeBuilding(type);
    if (success) {
        addLog(`成功升级为${targetName}！容量增至${targetCapacity}。`);
        const tr = gameStore.advanceTime(2);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog('升级失败，请检查铜钱和材料是否充足。');
    }
};
// === 操作处理 ===
const handleBuildBuilding = (type) => {
    const success = animalStore.buildBuilding(type);
    const bDef = ANIMAL_BUILDINGS.find(b => b.type === type);
    if (success) {
        addLog(`成功建造了${bDef?.name ?? '畜舍'}！`);
        const tr = gameStore.advanceTime(2);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog(`建造${bDef?.name ?? '畜舍'}失败，请检查铜钱和材料是否充足。`);
    }
};
const handleBuyAnimal = (type) => {
    const aDef = ANIMAL_DEFS.find(d => d.type === type);
    if (!aDef)
        return;
    const count = animalStore.animals.filter(a => a.type === type).length;
    const defaultName = `${aDef.name}${count + 1}`;
    const success = animalStore.buyAnimal(type, defaultName);
    if (success) {
        addLog(`买了一只${aDef.name}，取名「${defaultName}」。`);
    }
    else {
        addLog(`购买${aDef.name}失败，请检查铜钱和畜舍容量。`);
    }
};
const handlePetAnimal = (id) => {
    const success = animalStore.petAnimal(id);
    if (success) {
        const animal = animalStore.animals.find(a => a.id === id);
        addLog(`抚摸了${animal?.name ?? '动物'}，友好度提升了。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.petAnimal);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog('今天已经抚摸过了。');
    }
};
const handlePetThePet = () => {
    const success = animalStore.petThePet();
    if (success) {
        addLog(`抚摸了${animalStore.pet?.name ?? '宠物'}，好感度+5。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.petAnimal);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog('今天已经抚摸过了。');
    }
};
const unpettedCount = computed(() => {
    let count = animalStore.animals.filter(a => !a.wasPetted).length;
    if (animalStore.pet && !animalStore.pet.wasPetted)
        count++;
    return count;
});
const handlePetAll = () => {
    const STAMINA_COST = 2;
    if (!playerStore.consumeStamina(STAMINA_COST)) {
        addLog('体力不足，无法一键抚摸。');
        return;
    }
    const count = animalStore.petAllAnimals();
    if (count > 0) {
        addLog(`一口气抚摸了${count}只动物，大家都很开心！`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.batchPet);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog('今天已经全部抚摸过了。');
    }
};
const handleStartIncubation = (itemId) => {
    const result = animalStore.startIncubation(itemId);
    addLog(result.message);
};
const handleStartBarnIncubation = (itemId) => {
    const result = animalStore.startBarnIncubation(itemId);
    addLog(result.message);
};
const handleFeedAnimal = (animalId, animalName) => {
    const success = animalStore.feedAnimal(animalId, selectedFeed.value);
    if (success) {
        addLog(`用${selectedFeedName.value}喂食了${animalName}。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.petAnimal);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog(`${selectedFeedName.value}不足，无法喂食。`);
    }
};
const handleFeedAll = () => {
    const result = animalStore.feedAll(selectedFeed.value);
    const feedName = selectedFeedName.value;
    if (result.fedCount > 0) {
        addLog(`用${feedName}喂食了${result.fedCount}只动物。`);
    }
    if (result.noFeedCount > 0) {
        addLog(`${feedName}不足，${result.noFeedCount}只动物未能喂食。`);
    }
    if (result.fedCount === 0 && result.noFeedCount === 0) {
        addLog('所有动物今天都已喂过了。');
    }
    if (result.fedCount > 0) {
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.feedAnimals);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
};
const handleBuyFeed = () => {
    const feed = FEED_DEFS.find(f => f.id === selectedFeed.value);
    if (!feed)
        return;
    // 检查背包主区是否有空间（已有同类栈或有空位），防止溢出到临时背包导致无法使用
    const hasStack = inventoryStore.items.some(s => s.itemId === feed.id && s.quality === 'normal' && s.quantity < 999);
    if (!hasStack && inventoryStore.isFull) {
        addLog('背包已满，无法购买。');
        return;
    }
    if (!playerStore.spendMoney(feed.price)) {
        addLog(`铜钱不足，无法购买${feed.name}。`);
        return;
    }
    if (!inventoryStore.addItem(feed.id)) {
        // addItem 异常失败，退款
        playerStore.earnMoney(feed.price);
        addLog('购买失败，已退款。');
        return;
    }
    addLog(`购买了1份${feed.name}，花费${feed.price}文。`);
};
const handleGraze = () => {
    const result = animalStore.grazeAnimals();
    addLog(result.message);
    if (result.success) {
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.graze);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
};
const handleHealAnimal = (animalId, animalName) => {
    const success = animalStore.healAnimal(animalId);
    if (success)
        addLog(`用兽药治好了${animalName}。`);
    else
        addLog('治疗失败，请检查是否有兽药。');
};
const handleHealAll = () => {
    const result = animalStore.healAllSick();
    if (result.healedCount > 0)
        addLog(`用兽药治疗了${result.healedCount}只动物。`);
    if (result.noMedicineCount > 0)
        addLog(`兽药不足，${result.noMedicineCount}只动物未能治疗。`);
};
// === 改名 ===
const renamingId = ref(null);
const renameInput = ref('');
const startRename = (id, currentName) => {
    renamingId.value = id;
    renameInput.value = currentName;
};
const confirmRename = () => {
    if (!renamingId.value)
        return;
    const success = animalStore.renameAnimal(renamingId.value, renameInput.value);
    if (success) {
        addLog(`改名为「${renameInput.value.trim()}」。`);
    }
    else {
        addLog('改名失败，名称需要1-8个字。');
    }
    renamingId.value = null;
};
const cancelRename = () => {
    renamingId.value = null;
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
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Home} */
Home;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_2 = __VLS_1({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
if (__VLS_ctx.unpettedCount > 0) {
    const __VLS_5 = Button || Button;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Hand),
    }));
    const __VLS_7 = __VLS_6({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Hand),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    let __VLS_10;
    const __VLS_11 = {
        /** @type {typeof __VLS_10.click} */
        onClick: (__VLS_ctx.handlePetAll),
    };
    const { default: __VLS_12 } = __VLS_8.slots;
    (__VLS_ctx.unpettedCount);
    // @ts-ignore
    [unpettedCount, unpettedCount, Hand, handlePetAll,];
    var __VLS_8;
    var __VLS_9;
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
    ...{ class: "mb-4 border border-accent/20 rounded-xs p-3" },
});
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
if (__VLS_ctx.animalStore.pet) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    if (__VLS_ctx.renamingId === 'pet') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onKeyup: (__VLS_ctx.confirmRename) },
            ...{ onKeyup: (__VLS_ctx.cancelRename) },
            ...{ class: "bg-bg border border-accent/30 rounded-xs px-1 py-0.5 text-xs text-text w-20 focus:border-accent outline-none placeholder:text-muted/40 transition-colors" },
            maxlength: "8",
        });
        (__VLS_ctx.renameInput);
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-20']} */ ;
        /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
        /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        const __VLS_13 = Button || Button;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
        }));
        const __VLS_15 = __VLS_14({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        let __VLS_18;
        const __VLS_19 = {
            /** @type {typeof __VLS_18.click} */
            onClick: (__VLS_ctx.confirmRename),
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        const { default: __VLS_20 } = __VLS_16.slots;
        // @ts-ignore
        [tutorialHint, tutorialHint, animalStore, renamingId, confirmRename, confirmRename, cancelRename, renameInput,];
        var __VLS_16;
        var __VLS_17;
        const __VLS_21 = Button || Button;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
        }));
        const __VLS_23 = __VLS_22({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_26;
        const __VLS_27 = {
            /** @type {typeof __VLS_26.click} */
            onClick: (__VLS_ctx.cancelRename),
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        const { default: __VLS_28 } = __VLS_24.slots;
        // @ts-ignore
        [cancelRename,];
        var __VLS_24;
        var __VLS_25;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.animalStore.pet.type === 'cat' ? '猫' : '狗');
        (__VLS_ctx.animalStore.pet.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.animalStore.pet))
                        throw 0;
                    if (!!(__VLS_ctx.renamingId === 'pet'))
                        throw 0;
                    return __VLS_ctx.startRename('pet', __VLS_ctx.animalStore.pet.name);
                    // @ts-ignore
                    [animalStore, animalStore, animalStore, startRename,];
                } },
            ...{ class: "text-muted hover:text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-accent']} */ ;
        let __VLS_29;
        /** @ts-ignore @type { | typeof __VLS_components.Pencil} */
        Pencil;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
            size: (10),
        }));
        const __VLS_31 = __VLS_30({
            size: (10),
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    }
    const __VLS_34 = Button || Button;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.Hand),
        disabled: (__VLS_ctx.animalStore.pet.wasPetted),
    }));
    const __VLS_36 = __VLS_35({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.Hand),
        disabled: (__VLS_ctx.animalStore.pet.wasPetted),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    let __VLS_39;
    const __VLS_40 = {
        /** @type {typeof __VLS_39.click} */
        onClick: (__VLS_ctx.handlePetThePet),
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    const { default: __VLS_41 } = __VLS_37.slots;
    (__VLS_ctx.animalStore.pet.wasPetted ? '已摸' : '抚摸');
    // @ts-ignore
    [Hand, animalStore, animalStore, handlePetThePet,];
    var __VLS_37;
    var __VLS_38;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted w-6" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 h-1.5 bg-bg rounded-xs border border-accent/10" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full rounded-xs bg-danger transition-all" },
        ...{ style: ({ width: Math.floor(__VLS_ctx.animalStore.pet.friendship / 10) + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.animalStore.pet.friendship);
    if (__VLS_ctx.animalStore.pet.friendship >= 800) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-success mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_42;
    /** @ts-ignore @type { | typeof __VLS_components.Home} */
    Home;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
        size: (32),
        ...{ class: "mb-2" },
    }));
    const __VLS_44 = __VLS_43({
        size: (32),
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
for (const [bDef] of __VLS_vFor((__VLS_ctx.mainBuildings))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (bDef.type),
        ...{ class: "mb-4 border border-accent/20 rounded-xs p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.getBuildingDisplayName(bDef.type));
    if (__VLS_ctx.isBuildingBuilt(bDef.type)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.getAnimalsInBuilding(bDef.type).length);
        (__VLS_ctx.getBuildingCapacity(bDef.type));
        if (__VLS_ctx.getBuildingLevel(bDef.type) < 3) {
            const __VLS_47 = Button || Button;
            // @ts-ignore
            const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.ArrowUp),
            }));
            const __VLS_49 = __VLS_48({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.ArrowUp),
            }, ...__VLS_functionalComponentArgsRest(__VLS_48));
            let __VLS_52;
            const __VLS_53 = {
                /** @type {typeof __VLS_52.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                        throw 0;
                    if (!(__VLS_ctx.getBuildingLevel(bDef.type) < 3))
                        throw 0;
                    return __VLS_ctx.openUpgradeModal(bDef.type);
                    // @ts-ignore
                    [animalStore, animalStore, animalStore, mainBuildings, getBuildingDisplayName, isBuildingBuilt, getAnimalsInBuilding, getBuildingCapacity, getBuildingLevel, ArrowUp, openUpgradeModal,];
                },
            };
            const { default: __VLS_54 } = __VLS_50.slots;
            // @ts-ignore
            [];
            var __VLS_50;
            var __VLS_51;
        }
    }
    else {
        const __VLS_55 = Button || Button;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Hammer),
        }));
        const __VLS_57 = __VLS_56({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Hammer),
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
        let __VLS_60;
        const __VLS_61 = {
            /** @type {typeof __VLS_60.click} */
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                    throw 0;
                return __VLS_ctx.handleBuildBuilding(bDef.type);
                // @ts-ignore
                [Hammer, handleBuildBuilding,];
            },
        };
        const { default: __VLS_62 } = __VLS_58.slots;
        (bDef.cost);
        // @ts-ignore
        [];
        var __VLS_58;
        var __VLS_59;
    }
    if (__VLS_ctx.isBuildingBuilt(bDef.type)) {
        if (__VLS_ctx.animalStore.hasAutoPetter(bDef.type)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-success mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        }
        if (bDef.type === 'coop' && __VLS_ctx.getBuildingLevel('coop') >= 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-3 p-2 border border-accent/10 rounded-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            let __VLS_63;
            /** @ts-ignore @type { | typeof __VLS_components.Egg} */
            Egg;
            // @ts-ignore
            const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
                size: (14),
                ...{ class: "inline" },
            }));
            const __VLS_65 = __VLS_64({
                size: (14),
                ...{ class: "inline" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_64));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            if (__VLS_ctx.animalStore.incubating) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (__VLS_ctx.getAnimalName(__VLS_ctx.animalStore.incubating.animalType));
                (__VLS_ctx.animalStore.incubating.daysLeft);
            }
            else if (__VLS_ctx.coopIncubatableEggs.length > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-col space-y-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                for (const [eggItem] of __VLS_vFor((__VLS_ctx.coopIncubatableEggs))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                                    throw 0;
                                if (!(bDef.type === 'coop' && __VLS_ctx.getBuildingLevel('coop') >= 2))
                                    throw 0;
                                if (!!(__VLS_ctx.animalStore.incubating))
                                    throw 0;
                                if (!(__VLS_ctx.coopIncubatableEggs.length > 0))
                                    throw 0;
                                return __VLS_ctx.handleStartIncubation(eggItem.itemId);
                                // @ts-ignore
                                [animalStore, animalStore, animalStore, animalStore, isBuildingBuilt, getBuildingLevel, getAnimalName, coopIncubatableEggs, coopIncubatableEggs, handleStartIncubation,];
                            } },
                        key: (eggItem.itemId),
                        ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    (eggItem.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs text-muted" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                    (eggItem.count);
                    // @ts-ignore
                    [];
                }
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
        }
        if (bDef.type === 'barn' && __VLS_ctx.getBuildingLevel('barn') >= 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-3 p-2 border border-accent/10 rounded-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            let __VLS_68;
            /** @ts-ignore @type { | typeof __VLS_components.Egg} */
            Egg;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
                size: (14),
                ...{ class: "inline" },
            }));
            const __VLS_70 = __VLS_69({
                size: (14),
                ...{ class: "inline" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            if (__VLS_ctx.animalStore.barnIncubating) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (__VLS_ctx.getAnimalName(__VLS_ctx.animalStore.barnIncubating.animalType));
                (__VLS_ctx.animalStore.barnIncubating.daysLeft);
            }
            else if (__VLS_ctx.barnIncubatableEggs.length > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-col space-y-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                for (const [eggItem] of __VLS_vFor((__VLS_ctx.barnIncubatableEggs))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                                    throw 0;
                                if (!(bDef.type === 'barn' && __VLS_ctx.getBuildingLevel('barn') >= 2))
                                    throw 0;
                                if (!!(__VLS_ctx.animalStore.barnIncubating))
                                    throw 0;
                                if (!(__VLS_ctx.barnIncubatableEggs.length > 0))
                                    throw 0;
                                return __VLS_ctx.handleStartBarnIncubation(eggItem.itemId);
                                // @ts-ignore
                                [animalStore, animalStore, animalStore, getBuildingLevel, getAnimalName, barnIncubatableEggs, barnIncubatableEggs, handleStartBarnIncubation,];
                            } },
                        key: (eggItem.itemId),
                        ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    (eggItem.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs text-muted" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                    (eggItem.count);
                    // @ts-ignore
                    [];
                }
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
        }
        const __VLS_73 = Button || Button;
        // @ts-ignore
        const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
            ...{ 'onClick': {} },
            ...{ class: "w-full md:w-auto mb-3" },
            icon: (__VLS_ctx.ShoppingCart),
        }));
        const __VLS_75 = __VLS_74({
            ...{ 'onClick': {} },
            ...{ class: "w-full md:w-auto mb-3" },
            icon: (__VLS_ctx.ShoppingCart),
        }, ...__VLS_functionalComponentArgsRest(__VLS_74));
        let __VLS_78;
        const __VLS_79 = {
            /** @type {typeof __VLS_78.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                    throw 0;
                return __VLS_ctx.buyListBuilding = bDef.type;
                // @ts-ignore
                [ShoppingCart, buyListBuilding,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:w-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_80 } = __VLS_76.slots;
        // @ts-ignore
        [];
        var __VLS_76;
        var __VLS_77;
        if (__VLS_ctx.getAnimalsInBuilding(bDef.type).length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            for (const [animal] of __VLS_vFor((__VLS_ctx.getAnimalsInBuilding(bDef.type)))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (animal.id),
                    ...{ class: "border border-accent/10 rounded-xs p-2 mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                if (__VLS_ctx.renamingId === animal.id) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                        ...{ onKeyup: (__VLS_ctx.confirmRename) },
                        ...{ onKeyup: (__VLS_ctx.cancelRename) },
                        ...{ class: "bg-bg border border-accent/30 rounded-xs px-1 py-0.5 text-xs text-text w-20 focus:border-accent outline-none placeholder:text-muted/40 transition-colors" },
                        maxlength: "8",
                    });
                    (__VLS_ctx.renameInput);
                    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
                    /** @type {__VLS_StyleScopedClasses['w-20']} */ ;
                    /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
                    /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
                    /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                    const __VLS_81 = Button || Button;
                    // @ts-ignore
                    const __VLS_82 = __VLS_asFunctionalComponent1(__VLS_81, new __VLS_81({
                        ...{ 'onClick': {} },
                        ...{ class: "py-0 px-1" },
                    }));
                    const __VLS_83 = __VLS_82({
                        ...{ 'onClick': {} },
                        ...{ class: "py-0 px-1" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
                    let __VLS_86;
                    const __VLS_87 = {
                        /** @type {typeof __VLS_86.click} */
                        onClick: (__VLS_ctx.confirmRename),
                    };
                    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                    const { default: __VLS_88 } = __VLS_84.slots;
                    // @ts-ignore
                    [renamingId, confirmRename, confirmRename, cancelRename, renameInput, getAnimalsInBuilding, getAnimalsInBuilding,];
                    var __VLS_84;
                    var __VLS_85;
                    const __VLS_89 = Button || Button;
                    // @ts-ignore
                    const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
                        ...{ 'onClick': {} },
                        ...{ class: "py-0 px-1" },
                    }));
                    const __VLS_91 = __VLS_90({
                        ...{ 'onClick': {} },
                        ...{ class: "py-0 px-1" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_90));
                    let __VLS_94;
                    const __VLS_95 = {
                        /** @type {typeof __VLS_94.click} */
                        onClick: (__VLS_ctx.cancelRename),
                    };
                    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                    const { default: __VLS_96 } = __VLS_92.slots;
                    // @ts-ignore
                    [cancelRename,];
                    var __VLS_92;
                    var __VLS_93;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs text-accent" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                    (animal.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                                    throw 0;
                                if (!(__VLS_ctx.getAnimalsInBuilding(bDef.type).length > 0))
                                    throw 0;
                                if (!!(__VLS_ctx.renamingId === animal.id))
                                    throw 0;
                                return __VLS_ctx.startRename(animal.id, animal.name);
                                // @ts-ignore
                                [startRename,];
                            } },
                        ...{ class: "text-muted hover:text-accent" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-accent']} */ ;
                    let __VLS_97;
                    /** @ts-ignore @type { | typeof __VLS_components.Pencil} */
                    Pencil;
                    // @ts-ignore
                    const __VLS_98 = __VLS_asFunctionalComponent1(__VLS_97, new __VLS_97({
                        size: (10),
                    }));
                    const __VLS_99 = __VLS_98({
                        size: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_98));
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                const __VLS_102 = Button || Button;
                // @ts-ignore
                const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Apple),
                    disabled: (animal.wasFed),
                }));
                const __VLS_104 = __VLS_103({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Apple),
                    disabled: (animal.wasFed),
                }, ...__VLS_functionalComponentArgsRest(__VLS_103));
                let __VLS_107;
                const __VLS_108 = {
                    /** @type {typeof __VLS_107.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                            throw 0;
                        if (!(__VLS_ctx.getAnimalsInBuilding(bDef.type).length > 0))
                            throw 0;
                        return __VLS_ctx.handleFeedAnimal(animal.id, animal.name);
                        // @ts-ignore
                        [Apple, handleFeedAnimal,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                const { default: __VLS_109 } = __VLS_105.slots;
                (animal.wasFed ? '已喂' : '喂食');
                // @ts-ignore
                [];
                var __VLS_105;
                var __VLS_106;
                const __VLS_110 = Button || Button;
                // @ts-ignore
                const __VLS_111 = __VLS_asFunctionalComponent1(__VLS_110, new __VLS_110({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Hand),
                    disabled: (animal.wasPetted),
                }));
                const __VLS_112 = __VLS_111({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Hand),
                    disabled: (animal.wasPetted),
                }, ...__VLS_functionalComponentArgsRest(__VLS_111));
                let __VLS_115;
                const __VLS_116 = {
                    /** @type {typeof __VLS_115.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                            throw 0;
                        if (!(__VLS_ctx.getAnimalsInBuilding(bDef.type).length > 0))
                            throw 0;
                        return __VLS_ctx.handlePetAnimal(animal.id);
                        // @ts-ignore
                        [Hand, handlePetAnimal,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                const { default: __VLS_117 } = __VLS_113.slots;
                (animal.wasPetted ? '已摸' : '抚摸');
                // @ts-ignore
                [];
                var __VLS_113;
                var __VLS_114;
                const __VLS_118 = Button || Button;
                // @ts-ignore
                const __VLS_119 = __VLS_asFunctionalComponent1(__VLS_118, new __VLS_118({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Coins),
                }));
                const __VLS_120 = __VLS_119({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Coins),
                }, ...__VLS_functionalComponentArgsRest(__VLS_119));
                let __VLS_123;
                const __VLS_124 = {
                    /** @type {typeof __VLS_123.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                            throw 0;
                        if (!(__VLS_ctx.getAnimalsInBuilding(bDef.type).length > 0))
                            throw 0;
                        return __VLS_ctx.sellTarget = { id: animal.id, name: animal.name, type: animal.type };
                        // @ts-ignore
                        [Coins, sellTarget,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                const { default: __VLS_125 } = __VLS_121.slots;
                // @ts-ignore
                [];
                var __VLS_121;
                var __VLS_122;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted w-6" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex-1 h-1.5 bg-bg rounded-xs border border-accent/10" },
                });
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                    ...{ class: "h-full rounded-xs bg-danger transition-all" },
                    ...{ style: ({ width: Math.floor(animal.friendship / 10) + '%' }) },
                });
                /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted w-6" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex-1 h-1.5 bg-bg rounded-xs border border-accent/10" },
                });
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                    ...{ class: "h-full rounded-xs transition-all" },
                    ...{ class: (__VLS_ctx.getMoodBarColor(animal.mood)) },
                    ...{ style: ({ width: Math.floor((animal.mood / 255) * 100) + '%' }) },
                });
                /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted w-6" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
                (__VLS_ctx.getMoodText(animal.mood));
                if (animal.hunger > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-muted w-6" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                    /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex-1 h-1.5 bg-bg rounded-xs border border-accent/10" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                        ...{ class: "h-full rounded-xs bg-danger transition-all" },
                        ...{ style: ({ width: Math.floor((animal.hunger / 7) * 100) + '%' }) },
                    });
                    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-danger w-6" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                    /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
                    (animal.hunger);
                }
                if (animal.sick) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-between mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-[10px] text-danger" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                    (animal.sickDays);
                    const __VLS_126 = Button || Button;
                    // @ts-ignore
                    const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
                        ...{ 'onClick': {} },
                        ...{ class: "py-0 px-1" },
                        icon: (__VLS_ctx.Syringe),
                        disabled: (__VLS_ctx.medicineCount <= 0),
                    }));
                    const __VLS_128 = __VLS_127({
                        ...{ 'onClick': {} },
                        ...{ class: "py-0 px-1" },
                        icon: (__VLS_ctx.Syringe),
                        disabled: (__VLS_ctx.medicineCount <= 0),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_127));
                    let __VLS_131;
                    const __VLS_132 = {
                        /** @type {typeof __VLS_131.click} */
                        onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isBuildingBuilt(bDef.type)))
                                throw 0;
                            if (!(__VLS_ctx.getAnimalsInBuilding(bDef.type).length > 0))
                                throw 0;
                            if (!(animal.sick))
                                throw 0;
                            return __VLS_ctx.handleHealAnimal(animal.id, animal.name);
                            // @ts-ignore
                            [getMoodBarColor, getMoodText, Syringe, medicineCount, handleHealAnimal,];
                        },
                    };
                    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                    const { default: __VLS_133 } = __VLS_129.slots;
                    // @ts-ignore
                    [];
                    var __VLS_129;
                    var __VLS_130;
                }
                // @ts-ignore
                [];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-6" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
            let __VLS_134;
            /** @ts-ignore @type { | typeof __VLS_components.Home} */
            Home;
            // @ts-ignore
            const __VLS_135 = __VLS_asFunctionalComponent1(__VLS_134, new __VLS_134({
                size: (36),
                ...{ class: "text-accent/20 mb-2" },
            }));
            const __VLS_136 = __VLS_135({
                size: (36),
                ...{ class: "text-accent/20 mb-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_135));
            /** @type {__VLS_StyleScopedClasses['text-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted/50 mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (bDef.materialCost.map(m => `${__VLS_ctx.getItemName(m.itemId)}×${m.quantity}`).join('、'));
    }
    // @ts-ignore
    [getItemName,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-4 border border-accent/20 rounded-xs p-3" },
});
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
if (__VLS_ctx.animalStore.stableBuilt) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.animalStore.getHorse ? '1/1' : '0/1');
}
else {
    const __VLS_139 = Button || Button;
    // @ts-ignore
    const __VLS_140 = __VLS_asFunctionalComponent1(__VLS_139, new __VLS_139({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Hammer),
    }));
    const __VLS_141 = __VLS_140({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Hammer),
    }, ...__VLS_functionalComponentArgsRest(__VLS_140));
    let __VLS_144;
    const __VLS_145 = {
        /** @type {typeof __VLS_144.click} */
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.animalStore.stableBuilt))
                throw 0;
            return __VLS_ctx.handleBuildBuilding('stable');
            // @ts-ignore
            [animalStore, animalStore, Hammer, handleBuildBuilding,];
        },
    };
    const { default: __VLS_146 } = __VLS_142.slots;
    (__VLS_ctx.stableDef?.cost ?? 10000);
    // @ts-ignore
    [stableDef,];
    var __VLS_142;
    var __VLS_143;
}
if (__VLS_ctx.animalStore.stableBuilt) {
    if (__VLS_ctx.animalStore.getHorse) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        if (__VLS_ctx.renamingId === __VLS_ctx.animalStore.getHorse.id) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onKeyup: (__VLS_ctx.confirmRename) },
                ...{ onKeyup: (__VLS_ctx.cancelRename) },
                ...{ class: "bg-bg border border-accent/30 rounded-xs px-1 py-0.5 text-xs text-text w-20 focus:border-accent outline-none placeholder:text-muted/40 transition-colors" },
                maxlength: "8",
            });
            (__VLS_ctx.renameInput);
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-20']} */ ;
            /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            const __VLS_147 = Button || Button;
            // @ts-ignore
            const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
            }));
            const __VLS_149 = __VLS_148({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_148));
            let __VLS_152;
            const __VLS_153 = {
                /** @type {typeof __VLS_152.click} */
                onClick: (__VLS_ctx.confirmRename),
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            const { default: __VLS_154 } = __VLS_150.slots;
            // @ts-ignore
            [animalStore, animalStore, animalStore, renamingId, confirmRename, confirmRename, cancelRename, renameInput,];
            var __VLS_150;
            var __VLS_151;
            const __VLS_155 = Button || Button;
            // @ts-ignore
            const __VLS_156 = __VLS_asFunctionalComponent1(__VLS_155, new __VLS_155({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
            }));
            const __VLS_157 = __VLS_156({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_156));
            let __VLS_160;
            const __VLS_161 = {
                /** @type {typeof __VLS_160.click} */
                onClick: (__VLS_ctx.cancelRename),
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            const { default: __VLS_162 } = __VLS_158.slots;
            // @ts-ignore
            [cancelRename,];
            var __VLS_158;
            var __VLS_159;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.animalStore.getHorse.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.animalStore.stableBuilt))
                            throw 0;
                        if (!(__VLS_ctx.animalStore.getHorse))
                            throw 0;
                        if (!!(__VLS_ctx.renamingId === __VLS_ctx.animalStore.getHorse.id))
                            throw 0;
                        return __VLS_ctx.startRename(__VLS_ctx.animalStore.getHorse.id, __VLS_ctx.animalStore.getHorse.name);
                        // @ts-ignore
                        [animalStore, animalStore, animalStore, startRename,];
                    } },
                ...{ class: "text-muted hover:text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-accent']} */ ;
            let __VLS_163;
            /** @ts-ignore @type { | typeof __VLS_components.Pencil} */
            Pencil;
            // @ts-ignore
            const __VLS_164 = __VLS_asFunctionalComponent1(__VLS_163, new __VLS_163({
                size: (10),
            }));
            const __VLS_165 = __VLS_164({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_164));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_168 = Button || Button;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.Apple),
            disabled: (__VLS_ctx.animalStore.getHorse.wasFed),
        }));
        const __VLS_170 = __VLS_169({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.Apple),
            disabled: (__VLS_ctx.animalStore.getHorse.wasFed),
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        let __VLS_173;
        const __VLS_174 = {
            /** @type {typeof __VLS_173.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.animalStore.stableBuilt))
                    throw 0;
                if (!(__VLS_ctx.animalStore.getHorse))
                    throw 0;
                return __VLS_ctx.handleFeedAnimal(__VLS_ctx.animalStore.getHorse.id, __VLS_ctx.animalStore.getHorse.name);
                // @ts-ignore
                [animalStore, animalStore, animalStore, Apple, handleFeedAnimal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        const { default: __VLS_175 } = __VLS_171.slots;
        (__VLS_ctx.animalStore.getHorse.wasFed ? '已喂' : '喂食');
        // @ts-ignore
        [animalStore,];
        var __VLS_171;
        var __VLS_172;
        const __VLS_176 = Button || Button;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.Hand),
            disabled: (__VLS_ctx.animalStore.getHorse.wasPetted),
        }));
        const __VLS_178 = __VLS_177({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.Hand),
            disabled: (__VLS_ctx.animalStore.getHorse.wasPetted),
        }, ...__VLS_functionalComponentArgsRest(__VLS_177));
        let __VLS_181;
        const __VLS_182 = {
            /** @type {typeof __VLS_181.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.animalStore.stableBuilt))
                    throw 0;
                if (!(__VLS_ctx.animalStore.getHorse))
                    throw 0;
                return __VLS_ctx.handlePetAnimal(__VLS_ctx.animalStore.getHorse.id);
                // @ts-ignore
                [Hand, animalStore, animalStore, handlePetAnimal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        const { default: __VLS_183 } = __VLS_179.slots;
        (__VLS_ctx.animalStore.getHorse.wasPetted ? '已摸' : '抚摸');
        // @ts-ignore
        [animalStore,];
        var __VLS_179;
        var __VLS_180;
        const __VLS_184 = Button || Button;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent1(__VLS_184, new __VLS_184({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.Coins),
        }));
        const __VLS_186 = __VLS_185({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.Coins),
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        let __VLS_189;
        const __VLS_190 = {
            /** @type {typeof __VLS_189.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.animalStore.stableBuilt))
                    throw 0;
                if (!(__VLS_ctx.animalStore.getHorse))
                    throw 0;
                return __VLS_ctx.sellTarget = { id: __VLS_ctx.animalStore.getHorse.id, name: __VLS_ctx.animalStore.getHorse.name, type: __VLS_ctx.animalStore.getHorse.type };
                // @ts-ignore
                [animalStore, animalStore, animalStore, Coins, sellTarget,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        const { default: __VLS_191 } = __VLS_187.slots;
        // @ts-ignore
        [];
        var __VLS_187;
        var __VLS_188;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted w-6" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 h-1.5 bg-bg rounded-xs border border-accent/10" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "h-full rounded-xs bg-danger transition-all" },
            ...{ style: ({ width: Math.floor(__VLS_ctx.animalStore.getHorse.friendship / 10) + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted w-6" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 h-1.5 bg-bg rounded-xs border border-accent/10" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "h-full rounded-xs transition-all" },
            ...{ class: (__VLS_ctx.getMoodBarColor(__VLS_ctx.animalStore.getHorse.mood)) },
            ...{ style: ({ width: Math.floor((__VLS_ctx.animalStore.getHorse.mood / 255) * 100) + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted w-6" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
        (__VLS_ctx.getMoodText(__VLS_ctx.animalStore.getHorse.mood));
        if (__VLS_ctx.animalStore.getHorse.hunger > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted w-6" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex-1 h-1.5 bg-bg rounded-xs border border-accent/10" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "h-full rounded-xs bg-danger transition-all" },
                ...{ style: ({ width: Math.floor((__VLS_ctx.animalStore.getHorse.hunger / 7) * 100) + '%' }) },
            });
            /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-danger w-6" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
            (__VLS_ctx.animalStore.getHorse.hunger);
        }
        if (__VLS_ctx.animalStore.getHorse.sick) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            (__VLS_ctx.animalStore.getHorse.sickDays);
            const __VLS_192 = Button || Button;
            // @ts-ignore
            const __VLS_193 = __VLS_asFunctionalComponent1(__VLS_192, new __VLS_192({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
                icon: (__VLS_ctx.Syringe),
                disabled: (__VLS_ctx.medicineCount <= 0),
            }));
            const __VLS_194 = __VLS_193({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
                icon: (__VLS_ctx.Syringe),
                disabled: (__VLS_ctx.medicineCount <= 0),
            }, ...__VLS_functionalComponentArgsRest(__VLS_193));
            let __VLS_197;
            const __VLS_198 = {
                /** @type {typeof __VLS_197.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.animalStore.stableBuilt))
                        throw 0;
                    if (!(__VLS_ctx.animalStore.getHorse))
                        throw 0;
                    if (!(__VLS_ctx.animalStore.getHorse.sick))
                        throw 0;
                    return __VLS_ctx.handleHealAnimal(__VLS_ctx.animalStore.getHorse.id, __VLS_ctx.animalStore.getHorse.name);
                    // @ts-ignore
                    [animalStore, animalStore, animalStore, animalStore, animalStore, animalStore, animalStore, animalStore, animalStore, animalStore, animalStore, getMoodBarColor, getMoodText, Syringe, medicineCount, handleHealAnimal,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            const { default: __VLS_199 } = __VLS_195.slots;
            // @ts-ignore
            [];
            var __VLS_195;
            var __VLS_196;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-success mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.animalStore.stableBuilt))
                        throw 0;
                    if (!!(__VLS_ctx.animalStore.getHorse))
                        throw 0;
                    return;
                    __VLS_ctx.openBuyModal({
                        type: 'horse',
                        name: '马',
                        building: 'stable',
                        cost: 5000,
                        productId: '',
                        productName: '无',
                        produceDays: 0,
                        friendship: { min: 0, max: 1000 }
                    }, 'stable');
                    // @ts-ignore
                    [openBuyModal,];
                } },
            ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.stableDef?.materialCost.map(m => `${__VLS_ctx.getItemName(m.itemId)}×${m.quantity}`).join('、') ?? '');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_200;
/** @ts-ignore @type { | typeof __VLS_components.Apple} */
Apple;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent1(__VLS_200, new __VLS_200({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_202 = __VLS_201({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-3" },
});
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-1" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
for (const [feed] of __VLS_vFor((__VLS_ctx.feedCounts))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                return __VLS_ctx.selectedFeed = feed.id;
                // @ts-ignore
                [getItemName, stableDef, feedCounts, selectedFeed,];
            } },
        key: (feed.id),
        ...{ class: "flex items-center justify-between border rounded-xs px-3 py-1.5 cursor-pointer" },
        ...{ class: (__VLS_ctx.selectedFeed === feed.id ? 'border-accent bg-accent/10' : 'border-accent/20 hover:bg-accent/5') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.selectedFeed === feed.id ? 'text-accent' : '') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (feed.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (feed.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (feed.count);
    // @ts-ignore
    [selectedFeed, selectedFeed,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-3" },
});
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between mb-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.selectedFeedName);
(__VLS_ctx.selectedFeedCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.unfedCount > 0 && __VLS_ctx.handleFeedAll();
            // @ts-ignore
            [selectedFeedName, selectedFeedCount, unfedCount, handleFeedAll,];
        } },
    ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5" },
    ...{ class: (__VLS_ctx.unfedCount > 0 ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50') },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.selectedFeedName);
(__VLS_ctx.unfedCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.playerStore.money >= __VLS_ctx.selectedFeedPrice && __VLS_ctx.handleBuyFeed();
            // @ts-ignore
            [selectedFeedName, unfedCount, unfedCount, playerStore, selectedFeedPrice, handleBuyFeed,];
        } },
    ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5" },
    ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.selectedFeedPrice ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50') },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
(__VLS_ctx.selectedFeedName);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.selectedFeedPrice);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-1" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.canGraze && __VLS_ctx.handleGraze();
            // @ts-ignore
            [selectedFeedName, playerStore, selectedFeedPrice, selectedFeedPrice, canGraze, handleGraze,];
        } },
    ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5" },
    ...{ class: (__VLS_ctx.canGraze ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50') },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
if (__VLS_ctx.grazeDisabledReason) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.grazeDisabledReason);
}
if (__VLS_ctx.sickCount > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-3" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.medicineCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.sickCount > 0))
                    throw 0;
                return __VLS_ctx.medicineCount > 0 && __VLS_ctx.handleHealAll();
                // @ts-ignore
                [medicineCount, medicineCount, canGraze, grazeDisabledReason, grazeDisabledReason, sickCount, handleHealAll,];
            } },
        ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5" },
        ...{ class: (__VLS_ctx.medicineCount > 0 ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.sickCount);
}
let __VLS_205;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent1(__VLS_205, new __VLS_205({
    name: "panel-fade",
}));
const __VLS_207 = __VLS_206({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
const { default: __VLS_210 } = __VLS_208.slots;
if (__VLS_ctx.buyListBuilding) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.buyListBuilding))
                    throw 0;
                return __VLS_ctx.buyListBuilding = null;
                // @ts-ignore
                [buyListBuilding, buyListBuilding, medicineCount, sickCount,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    const __VLS_211 = Button;
    // @ts-ignore
    const __VLS_212 = __VLS_asFunctionalComponent1(__VLS_211, new __VLS_211({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_213 = __VLS_212({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_212));
    let __VLS_216;
    const __VLS_217 = {
        /** @type {typeof __VLS_216.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.buyListBuilding))
                throw 0;
            return __VLS_ctx.buyListBuilding = null;
            // @ts-ignore
            [buyListBuilding, X,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_214;
    var __VLS_215;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    for (const [aDef] of __VLS_vFor((__VLS_ctx.getAnimalDefsForBuilding(__VLS_ctx.buyListBuilding)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.buyListBuilding))
                        throw 0;
                    return __VLS_ctx.handleSelectAnimalToBuy(aDef);
                    // @ts-ignore
                    [buyListBuilding, getAnimalDefsForBuilding, handleSelectAnimalToBuy,];
                } },
            key: (aDef.type),
            ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (aDef.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (aDef.cost);
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
var __VLS_208;
let __VLS_218;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_219 = __VLS_asFunctionalComponent1(__VLS_218, new __VLS_218({
    name: "panel-fade",
}));
const __VLS_220 = __VLS_219({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_219));
const { default: __VLS_223 } = __VLS_221.slots;
if (__VLS_ctx.buyModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.buyModal))
                    throw 0;
                return __VLS_ctx.buyModal = null;
                // @ts-ignore
                [buyModal, buyModal,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.buyModal.name);
    const __VLS_224 = Button;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent1(__VLS_224, new __VLS_224({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_226 = __VLS_225({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    let __VLS_229;
    const __VLS_230 = {
        /** @type {typeof __VLS_229.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.buyModal))
                throw 0;
            return __VLS_ctx.buyModal = null;
            // @ts-ignore
            [X, buyModal, buyModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_227;
    var __VLS_228;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs space-y-1 mb-3 border-b border-accent/20 pb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
    if (__VLS_ctx.buyModal.productName && __VLS_ctx.buyModal.productName !== '无') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.buyModal.productName);
        (__VLS_ctx.buyModal.produceDays);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.buyModal.cost);
    const __VLS_231 = Button || Button;
    // @ts-ignore
    const __VLS_232 = __VLS_asFunctionalComponent1(__VLS_231, new __VLS_231({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
        icon: (__VLS_ctx.ShoppingCart),
        disabled: (!__VLS_ctx.buyModal.canBuy()),
    }));
    const __VLS_233 = __VLS_232({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
        icon: (__VLS_ctx.ShoppingCart),
        disabled: (!__VLS_ctx.buyModal.canBuy()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_232));
    let __VLS_236;
    const __VLS_237 = {
        /** @type {typeof __VLS_236.click} */
        onClick: (__VLS_ctx.handleBuyFromModal),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_238 } = __VLS_234.slots;
    // @ts-ignore
    [ShoppingCart, buyModal, buyModal, buyModal, buyModal, buyModal, buyModal, handleBuyFromModal,];
    var __VLS_234;
    var __VLS_235;
}
// @ts-ignore
[];
var __VLS_221;
let __VLS_239;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent1(__VLS_239, new __VLS_239({
    name: "panel-fade",
}));
const __VLS_241 = __VLS_240({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
const { default: __VLS_244 } = __VLS_242.slots;
if (__VLS_ctx.sellTarget) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.sellTarget))
                    throw 0;
                return __VLS_ctx.sellTarget = null;
                // @ts-ignore
                [sellTarget, sellTarget,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-60']} */ ;
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
                if (!(__VLS_ctx.sellTarget))
                    throw 0;
                return __VLS_ctx.sellTarget = null;
                // @ts-ignore
                [sellTarget,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_245;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_246 = __VLS_asFunctionalComponent1(__VLS_245, new __VLS_245({
        size: (14),
    }));
    const __VLS_247 = __VLS_246({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_246));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-text mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.sellTarget.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.sellTargetRefund);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    const __VLS_250 = Button || Button;
    // @ts-ignore
    const __VLS_251 = __VLS_asFunctionalComponent1(__VLS_250, new __VLS_250({
        ...{ 'onClick': {} },
        ...{ class: "flex-1" },
    }));
    const __VLS_252 = __VLS_251({
        ...{ 'onClick': {} },
        ...{ class: "flex-1" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_251));
    let __VLS_255;
    const __VLS_256 = {
        /** @type {typeof __VLS_255.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.sellTarget))
                throw 0;
            return __VLS_ctx.sellTarget = null;
            // @ts-ignore
            [sellTarget, sellTarget, sellTargetRefund,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    const { default: __VLS_257 } = __VLS_253.slots;
    // @ts-ignore
    [];
    var __VLS_253;
    var __VLS_254;
    const __VLS_258 = Button || Button;
    // @ts-ignore
    const __VLS_259 = __VLS_asFunctionalComponent1(__VLS_258, new __VLS_258({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 !bg-danger !text-text" },
        icon: (__VLS_ctx.Coins),
        iconSize: (12),
    }));
    const __VLS_260 = __VLS_259({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 !bg-danger !text-text" },
        icon: (__VLS_ctx.Coins),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_259));
    let __VLS_263;
    const __VLS_264 = {
        /** @type {typeof __VLS_263.click} */
        onClick: (__VLS_ctx.confirmSellAnimal),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-text']} */ ;
    const { default: __VLS_265 } = __VLS_261.slots;
    // @ts-ignore
    [Coins, confirmSellAnimal,];
    var __VLS_261;
    var __VLS_262;
}
// @ts-ignore
[];
var __VLS_242;
let __VLS_266;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_267 = __VLS_asFunctionalComponent1(__VLS_266, new __VLS_266({
    name: "panel-fade",
}));
const __VLS_268 = __VLS_267({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_267));
const { default: __VLS_271 } = __VLS_269.slots;
if (__VLS_ctx.upgradeModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.upgradeModal))
                    throw 0;
                return __VLS_ctx.upgradeModal = null;
                // @ts-ignore
                [upgradeModal, upgradeModal,];
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
                if (!(__VLS_ctx.upgradeModal))
                    throw 0;
                return __VLS_ctx.upgradeModal = null;
                // @ts-ignore
                [upgradeModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_272;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent1(__VLS_272, new __VLS_272({
        size: (14),
    }));
    const __VLS_274 = __VLS_273({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
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
    (__VLS_ctx.upgradeModal.currentName);
    (__VLS_ctx.upgradeModal.currentLevel);
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
    (__VLS_ctx.upgradeModal.currentCapacity);
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.upgradeModal.targetName);
    (__VLS_ctx.upgradeModal.targetLevel);
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.upgradeModal.targetCapacity);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.upgradeModal.cost ? 'text-success' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.playerStore.money);
    (__VLS_ctx.upgradeModal.cost);
    for (const [mat] of __VLS_vFor((__VLS_ctx.upgradeModal.materials))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (mat.itemId),
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (mat.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (mat.have >= mat.need ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (mat.have);
        (mat.need);
        // @ts-ignore
        [playerStore, playerStore, upgradeModal, upgradeModal, upgradeModal, upgradeModal, upgradeModal, upgradeModal, upgradeModal, upgradeModal, upgradeModal,];
    }
    const __VLS_277 = Button || Button;
    // @ts-ignore
    const __VLS_278 = __VLS_asFunctionalComponent1(__VLS_277, new __VLS_277({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: (__VLS_ctx.canConfirmUpgrade ? '!bg-accent !text-bg' : 'opacity-50') },
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
        disabled: (!__VLS_ctx.canConfirmUpgrade),
    }));
    const __VLS_279 = __VLS_278({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: (__VLS_ctx.canConfirmUpgrade ? '!bg-accent !text-bg' : 'opacity-50') },
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
        disabled: (!__VLS_ctx.canConfirmUpgrade),
    }, ...__VLS_functionalComponentArgsRest(__VLS_278));
    let __VLS_282;
    const __VLS_283 = {
        /** @type {typeof __VLS_282.click} */
        onClick: (__VLS_ctx.confirmUpgradeBuilding),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_284 } = __VLS_280.slots;
    // @ts-ignore
    [ArrowUp, canConfirmUpgrade, canConfirmUpgrade, confirmUpgradeBuilding,];
    var __VLS_280;
    var __VLS_281;
}
// @ts-ignore
[];
var __VLS_269;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
