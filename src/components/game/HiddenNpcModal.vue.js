/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Diamond, Package, Circle, CircleCheck } from 'lucide-vue-next';
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useGameStore } from '@/stores/useGameStore';
import { getHiddenNpcById } from '@/data/hiddenNpcs';
import { getItemById } from '@/data';
import { INTERACTION_NAMES } from '@/types/hiddenNpc';
import { doOffering, doSpecialInteraction, doCourting, doBond, doDissolve, getOfferingPreference, OFFERING_PREF_LABELS, OFFERING_PREF_CLASS, OFFERING_PREF_ORDER } from '@/composables/useHiddenNpcActions';
import { triggerHeartEvent } from '@/composables/useDialogs';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
import Button from '@/components/game/Button.vue';
const props = defineProps();
const emit = defineEmits();
const hiddenNpcStore = useHiddenNpcStore();
const inventoryStore = useInventoryStore();
const gameStore = useGameStore();
const npcDef = computed(() => getHiddenNpcById(props.npcId));
const state = computed(() => hiddenNpcStore.getHiddenNpcState(props.npcId));
const AFFINITY_LEVEL_NAMES = {
    wary: '警惕',
    curious: '好奇',
    trusting: '信赖',
    devoted: '虔诚',
    eternal: '永恒'
};
const affinityLevelColor = computed(() => {
    const level = hiddenNpcStore.getAffinityLevel(props.npcId);
    switch (level) {
        case 'wary':
            return 'text-muted';
        case 'curious':
            return 'text-water';
        case 'trusting':
            return 'text-success';
        case 'devoted':
            return 'text-accent';
        case 'eternal':
            return 'text-accent';
    }
});
const showTrueName = computed(() => state.value.affinity >= 2500);
const dialogueText = ref(null);
const showDissolveConfirm = ref(false);
const canCourt = computed(() => {
    const s = state.value;
    const d = npcDef.value;
    if (!d.bondable || s.courting || s.bonded)
        return false;
    if (s.affinity < d.courtshipThreshold)
        return false;
    if (!inventoryStore.hasItem(d.courtshipItemId))
        return false;
    const existingBond = hiddenNpcStore.hiddenNpcStates.find(st => st.bonded || st.courting);
    if (existingBond && existingBond.npcId !== props.npcId)
        return false;
    return true;
});
const canCraftCourtship = computed(() => {
    const d = npcDef.value;
    return d.courtshipCraftCost.every(c => inventoryStore.getItemCount(c.itemId) >= c.quantity);
});
const canCraftBond = computed(() => {
    const d = npcDef.value;
    return d.bondCraftCost.every(c => inventoryStore.getItemCount(c.itemId) >= c.quantity);
});
const canBond = computed(() => {
    const s = state.value;
    const d = npcDef.value;
    if (!s.courting || s.bonded)
        return false;
    if (s.affinity < d.bondThreshold)
        return false;
    if (!inventoryStore.hasItem(d.bondItemId))
        return false;
    return true;
});
const qualityTextClass = (q, fallback = '') => {
    if (q === 'fine')
        return 'text-quality-fine';
    if (q === 'excellent')
        return 'text-quality-excellent';
    if (q === 'supreme')
        return 'text-quality-supreme';
    return fallback;
};
const offerableItems = computed(() => {
    const filtered = inventoryStore.items.filter(i => {
        const def = getItemById(i.itemId);
        return def && def.category !== 'seed';
    });
    return [...filtered].sort((a, b) => (OFFERING_PREF_ORDER[getOfferingPreference(props.npcId, a.itemId)] ?? 2) -
        (OFFERING_PREF_ORDER[getOfferingPreference(props.npcId, b.itemId)] ?? 2));
});
/** 检查心事件并触发 */
const checkAndTriggerHeartEvent = () => {
    const heartEvent = hiddenNpcStore.checkHeartEvent(props.npcId);
    if (heartEvent) {
        triggerHeartEvent(heartEvent);
    }
};
/** 检查是否因时间推进需要结束当天 */
const checkPassout = () => {
    if (gameStore.isPastBedtime) {
        addLog('太晚了，你精疲力竭地回到了家。');
        emit('close');
        handleEndDay();
    }
};
const handleInteraction = () => {
    const success = doSpecialInteraction(props.npcId);
    if (success) {
        const level = hiddenNpcStore.getAffinityLevel(props.npcId);
        const dialogues = npcDef.value.dialogues[level];
        dialogueText.value = dialogues[Math.floor(Math.random() * dialogues.length)] ?? null;
        checkAndTriggerHeartEvent();
        checkPassout();
    }
};
const handleOffer = (itemId, quality) => {
    const success = doOffering(props.npcId, itemId, quality);
    if (success) {
        checkAndTriggerHeartEvent();
        checkPassout();
    }
};
const handleCraft = (type) => {
    const result = hiddenNpcStore.craftSpiritItem(props.npcId, type);
    if (result.success) {
        addLog(`制作了${type === 'courtship' ? getItemById(npcDef.value.courtshipItemId)?.name : getItemById(npcDef.value.bondItemId)?.name}。`);
    }
};
const handleCourt = () => {
    doCourting(props.npcId);
};
const handleBond = () => {
    doBond(props.npcId);
};
const handleDissolve = () => {
    doDissolve(props.npcId);
    showDissolveConfirm.value = false;
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
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.emit('close');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
});
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[80vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex justify-between items-start mb-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.npcDef.name);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted ml-0.5" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
(__VLS_ctx.npcDef.title);
if (__VLS_ctx.state.bonded) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-accent border border-accent/30 rounded-xs px-1 ml-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
}
else if (__VLS_ctx.state.courting) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-accent/70 border border-accent/20 rounded-xs px-1 ml-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-muted/60 mt-0.5" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
(__VLS_ctx.npcDef.personality);
if (__VLS_ctx.showTrueName) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-accent/60 mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.npcDef.trueName);
}
const __VLS_0 = Button || Button;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = {
    /** @type {typeof __VLS_5.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.emit('close');
        // @ts-ignore
        [emit, npcDef, npcDef, npcDef, npcDef, state, state, showTrueName,];
    },
};
const { default: __VLS_7 } = __VLS_3.slots;
// @ts-ignore
[];
var __VLS_3;
var __VLS_4;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between mb-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-px" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
for (const [d] of __VLS_vFor((12))) {
    let __VLS_8;
    /** @ts-ignore @type { | typeof __VLS_components.Diamond} */
    Diamond;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        key: (d),
        size: (10),
        ...{ class: "flex-shrink-0" },
        ...{ class: (__VLS_ctx.state.affinity >= d * 250 ? 'text-accent' : 'text-muted/20') },
        fill: (__VLS_ctx.state.affinity >= d * 250 ? 'currentColor' : 'none'),
    }));
    const __VLS_10 = __VLS_9({
        key: (d),
        size: (10),
        ...{ class: "flex-shrink-0" },
        ...{ class: (__VLS_ctx.state.affinity >= d * 250 ? 'text-accent' : 'text-muted/20') },
        fill: (__VLS_ctx.state.affinity >= d * 250 ? 'currentColor' : 'none'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
    // @ts-ignore
    [state, state,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
    ...{ class: (__VLS_ctx.affinityLevelColor) },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
(__VLS_ctx.state.affinity);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted/40" },
});
/** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-1.5 flex-wrap" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-[10px] border rounded-xs px-1" },
    ...{ class: (__VLS_ctx.affinityLevelColor) },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
(__VLS_ctx.AFFINITY_LEVEL_NAMES[__VLS_ctx.hiddenNpcStore.getAffinityLevel(__VLS_ctx.npcId)]);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-[10px] border rounded-xs px-1 flex items-center space-x-0.5" },
    ...{ class: (__VLS_ctx.state.interactedToday ? 'text-muted/40 border-muted/10' : 'text-success border-success/30') },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.state.interactedToday ? '今日已互动' : '可互动');
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-[10px] border rounded-xs px-1 flex items-center space-x-0.5" },
    ...{ class: (__VLS_ctx.state.offeredToday ? 'text-muted/40 border-muted/10' : 'text-accent border-accent/30') },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.state.offersThisWeek);
if (__VLS_ctx.hiddenNpcStore.isManifestationDay(__VLS_ctx.npcId)) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-accent border border-accent/30 rounded-xs px-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
}
if (__VLS_ctx.dialogueText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel mb-3 text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (__VLS_ctx.npcDef.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.dialogueText);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-3" },
});
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
const __VLS_13 = Button || Button;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ 'onClick': {} },
    ...{ class: "w-full" },
    disabled: (__VLS_ctx.state.interactedToday || __VLS_ctx.state.specialInteractionCooldown > 0),
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    ...{ class: "w-full" },
    disabled: (__VLS_ctx.state.interactedToday || __VLS_ctx.state.specialInteractionCooldown > 0),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = {
    /** @type {typeof __VLS_18.click} */
    onClick: (__VLS_ctx.handleInteraction),
};
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
const { default: __VLS_20 } = __VLS_16.slots;
(__VLS_ctx.INTERACTION_NAMES[__VLS_ctx.npcDef.interactionType]);
if (__VLS_ctx.state.specialInteractionCooldown > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted ml-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    (__VLS_ctx.state.specialInteractionCooldown);
}
// @ts-ignore
[npcDef, npcDef, state, state, state, state, state, state, state, state, state, affinityLevelColor, affinityLevelColor, AFFINITY_LEVEL_NAMES, hiddenNpcStore, hiddenNpcStore, npcId, npcId, dialogueText, dialogueText, handleInteraction, INTERACTION_NAMES,];
var __VLS_16;
var __VLS_17;
if (__VLS_ctx.npcDef.bondable) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-accent/80 mb-1.5 flex items-center space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    let __VLS_21;
    /** @ts-ignore @type { | typeof __VLS_components.Diamond} */
    Diamond;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        size: (12),
    }));
    const __VLS_23 = __VLS_22({
        size: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    if (__VLS_ctx.state.bonded) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-accent/60 mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        const __VLS_26 = Button || Button;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-danger border-danger/40" },
        }));
        const __VLS_28 = __VLS_27({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-danger border-danger/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        let __VLS_31;
        const __VLS_32 = {
            /** @type {typeof __VLS_31.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.npcDef.bondable))
                    throw 0;
                if (!(__VLS_ctx.state.bonded))
                    throw 0;
                return __VLS_ctx.showDissolveConfirm = true;
                // @ts-ignore
                [npcDef, state, showDissolveConfirm,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
        const { default: __VLS_33 } = __VLS_29.slots;
        // @ts-ignore
        [];
        var __VLS_29;
        var __VLS_30;
    }
    else if (__VLS_ctx.state.courting) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-accent/60 mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-0.5 mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] flex items-center space-x-0.5" },
            ...{ class: (__VLS_ctx.state.affinity >= __VLS_ctx.npcDef.bondThreshold ? 'text-success' : 'text-muted/50') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        if (__VLS_ctx.state.affinity >= __VLS_ctx.npcDef.bondThreshold) {
            let __VLS_34;
            /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
            CircleCheck;
            // @ts-ignore
            const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
                size: (10),
            }));
            const __VLS_36 = __VLS_35({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_35));
        }
        else {
            let __VLS_39;
            /** @ts-ignore @type { | typeof __VLS_components.Circle} */
            Circle;
            // @ts-ignore
            const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
                size: (10),
            }));
            const __VLS_41 = __VLS_40({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        }
        (__VLS_ctx.npcDef.bondThreshold);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted/40" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        (__VLS_ctx.state.affinity);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] flex items-center space-x-0.5" },
            ...{ class: (__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.bondItemId) ? 'text-success' : 'text-muted/50') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        if (__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.bondItemId)) {
            let __VLS_44;
            /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
            CircleCheck;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
                size: (10),
            }));
            const __VLS_46 = __VLS_45({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        }
        else {
            let __VLS_49;
            /** @ts-ignore @type { | typeof __VLS_components.Circle} */
            Circle;
            // @ts-ignore
            const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
                size: (10),
            }));
            const __VLS_51 = __VLS_50({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_50));
        }
        (__VLS_ctx.getItemById(__VLS_ctx.npcDef.bondItemId)?.name ?? __VLS_ctx.npcDef.bondItemId);
        if (!__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.bondItemId)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-1.5 mb-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted/60 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (__VLS_ctx.getItemById(__VLS_ctx.npcDef.bondItemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-0.5 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            for (const [cost] of __VLS_vFor((__VLS_ctx.npcDef.bondCraftCost))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    key: (cost.itemId),
                    ...{ class: "text-[10px]" },
                    ...{ class: (__VLS_ctx.inventoryStore.getItemCount(cost.itemId) >= cost.quantity ? 'text-success' : 'text-muted/50') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (__VLS_ctx.getItemById(cost.itemId)?.name ?? cost.itemId);
                (cost.quantity);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted/30" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
                (__VLS_ctx.inventoryStore.getItemCount(cost.itemId));
                // @ts-ignore
                [npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, state, state, state, state, inventoryStore, inventoryStore, inventoryStore, inventoryStore, inventoryStore, getItemById, getItemById, getItemById,];
            }
            const __VLS_54 = Button || Button;
            // @ts-ignore
            const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
                ...{ 'onClick': {} },
                ...{ class: "w-full" },
                disabled: (!__VLS_ctx.canCraftBond),
            }));
            const __VLS_56 = __VLS_55({
                ...{ 'onClick': {} },
                ...{ class: "w-full" },
                disabled: (!__VLS_ctx.canCraftBond),
            }, ...__VLS_functionalComponentArgsRest(__VLS_55));
            let __VLS_59;
            const __VLS_60 = {
                /** @type {typeof __VLS_59.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.npcDef.bondable))
                        throw 0;
                    if (!!(__VLS_ctx.state.bonded))
                        throw 0;
                    if (!(__VLS_ctx.state.courting))
                        throw 0;
                    if (!(!__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.bondItemId)))
                        throw 0;
                    return __VLS_ctx.handleCraft('bond');
                    // @ts-ignore
                    [canCraftBond, handleCraft,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            const { default: __VLS_61 } = __VLS_57.slots;
            // @ts-ignore
            [];
            var __VLS_57;
            var __VLS_58;
        }
        const __VLS_62 = Button || Button;
        // @ts-ignore
        const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-accent border-accent/40" },
            disabled: (!__VLS_ctx.canBond),
        }));
        const __VLS_64 = __VLS_63({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-accent border-accent/40" },
            disabled: (!__VLS_ctx.canBond),
        }, ...__VLS_functionalComponentArgsRest(__VLS_63));
        let __VLS_67;
        const __VLS_68 = {
            /** @type {typeof __VLS_67.click} */
            onClick: (__VLS_ctx.handleBond),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/40']} */ ;
        const { default: __VLS_69 } = __VLS_65.slots;
        // @ts-ignore
        [canBond, handleBond,];
        var __VLS_65;
        var __VLS_66;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-0.5 mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] flex items-center space-x-0.5" },
            ...{ class: (__VLS_ctx.state.affinity >= __VLS_ctx.npcDef.courtshipThreshold ? 'text-success' : 'text-muted/50') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        if (__VLS_ctx.state.affinity >= __VLS_ctx.npcDef.courtshipThreshold) {
            let __VLS_70;
            /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
            CircleCheck;
            // @ts-ignore
            const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
                size: (10),
            }));
            const __VLS_72 = __VLS_71({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_71));
        }
        else {
            let __VLS_75;
            /** @ts-ignore @type { | typeof __VLS_components.Circle} */
            Circle;
            // @ts-ignore
            const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
                size: (10),
            }));
            const __VLS_77 = __VLS_76({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        }
        (__VLS_ctx.npcDef.courtshipThreshold);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted/40" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        (__VLS_ctx.state.affinity);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] flex items-center space-x-0.5" },
            ...{ class: (__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.courtshipItemId) ? 'text-success' : 'text-muted/50') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        if (__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.courtshipItemId)) {
            let __VLS_80;
            /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
            CircleCheck;
            // @ts-ignore
            const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
                size: (10),
            }));
            const __VLS_82 = __VLS_81({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        }
        else {
            let __VLS_85;
            /** @ts-ignore @type { | typeof __VLS_components.Circle} */
            Circle;
            // @ts-ignore
            const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
                size: (10),
            }));
            const __VLS_87 = __VLS_86({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        }
        (__VLS_ctx.getItemById(__VLS_ctx.npcDef.courtshipItemId)?.name ?? __VLS_ctx.npcDef.courtshipItemId);
        if (!__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.courtshipItemId)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/10 rounded-xs p-1.5 mb-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted/60 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (__VLS_ctx.getItemById(__VLS_ctx.npcDef.courtshipItemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-0.5 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            for (const [cost] of __VLS_vFor((__VLS_ctx.npcDef.courtshipCraftCost))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    key: (cost.itemId),
                    ...{ class: "text-[10px]" },
                    ...{ class: (__VLS_ctx.inventoryStore.getItemCount(cost.itemId) >= cost.quantity ? 'text-success' : 'text-muted/50') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (__VLS_ctx.getItemById(cost.itemId)?.name ?? cost.itemId);
                (cost.quantity);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted/30" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
                (__VLS_ctx.inventoryStore.getItemCount(cost.itemId));
                // @ts-ignore
                [npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, npcDef, state, state, state, inventoryStore, inventoryStore, inventoryStore, inventoryStore, inventoryStore, getItemById, getItemById, getItemById,];
            }
            const __VLS_90 = Button || Button;
            // @ts-ignore
            const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
                ...{ 'onClick': {} },
                ...{ class: "w-full" },
                disabled: (!__VLS_ctx.canCraftCourtship),
            }));
            const __VLS_92 = __VLS_91({
                ...{ 'onClick': {} },
                ...{ class: "w-full" },
                disabled: (!__VLS_ctx.canCraftCourtship),
            }, ...__VLS_functionalComponentArgsRest(__VLS_91));
            let __VLS_95;
            const __VLS_96 = {
                /** @type {typeof __VLS_95.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.npcDef.bondable))
                        throw 0;
                    if (!!(__VLS_ctx.state.bonded))
                        throw 0;
                    if (!!(__VLS_ctx.state.courting))
                        throw 0;
                    if (!(!__VLS_ctx.inventoryStore.hasItem(__VLS_ctx.npcDef.courtshipItemId)))
                        throw 0;
                    return __VLS_ctx.handleCraft('courtship');
                    // @ts-ignore
                    [handleCraft, canCraftCourtship,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            const { default: __VLS_97 } = __VLS_93.slots;
            // @ts-ignore
            [];
            var __VLS_93;
            var __VLS_94;
        }
        const __VLS_98 = Button || Button;
        // @ts-ignore
        const __VLS_99 = __VLS_asFunctionalComponent1(__VLS_98, new __VLS_98({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-accent border-accent/40" },
            disabled: (!__VLS_ctx.canCourt),
        }));
        const __VLS_100 = __VLS_99({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-accent border-accent/40" },
            disabled: (!__VLS_ctx.canCourt),
        }, ...__VLS_functionalComponentArgsRest(__VLS_99));
        let __VLS_103;
        const __VLS_104 = {
            /** @type {typeof __VLS_103.click} */
            onClick: (__VLS_ctx.handleCourt),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/40']} */ ;
        const { default: __VLS_105 } = __VLS_101.slots;
        // @ts-ignore
        [canCourt, handleCourt,];
        var __VLS_101;
        var __VLS_102;
    }
}
if (__VLS_ctx.showDissolveConfirm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel mb-3 border-accent/40" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-danger mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.npcDef.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    const __VLS_106 = Button || Button;
    // @ts-ignore
    const __VLS_107 = __VLS_asFunctionalComponent1(__VLS_106, new __VLS_106({
        ...{ 'onClick': {} },
        ...{ class: "text-danger" },
    }));
    const __VLS_108 = __VLS_107({
        ...{ 'onClick': {} },
        ...{ class: "text-danger" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_107));
    let __VLS_111;
    const __VLS_112 = {
        /** @type {typeof __VLS_111.click} */
        onClick: (__VLS_ctx.handleDissolve),
    };
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    const { default: __VLS_113 } = __VLS_109.slots;
    // @ts-ignore
    [npcDef, showDissolveConfirm, handleDissolve,];
    var __VLS_109;
    var __VLS_110;
    const __VLS_114 = Button || Button;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent1(__VLS_114, new __VLS_114({
        ...{ 'onClick': {} },
    }));
    const __VLS_116 = __VLS_115({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    let __VLS_119;
    const __VLS_120 = {
        /** @type {typeof __VLS_119.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showDissolveConfirm))
                throw 0;
            return __VLS_ctx.showDissolveConfirm = false;
            // @ts-ignore
            [showDissolveConfirm,];
        },
    };
    const { default: __VLS_121 } = __VLS_117.slots;
    // @ts-ignore
    [];
    var __VLS_117;
    var __VLS_118;
}
if (__VLS_ctx.npcDef.abilities.length > 0) {
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
        ...{ class: "flex flex-col space-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    for (const [ability] of __VLS_vFor((__VLS_ctx.npcDef.abilities))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (ability.id),
            ...{ class: "text-[10px] border border-accent/10 rounded-xs px-2 py-0.5 flex items-center justify-between" },
            ...{ class: (__VLS_ctx.state.unlockedAbilities.includes(ability.id) ? 'text-accent' : 'text-muted/40') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (ability.name);
        (ability.description);
        if (__VLS_ctx.state.unlockedAbilities.includes(ability.id)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (ability.affinityRequired);
        }
        // @ts-ignore
        [npcDef, npcDef, state, state,];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
if (__VLS_ctx.state.offeredToday) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_122;
    /** @ts-ignore @type { | typeof __VLS_components.Diamond} */
    Diamond;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent1(__VLS_122, new __VLS_122({
        size: (32),
        ...{ class: "mb-2" },
    }));
    const __VLS_124 = __VLS_123({
        size: (32),
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
}
else if (__VLS_ctx.state.offersThisWeek >= 3) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_127;
    /** @ts-ignore @type { | typeof __VLS_components.Diamond} */
    Diamond;
    // @ts-ignore
    const __VLS_128 = __VLS_asFunctionalComponent1(__VLS_127, new __VLS_127({
        size: (32),
        ...{ class: "mb-2" },
    }));
    const __VLS_129 = __VLS_128({
        size: (32),
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_128));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-40 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-40']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.offerableItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.state.offeredToday))
                        throw 0;
                    if (!!(__VLS_ctx.state.offersThisWeek >= 3))
                        throw 0;
                    return __VLS_ctx.handleOffer(item.itemId, item.quality);
                    // @ts-ignore
                    [state, state, offerableItems, handleOffer,];
                } },
            key: (`${item.itemId}_${item.quality ?? 'normal'}`),
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
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.qualityTextClass(item.quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getItemById(item.itemId)?.name);
        if (__VLS_ctx.getOfferingPreference(__VLS_ctx.npcId, item.itemId) !== 'neutral') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px]" },
                ...{ class: (__VLS_ctx.OFFERING_PREF_CLASS[__VLS_ctx.getOfferingPreference(__VLS_ctx.npcId, item.itemId)]) },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            (__VLS_ctx.OFFERING_PREF_LABELS[__VLS_ctx.getOfferingPreference(__VLS_ctx.npcId, item.itemId)]);
        }
        let __VLS_132;
        /** @ts-ignore @type { | typeof __VLS_components.Diamond} */
        Diamond;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent1(__VLS_132, new __VLS_132({
            size: (12),
            ...{ class: "text-muted" },
        }));
        const __VLS_134 = __VLS_133({
            size: (12),
            ...{ class: "text-muted" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        // @ts-ignore
        [npcId, npcId, npcId, getItemById, qualityTextClass, getOfferingPreference, getOfferingPreference, getOfferingPreference, OFFERING_PREF_CLASS, OFFERING_PREF_LABELS,];
    }
    if (__VLS_ctx.offerableItems.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_137;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_138 = __VLS_asFunctionalComponent1(__VLS_137, new __VLS_137({
            size: (32),
            ...{ class: "mb-2" },
        }));
        const __VLS_139 = __VLS_138({
            size: (32),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_138));
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mt-3 border-t border-accent/10 pt-2" },
});
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-muted/50 leading-relaxed" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
(__VLS_ctx.npcDef.origin);
// @ts-ignore
[npcDef, offerableItems,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
