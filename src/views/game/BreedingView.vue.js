/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { FlaskConical, Plus, Check, ChevronDown, X, Dna, Trash2, Sprout, PackageOpen, Star, Lock, ArrowUpCircle } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useBreedingStore } from '@/stores/useBreedingStore';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory';
import { getCropById } from '@/data/crops';
import { getItemById } from '@/data/items';
import { MAX_BREEDING_STATIONS, BREEDING_STATION_COST, SEED_BOX_UPGRADE_INCREMENT, getStarRating, getTotalStats, HYBRID_DEFS, getHybridTier, findPossibleHybrid } from '@/data/breeding';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
const breedingStore = useBreedingStore();
const playerStore = usePlayerStore();
const gameStore = useGameStore();
const tab = ref('breeding');
// === 育种规则展示 ===
const showRules = ref(false);
// === 图鉴阶层筛选 ===
const TIER_LABELS = {
    1: '一',
    2: '二',
    3: '三',
    4: '四',
    5: '五',
    6: '六',
    7: '七',
    8: '八',
    9: '九',
    10: '十'
};
const TIER_FILTERS = [
    { value: 0, label: '全部' },
    { value: 1, label: '一代' },
    { value: 2, label: '二代' },
    { value: 3, label: '三代' },
    { value: 4, label: '四代' },
    { value: 5, label: '五代' },
    { value: 6, label: '六代' },
    { value: 7, label: '七代' },
    { value: 8, label: '八代' },
    { value: 9, label: '九代' },
    { value: 10, label: '十代' }
];
const tierFilter = ref(0);
const filteredHybrids = computed(() => {
    if (tierFilter.value === 0)
        return HYBRID_DEFS;
    return HYBRID_DEFS.filter(h => getHybridTier(h.id) === tierFilter.value);
});
const filteredDiscoveredCount = computed(() => {
    return filteredHybrids.value.filter(h => isDiscovered(h.id)).length;
});
const totalDiscovered = computed(() => {
    return breedingStore.compendium.length;
});
const completionPercent = computed(() => {
    if (HYBRID_DEFS.length === 0)
        return 0;
    return Math.floor((totalDiscovered.value / HYBRID_DEFS.length) * 100);
});
const tierStats = computed(() => {
    const stats = [];
    for (let t = 1; t <= 10; t++) {
        const hybrids = HYBRID_DEFS.filter(h => getHybridTier(h.id) === t);
        const discovered = hybrids.filter(h => isDiscovered(h.id)).length;
        stats.push({ tier: t, label: `${TIER_LABELS[t]}代`, total: hybrids.length, discovered });
    }
    return stats;
});
/** 根据阶层给已发现品种上色 */
const TIER_COLOR_MAP = {
    1: 'text-accent',
    2: 'text-quality-fine',
    3: 'text-accent',
    4: 'text-quality-fine',
    5: 'text-quality-excellent',
    6: 'text-quality-excellent',
    7: 'text-quality-supreme',
    8: 'text-quality-supreme',
    9: 'text-quality-supreme',
    10: 'text-quality-supreme'
};
const tierColor = (hybridId) => {
    return TIER_COLOR_MAP[getHybridTier(hybridId)] ?? 'text-accent';
};
// === 图鉴详情 ===
const activeHybrid = ref(null);
// === 种子详情 ===
const detailSeed = ref(null);
const openSeedDetail = (seed) => {
    detailSeed.value = seed;
};
const seedAttributes = computed(() => {
    if (!detailSeed.value)
        return [];
    const g = detailSeed.value.genetics;
    return [
        { key: 'sweetness', label: '甜度', value: g.sweetness, barClass: 'bg-accent' },
        { key: 'yield', label: '产量', value: g.yield, barClass: 'bg-success' },
        { key: 'resistance', label: '抗性', value: g.resistance, barClass: 'bg-water' },
        { key: 'stability', label: '稳定', value: g.stability, barClass: 'bg-muted' },
        { key: 'mutationRate', label: '变异', value: g.mutationRate, barClass: 'bg-danger' }
    ];
});
const handleDiscard = () => {
    if (!detailSeed.value)
        return;
    breedingStore.removeFromBox(detailSeed.value.genetics.id);
    addLog('丢弃了一颗育种种子。');
    detailSeed.value = null;
};
// === 育种选种 ===
const breedingSelectSlot = ref(null);
const selectedSeedIds = ref([]);
const openBreedingSelect = (slotIdx) => {
    breedingSelectSlot.value = slotIdx;
    selectedSeedIds.value = [];
};
const cancelBreedingSelect = () => {
    breedingSelectSlot.value = null;
    selectedSeedIds.value = [];
};
const toggleSeedSelect = (id) => {
    const idx = selectedSeedIds.value.indexOf(id);
    if (idx >= 0) {
        selectedSeedIds.value.splice(idx, 1);
    }
    else if (selectedSeedIds.value.length < 2) {
        selectedSeedIds.value.push(id);
    }
};
/** 选中两颗种子时，检查是否存在杂交配方并显示属性要求 */
const crossBreedHint = computed(() => {
    if (selectedSeedIds.value.length !== 2)
        return null;
    const seedA = breedingStore.breedingBox.find(s => s.genetics.id === selectedSeedIds.value[0]);
    const seedB = breedingStore.breedingBox.find(s => s.genetics.id === selectedSeedIds.value[1]);
    if (!seedA || !seedB)
        return null;
    const a = seedA.genetics;
    const b = seedB.genetics;
    if (a.cropId === b.cropId)
        return { type: 'same' };
    const hybrid = findPossibleHybrid(a.cropId, b.cropId);
    if (!hybrid)
        return { type: 'no_recipe' };
    const avgSweet = Math.round((a.sweetness + b.sweetness) / 2);
    const avgYield = Math.round((a.yield + b.yield) / 2);
    const sweetOk = avgSweet >= hybrid.minSweetness;
    const yieldOk = avgYield >= hybrid.minYield;
    return {
        type: 'recipe',
        name: hybrid.name,
        avgSweet,
        avgYield,
        minSweet: hybrid.minSweetness,
        minYield: hybrid.minYield,
        sweetOk,
        yieldOk,
        canSucceed: sweetOk && yieldOk
    };
});
const handleStartBreeding = () => {
    if (breedingSelectSlot.value === null || selectedSeedIds.value.length !== 2)
        return;
    const ok = breedingStore.startBreeding(breedingSelectSlot.value, selectedSeedIds.value[0], selectedSeedIds.value[1]);
    if (ok) {
        addLog('育种开始，2天后可收取结果。');
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.breeding);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
        }
    }
    else {
        addLog('育种启动失败。');
    }
    cancelBreedingSelect();
};
const handleCollect = (slotIdx) => {
    const result = breedingStore.collectResult(slotIdx);
    if (result) {
        const crop = getCropById(result.cropId);
        const stars = getStarRating(result);
        addLog(`收取了育种种子：${crop?.name ?? result.cropId}（${stars}星）。`);
    }
};
// === 制造育种台 ===
const showCraftModal = ref(false);
const canCraftStation = computed(() => {
    return breedingStore.canCraftStation(playerStore.money, (id) => getCombinedItemCount(id));
});
const craftMaterials = computed(() => {
    return BREEDING_STATION_COST.materials.map(m => ({
        itemId: m.itemId,
        name: getItemById(m.itemId)?.name ?? m.itemId,
        required: m.quantity,
        owned: getCombinedItemCount(m.itemId),
        enough: getCombinedItemCount(m.itemId) >= m.quantity
    }));
});
const handleCraftStation = () => {
    if (!canCraftStation.value)
        return;
    breedingStore.craftStation((amount) => playerStore.spendMoney(amount), (id, qty) => removeCombinedItem(id, qty));
    addLog('建造了一台育种台。');
    showCraftModal.value = false;
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.breeding);
    if (tr.message)
        addLog(tr.message);
    if (tr.passedOut) {
        handleEndDay();
    }
};
// === 种子箱升级 ===
const showSeedBoxUpgradeModal = ref(false);
const showSeedBoxUpgradeConfirm = ref(false);
const nextSeedBoxUpgrade = computed(() => breedingStore.getNextSeedBoxUpgrade());
const canUpgradeSeedBox = computed(() => {
    return breedingStore.canUpgradeSeedBox(playerStore.money, (id) => getCombinedItemCount(id));
});
const handleSeedBoxUpgrade = () => {
    const result = breedingStore.upgradeSeedBox((amount) => playerStore.spendMoney(amount), (id, qty) => removeCombinedItem(id, qty));
    addLog(result.message);
    if (result.success) {
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.breeding);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    showSeedBoxUpgradeConfirm.value = false;
    showSeedBoxUpgradeModal.value = false;
};
// === 图鉴 ===
const isDiscovered = (hybridId) => {
    return breedingStore.compendium.some(e => e.hybridId === hybridId);
};
const getCompendiumEntry = (hybridId) => {
    return breedingStore.compendium.find(e => e.hybridId === hybridId) ?? null;
};
// === 辅助 ===
const getCropName = (cropId) => {
    return getCropById(cropId)?.name ?? cropId;
};
const seedStarColor = (g) => {
    const total = g.sweetness + g.yield + g.resistance;
    if (total >= 250)
        return 'text-quality-supreme';
    if (total >= 200)
        return 'text-quality-excellent';
    if (total >= 150)
        return 'text-quality-fine';
    return '';
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
/** @ts-ignore @type { | typeof __VLS_components.FlaskConical} */
FlaskConical;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.breedingStore.boxCount);
(__VLS_ctx.breedingStore.maxSeedBox);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex space-x-1 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
const __VLS_5 = Button || Button;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'breeding' }) },
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'breeding' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_10;
const __VLS_11 = {
    /** @type {typeof __VLS_10.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'breeding';
        // @ts-ignore
        [breedingStore, breedingStore, tab, tab,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_12 } = __VLS_8.slots;
// @ts-ignore
[];
var __VLS_8;
var __VLS_9;
const __VLS_13 = Button || Button;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'compendium' }) },
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'compendium' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = {
    /** @type {typeof __VLS_18.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'compendium';
        // @ts-ignore
        [tab, tab,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_20 } = __VLS_16.slots;
// @ts-ignore
[];
var __VLS_16;
var __VLS_17;
if (__VLS_ctx.tab === 'breeding') {
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.breedingStore.stationCount);
    (__VLS_ctx.MAX_BREEDING_STATIONS);
    if (__VLS_ctx.breedingStore.stationCount < __VLS_ctx.MAX_BREEDING_STATIONS) {
        const __VLS_21 = Button || Button;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
        }));
        const __VLS_23 = __VLS_22({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_26;
        const __VLS_27 = {
            /** @type {typeof __VLS_26.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.tab === 'breeding'))
                    throw 0;
                if (!(__VLS_ctx.breedingStore.stationCount < __VLS_ctx.MAX_BREEDING_STATIONS))
                    throw 0;
                return __VLS_ctx.showCraftModal = true;
                // @ts-ignore
                [breedingStore, breedingStore, tab, MAX_BREEDING_STATIONS, MAX_BREEDING_STATIONS, Plus, showCraftModal,];
            },
        };
        const { default: __VLS_28 } = __VLS_24.slots;
        // @ts-ignore
        [];
        var __VLS_24;
        var __VLS_25;
    }
    if (__VLS_ctx.breedingStore.stationCount === 0) {
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
        let __VLS_29;
        /** @ts-ignore @type { | typeof __VLS_components.Dna} */
        Dna;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
            size: (32),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_31 = __VLS_30({
            size: (32),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
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
            ...{ class: "flex flex-col space-y-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        for (const [slot, idx] of __VLS_vFor((__VLS_ctx.breedingStore.stations))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (idx),
                ...{ class: "border border-accent/20 rounded-xs px-3 py-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            if (!slot.parentA && !slot.ready) {
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
                let __VLS_34;
                /** @ts-ignore @type { | typeof __VLS_components.FlaskConical} */
                FlaskConical;
                // @ts-ignore
                const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
                    size: (12),
                    ...{ class: "text-muted/40" },
                }));
                const __VLS_36 = __VLS_35({
                    size: (12),
                    ...{ class: "text-muted/40" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_35));
                /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (idx + 1);
                const __VLS_39 = Button || Button;
                // @ts-ignore
                const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.Dna),
                    iconSize: (12),
                    disabled: (__VLS_ctx.breedingStore.boxCount < 2),
                }));
                const __VLS_41 = __VLS_40({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.Dna),
                    iconSize: (12),
                    disabled: (__VLS_ctx.breedingStore.boxCount < 2),
                }, ...__VLS_functionalComponentArgsRest(__VLS_40));
                let __VLS_44;
                const __VLS_45 = {
                    /** @type {typeof __VLS_44.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'breeding'))
                            throw 0;
                        if (!!(__VLS_ctx.breedingStore.stationCount === 0))
                            throw 0;
                        if (!(!slot.parentA && !slot.ready))
                            throw 0;
                        return __VLS_ctx.openBreedingSelect(idx);
                        // @ts-ignore
                        [breedingStore, breedingStore, breedingStore, Dna, openBreedingSelect,];
                    },
                };
                const { default: __VLS_46 } = __VLS_42.slots;
                // @ts-ignore
                [];
                var __VLS_42;
                var __VLS_43;
            }
            else if (slot.parentA && !slot.ready) {
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
                let __VLS_47;
                /** @ts-ignore @type { | typeof __VLS_components.FlaskConical} */
                FlaskConical;
                // @ts-ignore
                const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
                    size: (12),
                    ...{ class: "text-accent" },
                }));
                const __VLS_49 = __VLS_48({
                    size: (12),
                    ...{ class: "text-accent" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_48));
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                (idx + 1);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (slot.daysProcessed);
                (slot.totalDays);
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
                    ...{ style: ({ width: (slot.daysProcessed / slot.totalDays) * 100 + '%' }) },
                });
                /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
            }
            else if (slot.ready) {
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
                let __VLS_52;
                /** @ts-ignore @type { | typeof __VLS_components.Sprout} */
                Sprout;
                // @ts-ignore
                const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
                    size: (12),
                    ...{ class: "text-success" },
                }));
                const __VLS_54 = __VLS_53({
                    size: (12),
                    ...{ class: "text-success" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_53));
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                (idx + 1);
                const __VLS_57 = Button || Button;
                // @ts-ignore
                const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.Check),
                    iconSize: (12),
                }));
                const __VLS_59 = __VLS_58({
                    ...{ 'onClick': {} },
                    icon: (__VLS_ctx.Check),
                    iconSize: (12),
                }, ...__VLS_functionalComponentArgsRest(__VLS_58));
                let __VLS_62;
                const __VLS_63 = {
                    /** @type {typeof __VLS_62.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'breeding'))
                            throw 0;
                        if (!!(__VLS_ctx.breedingStore.stationCount === 0))
                            throw 0;
                        if (!!(!slot.parentA && !slot.ready))
                            throw 0;
                        if (!!(slot.parentA && !slot.ready))
                            throw 0;
                        if (!(slot.ready))
                            throw 0;
                        return __VLS_ctx.handleCollect(idx);
                        // @ts-ignore
                        [Check, handleCollect,];
                    },
                };
                const { default: __VLS_64 } = __VLS_60.slots;
                // @ts-ignore
                [];
                var __VLS_60;
                var __VLS_61;
            }
            // @ts-ignore
            [];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
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
    (__VLS_ctx.breedingStore.boxCount);
    (__VLS_ctx.breedingStore.maxSeedBox);
    if (__VLS_ctx.nextSeedBoxUpgrade || __VLS_ctx.breedingStore.seedBoxLevel > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'breeding'))
                        throw 0;
                    if (!(__VLS_ctx.nextSeedBoxUpgrade || __VLS_ctx.breedingStore.seedBoxLevel > 0))
                        throw 0;
                    return __VLS_ctx.showSeedBoxUpgradeModal = true;
                    // @ts-ignore
                    [breedingStore, breedingStore, breedingStore, nextSeedBoxUpgrade, showSeedBoxUpgradeModal,];
                } },
            ...{ class: "text-[10px] px-2 py-0.5 border rounded-xs" },
            ...{ class: (__VLS_ctx.nextSeedBoxUpgrade ? 'border-accent/30 text-accent hover:bg-accent/5 cursor-pointer' : 'border-accent/10 text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        let __VLS_65;
        /** @ts-ignore @type { | typeof __VLS_components.ArrowUpCircle} */
        ArrowUpCircle;
        // @ts-ignore
        const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
            size: (10),
            ...{ class: "inline mr-0.5" },
        }));
        const __VLS_67 = __VLS_66({
            size: (10),
            ...{ class: "inline mr-0.5" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_66));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
        (__VLS_ctx.breedingStore.seedBoxLevel);
    }
    if (__VLS_ctx.breedingStore.boxCount === 0) {
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
        let __VLS_70;
        /** @ts-ignore @type { | typeof __VLS_components.PackageOpen} */
        PackageOpen;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
            size: (32),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_72 = __VLS_71({
            size: (32),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
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
            ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [seed] of __VLS_vFor((__VLS_ctx.breedingStore.breedingBox))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'breeding'))
                            throw 0;
                        if (!!(__VLS_ctx.breedingStore.boxCount === 0))
                            throw 0;
                        return __VLS_ctx.openSeedDetail(seed);
                        // @ts-ignore
                        [breedingStore, breedingStore, breedingStore, nextSeedBoxUpgrade, openSeedDetail,];
                    } },
                key: (seed.genetics.id),
                ...{ class: "border rounded-xs px-1 py-1.5 text-center cursor-pointer hover:bg-accent/5 transition-colors mr-1" },
                ...{ class: (__VLS_ctx.selectedSeedIds.includes(seed.genetics.id) ? 'border-accent bg-accent/10' : 'border-accent/20') },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs truncate" },
                ...{ class: (__VLS_ctx.seedStarColor(seed.genetics)) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.getCropName(seed.genetics.cropId));
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (seed.genetics.generation);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs flex items-center justify-center space-x-px" },
                ...{ class: (__VLS_ctx.seedStarColor(seed.genetics)) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
            for (const [n] of __VLS_vFor((__VLS_ctx.getStarRating(seed.genetics)))) {
                let __VLS_75;
                /** @ts-ignore @type { | typeof __VLS_components.Star} */
                Star;
                // @ts-ignore
                const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
                    key: (n),
                    size: (10),
                }));
                const __VLS_77 = __VLS_76({
                    key: (n),
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_76));
                // @ts-ignore
                [selectedSeedIds, seedStarColor, seedStarColor, getCropName, getStarRating,];
            }
            // @ts-ignore
            [];
        }
    }
}
if (__VLS_ctx.tab === 'compendium') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.tab === 'compendium'))
                    throw 0;
                return __VLS_ctx.showRules = !__VLS_ctx.showRules;
                // @ts-ignore
                [tab, showRules, showRules,];
            } },
        ...{ class: "w-full flex items-center justify-between p-2 text-xs text-accent hover:bg-accent/5" },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    let __VLS_80;
    /** @ts-ignore @type { | typeof __VLS_components.ChevronDown} */
    ChevronDown;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
        size: (12),
        ...{ class: ({ 'transform rotate-180': __VLS_ctx.showRules }) },
    }));
    const __VLS_82 = __VLS_81({
        size: (12),
        ...{ class: ({ 'transform rotate-180': __VLS_ctx.showRules }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    /** @type {__VLS_StyleScopedClasses['transform']} */ ;
    /** @type {__VLS_StyleScopedClasses['rotate-180']} */ ;
    if (__VLS_ctx.showRules) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "px-2 pb-2 border-t border-accent/10" },
        });
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "text-xs text-muted leading-relaxed mt-1.5 flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
    }
    if (__VLS_ctx.totalDiscovered === 0) {
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-1 leading-relaxed" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [tf] of __VLS_vFor((__VLS_ctx.TIER_FILTERS))) {
        const __VLS_85 = Button || Button;
        // @ts-ignore
        const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
            ...{ 'onClick': {} },
            key: (tf.value),
            ...{ class: "grow shrink-0 basis-[calc(25%-4px)] md:grow-0 md:shrink md:basis-auto justify-center mr-1 mb-1" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tierFilter === tf.value }) },
        }));
        const __VLS_87 = __VLS_86({
            ...{ 'onClick': {} },
            key: (tf.value),
            ...{ class: "grow shrink-0 basis-[calc(25%-4px)] md:grow-0 md:shrink md:basis-auto justify-center mr-1 mb-1" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tierFilter === tf.value }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        let __VLS_90;
        const __VLS_91 = {
            /** @type {typeof __VLS_90.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.tab === 'compendium'))
                    throw 0;
                return __VLS_ctx.tierFilter = tf.value;
                // @ts-ignore
                [showRules, showRules, totalDiscovered, TIER_FILTERS, tierFilter, tierFilter,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['grow']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['basis-[calc(25%-4px)]']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grow-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:shrink']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:basis-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_92 } = __VLS_88.slots;
        (tf.label);
        // @ts-ignore
        [];
        var __VLS_88;
        var __VLS_89;
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.filteredDiscoveredCount);
    (__VLS_ctx.filteredHybrids.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1 max-h-72 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [hybrid] of __VLS_vFor((__VLS_ctx.filteredHybrids))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'compendium'))
                        throw 0;
                    return __VLS_ctx.isDiscovered(hybrid.id) && (__VLS_ctx.activeHybrid = hybrid);
                    // @ts-ignore
                    [filteredDiscoveredCount, filteredHybrids, filteredHybrids, isDiscovered, activeHybrid,];
                } },
            key: (hybrid.id),
            ...{ class: "border rounded-xs p-1.5 text-xs text-center transition-colors truncate mr-1" },
            ...{ class: (__VLS_ctx.isDiscovered(hybrid.id)
                    ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + __VLS_ctx.tierColor(hybrid.id)
                    : 'border-accent/10 text-muted/30') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        if (__VLS_ctx.isDiscovered(hybrid.id)) {
            (hybrid.name);
        }
        else {
            let __VLS_93;
            /** @ts-ignore @type { | typeof __VLS_components.Lock} */
            Lock;
            // @ts-ignore
            const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }));
            const __VLS_95 = __VLS_94({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_94));
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        }
        // @ts-ignore
        [isDiscovered, isDiscovered, tierColor,];
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
    (__VLS_ctx.totalDiscovered);
    (__VLS_ctx.HYBRID_DEFS.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-2 gap-x-3 gap-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-y-0.5']} */ ;
    for (const [ts] of __VLS_vFor((__VLS_ctx.tierStats))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (ts.tier),
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
        (ts.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (ts.discovered);
        (ts.total);
        // @ts-ignore
        [totalDiscovered, completionPercent, HYBRID_DEFS, tierStats,];
    }
}
let __VLS_98;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent1(__VLS_98, new __VLS_98({
    name: "panel-fade",
}));
const __VLS_100 = __VLS_99({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
const { default: __VLS_103 } = __VLS_101.slots;
if (__VLS_ctx.showCraftModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCraftModal))
                    throw 0;
                return __VLS_ctx.showCraftModal = false;
                // @ts-ignore
                [showCraftModal, showCraftModal,];
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
                if (!(__VLS_ctx.showCraftModal))
                    throw 0;
                return __VLS_ctx.showCraftModal = false;
                // @ts-ignore
                [showCraftModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_104;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent1(__VLS_104, new __VLS_104({
        size: (14),
    }));
    const __VLS_106 = __VLS_105({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [mat] of __VLS_vFor((__VLS_ctx.craftMaterials))) {
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
        [craftMaterials,];
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
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.BREEDING_STATION_COST.money ? 'text-accent' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.BREEDING_STATION_COST.money);
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
    const __VLS_109 = Button || Button;
    // @ts-ignore
    const __VLS_110 = __VLS_asFunctionalComponent1(__VLS_109, new __VLS_109({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canCraftStation }) },
        icon: (__VLS_ctx.Plus),
        iconSize: (12),
        disabled: (!__VLS_ctx.canCraftStation),
    }));
    const __VLS_111 = __VLS_110({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canCraftStation }) },
        icon: (__VLS_ctx.Plus),
        iconSize: (12),
        disabled: (!__VLS_ctx.canCraftStation),
    }, ...__VLS_functionalComponentArgsRest(__VLS_110));
    let __VLS_114;
    const __VLS_115 = {
        /** @type {typeof __VLS_114.click} */
        onClick: (__VLS_ctx.handleCraftStation),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_116 } = __VLS_112.slots;
    // @ts-ignore
    [Plus, playerStore, playerStore, BREEDING_STATION_COST, BREEDING_STATION_COST, canCraftStation, canCraftStation, handleCraftStation,];
    var __VLS_112;
    var __VLS_113;
}
// @ts-ignore
[];
var __VLS_101;
let __VLS_117;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent1(__VLS_117, new __VLS_117({
    name: "panel-fade",
}));
const __VLS_119 = __VLS_118({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
const { default: __VLS_122 } = __VLS_120.slots;
if (__VLS_ctx.detailSeed) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.detailSeed))
                    throw 0;
                return __VLS_ctx.detailSeed = null;
                // @ts-ignore
                [detailSeed, detailSeed,];
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
                if (!(__VLS_ctx.detailSeed))
                    throw 0;
                return __VLS_ctx.detailSeed = null;
                // @ts-ignore
                [detailSeed,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_123;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_124 = __VLS_asFunctionalComponent1(__VLS_123, new __VLS_123({
        size: (14),
    }));
    const __VLS_125 = __VLS_124({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_124));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.getCropName(__VLS_ctx.detailSeed.genetics.cropId));
    (__VLS_ctx.detailSeed.genetics.generation);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mb-2 flex items-center space-x-1" },
        ...{ class: (__VLS_ctx.seedStarColor(__VLS_ctx.detailSeed.genetics)) },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "flex items-center space-x-px" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
    for (const [n] of __VLS_vFor((__VLS_ctx.getStarRating(__VLS_ctx.detailSeed.genetics)))) {
        let __VLS_128;
        /** @ts-ignore @type { | typeof __VLS_components.Star} */
        Star;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
            key: (n),
            size: (10),
        }));
        const __VLS_130 = __VLS_129({
            key: (n),
            size: (10),
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        // @ts-ignore
        [seedStarColor, getCropName, getStarRating, detailSeed, detailSeed, detailSeed, detailSeed,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.getTotalStats(__VLS_ctx.detailSeed.genetics));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [attr] of __VLS_vFor((__VLS_ctx.seedAttributes))) {
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
        [detailSeed, getTotalStats, seedAttributes,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    const __VLS_133 = Button || Button;
    // @ts-ignore
    const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger" },
        icon: (__VLS_ctx.Trash2),
        iconSize: (12),
    }));
    const __VLS_135 = __VLS_134({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger" },
        icon: (__VLS_ctx.Trash2),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_134));
    let __VLS_138;
    const __VLS_139 = {
        /** @type {typeof __VLS_138.click} */
        onClick: (__VLS_ctx.handleDiscard),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    const { default: __VLS_140 } = __VLS_136.slots;
    // @ts-ignore
    [Trash2, handleDiscard,];
    var __VLS_136;
    var __VLS_137;
}
// @ts-ignore
[];
var __VLS_120;
let __VLS_141;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({
    name: "panel-fade",
}));
const __VLS_143 = __VLS_142({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_142));
const { default: __VLS_146 } = __VLS_144.slots;
if (__VLS_ctx.activeHybrid) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeHybrid))
                    throw 0;
                return __VLS_ctx.activeHybrid = null;
                // @ts-ignore
                [activeHybrid, activeHybrid,];
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
                if (!(__VLS_ctx.activeHybrid))
                    throw 0;
                return __VLS_ctx.activeHybrid = null;
                // @ts-ignore
                [activeHybrid,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_147;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
        size: (14),
    }));
    const __VLS_149 = __VLS_148({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.tierColor(__VLS_ctx.activeHybrid.id)) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeHybrid.name);
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
    (__VLS_ctx.activeHybrid.discoveryText);
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
    (__VLS_ctx.TIER_LABELS[__VLS_ctx.getHybridTier(__VLS_ctx.activeHybrid.id)] ?? '一');
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
    (__VLS_ctx.getCropName(__VLS_ctx.activeHybrid.parentCropA));
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
    (__VLS_ctx.getCropName(__VLS_ctx.activeHybrid.parentCropB));
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
    (__VLS_ctx.activeHybrid.minSweetness);
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
    (__VLS_ctx.activeHybrid.minYield);
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
    (__VLS_ctx.activeHybrid.baseGenetics.sweetness);
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
    (__VLS_ctx.activeHybrid.baseGenetics.yield);
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
    (__VLS_ctx.activeHybrid.baseGenetics.resistance);
    if (__VLS_ctx.getCompendiumEntry(__VLS_ctx.activeHybrid.id)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-1 pt-1 border-t border-accent/10" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getCompendiumEntry(__VLS_ctx.activeHybrid.id)?.timesGrown ?? 0);
    }
}
// @ts-ignore
[getCropName, getCropName, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, activeHybrid, tierColor, TIER_LABELS, getHybridTier, getCompendiumEntry, getCompendiumEntry,];
var __VLS_144;
let __VLS_152;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent1(__VLS_152, new __VLS_152({
    name: "panel-fade",
}));
const __VLS_154 = __VLS_153({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
const { default: __VLS_157 } = __VLS_155.slots;
if (__VLS_ctx.showSeedBoxUpgradeModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showSeedBoxUpgradeModal))
                    throw 0;
                return __VLS_ctx.showSeedBoxUpgradeModal = false;
                // @ts-ignore
                [showSeedBoxUpgradeModal, showSeedBoxUpgradeModal,];
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
                if (!(__VLS_ctx.showSeedBoxUpgradeModal))
                    throw 0;
                return __VLS_ctx.showSeedBoxUpgradeModal = false;
                // @ts-ignore
                [showSeedBoxUpgradeModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_158;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_159 = __VLS_asFunctionalComponent1(__VLS_158, new __VLS_158({
        size: (14),
    }));
    const __VLS_160 = __VLS_159({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_159));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_163;
    /** @ts-ignore @type { | typeof __VLS_components.ArrowUpCircle} */
    ArrowUpCircle;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent1(__VLS_163, new __VLS_163({
        size: (14),
        ...{ class: "inline mr-0.5" },
    }));
    const __VLS_165 = __VLS_164({
        size: (14),
        ...{ class: "inline mr-0.5" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
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
    (__VLS_ctx.breedingStore.seedBoxLevel);
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
        ...{ class: "text-xs text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    (__VLS_ctx.breedingStore.maxSeedBox);
    if (__VLS_ctx.nextSeedBoxUpgrade) {
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
        (__VLS_ctx.breedingStore.seedBoxLevel + 1);
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
            ...{ class: "text-xs text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        (__VLS_ctx.breedingStore.maxSeedBox);
        (__VLS_ctx.breedingStore.maxSeedBox + __VLS_ctx.SEED_BOX_UPGRADE_INCREMENT);
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
        for (const [mat] of __VLS_vFor((__VLS_ctx.nextSeedBoxUpgrade.materials))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (mat.itemId),
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
            (__VLS_ctx.getItemById(mat.itemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getCombinedItemCount(mat.itemId));
            (mat.quantity);
            // @ts-ignore
            [breedingStore, breedingStore, breedingStore, breedingStore, breedingStore, nextSeedBoxUpgrade, nextSeedBoxUpgrade, SEED_BOX_UPGRADE_INCREMENT, getItemById, getCombinedItemCount, getCombinedItemCount,];
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
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.nextSeedBoxUpgrade.cost ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.nextSeedBoxUpgrade.cost);
        if (!__VLS_ctx.showSeedBoxUpgradeConfirm) {
            const __VLS_168 = Button || Button;
            // @ts-ignore
            const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeSeedBox }) },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
                disabled: (!__VLS_ctx.canUpgradeSeedBox),
            }));
            const __VLS_170 = __VLS_169({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeSeedBox }) },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
                disabled: (!__VLS_ctx.canUpgradeSeedBox),
            }, ...__VLS_functionalComponentArgsRest(__VLS_169));
            let __VLS_173;
            const __VLS_174 = {
                /** @type {typeof __VLS_173.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showSeedBoxUpgradeModal))
                        throw 0;
                    if (!(__VLS_ctx.nextSeedBoxUpgrade))
                        throw 0;
                    if (!(!__VLS_ctx.showSeedBoxUpgradeConfirm))
                        throw 0;
                    return __VLS_ctx.showSeedBoxUpgradeConfirm = true;
                    // @ts-ignore
                    [nextSeedBoxUpgrade, nextSeedBoxUpgrade, playerStore, showSeedBoxUpgradeConfirm, showSeedBoxUpgradeConfirm, canUpgradeSeedBox, canUpgradeSeedBox, ArrowUpCircle,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_175 } = __VLS_171.slots;
            // @ts-ignore
            [];
            var __VLS_171;
            var __VLS_172;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            const __VLS_176 = Button || Button;
            // @ts-ignore
            const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }));
            const __VLS_178 = __VLS_177({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_177));
            let __VLS_181;
            const __VLS_182 = {
                /** @type {typeof __VLS_181.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showSeedBoxUpgradeModal))
                        throw 0;
                    if (!(__VLS_ctx.nextSeedBoxUpgrade))
                        throw 0;
                    if (!!(!__VLS_ctx.showSeedBoxUpgradeConfirm))
                        throw 0;
                    return __VLS_ctx.showSeedBoxUpgradeConfirm = false;
                    // @ts-ignore
                    [showSeedBoxUpgradeConfirm,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_183 } = __VLS_179.slots;
            // @ts-ignore
            [];
            var __VLS_179;
            var __VLS_180;
            const __VLS_184 = Button || Button;
            // @ts-ignore
            const __VLS_185 = __VLS_asFunctionalComponent1(__VLS_184, new __VLS_184({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
            }));
            const __VLS_186 = __VLS_185({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
                icon: (__VLS_ctx.ArrowUpCircle),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_185));
            let __VLS_189;
            const __VLS_190 = {
                /** @type {typeof __VLS_189.click} */
                onClick: (__VLS_ctx.handleSeedBoxUpgrade),
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_191 } = __VLS_187.slots;
            // @ts-ignore
            [ArrowUpCircle, handleSeedBoxUpgrade,];
            var __VLS_187;
            var __VLS_188;
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    }
}
// @ts-ignore
[];
var __VLS_155;
let __VLS_192;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent1(__VLS_192, new __VLS_192({
    name: "panel-fade",
}));
const __VLS_194 = __VLS_193({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
const { default: __VLS_197 } = __VLS_195.slots;
if (__VLS_ctx.breedingSelectSlot !== null) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.cancelBreedingSelect) },
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
        ...{ onClick: (__VLS_ctx.cancelBreedingSelect) },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_198;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent1(__VLS_198, new __VLS_198({
        size: (14),
    }));
    const __VLS_200 = __VLS_199({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.selectedSeedIds.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [seed] of __VLS_vFor((__VLS_ctx.breedingStore.breedingBox))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.breedingSelectSlot !== null))
                        throw 0;
                    return __VLS_ctx.toggleSeedSelect(seed.genetics.id);
                    // @ts-ignore
                    [breedingStore, selectedSeedIds, breedingSelectSlot, cancelBreedingSelect, cancelBreedingSelect, toggleSeedSelect,];
                } },
            key: (seed.genetics.id),
            ...{ class: "flex items-center justify-between px-2 py-1 border rounded-xs text-xs cursor-pointer hover:bg-accent/5" },
            ...{ class: (__VLS_ctx.selectedSeedIds.includes(seed.genetics.id) ? 'border-accent bg-accent/10' : 'border-accent/20') },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (__VLS_ctx.seedStarColor(seed.genetics)) },
        });
        (__VLS_ctx.getCropName(seed.genetics.cropId));
        (seed.genetics.generation);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center space-x-px" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
        for (const [n] of __VLS_vFor((__VLS_ctx.getStarRating(seed.genetics)))) {
            let __VLS_203;
            /** @ts-ignore @type { | typeof __VLS_components.Star} */
            Star;
            // @ts-ignore
            const __VLS_204 = __VLS_asFunctionalComponent1(__VLS_203, new __VLS_203({
                key: (n),
                size: (10),
            }));
            const __VLS_205 = __VLS_204({
                key: (n),
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_204));
            // @ts-ignore
            [selectedSeedIds, seedStarColor, getCropName, getStarRating,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.getTotalStats(seed.genetics));
        // @ts-ignore
        [getTotalStats,];
    }
    if (__VLS_ctx.crossBreedHint) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border rounded-xs p-2 mb-3" },
            ...{ class: (__VLS_ctx.crossBreedHint.type === 'recipe' && __VLS_ctx.crossBreedHint.canSucceed ? 'border-success/30' : 'border-accent/10') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        if (__VLS_ctx.crossBreedHint.type === 'same') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        }
        else if (__VLS_ctx.crossBreedHint.type === 'no_recipe') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        }
        else if (__VLS_ctx.crossBreedHint.type === 'recipe') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (__VLS_ctx.crossBreedHint.name);
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
                ...{ class: (__VLS_ctx.crossBreedHint.sweetOk ? 'text-success' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.crossBreedHint.avgSweet);
            (__VLS_ctx.crossBreedHint.minSweet);
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
                ...{ class: (__VLS_ctx.crossBreedHint.yieldOk ? 'text-success' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.crossBreedHint.avgYield);
            (__VLS_ctx.crossBreedHint.minYield);
            if (!__VLS_ctx.crossBreedHint.canSucceed) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-danger mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-success mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            }
        }
    }
    const __VLS_208 = Button || Button;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent1(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.selectedSeedIds.length === 2 }) },
        icon: (__VLS_ctx.Dna),
        iconSize: (12),
        disabled: (__VLS_ctx.selectedSeedIds.length !== 2),
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.selectedSeedIds.length === 2 }) },
        icon: (__VLS_ctx.Dna),
        iconSize: (12),
        disabled: (__VLS_ctx.selectedSeedIds.length !== 2),
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_213;
    const __VLS_214 = {
        /** @type {typeof __VLS_213.click} */
        onClick: (__VLS_ctx.handleStartBreeding),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_215 } = __VLS_211.slots;
    // @ts-ignore
    [Dna, selectedSeedIds, selectedSeedIds, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, crossBreedHint, handleStartBreeding,];
    var __VLS_211;
    var __VLS_212;
}
// @ts-ignore
[];
var __VLS_195;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
