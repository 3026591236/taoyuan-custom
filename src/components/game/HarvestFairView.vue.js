/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Wheat, Package } from 'lucide-vue-next';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { getItemById } from '@/data';
import { sfxRewardClaim, sfxItemSelect, sfxJudging, sfxMiniFail, sfxRankFirst, sfxRankSecond, sfxRankThird, sfxRankLose } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
const inventoryStore = useInventoryStore();
const QUALITY_MULTIPLIERS = {
    normal: 1,
    fine: 1.25,
    excellent: 1.5,
    supreme: 2
};
const selectedItems = ref([]);
const submitted = ref(false);
const rankings = ref([]);
const scoreDetails = ref([]);
const playerScore = ref(0);
/** 可参展的背包物品（排除种子、机器等非展示类物品） */
const selectableItems = computed(() => {
    const exhibitCategories = ['crop', 'fish', 'food', 'processed', 'gem', 'misc'];
    return inventoryStore.items.filter(item => {
        const def = getItemById(item.itemId);
        return def && exhibitCategories.includes(def.category);
    });
});
/** 预览当前选择的总分 */
const previewScore = computed(() => {
    return selectedItems.value.reduce((sum, sel) => {
        const def = getItemById(sel.itemId);
        if (!def)
            return sum;
        const mult = QUALITY_MULTIPLIERS[sel.quality];
        return sum + Math.round(def.sellPrice * mult);
    }, 0);
});
const playerRank = computed(() => {
    const idx = rankings.value.findIndex(e => e.name === '你');
    return idx === -1 ? 99 : idx + 1;
});
const qualityClass = (quality) => {
    const classes = {
        normal: '',
        fine: 'text-quality-fine',
        excellent: 'text-quality-excellent',
        supreme: 'text-quality-supreme'
    };
    return classes[quality];
};
const addSelection = (item) => {
    if (selectedItems.value.length >= 5)
        return;
    sfxItemSelect();
    selectedItems.value.push({ itemId: item.itemId, quality: item.quality });
};
const removeSelection = (index) => {
    sfxMiniFail();
    selectedItems.value.splice(index, 1);
};
const handleSubmit = () => {
    if (selectedItems.value.length === 0)
        return;
    sfxJudging();
    // 计算玩家分数明细
    const details = [];
    let total = 0;
    for (const sel of selectedItems.value) {
        const def = getItemById(sel.itemId);
        if (!def)
            continue;
        const mult = QUALITY_MULTIPLIERS[sel.quality];
        const score = Math.round(def.sellPrice * mult);
        total += score;
        details.push({
            name: def.name,
            quality: sel.quality,
            basePrice: def.sellPrice,
            multiplier: mult,
            score
        });
    }
    scoreDetails.value = details;
    playerScore.value = total;
    // 生成NPC分数（600-1200范围）
    const npcs = [
        { name: '秋月', score: Math.round(600 + Math.random() * 600) },
        { name: '陈伯', score: Math.round(600 + Math.random() * 600) },
        { name: '小满', score: Math.round(600 + Math.random() * 600) }
    ];
    const player = { name: '你', score: total };
    const all = [...npcs, player];
    all.sort((a, b) => b.score - a.score);
    rankings.value = all;
    submitted.value = true;
    // 排名音效
    const rank = all.findIndex(e => e.name === '你') + 1;
    setTimeout(() => {
        if (rank === 1)
            sfxRankFirst();
        else if (rank === 2)
            sfxRankSecond();
        else if (rank === 3)
            sfxRankThird();
        else
            sfxRankLose();
    }, 300);
};
const handleQuit = () => {
    emit('complete', 0);
};
const handleClaim = () => {
    sfxRewardClaim();
    const prizes = { 1: 1000, 2: 500, 3: 200 };
    const prize = prizes[playerRank.value] ?? 0;
    emit('complete', prize);
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-panel max-w-sm w-full" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3 flex items-center space-x-1" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Wheat} */
Wheat;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
if (!__VLS_ctx.submitted) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
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
    (__VLS_ctx.selectedItems.length);
    if (__VLS_ctx.selectedItems.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center py-4 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_5;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
            size: (28),
            ...{ class: "mb-1.5 opacity-40" },
        }));
        const __VLS_7 = __VLS_6({
            size: (28),
            ...{ class: "mb-1.5 opacity-40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-40']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs opacity-60" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        for (const [sel, i] of __VLS_vFor((__VLS_ctx.selectedItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.submitted))
                            throw 0;
                        if (!!(__VLS_ctx.selectedItems.length === 0))
                            throw 0;
                        return __VLS_ctx.removeSelection(i);
                        // @ts-ignore
                        [submitted, selectedItems, selectedItems, selectedItems, removeSelection,];
                    } },
                key: (i),
                ...{ class: "border border-accent/20 rounded-xs px-2 py-1.5 text-xs flex items-center justify-between hover:border-danger/50 transition-colors" },
                title: ('点击移除'),
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:border-danger/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "truncate" },
                ...{ class: (__VLS_ctx.qualityClass(sel.quality)) },
            });
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.getItemById(sel.itemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center space-x-2 shrink-0 ml-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.getItemById(sel.itemId)?.sellPrice);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            // @ts-ignore
            [qualityClass, getItemById, getItemById,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.previewScore);
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
    if (__VLS_ctx.selectableItems.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center py-4 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_10;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
            size: (28),
            ...{ class: "mb-1.5 opacity-40" },
        }));
        const __VLS_12 = __VLS_11({
            size: (28),
            ...{ class: "mb-1.5 opacity-40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-40']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs opacity-60" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5 max-h-48 overflow-y-auto pr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['pr-1']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.selectableItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.submitted))
                            throw 0;
                        if (!!(__VLS_ctx.selectableItems.length === 0))
                            throw 0;
                        return __VLS_ctx.addSelection(item);
                        // @ts-ignore
                        [previewScore, selectableItems, selectableItems, addSelection,];
                    } },
                key: (item.itemId + item.quality),
                ...{ class: "border border-accent/20 rounded-xs px-2 py-1.5 text-xs flex items-center justify-between hover:border-accent/50 transition-colors" },
                disabled: (__VLS_ctx.selectedItems.length >= 5),
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:border-accent/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "truncate" },
                ...{ class: (__VLS_ctx.qualityClass(item.quality)) },
            });
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.getItemById(item.itemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center space-x-2 shrink-0 ml-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (item.quantity);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.getItemById(item.itemId)?.sellPrice);
            // @ts-ignore
            [selectedItems, qualityClass, getItemById, getItemById,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    const __VLS_15 = Button || Button;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
        ...{ 'onClick': {} },
        ...{ class: "flex-1" },
        disabled: (__VLS_ctx.selectedItems.length === 0),
    }));
    const __VLS_17 = __VLS_16({
        ...{ 'onClick': {} },
        ...{ class: "flex-1" },
        disabled: (__VLS_ctx.selectedItems.length === 0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    let __VLS_20;
    const __VLS_21 = {
        /** @type {typeof __VLS_20.click} */
        onClick: (__VLS_ctx.handleSubmit),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    const { default: __VLS_22 } = __VLS_18.slots;
    // @ts-ignore
    [selectedItems, handleSubmit,];
    var __VLS_18;
    var __VLS_19;
    const __VLS_23 = Button || Button;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 opacity-60 hover:opacity-100" },
    }));
    const __VLS_25 = __VLS_24({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 opacity-60 hover:opacity-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    let __VLS_28;
    const __VLS_29 = {
        /** @type {typeof __VLS_28.click} */
        onClick: (__VLS_ctx.handleQuit),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:opacity-100']} */ ;
    const { default: __VLS_30 } = __VLS_26.slots;
    // @ts-ignore
    [handleQuit,];
    var __VLS_26;
    var __VLS_27;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [entry, i] of __VLS_vFor((__VLS_ctx.rankings))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (entry.name),
            ...{ class: "flex items-center justify-between text-xs py-0.5 border-b border-accent/10 last:border-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['last:border-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "mr-2" },
            ...{ class: ({
                    'text-accent': i === 0,
                    'text-success': entry.name === '你'
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (i + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: ({ 'text-success': entry.name === '你' }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (entry.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (entry.score);
        // @ts-ignore
        [rankings,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [d, i] of __VLS_vFor((__VLS_ctx.scoreDetails))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "flex items-center justify-between text-xs py-0.5 border-b border-accent/10 last:border-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['last:border-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (__VLS_ctx.qualityClass(d.quality) || 'text-accent') },
        });
        (d.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (d.basePrice);
        (d.multiplier);
        (d.score);
        // @ts-ignore
        [qualityClass, scoreDetails,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between text-xs mt-1.5 pt-1 border-t border-accent/20" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.playerScore);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3 text-xs text-center border border-accent/20 p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    if (__VLS_ctx.playerRank === 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    }
    else if (__VLS_ctx.playerRank === 2) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    else if (__VLS_ctx.playerRank === 3) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    const __VLS_31 = Button || Button;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_33 = __VLS_32({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    let __VLS_36;
    const __VLS_37 = {
        /** @type {typeof __VLS_36.click} */
        onClick: (__VLS_ctx.handleClaim),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_38 } = __VLS_34.slots;
    // @ts-ignore
    [playerScore, playerRank, playerRank, playerRank, handleClaim,];
    var __VLS_34;
    var __VLS_35;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
