/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { ClipboardList, Calendar, Clock, Plus, CheckCircle, CircleCheck, Circle, Star, BookOpen, X } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useQuestStore } from '@/stores/useQuestStore';
import { getItemById, getStoryQuestById, CHAPTER_TITLES } from '@/data';
import { addLog } from '@/composables/useGameLog';
const questStore = useQuestStore();
const inventoryStore = useInventoryStore();
const getItemName = (id) => {
    return getItemById(id)?.name ?? id;
};
const questModal = ref(null);
const selectedBoardQuest = computed(() => {
    const m = questModal.value;
    if (!m || m.type !== 'board')
        return null;
    return questStore.boardQuests.find(q => q.id === m.questId) ?? null;
});
const selectedActiveQuest = computed(() => {
    const m = questModal.value;
    if (!m || m.type !== 'active')
        return null;
    return questStore.activeQuests.find(q => q.id === m.questId) ?? null;
});
// === 主线任务 ===
const mainQuestDef = computed(() => {
    if (!questStore.mainQuest)
        return null;
    return getStoryQuestById(questStore.mainQuest.questId) ?? null;
});
const chapterTitle = computed(() => {
    if (!mainQuestDef.value)
        return '';
    return CHAPTER_TITLES[mainQuestDef.value.chapter] ?? '';
});
const mainQuestProgress = computed(() => {
    return questStore.mainQuest?.objectiveProgress ?? [];
});
const handleAcceptMain = () => {
    const result = questStore.acceptMainQuest();
    addLog(result.message);
    questModal.value = null;
};
const handleSubmitMain = () => {
    const result = questStore.submitMainQuest();
    addLog(result.message);
    questModal.value = null;
};
// === 日常委托 ===
/** 非送货类任务的有效进度（取追踪数量和背包数量的较大值） */
const getEffectiveProgress = (quest) => {
    return Math.min(Math.max(quest.collectedQuantity, inventoryStore.getItemCount(quest.targetItemId)), quest.targetQuantity);
};
const canSubmit = (quest) => {
    if (quest.type === 'delivery') {
        return inventoryStore.getItemCount(quest.targetItemId) >= quest.targetQuantity;
    }
    return getEffectiveProgress(quest) >= quest.targetQuantity;
};
const handleAccept = (questId) => {
    const result = questStore.acceptQuest(questId);
    addLog(result.message);
    questModal.value = null;
};
const handleAcceptSpecialOrder = () => {
    const result = questStore.acceptSpecialOrder();
    addLog(result.message);
    questModal.value = null;
};
const handleSubmit = (questId) => {
    const result = questStore.submitQuest(questId);
    addLog(result.message);
    questModal.value = null;
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
    ...{ class: "flex items-center space-x-1.5 text-sm text-accent mb-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.ClipboardList} */
ClipboardList;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.BookOpen} */
BookOpen;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    size: (12),
    ...{ class: "inline" },
}));
const __VLS_7 = __VLS_6({
    size: (12),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
if (__VLS_ctx.mainQuestDef) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.mainQuestDef))
                    throw 0;
                return __VLS_ctx.questModal = { type: 'main' };
                // @ts-ignore
                [mainQuestDef, questModal,];
            } },
        ...{ class: "flex items-center justify-between border rounded-xs px-3 py-1.5 cursor-pointer" },
        ...{ class: (__VLS_ctx.questStore.mainQuest?.accepted && __VLS_ctx.questStore.canSubmitMainQuest()
                ? 'border-success/50 bg-success/5 hover:bg-success/10'
                : 'border-accent/20 hover:bg-accent/5') },
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
        ...{ class: "min-w-0" },
    });
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-accent truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    (__VLS_ctx.mainQuestDef.chapter);
    (__VLS_ctx.mainQuestDef.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    (__VLS_ctx.mainQuestDef.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs whitespace-nowrap ml-2" },
        ...{ class: (__VLS_ctx.questStore.canSubmitMainQuest() ? 'text-success' : __VLS_ctx.questStore.mainQuest?.accepted ? 'text-accent' : 'text-muted') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
    (__VLS_ctx.questStore.canSubmitMainQuest() ? '可提交' : __VLS_ctx.questStore.mainQuest?.accepted ? '进行中' : '未接取');
}
else if (__VLS_ctx.questStore.completedMainQuests.length >= 50) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_10;
    /** @ts-ignore @type { | typeof __VLS_components.CheckCircle} */
    CheckCircle;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        size: (24),
    }));
    const __VLS_12 = __VLS_11({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
let __VLS_15;
/** @ts-ignore @type { | typeof __VLS_components.Calendar} */
Calendar;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    size: (12),
    ...{ class: "inline" },
}));
const __VLS_17 = __VLS_16({
    size: (12),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
if (__VLS_ctx.questStore.boardQuests.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_20;
    /** @ts-ignore @type { | typeof __VLS_components.Calendar} */
    Calendar;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
        size: (24),
    }));
    const __VLS_22 = __VLS_21({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    for (const [quest] of __VLS_vFor((__VLS_ctx.questStore.boardQuests))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.questStore.boardQuests.length === 0))
                        throw 0;
                    return __VLS_ctx.questModal = { type: 'board', questId: quest.id };
                    // @ts-ignore
                    [mainQuestDef, mainQuestDef, mainQuestDef, questModal, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore,];
                } },
            key: (quest.id),
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs truncate min-w-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
        (quest.description);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (quest.moneyReward);
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.questStore.specialOrder) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_25;
    /** @ts-ignore @type { | typeof __VLS_components.Star} */
    Star;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_27 = __VLS_26({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.questStore.specialOrder))
                    throw 0;
                return __VLS_ctx.questModal = { type: 'special' };
                // @ts-ignore
                [questModal, questStore,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "min-w-0" },
    });
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    (__VLS_ctx.questStore.specialOrder.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent whitespace-nowrap ml-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
    (__VLS_ctx.questStore.specialOrder.moneyReward);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
let __VLS_30;
/** @ts-ignore @type { | typeof __VLS_components.Clock} */
Clock;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    size: (12),
    ...{ class: "inline" },
}));
const __VLS_32 = __VLS_31({
    size: (12),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
(__VLS_ctx.questStore.activeQuests.length);
(__VLS_ctx.questStore.MAX_ACTIVE_QUESTS);
if (__VLS_ctx.questStore.activeQuests.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_35;
    /** @ts-ignore @type { | typeof __VLS_components.Clock} */
    Clock;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({
        size: (24),
    }));
    const __VLS_37 = __VLS_36({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    for (const [quest] of __VLS_vFor((__VLS_ctx.questStore.activeQuests))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.questStore.activeQuests.length === 0))
                        throw 0;
                    return __VLS_ctx.questModal = { type: 'active', questId: quest.id };
                    // @ts-ignore
                    [questModal, questStore, questStore, questStore, questStore, questStore, questStore,];
                } },
            key: (quest.id),
            ...{ class: "border rounded-xs px-3 py-1.5 cursor-pointer" },
            ...{ class: (__VLS_ctx.canSubmit(quest)
                    ? 'border-success/50 bg-success/5 hover:bg-success/10'
                    : quest.type === 'special_order'
                        ? 'border-accent/30 hover:bg-accent/5'
                        : 'border-accent/20 hover:bg-accent/5') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs truncate min-w-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
        (quest.description);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs whitespace-nowrap ml-2" },
            ...{ class: (__VLS_ctx.canSubmit(quest) ? 'text-success' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (__VLS_ctx.canSubmit(quest) ? '可提交' : `剩${quest.daysRemaining}天`);
        if (quest.type !== 'delivery') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-1 flex items-center space-x-2" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
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
                ...{ class: "h-full rounded-xs bg-accent transition-all" },
                ...{ style: ({ width: Math.floor((__VLS_ctx.getEffectiveProgress(quest) / quest.targetQuantity) * 100) + '%' }) },
            });
            /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.getEffectiveProgress(quest));
            (quest.targetQuantity);
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.inventoryStore.getItemCount(quest.targetItemId));
            (quest.targetQuantity);
        }
        // @ts-ignore
        [canSubmit, canSubmit, canSubmit, getEffectiveProgress, getEffectiveProgress, inventoryStore,];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/10 rounded-xs p-2 text-center" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.questStore.completedQuestCount);
(__VLS_ctx.questStore.completedMainQuests.length);
let __VLS_40;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent1(__VLS_40, new __VLS_40({
    name: "panel-fade",
}));
const __VLS_42 = __VLS_41({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
const { default: __VLS_45 } = __VLS_43.slots;
if (__VLS_ctx.questModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.questModal))
                    throw 0;
                return __VLS_ctx.questModal = null;
                // @ts-ignore
                [questModal, questModal, questStore, questStore,];
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
                if (!(__VLS_ctx.questModal))
                    throw 0;
                return __VLS_ctx.questModal = null;
                // @ts-ignore
                [questModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_46;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        size: (14),
    }));
    const __VLS_48 = __VLS_47({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    if (__VLS_ctx.questModal.type === 'main' && __VLS_ctx.mainQuestDef) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.mainQuestDef.chapter);
        (__VLS_ctx.chapterTitle);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs font-bold text-accent mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.mainQuestDef.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted leading-relaxed mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.mainQuestDef.description);
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
        for (const [obj, i] of __VLS_vFor((__VLS_ctx.mainQuestDef.objectives))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
                ...{ class: "flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            if (__VLS_ctx.mainQuestProgress[i]) {
                let __VLS_51;
                /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
                CircleCheck;
                // @ts-ignore
                const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
                    size: (12),
                    ...{ class: "text-success shrink-0" },
                }));
                const __VLS_53 = __VLS_52({
                    size: (12),
                    ...{ class: "text-success shrink-0" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_52));
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            }
            else {
                let __VLS_56;
                /** @ts-ignore @type { | typeof __VLS_components.Circle} */
                Circle;
                // @ts-ignore
                const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
                    size: (12),
                    ...{ class: "text-danger shrink-0" },
                }));
                const __VLS_58 = __VLS_57({
                    size: (12),
                    ...{ class: "text-danger shrink-0" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_57));
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.mainQuestProgress[i] ? 'text-success' : '') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (obj.label);
            // @ts-ignore
            [mainQuestDef, mainQuestDef, mainQuestDef, mainQuestDef, mainQuestDef, questModal, chapterTitle, mainQuestProgress, mainQuestProgress,];
        }
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.mainQuestDef.moneyReward);
        if (__VLS_ctx.mainQuestDef.friendshipReward?.length) {
        }
        if (__VLS_ctx.mainQuestDef.itemReward?.length) {
            (__VLS_ctx.mainQuestDef.itemReward.map(i => `${__VLS_ctx.getItemName(i.itemId)}×${i.quantity}`).join(', '));
        }
        if (!__VLS_ctx.questStore.mainQuest?.accepted) {
            const __VLS_61 = Button || Button;
            // @ts-ignore
            const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                icon: (__VLS_ctx.Plus),
                iconSize: (12),
            }));
            const __VLS_63 = __VLS_62({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                icon: (__VLS_ctx.Plus),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_62));
            let __VLS_66;
            const __VLS_67 = {
                /** @type {typeof __VLS_66.click} */
                onClick: (__VLS_ctx.handleAcceptMain),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_68 } = __VLS_64.slots;
            // @ts-ignore
            [mainQuestDef, mainQuestDef, mainQuestDef, mainQuestDef, questStore, getItemName, Plus, handleAcceptMain,];
            var __VLS_64;
            var __VLS_65;
        }
        else {
            const __VLS_69 = Button || Button;
            // @ts-ignore
            const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.questStore.canSubmitMainQuest() }) },
                icon: (__VLS_ctx.CheckCircle),
                iconSize: (12),
                disabled: (!__VLS_ctx.questStore.canSubmitMainQuest()),
            }));
            const __VLS_71 = __VLS_70({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.questStore.canSubmitMainQuest() }) },
                icon: (__VLS_ctx.CheckCircle),
                iconSize: (12),
                disabled: (!__VLS_ctx.questStore.canSubmitMainQuest()),
            }, ...__VLS_functionalComponentArgsRest(__VLS_70));
            let __VLS_74;
            const __VLS_75 = {
                /** @type {typeof __VLS_74.click} */
                onClick: (__VLS_ctx.handleSubmitMain),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
            const { default: __VLS_76 } = __VLS_72.slots;
            // @ts-ignore
            [questStore, questStore, CheckCircle, handleSubmitMain,];
            var __VLS_72;
            var __VLS_73;
        }
    }
    if (__VLS_ctx.questModal.type === 'board' && __VLS_ctx.selectedBoardQuest) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.selectedBoardQuest.description);
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.selectedBoardQuest.targetItemName);
        (__VLS_ctx.selectedBoardQuest.targetQuantity);
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.selectedBoardQuest.moneyReward);
        (__VLS_ctx.selectedBoardQuest.friendshipReward);
        const __VLS_77 = Button || Button;
        // @ts-ignore
        const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
            disabled: (__VLS_ctx.questStore.activeQuests.length >= __VLS_ctx.questStore.MAX_ACTIVE_QUESTS),
        }));
        const __VLS_79 = __VLS_78({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
            disabled: (__VLS_ctx.questStore.activeQuests.length >= __VLS_ctx.questStore.MAX_ACTIVE_QUESTS),
        }, ...__VLS_functionalComponentArgsRest(__VLS_78));
        let __VLS_82;
        const __VLS_83 = {
            /** @type {typeof __VLS_82.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.questModal))
                    throw 0;
                if (!(__VLS_ctx.questModal.type === 'board' && __VLS_ctx.selectedBoardQuest))
                    throw 0;
                return __VLS_ctx.handleAccept(__VLS_ctx.selectedBoardQuest.id);
                // @ts-ignore
                [questModal, questStore, questStore, Plus, selectedBoardQuest, selectedBoardQuest, selectedBoardQuest, selectedBoardQuest, selectedBoardQuest, selectedBoardQuest, selectedBoardQuest, handleAccept,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_84 } = __VLS_80.slots;
        // @ts-ignore
        [];
        var __VLS_80;
        var __VLS_81;
    }
    if (__VLS_ctx.questModal.type === 'special' && __VLS_ctx.questStore.specialOrder) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        if (__VLS_ctx.questStore.specialOrder.tierLabel) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted border border-accent/20 rounded-xs px-1 ml-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            (__VLS_ctx.questStore.specialOrder.tierLabel);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.questStore.specialOrder.description);
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.questStore.specialOrder.targetItemName);
        (__VLS_ctx.questStore.specialOrder.targetQuantity);
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.questStore.specialOrder.daysRemaining);
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.questStore.specialOrder.moneyReward);
        (__VLS_ctx.questStore.specialOrder.friendshipReward);
        if (__VLS_ctx.questStore.specialOrder.itemReward?.length) {
            (__VLS_ctx.questStore.specialOrder.itemReward.map(i => `${__VLS_ctx.getItemName(i.itemId)}×${i.quantity}`).join(', '));
        }
        const __VLS_85 = Button || Button;
        // @ts-ignore
        const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
            disabled: (__VLS_ctx.questStore.activeQuests.length >= __VLS_ctx.questStore.MAX_ACTIVE_QUESTS),
        }));
        const __VLS_87 = __VLS_86({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
            disabled: (__VLS_ctx.questStore.activeQuests.length >= __VLS_ctx.questStore.MAX_ACTIVE_QUESTS),
        }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        let __VLS_90;
        const __VLS_91 = {
            /** @type {typeof __VLS_90.click} */
            onClick: (__VLS_ctx.handleAcceptSpecialOrder),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_92 } = __VLS_88.slots;
        // @ts-ignore
        [questModal, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore, questStore, getItemName, Plus, handleAcceptSpecialOrder,];
        var __VLS_88;
        var __VLS_89;
    }
    if (__VLS_ctx.questModal.type === 'active' && __VLS_ctx.selectedActiveQuest) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.selectedActiveQuest.type === 'special_order' ? '特殊订单' : '委托');
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs leading-relaxed mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.selectedActiveQuest.description);
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
        if (__VLS_ctx.selectedActiveQuest.type !== 'delivery') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
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
                ...{ class: "h-full rounded-xs bg-accent transition-all" },
                ...{ style: ({
                        width: Math.floor((__VLS_ctx.getEffectiveProgress(__VLS_ctx.selectedActiveQuest) / __VLS_ctx.selectedActiveQuest.targetQuantity) * 100) + '%'
                    }) },
            });
            /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.getEffectiveProgress(__VLS_ctx.selectedActiveQuest));
            (__VLS_ctx.selectedActiveQuest.targetQuantity);
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.inventoryStore.getItemCount(__VLS_ctx.selectedActiveQuest.targetItemId));
            (__VLS_ctx.selectedActiveQuest.targetQuantity);
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.selectedActiveQuest.daysRemaining);
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.selectedActiveQuest.moneyReward);
        if (__VLS_ctx.selectedActiveQuest.itemReward?.length) {
            (__VLS_ctx.selectedActiveQuest.itemReward.map(i => `${__VLS_ctx.getItemName(i.itemId)}×${i.quantity}`).join(', '));
        }
        const __VLS_93 = Button || Button;
        // @ts-ignore
        const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canSubmit(__VLS_ctx.selectedActiveQuest) }) },
            icon: (__VLS_ctx.CheckCircle),
            iconSize: (12),
            disabled: (!__VLS_ctx.canSubmit(__VLS_ctx.selectedActiveQuest)),
        }));
        const __VLS_95 = __VLS_94({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canSubmit(__VLS_ctx.selectedActiveQuest) }) },
            icon: (__VLS_ctx.CheckCircle),
            iconSize: (12),
            disabled: (!__VLS_ctx.canSubmit(__VLS_ctx.selectedActiveQuest)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_94));
        let __VLS_98;
        const __VLS_99 = {
            /** @type {typeof __VLS_98.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.questModal))
                    throw 0;
                if (!(__VLS_ctx.questModal.type === 'active' && __VLS_ctx.selectedActiveQuest))
                    throw 0;
                return __VLS_ctx.handleSubmit(__VLS_ctx.selectedActiveQuest.id);
                // @ts-ignore
                [questModal, canSubmit, canSubmit, getEffectiveProgress, getEffectiveProgress, inventoryStore, getItemName, CheckCircle, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, selectedActiveQuest, handleSubmit,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_100 } = __VLS_96.slots;
        // @ts-ignore
        [];
        var __VLS_96;
        var __VLS_97;
    }
}
// @ts-ignore
[];
var __VLS_43;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
