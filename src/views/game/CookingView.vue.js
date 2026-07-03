/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { UtensilsCrossed, Zap, X, Minus, Plus } from 'lucide-vue-next';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useCookingStore } from '@/stores/useCookingStore';
import { useGameStore } from '@/stores/useGameStore';
import { useTutorialStore } from '@/stores/useTutorialStore';
import { getCombinedItemCount } from '@/composables/useCombinedInventory';
import { getItemById } from '@/data';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { sfxClick } from '@/composables/useAudio';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
import { QUALITY_NAMES } from '@/composables/useFarmActions';
import Button from '@/components/game/Button.vue';
const cookingStore = useCookingStore();
const gameStore = useGameStore();
const achievementStore = useAchievementStore();
const tutorialStore = useTutorialStore();
const showOnlyMakeable = ref(false);
const modalRecipeId = ref(null);
const modalQty = ref(1);
/** 预计算食谱信息（不含数量，避免改数量触发全量重算） */
const recipeInfos = computed(() => {
    return cookingStore.recipes.map(recipe => {
        const canCook = cookingStore.canCook(recipe.id);
        const maxQty = cookingStore.maxCookable(recipe.id);
        const quality = cookingStore.previewCookQuality(recipe.id);
        const ingredients = recipe.ingredients.map(ing => {
            const item = getItemById(ing.itemId);
            const available = getCombinedItemCount(ing.itemId);
            return {
                itemId: ing.itemId,
                name: item?.name ?? ing.itemId,
                quantity: ing.quantity,
                available,
                enough: available >= ing.quantity
            };
        });
        return { recipe, canCook, maxQty, quality, ingredients };
    });
});
const displayedRecipeInfos = computed(() => {
    if (!showOnlyMakeable.value)
        return recipeInfos.value;
    return recipeInfos.value.filter(info => info.canCook);
});
/** 当前弹窗对应的食谱信息（响应式，材料变化时自动更新） */
const modalInfo = computed(() => {
    if (!modalRecipeId.value)
        return null;
    return recipeInfos.value.find(i => i.recipe.id === modalRecipeId.value) ?? null;
});
const openModal = (recipeId) => {
    modalRecipeId.value = recipeId;
    modalQty.value = 1;
};
const closeModal = () => {
    modalRecipeId.value = null;
};
const onModalQtyInput = (event) => {
    const val = parseInt(event.target.value) || 1;
    const max = modalInfo.value?.maxQty ?? 1;
    modalQty.value = Math.max(1, Math.min(val, max));
};
const qualityTextClass = (quality) => {
    if (quality === 'fine')
        return 'text-quality-fine';
    if (quality === 'excellent')
        return 'text-quality-excellent';
    if (quality === 'supreme')
        return 'text-quality-supreme';
    return '';
};
const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1)
        return null;
    if (achievementStore.stats.totalRecipesCooked === 0)
        return '点击食谱查看详情和烹饪。料理可以恢复体力和生命值，高品质材料可做出更好的食物。';
    return null;
});
const handleCookFromModal = () => {
    if (!modalInfo.value || !modalInfo.value.canCook)
        return;
    if (gameStore.isPastBedtime) {
        addLog('太晚了，没力气做饭了。');
        handleEndDay();
        closeModal();
        return;
    }
    const qty = Math.min(modalQty.value, modalInfo.value.maxQty);
    const result = cookingStore.cook(modalInfo.value.recipe.id, qty);
    sfxClick();
    addLog(result.message);
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.cook * qty);
    if (tr.message)
        addLog(tr.message);
    closeModal();
    if (tr.passedOut)
        handleEndDay();
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
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.showOnlyMakeable = !__VLS_ctx.showOnlyMakeable;
            // @ts-ignore
            [showOnlyMakeable, showOnlyMakeable,];
        } },
    ...{ class: "text-[10px] px-2 py-0.5 border rounded-xs" },
    ...{ class: (__VLS_ctx.showOnlyMakeable ? 'border-accent text-accent' : 'border-accent/20 text-muted') },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
(__VLS_ctx.showOnlyMakeable ? '可制作' : '全部');
if (__VLS_ctx.tutorialHint) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted/50 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.tutorialHint);
}
if (__VLS_ctx.cookingStore.activeBuff) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-water/20 rounded-xs px-3 py-1.5 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-water/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-water" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-water']} */ ;
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.Zap} */
    Zap;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        size: (12),
        ...{ class: "inline mr-0.5" },
    }));
    const __VLS_2 = __VLS_1({
        size: (12),
        ...{ class: "inline mr-0.5" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
    (__VLS_ctx.cookingStore.activeBuff.description);
}
if (__VLS_ctx.displayedRecipeInfos.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs divide-y divide-accent/10 mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
    /** @type {__VLS_StyleScopedClasses['divide-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    for (const [info] of __VLS_vFor((__VLS_ctx.displayedRecipeInfos))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.displayedRecipeInfos.length > 0))
                        throw 0;
                    return __VLS_ctx.openModal(info.recipe.id);
                    // @ts-ignore
                    [showOnlyMakeable, showOnlyMakeable, tutorialHint, tutorialHint, cookingStore, cookingStore, displayedRecipeInfos, displayedRecipeInfos, openModal,];
                } },
            key: (info.recipe.id),
            ...{ class: "px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (info.canCook ? 'text-text' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (info.recipe.name);
        if (info.canCook && info.quality !== 'normal') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] ml-0.5" },
                ...{ class: (__VLS_ctx.qualityTextClass(info.quality)) },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
            (__VLS_ctx.QUALITY_NAMES[info.quality]);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] whitespace-nowrap ml-2" },
            ...{ class: (info.canCook ? 'text-success' : 'text-muted/50') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (info.recipe.effect.staminaRestore);
        if (info.recipe.effect.healthRestore) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (info.recipe.effect.healthRestore);
        }
        if (info.recipe.effect.buff) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-water mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-water']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            (info.recipe.effect.buff.description);
        }
        // @ts-ignore
        [qualityTextClass, QUALITY_NAMES,];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-8 mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.UtensilsCrossed} */
    UtensilsCrossed;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        size: (36),
        ...{ class: "text-accent/20 mb-2" },
    }));
    const __VLS_7 = __VLS_6({
        size: (36),
        ...{ class: "text-accent/20 mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    /** @type {__VLS_StyleScopedClasses['text-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.showOnlyMakeable) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    else if (__VLS_ctx.cookingStore.recipes.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    if (__VLS_ctx.showOnlyMakeable) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/50 mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    }
    else if (__VLS_ctx.cookingStore.recipes.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/50 mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    }
}
let __VLS_10;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    name: "panel-fade",
}));
const __VLS_12 = __VLS_11({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
const { default: __VLS_15 } = __VLS_13.slots;
if (__VLS_ctx.modalInfo) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closeModal) },
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
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_16;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        size: (14),
    }));
    const __VLS_18 = __VLS_17({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.modalInfo.recipe.name);
    if (__VLS_ctx.modalInfo.canCook && __VLS_ctx.modalInfo.quality !== 'normal') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] ml-0.5" },
            ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.modalInfo.quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
        (__VLS_ctx.QUALITY_NAMES[__VLS_ctx.modalInfo.quality]);
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
        ...{ class: "text-xs text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    (__VLS_ctx.modalInfo.recipe.effect.staminaRestore);
    if (__VLS_ctx.modalInfo.recipe.effect.healthRestore) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-danger ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (__VLS_ctx.modalInfo.recipe.effect.healthRestore);
    }
    if (__VLS_ctx.modalInfo.recipe.effect.buff) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-water mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-water']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.modalInfo.recipe.effect.buff.description);
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
    for (const [ing] of __VLS_vFor((__VLS_ctx.modalInfo.ingredients))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (ing.itemId),
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
        (ing.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (ing.enough ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (ing.available);
        (ing.quantity);
        // @ts-ignore
        [showOnlyMakeable, showOnlyMakeable, cookingStore, cookingStore, qualityTextClass, QUALITY_NAMES, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, modalInfo, closeModal, closeModal,];
    }
    if (__VLS_ctx.modalInfo.maxQty > 1) {
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
        const __VLS_21 = Button || Button;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.modalQty <= 1),
        }));
        const __VLS_23 = __VLS_22({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.modalQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_26;
        const __VLS_27 = {
            /** @type {typeof __VLS_26.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalInfo))
                    throw 0;
                if (!(__VLS_ctx.modalInfo.maxQty > 1))
                    throw 0;
                return __VLS_ctx.modalQty--;
                // @ts-ignore
                [modalInfo, modalQty, modalQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_28 } = __VLS_24.slots;
        let __VLS_29;
        /** @ts-ignore @type { | typeof __VLS_components.Minus} */
        Minus;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
            size: (12),
        }));
        const __VLS_31 = __VLS_30({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        // @ts-ignore
        [];
        var __VLS_24;
        var __VLS_25;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (__VLS_ctx.onModalQtyInput) },
            type: "number",
            value: (__VLS_ctx.modalQty),
            min: "1",
            max: (__VLS_ctx.modalInfo.maxQty),
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
        const __VLS_34 = Button || Button;
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.modalQty >= __VLS_ctx.modalInfo.maxQty),
        }));
        const __VLS_36 = __VLS_35({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.modalQty >= __VLS_ctx.modalInfo.maxQty),
        }, ...__VLS_functionalComponentArgsRest(__VLS_35));
        let __VLS_39;
        const __VLS_40 = {
            /** @type {typeof __VLS_39.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalInfo))
                    throw 0;
                if (!(__VLS_ctx.modalInfo.maxQty > 1))
                    throw 0;
                return __VLS_ctx.modalQty++;
                // @ts-ignore
                [modalInfo, modalInfo, modalQty, modalQty, modalQty, onModalQtyInput,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_41 } = __VLS_37.slots;
        let __VLS_42;
        /** @ts-ignore @type { | typeof __VLS_components.Plus} */
        Plus;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
            size: (12),
        }));
        const __VLS_44 = __VLS_43({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
        // @ts-ignore
        [];
        var __VLS_37;
        var __VLS_38;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_47 = Button || Button;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.modalQty <= 1),
        }));
        const __VLS_49 = __VLS_48({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.modalQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        let __VLS_52;
        const __VLS_53 = {
            /** @type {typeof __VLS_52.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalInfo))
                    throw 0;
                if (!(__VLS_ctx.modalInfo.maxQty > 1))
                    throw 0;
                return __VLS_ctx.modalQty = 1;
                // @ts-ignore
                [modalQty, modalQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_54 } = __VLS_50.slots;
        // @ts-ignore
        [];
        var __VLS_50;
        var __VLS_51;
        const __VLS_55 = Button || Button;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.modalQty >= __VLS_ctx.modalInfo.maxQty),
        }));
        const __VLS_57 = __VLS_56({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.modalQty >= __VLS_ctx.modalInfo.maxQty),
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
        let __VLS_60;
        const __VLS_61 = {
            /** @type {typeof __VLS_60.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalInfo))
                    throw 0;
                if (!(__VLS_ctx.modalInfo.maxQty > 1))
                    throw 0;
                return __VLS_ctx.modalQty = __VLS_ctx.modalInfo.maxQty;
                // @ts-ignore
                [modalInfo, modalInfo, modalQty, modalQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_62 } = __VLS_58.slots;
        // @ts-ignore
        [];
        var __VLS_58;
        var __VLS_59;
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
        (__VLS_ctx.modalInfo.maxQty);
    }
    const __VLS_63 = Button || Button;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.modalInfo.canCook }) },
        icon: (__VLS_ctx.UtensilsCrossed),
        iconSize: (12),
        disabled: (!__VLS_ctx.modalInfo.canCook),
    }));
    const __VLS_65 = __VLS_64({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.modalInfo.canCook }) },
        icon: (__VLS_ctx.UtensilsCrossed),
        iconSize: (12),
        disabled: (!__VLS_ctx.modalInfo.canCook),
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    let __VLS_68;
    const __VLS_69 = {
        /** @type {typeof __VLS_68.click} */
        onClick: (__VLS_ctx.handleCookFromModal),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_70 } = __VLS_66.slots;
    (__VLS_ctx.modalQty > 1 ? ` ×${__VLS_ctx.modalQty}` : '');
    // @ts-ignore
    [modalInfo, modalInfo, modalInfo, modalQty, modalQty, UtensilsCrossed, handleCookFromModal,];
    var __VLS_66;
    var __VLS_67;
}
// @ts-ignore
[];
var __VLS_13;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
