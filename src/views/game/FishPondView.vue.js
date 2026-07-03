/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Waves, Droplets, Sparkles, HeartPulse, Package, ArrowUp, Hammer, Lock, Fish, Heart, X, Star } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
import { useFishPondStore } from '@/stores/useFishPondStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { addLog, showFloat } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { POND_BUILD_COST, POND_UPGRADE_COSTS, POND_CAPACITY, PONDABLE_FISH, getPondableFish, FISH_BREEDING_DAYS } from '@/data/fishPond';
import { getBreedsByGeneration, BREED_COUNTS } from '@/data/pondBreeds';
import { getItemById } from '@/data/items';
const fishPondStore = useFishPondStore();
const inventoryStore = useInventoryStore();
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const currentTab = ref('pond');
const selectedBreedingFish = ref(null);
const detailFish = ref(null);
const compendiumGen = ref(1);
/** 建造/升级统一弹窗 */
const pondModal = ref(null);
const getItemName = (itemId) => getItemById(itemId)?.name ?? itemId;
const getPondableFishName = (fishId) => getPondableFish(fishId)?.name ?? fishId;
const totalBreedCount = 400;
const isDiscovered = (breedId) => fishPondStore.discoveredBreeds.has(breedId);
const discoveredCountByGen = (gen) => {
    const breeds = getBreedsByGeneration(gen);
    return breeds.filter(b => fishPondStore.discoveredBreeds.has(b.breedId)).length;
};
const currentGenBreeds = computed(() => getBreedsByGeneration(compendiumGen.value));
/** 图鉴完成度 */
const completionPercent = computed(() => {
    return Math.floor((fishPondStore.discoveredBreeds.size / totalBreedCount) * 100);
});
/** 代数颜色 */
const genColor = (gen) => {
    if (gen >= 5)
        return 'text-quality-supreme';
    if (gen >= 4)
        return 'text-quality-excellent';
    if (gen >= 3)
        return 'text-quality-fine';
    return 'text-accent';
};
/** 水质条颜色 */
const waterQualityColor = computed(() => {
    const wq = fishPondStore.pond.waterQuality;
    if (wq >= 70)
        return 'bg-success';
    if (wq >= 30)
        return 'bg-accent';
    return 'bg-danger';
});
/** 水质文字颜色 */
const waterQualityTextColor = computed(() => {
    const wq = fishPondStore.pond.waterQuality;
    if (wq >= 70)
        return 'text-success';
    if (wq >= 30)
        return 'text-accent';
    return 'text-danger';
});
/** 繁殖进度 */
const breedingTotalDays = FISH_BREEDING_DAYS;
const breedingProgress = computed(() => {
    if (!fishPondStore.pond.breeding)
        return 0;
    return ((breedingTotalDays - fishPondStore.pond.breeding.daysLeft) / breedingTotalDays) * 100;
});
// === 建造/升级统一弹窗 ===
const upgradeNextLevel = computed(() => Math.min(fishPondStore.pond.level + 1, 3));
const modalTitle = computed(() => (pondModal.value === 'build' ? '建造鱼塘' : '鱼塘升级'));
const modalCurrentLevel = computed(() => (pondModal.value === 'build' ? 1 : fishPondStore.pond.level));
const modalCurrentCapacity = computed(() => (pondModal.value === 'build' ? POND_CAPACITY[1] : fishPondStore.capacity));
const modalTargetLevel = computed(() => upgradeNextLevel.value);
const modalTargetCapacity = computed(() => POND_CAPACITY[upgradeNextLevel.value]);
const modalMoney = computed(() => pondModal.value === 'build' ? POND_BUILD_COST.money : POND_UPGRADE_COSTS[upgradeNextLevel.value].money);
const modalMaterials = computed(() => {
    const mats = pondModal.value === 'build' ? POND_BUILD_COST.materials : POND_UPGRADE_COSTS[upgradeNextLevel.value].materials;
    return mats.map(m => ({
        itemId: m.itemId,
        name: getItemName(m.itemId),
        required: m.quantity,
        owned: inventoryStore.getItemCount(m.itemId),
        enough: inventoryStore.getItemCount(m.itemId) >= m.quantity
    }));
});
const canConfirmModal = computed(() => {
    if (playerStore.money < modalMoney.value)
        return false;
    return modalMaterials.value.every(m => m.enough);
});
const handleModalConfirm = () => {
    if (pondModal.value === 'build') {
        if (fishPondStore.buildPond()) {
            addLog('鱼塘建造完成！');
            showFloat('鱼塘建造完成！', 'success');
            pondModal.value = null;
        }
        else {
            addLog('材料或铜钱不足，无法建造鱼塘。');
        }
    }
    else {
        const nextLevel = (fishPondStore.pond.level + 1);
        if (fishPondStore.upgradePond()) {
            addLog(`鱼塘升级到 Lv.${nextLevel}！容量提升。`);
            showFloat(`鱼塘升级 Lv.${nextLevel}`, 'success');
            pondModal.value = null;
        }
        else {
            addLog('材料或铜钱不足，无法升级。');
        }
    }
};
/** 背包中可放入鱼塘的鱼 */
const pondableFishInBag = computed(() => {
    const result = [];
    for (const def of PONDABLE_FISH) {
        const count = inventoryStore.getItemCount(def.fishId);
        if (count > 0) {
            result.push({ itemId: def.fishId, name: def.name, count });
        }
    }
    return result;
});
/** 鱼详情弹窗属性条 */
const fishAttributes = computed(() => {
    if (!detailFish.value)
        return [];
    const g = detailFish.value.genetics;
    return [
        { key: 'weight', label: '体重', value: g.weight, barClass: 'bg-accent' },
        { key: 'growthRate', label: '生长', value: g.growthRate, barClass: 'bg-success' },
        { key: 'diseaseRes', label: '抗病', value: g.diseaseRes, barClass: 'bg-water' },
        { key: 'qualityGene', label: '品质', value: g.qualityGene, barClass: 'bg-quality-fine' },
        { key: 'mutationRate', label: '变异', value: g.mutationRate, barClass: 'bg-danger' }
    ];
});
/** 打开鱼详情 */
const openFishDetail = (fish) => {
    detailFish.value = fish;
};
/** 弹窗内选为繁殖亲本 */
const handleDetailBreed = () => {
    if (!detailFish.value)
        return;
    handleSelectForBreeding(detailFish.value);
    detailFish.value = null;
};
/** 弹窗内取出到背包 */
const handleDetailRemove = () => {
    if (!detailFish.value)
        return;
    handleRemoveFish(detailFish.value.id);
    detailFish.value = null;
};
// === 操作 ===
const handleFeed = () => {
    if (fishPondStore.feedFish()) {
        addLog('喂食了鱼塘中的鱼。');
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.feedFish);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else if (fishPondStore.pond.fedToday) {
        addLog('今天已经喂过了。');
    }
    else {
        addLog('没有鱼饲料，无法喂食。');
    }
};
const handleClean = () => {
    if (fishPondStore.cleanPond()) {
        addLog('使用水质改良剂清理了鱼塘。');
        showFloat('+水质', 'success');
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.cleanPond);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog('没有水质改良剂。');
    }
};
const handleTreat = () => {
    const count = fishPondStore.treatSickFish();
    if (count > 0) {
        addLog(`治疗了${count}条生病的鱼。`);
        showFloat(`治疗${count}条鱼`, 'success');
    }
    else {
        addLog('没有兽药或没有生病的鱼。');
    }
};
const handleCollect = () => {
    const products = fishPondStore.collectProducts();
    if (products.length > 0) {
        for (const p of products) {
            inventoryStore.addItem(p.itemId, 1, p.quality);
        }
        const names = products.map(p => getItemName(p.itemId)).join('、');
        addLog(`收获了${names}。`);
        showFloat(`+${products.length}件水产`, 'success');
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.collectFishProducts);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog('没有可收获的产出。');
    }
};
const handleAddFish = (fishId) => {
    const added = fishPondStore.addFish(fishId, 1);
    if (added > 0) {
        const name = getPondableFishName(fishId);
        addLog(`放入了${added}条${name}。`);
    }
    else if (fishPondStore.isFull) {
        addLog('鱼塘已满，无法放入更多鱼。');
    }
    else {
        addLog('背包中没有这种鱼。');
    }
};
const handleRemoveFish = (pondFishId) => {
    if (fishPondStore.removeFish(pondFishId)) {
        addLog('取出了一条鱼。');
        selectedBreedingFish.value = null;
    }
    else {
        addLog('背包已满，无法取出。');
    }
};
const handleSelectForBreeding = (fish) => {
    if (!selectedBreedingFish.value) {
        selectedBreedingFish.value = fish;
        return;
    }
    if (selectedBreedingFish.value.id === fish.id) {
        selectedBreedingFish.value = null;
        return;
    }
    // 尝试配对
    if (fishPondStore.startBreeding(selectedBreedingFish.value.id, fish.id)) {
        addLog(`${fish.name}开始繁殖，${fishPondStore.pond.breeding.daysLeft}天后出结果。`);
        showFloat('开始繁殖', 'success');
        selectedBreedingFish.value = null;
    }
    else {
        if (selectedBreedingFish.value.fishId !== fish.fishId) {
            addLog('只能配对同种鱼。');
        }
        else if (fishPondStore.isFull) {
            addLog('鱼塘已满，无法繁殖。');
        }
        else {
            addLog('无法配对，请确认鱼已成熟且未生病。');
        }
        selectedBreedingFish.value = null;
    }
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
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Waves} */
Waves;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
if (!__VLS_ctx.fishPondStore.pond.built) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.fishPondStore.fishCount);
    (__VLS_ctx.fishPondStore.capacity);
}
if (!__VLS_ctx.fishPondStore.pond.built) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.Waves} */
    Waves;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        size: (32),
        ...{ class: "text-muted/30" },
    }));
    const __VLS_7 = __VLS_6({
        size: (32),
        ...{ class: "text-muted/30" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted/60" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
    const __VLS_10 = Button || Button;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Hammer),
        iconSize: (12),
    }));
    const __VLS_12 = __VLS_11({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Hammer),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    let __VLS_15;
    const __VLS_16 = {
        /** @type {typeof __VLS_15.click} */
        onClick: (...[$event]) => {
            if (!(!__VLS_ctx.fishPondStore.pond.built))
                throw 0;
            return __VLS_ctx.pondModal = 'build';
            // @ts-ignore
            [fishPondStore, fishPondStore, fishPondStore, fishPondStore, Hammer, pondModal,];
        },
    };
    const { default: __VLS_17 } = __VLS_13.slots;
    // @ts-ignore
    [];
    var __VLS_13;
    var __VLS_14;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const __VLS_18 = Button || Button;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.currentTab === 'pond' }) },
    }));
    const __VLS_20 = __VLS_19({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.currentTab === 'pond' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    let __VLS_23;
    const __VLS_24 = {
        /** @type {typeof __VLS_23.click} */
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.fishPondStore.pond.built))
                throw 0;
            return __VLS_ctx.currentTab = 'pond';
            // @ts-ignore
            [currentTab, currentTab,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_25 } = __VLS_21.slots;
    // @ts-ignore
    [];
    var __VLS_21;
    var __VLS_22;
    const __VLS_26 = Button || Button;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.currentTab === 'compendium' }) },
    }));
    const __VLS_28 = __VLS_27({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.currentTab === 'compendium' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    let __VLS_31;
    const __VLS_32 = {
        /** @type {typeof __VLS_31.click} */
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.fishPondStore.pond.built))
                throw 0;
            return __VLS_ctx.currentTab = 'compendium';
            // @ts-ignore
            [currentTab, currentTab,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_33 } = __VLS_29.slots;
    (__VLS_ctx.fishPondStore.discoveredBreeds.size);
    (__VLS_ctx.totalBreedCount);
    // @ts-ignore
    [fishPondStore, totalBreedCount,];
    var __VLS_29;
    var __VLS_30;
    if (__VLS_ctx.currentTab === 'pond') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        const __VLS_34 = Divider || Divider;
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({}));
        const __VLS_36 = __VLS_35({}, ...__VLS_functionalComponentArgsRest(__VLS_35));
        const { default: __VLS_39 } = __VLS_37.slots;
        (__VLS_ctx.fishPondStore.pond.level);
        // @ts-ignore
        [fishPondStore, currentTab,];
        var __VLS_37;
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
        (__VLS_ctx.fishPondStore.fishCount);
        (__VLS_ctx.fishPondStore.capacity);
        if (__VLS_ctx.fishPondStore.pond.level < 3) {
            const __VLS_40 = Button || Button;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent1(__VLS_40, new __VLS_40({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.ArrowUp),
                iconSize: (12),
            }));
            const __VLS_42 = __VLS_41({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.ArrowUp),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            let __VLS_45;
            const __VLS_46 = {
                /** @type {typeof __VLS_45.click} */
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.fishPondStore.pond.built))
                        throw 0;
                    if (!(__VLS_ctx.currentTab === 'pond'))
                        throw 0;
                    if (!(__VLS_ctx.fishPondStore.pond.level < 3))
                        throw 0;
                    return __VLS_ctx.pondModal = 'upgrade';
                    // @ts-ignore
                    [fishPondStore, fishPondStore, fishPondStore, pondModal, ArrowUp,];
                },
            };
            const { default: __VLS_47 } = __VLS_43.slots;
            // @ts-ignore
            [];
            var __VLS_43;
            var __VLS_44;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs px-3 py-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-2 mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
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
            ...{ class: "h-full rounded-xs transition-all" },
            ...{ class: (__VLS_ctx.waterQualityColor) },
            ...{ style: ({ width: __VLS_ctx.fishPondStore.pond.waterQuality + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs whitespace-nowrap" },
            ...{ class: (__VLS_ctx.waterQualityTextColor) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (__VLS_ctx.fishPondStore.pond.waterQuality);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_48 = Button || Button;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Droplets),
            iconSize: (12),
            disabled: (__VLS_ctx.fishPondStore.pond.fedToday || __VLS_ctx.fishPondStore.pond.fish.length === 0),
        }));
        const __VLS_50 = __VLS_49({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Droplets),
            iconSize: (12),
            disabled: (__VLS_ctx.fishPondStore.pond.fedToday || __VLS_ctx.fishPondStore.pond.fish.length === 0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        let __VLS_53;
        const __VLS_54 = {
            /** @type {typeof __VLS_53.click} */
            onClick: (__VLS_ctx.handleFeed),
        };
        const { default: __VLS_55 } = __VLS_51.slots;
        (__VLS_ctx.fishPondStore.pond.fedToday ? '已喂食' : '喂食');
        // @ts-ignore
        [fishPondStore, fishPondStore, fishPondStore, fishPondStore, fishPondStore, waterQualityColor, waterQualityTextColor, Droplets, handleFeed,];
        var __VLS_51;
        var __VLS_52;
        const __VLS_56 = Button || Button;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Sparkles),
            iconSize: (12),
        }));
        const __VLS_58 = __VLS_57({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Sparkles),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        let __VLS_61;
        const __VLS_62 = {
            /** @type {typeof __VLS_61.click} */
            onClick: (__VLS_ctx.handleClean),
        };
        const { default: __VLS_63 } = __VLS_59.slots;
        // @ts-ignore
        [Sparkles, handleClean,];
        var __VLS_59;
        var __VLS_60;
        if (__VLS_ctx.fishPondStore.sickFish.length > 0) {
            const __VLS_64 = Button || Button;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent1(__VLS_64, new __VLS_64({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.HeartPulse),
                iconSize: (12),
            }));
            const __VLS_66 = __VLS_65({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.HeartPulse),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
            let __VLS_69;
            const __VLS_70 = {
                /** @type {typeof __VLS_69.click} */
                onClick: (__VLS_ctx.handleTreat),
            };
            const { default: __VLS_71 } = __VLS_67.slots;
            (__VLS_ctx.fishPondStore.sickFish.length);
            // @ts-ignore
            [fishPondStore, fishPondStore, HeartPulse, handleTreat,];
            var __VLS_67;
            var __VLS_68;
        }
        if (__VLS_ctx.fishPondStore.pendingProducts.length > 0) {
            const __VLS_72 = Button || Button;
            // @ts-ignore
            const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Package),
                iconSize: (12),
                disabled: (__VLS_ctx.fishPondStore.pond.collectedToday),
            }));
            const __VLS_74 = __VLS_73({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Package),
                iconSize: (12),
                disabled: (__VLS_ctx.fishPondStore.pond.collectedToday),
            }, ...__VLS_functionalComponentArgsRest(__VLS_73));
            let __VLS_77;
            const __VLS_78 = {
                /** @type {typeof __VLS_77.click} */
                onClick: (__VLS_ctx.handleCollect),
            };
            const { default: __VLS_79 } = __VLS_75.slots;
            (__VLS_ctx.fishPondStore.pendingProducts.length);
            // @ts-ignore
            [fishPondStore, fishPondStore, fishPondStore, Package, handleCollect,];
            var __VLS_75;
            var __VLS_76;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const __VLS_80 = Divider;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
            label: "塘中鱼类",
        }));
        const __VLS_82 = __VLS_81({
            label: "塘中鱼类",
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        if (__VLS_ctx.fishPondStore.pond.fish.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            let __VLS_85;
            /** @ts-ignore @type { | typeof __VLS_components.Fish} */
            Fish;
            // @ts-ignore
            const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_87 = __VLS_86({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_86));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted/60" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1.5 max-h-80 overflow-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-80']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-auto']} */ ;
            for (const [fish] of __VLS_vFor((__VLS_ctx.fishPondStore.pond.fish))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.fishPondStore.pond.built))
                                throw 0;
                            if (!(__VLS_ctx.currentTab === 'pond'))
                                throw 0;
                            if (!!(__VLS_ctx.fishPondStore.pond.fish.length === 0))
                                throw 0;
                            return __VLS_ctx.openFishDetail(fish);
                            // @ts-ignore
                            [fishPondStore, fishPondStore, openFishDetail,];
                        } },
                    key: (fish.id),
                    ...{ class: "border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5 transition-colors mr-1" },
                    ...{ class: (fish.sick ? 'border-danger/30' : __VLS_ctx.selectedBreedingFish?.id === fish.id ? 'border-accent bg-accent/10' : 'border-accent/20') },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
                if (fish.mature && !fish.sick) {
                    let __VLS_90;
                    /** @ts-ignore @type { | typeof __VLS_components.Waves} */
                    Waves;
                    // @ts-ignore
                    const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
                        size: (12),
                        ...{ class: "text-success" },
                    }));
                    const __VLS_92 = __VLS_91({
                        size: (12),
                        ...{ class: "text-success" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
                    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                }
                else if (fish.sick) {
                    let __VLS_95;
                    /** @ts-ignore @type { | typeof __VLS_components.HeartPulse} */
                    HeartPulse;
                    // @ts-ignore
                    const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
                        size: (12),
                        ...{ class: "text-danger" },
                    }));
                    const __VLS_97 = __VLS_96({
                        size: (12),
                        ...{ class: "text-danger" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
                    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                }
                else {
                    let __VLS_100;
                    /** @ts-ignore @type { | typeof __VLS_components.Fish} */
                    Fish;
                    // @ts-ignore
                    const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
                        size: (12),
                        ...{ class: "text-muted/40" },
                    }));
                    const __VLS_102 = __VLS_101({
                        size: (12),
                        ...{ class: "text-muted/40" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
                    /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: (fish.sick ? 'text-danger' : fish.mature ? 'text-text' : 'text-muted') },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (fish.name);
                if (fish.sick) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-danger" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                }
                if (!fish.mature) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-muted" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-accent flex items-center space-x-px" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
                for (const [n] of __VLS_vFor((__VLS_ctx.fishPondStore.getGeneticStarRating(fish.genetics)))) {
                    let __VLS_105;
                    /** @ts-ignore @type { | typeof __VLS_components.Star} */
                    Star;
                    // @ts-ignore
                    const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
                        key: (n),
                        size: (10),
                    }));
                    const __VLS_107 = __VLS_106({
                        key: (n),
                        size: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_106));
                    // @ts-ignore
                    [fishPondStore, selectedBreedingFish,];
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (fish.daysInPond);
                // @ts-ignore
                [];
            }
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const __VLS_110 = Divider;
        // @ts-ignore
        const __VLS_111 = __VLS_asFunctionalComponent1(__VLS_110, new __VLS_110({
            label: "放入鱼苗",
        }));
        const __VLS_112 = __VLS_111({
            label: "放入鱼苗",
        }, ...__VLS_functionalComponentArgsRest(__VLS_111));
        if (__VLS_ctx.pondableFishInBag.length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1.5 max-h-80 overflow-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-80']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-auto']} */ ;
            for (const [item] of __VLS_vFor((__VLS_ctx.pondableFishInBag))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (item.itemId),
                    ...{ class: "border border-accent/20 rounded-xs px-3 py-2 flex items-center justify-between mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (item.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (item.count);
                const __VLS_115 = Button || Button;
                // @ts-ignore
                const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                }));
                const __VLS_117 = __VLS_116({
                    ...{ 'onClick': {} },
                    iconSize: (12),
                }, ...__VLS_functionalComponentArgsRest(__VLS_116));
                let __VLS_120;
                const __VLS_121 = {
                    /** @type {typeof __VLS_120.click} */
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.fishPondStore.pond.built))
                            throw 0;
                        if (!(__VLS_ctx.currentTab === 'pond'))
                            throw 0;
                        if (!(__VLS_ctx.pondableFishInBag.length > 0))
                            throw 0;
                        return __VLS_ctx.handleAddFish(item.itemId);
                        // @ts-ignore
                        [pondableFishInBag, pondableFishInBag, handleAddFish,];
                    },
                };
                const { default: __VLS_122 } = __VLS_118.slots;
                // @ts-ignore
                [];
                var __VLS_118;
                var __VLS_119;
                // @ts-ignore
                [];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            let __VLS_123;
            /** @ts-ignore @type { | typeof __VLS_components.Package} */
            Package;
            // @ts-ignore
            const __VLS_124 = __VLS_asFunctionalComponent1(__VLS_123, new __VLS_123({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_125 = __VLS_124({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_124));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted/60" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const __VLS_128 = Divider;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
            label: "繁殖",
        }));
        const __VLS_130 = __VLS_129({
            label: "繁殖",
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        if (__VLS_ctx.fishPondStore.pond.breeding) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs px-3 py-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
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
            let __VLS_133;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
                size: (12),
                ...{ class: "text-accent" },
            }));
            const __VLS_135 = __VLS_134({
                size: (12),
                ...{ class: "text-accent" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_134));
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.fishPondStore.pond.breeding.daysLeft);
            (__VLS_ctx.breedingTotalDays);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "h-1 bg-bg rounded-xs border border-accent/10" },
            });
            /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "h-full rounded-xs bg-accent transition-all" },
                ...{ style: ({ width: __VLS_ctx.breedingProgress + '%' }) },
            });
            /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            (__VLS_ctx.getPondableFishName(__VLS_ctx.fishPondStore.pond.breeding.fishId));
        }
        else if (__VLS_ctx.selectedBreedingFish) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs px-3 py-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
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
            let __VLS_138;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_139 = __VLS_asFunctionalComponent1(__VLS_138, new __VLS_138({
                size: (12),
                ...{ class: "text-muted/40" },
            }));
            const __VLS_140 = __VLS_139({
                size: (12),
                ...{ class: "text-muted/40" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_139));
            /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.selectedBreedingFish.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-accent inline-flex items-center space-x-px" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
            for (const [n] of __VLS_vFor((__VLS_ctx.fishPondStore.getGeneticStarRating(__VLS_ctx.selectedBreedingFish.genetics)))) {
                let __VLS_143;
                /** @ts-ignore @type { | typeof __VLS_components.Star} */
                Star;
                // @ts-ignore
                const __VLS_144 = __VLS_asFunctionalComponent1(__VLS_143, new __VLS_143({
                    key: (n),
                    size: (10),
                }));
                const __VLS_145 = __VLS_144({
                    key: (n),
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_144));
                // @ts-ignore
                [fishPondStore, fishPondStore, fishPondStore, fishPondStore, selectedBreedingFish, selectedBreedingFish, selectedBreedingFish, breedingTotalDays, breedingProgress, getPondableFishName,];
            }
            const __VLS_148 = Button || Button;
            // @ts-ignore
            const __VLS_149 = __VLS_asFunctionalComponent1(__VLS_148, new __VLS_148({
                ...{ 'onClick': {} },
            }));
            const __VLS_150 = __VLS_149({
                ...{ 'onClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_149));
            let __VLS_153;
            const __VLS_154 = {
                /** @type {typeof __VLS_153.click} */
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.fishPondStore.pond.built))
                        throw 0;
                    if (!(__VLS_ctx.currentTab === 'pond'))
                        throw 0;
                    if (!!(__VLS_ctx.fishPondStore.pond.breeding))
                        throw 0;
                    if (!(__VLS_ctx.selectedBreedingFish))
                        throw 0;
                    return __VLS_ctx.selectedBreedingFish = null;
                    // @ts-ignore
                    [selectedBreedingFish,];
                },
            };
            const { default: __VLS_155 } = __VLS_151.slots;
            // @ts-ignore
            [];
            var __VLS_151;
            var __VLS_152;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            let __VLS_156;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_157 = __VLS_asFunctionalComponent1(__VLS_156, new __VLS_156({
                size: (32),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_158 = __VLS_157({
                size: (32),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_157));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted/60" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        }
    }
    if (__VLS_ctx.currentTab === 'compendium') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-5 space-x-1 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        for (const [g] of __VLS_vFor((5))) {
            const __VLS_161 = Button || Button;
            // @ts-ignore
            const __VLS_162 = __VLS_asFunctionalComponent1(__VLS_161, new __VLS_161({
                ...{ 'onClick': {} },
                key: (g),
                ...{ class: "grow shrink-0 basis-[calc(20%-3px)] justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.compendiumGen === g }) },
            }));
            const __VLS_163 = __VLS_162({
                ...{ 'onClick': {} },
                key: (g),
                ...{ class: "grow shrink-0 basis-[calc(20%-3px)] justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.compendiumGen === g }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_162));
            let __VLS_166;
            const __VLS_167 = {
                /** @type {typeof __VLS_166.click} */
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.fishPondStore.pond.built))
                        throw 0;
                    if (!(__VLS_ctx.currentTab === 'compendium'))
                        throw 0;
                    return __VLS_ctx.compendiumGen = g;
                    // @ts-ignore
                    [currentTab, compendiumGen, compendiumGen,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['grow']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['basis-[calc(20%-3px)]']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_168 } = __VLS_164.slots;
            (g);
            // @ts-ignore
            [];
            var __VLS_164;
            var __VLS_165;
            // @ts-ignore
            [];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.discoveredCountByGen(__VLS_ctx.compendiumGen));
        (__VLS_ctx.BREED_COUNTS[__VLS_ctx.compendiumGen]);
        if (__VLS_ctx.compendiumGen > 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted leading-relaxed" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.compendiumGen);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.compendiumGen - 1);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-5 gap-1 p-2 max-h-[50vh] overflow-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-[50vh]']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-auto']} */ ;
        for (const [breed] of __VLS_vFor((__VLS_ctx.currentGenBreeds))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (breed.breedId),
                ...{ class: "border rounded-xs p-1.5 text-xs text-center transition-colors truncate" },
                ...{ class: (__VLS_ctx.isDiscovered(breed.breedId) ? 'border-accent/20 ' + __VLS_ctx.genColor(__VLS_ctx.compendiumGen) : 'border-accent/10 text-muted/30') },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            if (__VLS_ctx.isDiscovered(breed.breedId)) {
                (breed.name);
            }
            else {
                let __VLS_169;
                /** @ts-ignore @type { | typeof __VLS_components.Lock} */
                Lock;
                // @ts-ignore
                const __VLS_170 = __VLS_asFunctionalComponent1(__VLS_169, new __VLS_169({
                    size: (12),
                    ...{ class: "mx-auto text-muted/30" },
                }));
                const __VLS_171 = __VLS_170({
                    size: (12),
                    ...{ class: "mx-auto text-muted/30" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_170));
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            }
            // @ts-ignore
            [compendiumGen, compendiumGen, compendiumGen, compendiumGen, compendiumGen, compendiumGen, discoveredCountByGen, BREED_COUNTS, currentGenBreeds, isDiscovered, isDiscovered, genColor,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3 border border-accent/20 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-2 text-xs mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
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
            ...{ class: "h-full bg-accent rounded-xs transition-all" },
            ...{ style: ({ width: __VLS_ctx.completionPercent + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (__VLS_ctx.fishPondStore.discoveredBreeds.size);
        (__VLS_ctx.totalBreedCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-2 gap-x-3 gap-y-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-y-0.5']} */ ;
        for (const [g] of __VLS_vFor((5))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (g),
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
            (g);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.discoveredCountByGen(g));
            (__VLS_ctx.BREED_COUNTS[g]);
            // @ts-ignore
            [fishPondStore, totalBreedCount, discoveredCountByGen, BREED_COUNTS, completionPercent,];
        }
    }
}
let __VLS_174;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent1(__VLS_174, new __VLS_174({
    name: "panel-fade",
}));
const __VLS_176 = __VLS_175({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
const { default: __VLS_179 } = __VLS_177.slots;
if (__VLS_ctx.detailFish) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.detailFish))
                    throw 0;
                return __VLS_ctx.detailFish = null;
                // @ts-ignore
                [detailFish, detailFish,];
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
                if (!(__VLS_ctx.detailFish))
                    throw 0;
                return __VLS_ctx.detailFish = null;
                // @ts-ignore
                [detailFish,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_180;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent1(__VLS_180, new __VLS_180({
        size: (14),
    }));
    const __VLS_182 = __VLS_181({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.detailFish.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mb-2 flex items-center space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent flex items-center space-x-px" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
    for (const [n] of __VLS_vFor((__VLS_ctx.fishPondStore.getGeneticStarRating(__VLS_ctx.detailFish.genetics)))) {
        let __VLS_185;
        /** @ts-ignore @type { | typeof __VLS_components.Star} */
        Star;
        // @ts-ignore
        const __VLS_186 = __VLS_asFunctionalComponent1(__VLS_185, new __VLS_185({
            key: (n),
            size: (10),
        }));
        const __VLS_187 = __VLS_186({
            key: (n),
            size: (10),
        }, ...__VLS_functionalComponentArgsRest(__VLS_186));
        // @ts-ignore
        [fishPondStore, detailFish, detailFish,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.detailFish.daysInPond);
    if (__VLS_ctx.detailFish.sick) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    }
    if (!__VLS_ctx.detailFish.mature) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [attr] of __VLS_vFor((__VLS_ctx.fishAttributes))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (attr.key),
            ...{ class: "flex items-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted w-10 shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        (attr.label);
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
            ...{ class: (attr.barClass) },
            ...{ style: ({ width: attr.value + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs w-6 text-right" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
        (attr.value);
        // @ts-ignore
        [detailFish, detailFish, detailFish, fishAttributes,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    if (__VLS_ctx.detailFish.mature && !__VLS_ctx.detailFish.sick) {
        const __VLS_190 = Button || Button;
        // @ts-ignore
        const __VLS_191 = __VLS_asFunctionalComponent1(__VLS_190, new __VLS_190({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            ...{ class: ({ '!bg-accent !text-bg': !__VLS_ctx.fishPondStore.pond.breeding }) },
            icon: (__VLS_ctx.Heart),
            iconSize: (12),
            disabled: (!!__VLS_ctx.fishPondStore.pond.breeding),
        }));
        const __VLS_192 = __VLS_191({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            ...{ class: ({ '!bg-accent !text-bg': !__VLS_ctx.fishPondStore.pond.breeding }) },
            icon: (__VLS_ctx.Heart),
            iconSize: (12),
            disabled: (!!__VLS_ctx.fishPondStore.pond.breeding),
        }, ...__VLS_functionalComponentArgsRest(__VLS_191));
        let __VLS_195;
        const __VLS_196 = {
            /** @type {typeof __VLS_195.click} */
            onClick: (__VLS_ctx.handleDetailBreed),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_197 } = __VLS_193.slots;
        // @ts-ignore
        [fishPondStore, fishPondStore, detailFish, detailFish, Heart, handleDetailBreed,];
        var __VLS_193;
        var __VLS_194;
    }
    const __VLS_198 = Button || Button;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent1(__VLS_198, new __VLS_198({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
    }));
    const __VLS_200 = __VLS_199({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    let __VLS_203;
    const __VLS_204 = {
        /** @type {typeof __VLS_203.click} */
        onClick: (__VLS_ctx.handleDetailRemove),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_205 } = __VLS_201.slots;
    // @ts-ignore
    [ArrowUp, handleDetailRemove,];
    var __VLS_201;
    var __VLS_202;
}
// @ts-ignore
[];
var __VLS_177;
let __VLS_206;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_207 = __VLS_asFunctionalComponent1(__VLS_206, new __VLS_206({
    name: "panel-fade",
}));
const __VLS_208 = __VLS_207({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_207));
const { default: __VLS_211 } = __VLS_209.slots;
if (__VLS_ctx.pondModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pondModal))
                    throw 0;
                return __VLS_ctx.pondModal = null;
                // @ts-ignore
                [pondModal, pondModal,];
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
                if (!(__VLS_ctx.pondModal))
                    throw 0;
                return __VLS_ctx.pondModal = null;
                // @ts-ignore
                [pondModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_212;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent1(__VLS_212, new __VLS_212({
        size: (14),
    }));
    const __VLS_214 = __VLS_213({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.modalTitle);
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
    (__VLS_ctx.pondModal === 'build' ? '等级' : '当前等级');
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.modalCurrentLevel);
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
    (__VLS_ctx.pondModal === 'build' ? '初始容量' : '当前容量');
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.modalCurrentCapacity);
    if (__VLS_ctx.pondModal === 'upgrade') {
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
        (__VLS_ctx.modalTargetLevel);
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
        (__VLS_ctx.modalTargetCapacity);
    }
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
    for (const [mat] of __VLS_vFor((__VLS_ctx.modalMaterials))) {
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
            ...{ class: (mat.enough ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (mat.owned);
        (mat.required);
        // @ts-ignore
        [pondModal, pondModal, pondModal, modalTitle, modalCurrentLevel, modalCurrentCapacity, modalTargetLevel, modalTargetCapacity, modalMaterials,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
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
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.modalMoney ? 'text-accent' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.modalMoney);
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
    (__VLS_ctx.playerStore.money);
    const __VLS_217 = Button || Button;
    // @ts-ignore
    const __VLS_218 = __VLS_asFunctionalComponent1(__VLS_217, new __VLS_217({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canConfirmModal }) },
        icon: (__VLS_ctx.pondModal === 'build' ? __VLS_ctx.Hammer : __VLS_ctx.ArrowUp),
        iconSize: (12),
        disabled: (!__VLS_ctx.canConfirmModal),
    }));
    const __VLS_219 = __VLS_218({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canConfirmModal }) },
        icon: (__VLS_ctx.pondModal === 'build' ? __VLS_ctx.Hammer : __VLS_ctx.ArrowUp),
        iconSize: (12),
        disabled: (!__VLS_ctx.canConfirmModal),
    }, ...__VLS_functionalComponentArgsRest(__VLS_218));
    let __VLS_222;
    const __VLS_223 = {
        /** @type {typeof __VLS_222.click} */
        onClick: (__VLS_ctx.handleModalConfirm),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_224 } = __VLS_220.slots;
    (__VLS_ctx.pondModal === 'build' ? '确认建造' : '确认升级');
    // @ts-ignore
    [Hammer, pondModal, pondModal, ArrowUp, playerStore, playerStore, modalMoney, modalMoney, canConfirmModal, canConfirmModal, handleModalConfirm,];
    var __VLS_220;
    var __VLS_221;
}
// @ts-ignore
[];
var __VLS_209;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
