/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { MessageCircle, Heart, Gift, Cake, X, Package, Lightbulb, Circle, CircleCheck, Users, Sparkles, Diamond } from 'lucide-vue-next';
import { useCookingStore } from '@/stores/useCookingStore';
import { useGameStore } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useNpcStore } from '@/stores/useNpcStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useTutorialStore } from '@/stores/useTutorialStore';
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore';
import { NPCS, getNpcById, getItemById, getHeartEventById } from '@/data';
import { getHiddenNpcById } from '@/data/hiddenNpcs';
import { ACTION_TIME_COSTS, isNpcAvailable } from '@/data/timeConstants';
import { TIP_NPC_LABELS } from '@/data/npcTips';
import { addLog } from '@/composables/useGameLog';
import { triggerHeartEvent } from '@/composables/useDialogs';
import { handleEndDay } from '@/composables/useEndDay';
import Button from '@/components/game/Button.vue';
import HiddenNpcModal from '@/components/game/HiddenNpcModal.vue';
const npcStore = useNpcStore();
const inventoryStore = useInventoryStore();
const cookingStore = useCookingStore();
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const tutorialStore = useTutorialStore();
const hiddenNpcStore = useHiddenNpcStore();
const activeTab = ref('villager');
const selectedHiddenNpc = ref(null);
const revealedHiddenNpcs = computed(() => hiddenNpcStore.getRevealedNpcs);
const rumorHiddenNpcs = computed(() => hiddenNpcStore.getRumorNpcs);
const hiddenHeartCount = (npcId) => {
    const affinity = hiddenNpcStore.getHiddenNpcState(npcId)?.affinity ?? 0;
    return Math.min(12, Math.floor(affinity / 250));
};
const getLastDiscoveryLog = (npcId) => {
    const npcDef = getHiddenNpcById(npcId);
    const state = hiddenNpcStore.getHiddenNpcState(npcId);
    if (!npcDef || !state)
        return null;
    const lastStepId = state.completedSteps[state.completedSteps.length - 1];
    const step = npcDef.discoverySteps.find(s => s.id === lastStepId);
    return step?.logMessage ?? null;
};
const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1)
        return null;
    if (npcStore.npcStates.every(n => n.friendship === 0))
        return '点击村民头像可以聊天和送礼，经常互动能增进友好度。';
    return null;
});
const selectedNpc = ref(null);
const dialogueText = ref(null);
const showDivorceConfirm = ref(false);
const showZhijiDissolveConfirm = ref(false);
const activeGiftKey = ref(null);
const activeGiftItem = computed(() => {
    if (!activeGiftKey.value)
        return null;
    const [itemId, quality] = activeGiftKey.value.split(':');
    return inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality) ?? null;
});
const activeGiftDef = computed(() => {
    if (!activeGiftItem.value)
        return null;
    return getItemById(activeGiftItem.value.itemId) ?? null;
});
const selectedNpcDef = computed(() => (selectedNpc.value ? getNpcById(selectedNpc.value) : null));
const selectedNpcState = computed(() => (selectedNpc.value ? npcStore.getNpcState(selectedNpc.value) : null));
const npcAvailable = (npcId) => {
    const state = npcStore.getNpcState(npcId);
    if (state?.married)
        return true;
    return isNpcAvailable(npcId, gameStore.day, gameStore.hour, gameStore.season);
};
const handleSelectNpc = (npcId) => {
    if (npcAvailable(npcId)) {
        selectedNpc.value = npcId;
        dialogueText.value = null;
        showDivorceConfirm.value = false;
        showZhijiDissolveConfirm.value = false;
    }
};
const heartCount = (npcId) => {
    const friendship = npcStore.getNpcState(npcId)?.friendship ?? 0;
    return Math.min(10, Math.floor(friendship / 250));
};
const npcGiftClass = (npcId) => {
    const state = npcStore.getNpcState(npcId);
    if ((state?.giftsThisWeek ?? 0) >= 2)
        return 'text-muted/20';
    if (state?.giftedToday)
        return 'text-muted/20';
    return 'text-accent';
};
/** 弹窗中下一颗心的阈值 */
const nextHeartThreshold = computed(() => {
    const f = selectedNpcState.value?.friendship ?? 0;
    const hearts = Math.min(10, Math.floor(f / 250));
    return hearts >= 10 ? 2500 : (hearts + 1) * 250;
});
/** 弹窗中送礼标签样式 */
const giftTagClass = computed(() => {
    const state = selectedNpcState.value;
    if ((state?.giftsThisWeek ?? 0) >= 2)
        return 'text-muted/40 border-muted/10';
    if (state?.giftedToday)
        return 'text-muted/40 border-muted/10';
    return 'text-accent border-accent/30';
});
/** 弹窗中送礼标签文字 */
const giftTagText = computed(() => {
    const state = selectedNpcState.value;
    if ((state?.giftsThisWeek ?? 0) >= 2)
        return '本周已送满';
    if (state?.giftedToday)
        return '今日已送';
    return `可送礼 ${state?.giftsThisWeek ?? 0}/2`;
});
const giftableItems = computed(() => {
    const filtered = inventoryStore.items.filter(i => {
        const def = getItemById(i.itemId);
        return def && def.category !== 'seed';
    });
    if (!selectedNpcDef.value)
        return filtered;
    return [...filtered].sort((a, b) => GIFT_PREF_ORDER[getGiftPreference(a.itemId)] - GIFT_PREF_ORDER[getGiftPreference(b.itemId)]);
});
/** 是否可以赠帕开始约会 */
const canStartDating = computed(() => {
    if (!selectedNpcDef.value?.marriageable)
        return false;
    if (selectedNpcDef.value.gender === playerStore.gender)
        return false;
    if (selectedNpcState.value?.dating)
        return false;
    if (selectedNpcState.value?.married)
        return false;
    if (npcStore.npcStates.some(s => s.married))
        return false;
    if ((selectedNpcState.value?.friendship ?? 0) < 2000)
        return false;
    if (!inventoryStore.hasItem('silk_ribbon'))
        return false;
    return true;
});
/** 是否可以求婚 */
const canPropose = computed(() => {
    if (!selectedNpcDef.value?.marriageable)
        return false;
    if (selectedNpcDef.value.gender === playerStore.gender)
        return false;
    if (!selectedNpcState.value?.dating)
        return false;
    if (selectedNpcState.value?.married)
        return false;
    if (npcStore.npcStates.some(s => s.married))
        return false;
    if (npcStore.weddingCountdown > 0)
        return false;
    if ((selectedNpcState.value?.friendship ?? 0) < 2500)
        return false;
    if (!inventoryStore.hasItem('jade_ring'))
        return false;
    return true;
});
/** 是否可以结为知己 */
const canBecomeZhiji = computed(() => {
    if (!selectedNpcDef.value?.marriageable)
        return false;
    if (selectedNpcDef.value.gender !== playerStore.gender)
        return false;
    if (selectedNpcState.value?.zhiji || selectedNpcState.value?.dating || selectedNpcState.value?.married)
        return false;
    if (npcStore.npcStates.some(s => s.zhiji))
        return false;
    if ((selectedNpcState.value?.friendship ?? 0) < 2000)
        return false;
    if (!inventoryStore.hasItem('zhiji_jade'))
        return false;
    return true;
});
const SEASON_NAMES_MAP = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const qualityTextClass = (q, fallback = '') => {
    if (q === 'fine')
        return 'text-quality-fine';
    if (q === 'excellent')
        return 'text-quality-excellent';
    if (q === 'supreme')
        return 'text-quality-supreme';
    return fallback;
};
const QUALITY_NAMES = {
    normal: '普通',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
};
const getGiftPreference = (itemId) => {
    const npcDef = selectedNpcDef.value;
    if (!npcDef)
        return 'neutral';
    if (npcDef.lovedItems.includes(itemId))
        return 'loved';
    if (npcDef.likedItems.includes(itemId))
        return 'liked';
    if (npcDef.hatedItems.includes(itemId))
        return 'hated';
    return 'neutral';
};
const GIFT_PREF_LABELS = {
    loved: '最爱',
    liked: '喜欢',
    hated: '讨厌',
    neutral: ''
};
const GIFT_PREF_CLASS = {
    loved: 'text-danger',
    liked: 'text-success',
    hated: 'text-muted',
    neutral: ''
};
const GIFT_PREF_ORDER = {
    loved: 0,
    liked: 1,
    neutral: 2,
    hated: 3
};
const GIFT_REACTION_TEXT = {
    loved: '非常喜欢',
    liked: '还不错',
    hated: '讨厌',
    neutral: '一般'
};
const activeGiftReaction = computed(() => {
    if (!activeGiftItem.value || !selectedNpcDef.value)
        return null;
    const pref = getGiftPreference(activeGiftItem.value.itemId);
    return { text: GIFT_REACTION_TEXT[pref], className: GIFT_PREF_CLASS[pref] };
});
const levelColor = (level) => {
    switch (level) {
        case 'stranger':
            return 'text-muted';
        case 'acquaintance':
            return 'text-water';
        case 'friendly':
            return 'text-success';
        case 'bestFriend':
            return 'text-accent';
    }
};
const getHeartEventTitle = (eventId) => {
    return getHeartEventById(eventId)?.title ?? eventId;
};
const handleTalk = () => {
    if (!selectedNpc.value)
        return;
    if (gameStore.isPastBedtime) {
        addLog('太晚了，人家都睡了。');
        handleEndDay();
        return;
    }
    const result = npcStore.talkTo(selectedNpc.value);
    if (result) {
        dialogueText.value = result.message;
        addLog(`与${selectedNpcDef.value?.name}聊天。(+${result.friendshipGain}好感)`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.talk);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
        // 检查心事件触发
        const heartEvent = npcStore.checkHeartEvent(selectedNpc.value);
        if (heartEvent) {
            triggerHeartEvent(heartEvent);
        }
    }
};
const handleDailyTip = () => {
    if (!selectedNpc.value)
        return;
    const tip = npcStore.getDailyTip(selectedNpc.value);
    if (tip) {
        dialogueText.value = tip;
        addLog(`${selectedNpcDef.value?.name}告诉了你一些有用的信息。`);
    }
};
const handleGift = (itemId, quality = 'normal') => {
    if (!selectedNpc.value)
        return;
    const cookingGiftBonus = cookingStore.activeBuff?.type === 'giftBonus' ? cookingStore.activeBuff.value : 1;
    const ringGiftBonus = inventoryStore.getRingEffectValue('gift_friendship');
    const giftMultiplier = cookingGiftBonus * (1 + ringGiftBonus);
    const result = npcStore.giveGift(selectedNpc.value, itemId, giftMultiplier, quality);
    if (result) {
        const itemName = getItemById(itemId)?.name ?? itemId;
        const npcName = selectedNpcDef.value?.name;
        if (result.gain > 0) {
            addLog(`送给${npcName}${itemName}，${npcName}觉得${result.reaction}。(+${result.gain}好感)`);
        }
        else if (result.gain < 0) {
            addLog(`送给${npcName}${itemName}，${npcName}${result.reaction}这个……(${result.gain}好感)`);
        }
        else {
            addLog(`送给${npcName}${itemName}，${npcName}觉得${result.reaction}。`);
        }
        // 关闭送礼弹窗
        activeGiftKey.value = null;
        // 送礼后也检查心事件
        const heartEvent = npcStore.checkHeartEvent(selectedNpc.value);
        if (heartEvent) {
            triggerHeartEvent(heartEvent);
        }
    }
};
const handlePropose = () => {
    if (!selectedNpc.value)
        return;
    const result = npcStore.propose(selectedNpc.value);
    if (result.success) {
        dialogueText.value = result.message;
        addLog(result.message);
    }
    else {
        addLog(result.message);
    }
};
const handleStartDating = () => {
    if (!selectedNpc.value)
        return;
    const result = npcStore.startDating(selectedNpc.value);
    if (result.success) {
        dialogueText.value = result.message;
        addLog(result.message);
    }
    else {
        addLog(result.message);
    }
};
const handleBecomeZhiji = () => {
    if (!selectedNpc.value)
        return;
    const result = npcStore.becomeZhiji(selectedNpc.value);
    if (result.success) {
        dialogueText.value = result.message;
        addLog(result.message);
    }
    else {
        addLog(result.message);
    }
};
const handleDissolveZhiji = () => {
    const result = npcStore.dissolveZhiji();
    if (result.success) {
        addLog(result.message);
        dialogueText.value = result.message;
    }
    else {
        addLog(result.message);
    }
    showZhijiDissolveConfirm.value = false;
};
const handleDivorce = () => {
    const result = npcStore.divorce();
    if (result.success) {
        addLog(result.message);
        dialogueText.value = result.message;
    }
    else {
        addLog(result.message);
    }
    showDivorceConfirm.value = false;
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'villager' }) },
    icon: (__VLS_ctx.Users),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'villager' }) },
    icon: (__VLS_ctx.Users),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = {
    /** @type {typeof __VLS_5.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.activeTab = 'villager';
        // @ts-ignore
        [activeTab, activeTab, Users,];
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'spirit' }) },
    icon: (__VLS_ctx.Sparkles),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'spirit' }) },
    icon: (__VLS_ctx.Sparkles),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_13;
const __VLS_14 = {
    /** @type {typeof __VLS_13.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.activeTab = 'spirit';
        // @ts-ignore
        [activeTab, activeTab, Sparkles,];
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
if (__VLS_ctx.activeTab === 'villager') {
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-4 md:grid-cols-3 gap-1.5 md:gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:gap-2']} */ ;
    for (const [npc] of __VLS_vFor((__VLS_ctx.NPCS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeTab === 'villager'))
                        throw 0;
                    return __VLS_ctx.handleSelectNpc(npc.id);
                    // @ts-ignore
                    [activeTab, tutorialHint, tutorialHint, NPCS, handleSelectNpc,];
                } },
            key: (npc.id),
            ...{ class: "border border-accent/20 rounded-xs p-1.5 md:p-2 transition-colors" },
            ...{ class: ([__VLS_ctx.npcAvailable(npc.id) ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50', 'text-center md:text-left']) },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:text-left']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "md:hidden" },
        });
        /** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs truncate" },
            ...{ class: (__VLS_ctx.levelColor(__VLS_ctx.npcStore.getFriendshipLevel(npc.id))) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        (npc.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] flex items-center justify-center" },
            ...{ class: (__VLS_ctx.heartCount(npc.id) > 0 ? 'text-danger' : 'text-muted/30') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        (__VLS_ctx.heartCount(npc.id));
        let __VLS_16;
        /** @ts-ignore @type { | typeof __VLS_components.Heart} */
        Heart;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
            size: (10),
            fill: (__VLS_ctx.heartCount(npc.id) > 0 ? 'currentColor' : 'none'),
        }));
        const __VLS_18 = __VLS_17({
            size: (10),
            fill: (__VLS_ctx.heartCount(npc.id) > 0 ? 'currentColor' : 'none'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted/50 ml-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
        (__VLS_ctx.npcStore.getNpcState(npc.id)?.friendship ?? 0);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-1 mt-0.5 min-h-3.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-3.5']} */ ;
        let __VLS_21;
        /** @ts-ignore @type { | typeof __VLS_components.MessageCircle} */
        MessageCircle;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            size: (10),
            ...{ class: (__VLS_ctx.npcStore.getNpcState(npc.id)?.talkedToday ? 'text-muted/20' : 'text-success') },
        }));
        const __VLS_23 = __VLS_22({
            size: (10),
            ...{ class: (__VLS_ctx.npcStore.getNpcState(npc.id)?.talkedToday ? 'text-muted/20' : 'text-success') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_26;
        /** @ts-ignore @type { | typeof __VLS_components.Gift} */
        Gift;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
            size: (10),
            ...{ class: (__VLS_ctx.npcGiftClass(npc.id)) },
        }));
        const __VLS_28 = __VLS_27({
            size: (10),
            ...{ class: (__VLS_ctx.npcGiftClass(npc.id)) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        if (__VLS_ctx.npcStore.getNpcState(npc.id)?.married) {
            let __VLS_31;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
                size: (10),
                ...{ class: "text-danger" },
            }));
            const __VLS_33 = __VLS_32({
                size: (10),
                ...{ class: "text-danger" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_32));
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        }
        else if (__VLS_ctx.npcStore.getNpcState(npc.id)?.dating) {
            let __VLS_36;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
                size: (10),
                ...{ class: "text-danger/50" },
            }));
            const __VLS_38 = __VLS_37({
                size: (10),
                ...{ class: "text-danger/50" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            /** @type {__VLS_StyleScopedClasses['text-danger/50']} */ ;
        }
        else if (__VLS_ctx.npcStore.getNpcState(npc.id)?.zhiji) {
            let __VLS_41;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
                size: (10),
                ...{ class: "text-accent" },
            }));
            const __VLS_43 = __VLS_42({
                size: (10),
                ...{ class: "text-accent" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_42));
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        }
        else if (npc.marriageable) {
            let __VLS_46;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
                size: (10),
                ...{ class: "text-muted/30" },
            }));
            const __VLS_48 = __VLS_47({
                size: (10),
                ...{ class: "text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_47));
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        }
        if (__VLS_ctx.npcStore.isBirthday(npc.id)) {
            let __VLS_51;
            /** @ts-ignore @type { | typeof __VLS_components.Cake} */
            Cake;
            // @ts-ignore
            const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
                size: (10),
                ...{ class: "text-danger" },
            }));
            const __VLS_53 = __VLS_52({
                size: (10),
                ...{ class: "text-danger" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_52));
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hidden md:block" },
        });
        /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.levelColor(__VLS_ctx.npcStore.getFriendshipLevel(npc.id))) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (npc.name);
        if (__VLS_ctx.npcStore.getNpcState(npc.id)?.married) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger text-[10px] ml-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
        }
        else if (__VLS_ctx.npcStore.getNpcState(npc.id)?.dating) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger/70 text-[10px] ml-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger/70']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
        }
        else if (__VLS_ctx.npcStore.getNpcState(npc.id)?.zhiji) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-accent text-[10px] ml-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_56;
        /** @ts-ignore @type { | typeof __VLS_components.MessageCircle} */
        MessageCircle;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
            size: (10),
            ...{ class: (__VLS_ctx.npcStore.getNpcState(npc.id)?.talkedToday ? 'text-muted/20' : 'text-success') },
        }));
        const __VLS_58 = __VLS_57({
            size: (10),
            ...{ class: (__VLS_ctx.npcStore.getNpcState(npc.id)?.talkedToday ? 'text-muted/20' : 'text-success') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        let __VLS_61;
        /** @ts-ignore @type { | typeof __VLS_components.Gift} */
        Gift;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
            size: (10),
            ...{ class: (__VLS_ctx.npcGiftClass(npc.id)) },
        }));
        const __VLS_63 = __VLS_62({
            size: (10),
            ...{ class: (__VLS_ctx.npcGiftClass(npc.id)) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_62));
        if (npc.marriageable) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger/50" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger/50']} */ ;
            let __VLS_66;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
                size: (10),
            }));
            const __VLS_68 = __VLS_67({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_67));
        }
        if (__VLS_ctx.npcStore.isBirthday(npc.id)) {
            let __VLS_71;
            /** @ts-ignore @type { | typeof __VLS_components.Cake} */
            Cake;
            // @ts-ignore
            const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
                size: (10),
                ...{ class: "text-danger" },
            }));
            const __VLS_73 = __VLS_72({
                size: (10),
                ...{ class: "text-danger" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_72));
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted truncate" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        (npc.role);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-px" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
        for (const [h] of __VLS_vFor((10))) {
            let __VLS_76;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
                key: (h),
                size: (10),
                ...{ class: "flex-shrink-0" },
                ...{ class: ((__VLS_ctx.npcStore.getNpcState(npc.id)?.friendship ?? 0) >= h * 250 ? 'text-danger' : 'text-muted/30') },
                fill: ((__VLS_ctx.npcStore.getNpcState(npc.id)?.friendship ?? 0) >= h * 250 ? 'currentColor' : 'none'),
            }));
            const __VLS_78 = __VLS_77({
                key: (h),
                size: (10),
                ...{ class: "flex-shrink-0" },
                ...{ class: ((__VLS_ctx.npcStore.getNpcState(npc.id)?.friendship ?? 0) >= h * 250 ? 'text-danger' : 'text-muted/30') },
                fill: ((__VLS_ctx.npcStore.getNpcState(npc.id)?.friendship ?? 0) >= h * 250 ? 'currentColor' : 'none'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_77));
            /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
            // @ts-ignore
            [npcAvailable, levelColor, levelColor, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, heartCount, heartCount, heartCount, npcGiftClass, npcGiftClass,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted/50" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
        (__VLS_ctx.npcStore.getNpcState(npc.id)?.friendship ?? 0);
        // @ts-ignore
        [npcStore,];
    }
}
if (__VLS_ctx.activeTab === 'spirit') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    if (__VLS_ctx.revealedHiddenNpcs.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-4 md:grid-cols-3 gap-1.5 md:gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:gap-2']} */ ;
        for (const [npc] of __VLS_vFor((__VLS_ctx.revealedHiddenNpcs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeTab === 'spirit'))
                            throw 0;
                        if (!(__VLS_ctx.revealedHiddenNpcs.length > 0))
                            throw 0;
                        return __VLS_ctx.selectedHiddenNpc = npc.id;
                        // @ts-ignore
                        [activeTab, revealedHiddenNpcs, revealedHiddenNpcs, selectedHiddenNpc,];
                    } },
                key: (npc.id),
                ...{ class: "border border-accent/20 rounded-xs p-1.5 md:p-2 cursor-pointer hover:bg-accent/5 text-center md:text-left" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['md:p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['md:text-left']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "md:hidden" },
            });
            /** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (npc.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] flex items-center justify-center" },
                ...{ class: (__VLS_ctx.hiddenHeartCount(npc.id) > 0 ? 'text-accent' : 'text-muted/30') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            (__VLS_ctx.hiddenHeartCount(npc.id));
            let __VLS_81;
            /** @ts-ignore @type { | typeof __VLS_components.Diamond} */
            Diamond;
            // @ts-ignore
            const __VLS_82 = __VLS_asFunctionalComponent1(__VLS_81, new __VLS_81({
                size: (10),
                fill: (__VLS_ctx.hiddenHeartCount(npc.id) > 0 ? 'currentColor' : 'none'),
            }));
            const __VLS_83 = __VLS_82({
                size: (10),
                fill: (__VLS_ctx.hiddenHeartCount(npc.id) > 0 ? 'currentColor' : 'none'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_82));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted/50 ml-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
            (__VLS_ctx.hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "hidden md:block" },
            });
            /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
            /** @type {__VLS_StyleScopedClasses['md:block']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (npc.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (npc.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-px" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
            for (const [d] of __VLS_vFor((12))) {
                let __VLS_86;
                /** @ts-ignore @type { | typeof __VLS_components.Diamond} */
                Diamond;
                // @ts-ignore
                const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
                    key: (d),
                    size: (8),
                    ...{ class: "flex-shrink-0" },
                    ...{ class: ((__VLS_ctx.hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0) >= d * 250 ? 'text-accent' : 'text-muted/20') },
                    fill: ((__VLS_ctx.hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0) >= d * 250 ? 'currentColor' : 'none'),
                }));
                const __VLS_88 = __VLS_87({
                    key: (d),
                    size: (8),
                    ...{ class: "flex-shrink-0" },
                    ...{ class: ((__VLS_ctx.hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0) >= d * 250 ? 'text-accent' : 'text-muted/20') },
                    fill: ((__VLS_ctx.hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0) >= d * 250 ? 'currentColor' : 'none'),
                }, ...__VLS_functionalComponentArgsRest(__VLS_87));
                /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                // @ts-ignore
                [hiddenHeartCount, hiddenHeartCount, hiddenHeartCount, hiddenNpcStore, hiddenNpcStore, hiddenNpcStore,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted/50" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
            (__VLS_ctx.hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0);
            // @ts-ignore
            [hiddenNpcStore,];
        }
    }
    if (__VLS_ctx.rumorHiddenNpcs.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: ({ 'mt-4': __VLS_ctx.revealedHiddenNpcs.length > 0 }) },
        });
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "text-muted/60 text-sm mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        for (const [npc] of __VLS_vFor((__VLS_ctx.rumorHiddenNpcs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (npc.id),
                ...{ class: "border border-muted/10 rounded-xs px-2 py-1 text-[10px] text-muted/50" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-muted/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
            if (__VLS_ctx.hiddenNpcStore.getHiddenNpcState(npc.id)?.discoveryPhase === 'rumor') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (__VLS_ctx.getLastDiscoveryLog(npc.id) ?? '似乎有什么隐约的传说……');
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (__VLS_ctx.getLastDiscoveryLog(npc.id) ?? '你曾看到某种异象……');
            }
            // @ts-ignore
            [revealedHiddenNpcs, hiddenNpcStore, rumorHiddenNpcs, rumorHiddenNpcs, getLastDiscoveryLog, getLastDiscoveryLog,];
        }
    }
    if (__VLS_ctx.revealedHiddenNpcs.length === 0 && __VLS_ctx.rumorHiddenNpcs.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-12 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_91;
        /** @ts-ignore @type { | typeof __VLS_components.Sparkles} */
        Sparkles;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent1(__VLS_91, new __VLS_91({
            size: (32),
            ...{ class: "mb-2" },
        }));
        const __VLS_93 = __VLS_92({
            size: (32),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
}
let __VLS_96;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent1(__VLS_96, new __VLS_96({
    name: "panel-fade",
}));
const __VLS_98 = __VLS_97({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
const { default: __VLS_101 } = __VLS_99.slots;
if (__VLS_ctx.selectedHiddenNpc) {
    const __VLS_102 = HiddenNpcModal;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({
        ...{ 'onClose': {} },
        npcId: (__VLS_ctx.selectedHiddenNpc),
    }));
    const __VLS_104 = __VLS_103({
        ...{ 'onClose': {} },
        npcId: (__VLS_ctx.selectedHiddenNpc),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    let __VLS_107;
    const __VLS_108 = {
        /** @type {typeof __VLS_107.close} */
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.selectedHiddenNpc))
                throw 0;
            return __VLS_ctx.selectedHiddenNpc = null;
            // @ts-ignore
            [revealedHiddenNpcs, selectedHiddenNpc, selectedHiddenNpc, selectedHiddenNpc, rumorHiddenNpcs,];
        },
    };
    var __VLS_105;
    var __VLS_106;
}
// @ts-ignore
[];
var __VLS_99;
let __VLS_109;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent1(__VLS_109, new __VLS_109({
    name: "panel-fade",
}));
const __VLS_111 = __VLS_110({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
const { default: __VLS_114 } = __VLS_112.slots;
if (__VLS_ctx.selectedNpc) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedNpc))
                    throw 0;
                return __VLS_ctx.selectedNpc = null;
                // @ts-ignore
                [selectedNpc, selectedNpc,];
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
    (__VLS_ctx.selectedNpcDef?.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted ml-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
    (__VLS_ctx.selectedNpcDef?.role);
    if (__VLS_ctx.selectedNpcState?.married) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-danger border border-danger/30 rounded-xs px-1 ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    }
    else if (__VLS_ctx.selectedNpcState?.dating) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-danger/70 border border-danger/20 rounded-xs px-1 ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger/70']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    }
    else if (__VLS_ctx.selectedNpcState?.zhiji) {
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted/60 mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.selectedNpcDef?.personality);
    const __VLS_115 = Button || Button;
    // @ts-ignore
    const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
        ...{ 'onClick': {} },
    }));
    const __VLS_117 = __VLS_116({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_116));
    let __VLS_120;
    const __VLS_121 = {
        /** @type {typeof __VLS_120.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedNpc))
                throw 0;
            return __VLS_ctx.selectedNpc = null;
            // @ts-ignore
            [selectedNpc, selectedNpcDef, selectedNpcDef, selectedNpcDef, selectedNpcState, selectedNpcState, selectedNpcState,];
        },
    };
    const { default: __VLS_122 } = __VLS_118.slots;
    // @ts-ignore
    [];
    var __VLS_118;
    var __VLS_119;
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
    for (const [h] of __VLS_vFor((10))) {
        let __VLS_123;
        /** @ts-ignore @type { | typeof __VLS_components.Heart} */
        Heart;
        // @ts-ignore
        const __VLS_124 = __VLS_asFunctionalComponent1(__VLS_123, new __VLS_123({
            key: (h),
            size: (12),
            ...{ class: "flex-shrink-0" },
            ...{ class: ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= h * 250 ? 'text-danger' : 'text-muted/20') },
            fill: ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= h * 250 ? 'currentColor' : 'none'),
        }));
        const __VLS_125 = __VLS_124({
            key: (h),
            size: (12),
            ...{ class: "flex-shrink-0" },
            ...{ class: ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= h * 250 ? 'text-danger' : 'text-muted/20') },
            fill: ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= h * 250 ? 'currentColor' : 'none'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_124));
        /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
        // @ts-ignore
        [selectedNpcState, selectedNpcState,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.levelColor(__VLS_ctx.npcStore.getFriendshipLevel(__VLS_ctx.selectedNpc))) },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.selectedNpcState?.friendship ?? 0);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted/40" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    (__VLS_ctx.nextHeartThreshold);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 flex-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] border rounded-xs px-1 flex items-center space-x-0.5" },
        ...{ class: (__VLS_ctx.selectedNpcState?.talkedToday ? 'text-muted/40 border-muted/10' : 'text-success border-success/30') },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
    let __VLS_128;
    /** @ts-ignore @type { | typeof __VLS_components.MessageCircle} */
    MessageCircle;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
        size: (10),
    }));
    const __VLS_130 = __VLS_129({
        size: (10),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.selectedNpcState?.talkedToday ? '已聊天' : '可聊天');
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] border rounded-xs px-1 flex items-center space-x-0.5" },
        ...{ class: (__VLS_ctx.giftTagClass) },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
    let __VLS_133;
    /** @ts-ignore @type { | typeof __VLS_components.Gift} */
    Gift;
    // @ts-ignore
    const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
        size: (10),
    }));
    const __VLS_135 = __VLS_134({
        size: (10),
    }, ...__VLS_functionalComponentArgsRest(__VLS_134));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.giftTagText);
    if (__VLS_ctx.selectedNpcDef?.birthday) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] border border-muted/10 rounded-xs px-1 text-muted flex items-center space-x-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-muted/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
        let __VLS_138;
        /** @ts-ignore @type { | typeof __VLS_components.Cake} */
        Cake;
        // @ts-ignore
        const __VLS_139 = __VLS_asFunctionalComponent1(__VLS_138, new __VLS_138({
            size: (10),
        }));
        const __VLS_140 = __VLS_139({
            size: (10),
        }, ...__VLS_functionalComponentArgsRest(__VLS_139));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.SEASON_NAMES_MAP[__VLS_ctx.selectedNpcDef.birthday.season]);
        (__VLS_ctx.selectedNpcDef.birthday.day);
    }
    if (__VLS_ctx.npcStore.isBirthday(__VLS_ctx.selectedNpc)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-danger border border-danger/30 rounded-xs px-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    }
    if (__VLS_ctx.selectedNpcState && __VLS_ctx.selectedNpcState.triggeredHeartEvents.length > 0) {
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
            ...{ class: "flex space-x-1 flex-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        for (const [eid] of __VLS_vFor((__VLS_ctx.selectedNpcState.triggeredHeartEvents))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (eid),
                ...{ class: "text-xs border border-accent/20 rounded-xs px-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            (__VLS_ctx.getHeartEventTitle(eid));
            // @ts-ignore
            [levelColor, npcStore, npcStore, selectedNpc, selectedNpc, selectedNpcDef, selectedNpcDef, selectedNpcDef, selectedNpcState, selectedNpcState, selectedNpcState, selectedNpcState, selectedNpcState, selectedNpcState, nextHeartThreshold, giftTagClass, giftTagText, SEASON_NAMES_MAP, getHeartEventTitle,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3 flex space-y-2 flex-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    const __VLS_143 = Button || Button;
    // @ts-ignore
    const __VLS_144 = __VLS_asFunctionalComponent1(__VLS_143, new __VLS_143({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
        icon: (__VLS_ctx.MessageCircle),
        disabled: (__VLS_ctx.selectedNpcState?.talkedToday),
    }));
    const __VLS_145 = __VLS_144({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
        icon: (__VLS_ctx.MessageCircle),
        disabled: (__VLS_ctx.selectedNpcState?.talkedToday),
    }, ...__VLS_functionalComponentArgsRest(__VLS_144));
    let __VLS_148;
    const __VLS_149 = {
        /** @type {typeof __VLS_148.click} */
        onClick: (__VLS_ctx.handleTalk),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_150 } = __VLS_146.slots;
    (__VLS_ctx.selectedNpcState?.talkedToday ? '今天已聊过' : '聊天');
    // @ts-ignore
    [selectedNpcState, selectedNpcState, MessageCircle, handleTalk,];
    var __VLS_146;
    var __VLS_147;
    if (__VLS_ctx.selectedNpc && __VLS_ctx.npcStore.hasDailyTip(__VLS_ctx.selectedNpc)) {
        const __VLS_151 = Button || Button;
        // @ts-ignore
        const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-success border-success/40" },
            icon: (__VLS_ctx.Lightbulb),
            disabled: (!!(__VLS_ctx.selectedNpc && __VLS_ctx.npcStore.isTipGivenToday(__VLS_ctx.selectedNpc))),
        }));
        const __VLS_153 = __VLS_152({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-success border-success/40" },
            icon: (__VLS_ctx.Lightbulb),
            disabled: (!!(__VLS_ctx.selectedNpc && __VLS_ctx.npcStore.isTipGivenToday(__VLS_ctx.selectedNpc))),
        }, ...__VLS_functionalComponentArgsRest(__VLS_152));
        let __VLS_156;
        const __VLS_157 = {
            /** @type {typeof __VLS_156.click} */
            onClick: (__VLS_ctx.handleDailyTip),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/40']} */ ;
        const { default: __VLS_158 } = __VLS_154.slots;
        (__VLS_ctx.selectedNpc && __VLS_ctx.npcStore.isTipGivenToday(__VLS_ctx.selectedNpc) ? '今天已提示' : __VLS_ctx.TIP_NPC_LABELS[__VLS_ctx.selectedNpc]);
        // @ts-ignore
        [npcStore, npcStore, npcStore, selectedNpc, selectedNpc, selectedNpc, selectedNpc, selectedNpc, selectedNpc, selectedNpc, Lightbulb, handleDailyTip, TIP_NPC_LABELS,];
        var __VLS_154;
        var __VLS_155;
    }
    if (__VLS_ctx.selectedNpcState?.married) {
        const __VLS_159 = Button || Button;
        // @ts-ignore
        const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-danger border-danger/40" },
        }));
        const __VLS_161 = __VLS_160({
            ...{ 'onClick': {} },
            ...{ class: "w-full text-danger border-danger/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_160));
        let __VLS_164;
        const __VLS_165 = {
            /** @type {typeof __VLS_164.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedNpc))
                    throw 0;
                if (!(__VLS_ctx.selectedNpcState?.married))
                    throw 0;
                return __VLS_ctx.showDivorceConfirm = true;
                // @ts-ignore
                [selectedNpcState, showDivorceConfirm,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
        const { default: __VLS_166 } = __VLS_162.slots;
        // @ts-ignore
        [];
        var __VLS_162;
        var __VLS_163;
    }
    if (__VLS_ctx.npcStore.weddingCountdown > 0 && __VLS_ctx.npcStore.weddingNpcId === __VLS_ctx.selectedNpc) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        (__VLS_ctx.npcStore.weddingCountdown);
    }
    if (__VLS_ctx.selectedNpcDef?.marriageable && !__VLS_ctx.selectedNpcState?.married && __VLS_ctx.selectedNpcDef.gender !== __VLS_ctx.playerStore.gender) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-danger/20 rounded-xs p-2 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger/80 mb-1.5 flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger/80']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_167;
        /** @ts-ignore @type { | typeof __VLS_components.Heart} */
        Heart;
        // @ts-ignore
        const __VLS_168 = __VLS_asFunctionalComponent1(__VLS_167, new __VLS_167({
            size: (12),
        }));
        const __VLS_169 = __VLS_168({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_168));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        if (!__VLS_ctx.selectedNpcState?.dating && !(__VLS_ctx.npcStore.weddingCountdown > 0 && __VLS_ctx.npcStore.weddingNpcId === __VLS_ctx.selectedNpc)) {
            if (__VLS_ctx.npcStore.npcStates.some(s => s.married)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-muted/50 mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
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
                    ...{ class: "text-[10px] flex items-center space-x-1" },
                    ...{ class: ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= 2000 ? 'text-success' : 'text-muted/50') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                if ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= 2000) {
                    let __VLS_172;
                    /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
                    CircleCheck;
                    // @ts-ignore
                    const __VLS_173 = __VLS_asFunctionalComponent1(__VLS_172, new __VLS_172({
                        size: (10),
                    }));
                    const __VLS_174 = __VLS_173({
                        size: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
                }
                else {
                    let __VLS_177;
                    /** @ts-ignore @type { | typeof __VLS_components.Circle} */
                    Circle;
                    // @ts-ignore
                    const __VLS_178 = __VLS_asFunctionalComponent1(__VLS_177, new __VLS_177({
                        size: (10),
                    }));
                    const __VLS_179 = __VLS_178({
                        size: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_178));
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted/40" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
                (__VLS_ctx.selectedNpcState?.friendship ?? 0);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] flex items-center space-x-1" },
                    ...{ class: (__VLS_ctx.inventoryStore.hasItem('silk_ribbon') ? 'text-success' : 'text-muted/50') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                if (__VLS_ctx.inventoryStore.hasItem('silk_ribbon')) {
                    let __VLS_182;
                    /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
                    CircleCheck;
                    // @ts-ignore
                    const __VLS_183 = __VLS_asFunctionalComponent1(__VLS_182, new __VLS_182({
                        size: (10),
                    }));
                    const __VLS_184 = __VLS_183({
                        size: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_183));
                }
                else {
                    let __VLS_187;
                    /** @ts-ignore @type { | typeof __VLS_components.Circle} */
                    Circle;
                    // @ts-ignore
                    const __VLS_188 = __VLS_asFunctionalComponent1(__VLS_187, new __VLS_187({
                        size: (10),
                    }));
                    const __VLS_189 = __VLS_188({
                        size: (10),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_188));
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted/40" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
                const __VLS_192 = Button || Button;
                // @ts-ignore
                const __VLS_193 = __VLS_asFunctionalComponent1(__VLS_192, new __VLS_192({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full text-danger border-danger/40" },
                    icon: (__VLS_ctx.Heart),
                    disabled: (!__VLS_ctx.canStartDating),
                }));
                const __VLS_194 = __VLS_193({
                    ...{ 'onClick': {} },
                    ...{ class: "w-full text-danger border-danger/40" },
                    icon: (__VLS_ctx.Heart),
                    disabled: (!__VLS_ctx.canStartDating),
                }, ...__VLS_functionalComponentArgsRest(__VLS_193));
                let __VLS_197;
                const __VLS_198 = {
                    /** @type {typeof __VLS_197.click} */
                    onClick: (__VLS_ctx.handleStartDating),
                };
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
                const { default: __VLS_199 } = __VLS_195.slots;
                // @ts-ignore
                [npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, selectedNpc, selectedNpc, selectedNpcDef, selectedNpcDef, selectedNpcState, selectedNpcState, selectedNpcState, selectedNpcState, selectedNpcState, playerStore, inventoryStore, inventoryStore, Heart, canStartDating, handleStartDating,];
                var __VLS_195;
                var __VLS_196;
            }
        }
        else if (__VLS_ctx.selectedNpcState?.dating) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-danger/60 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger/60']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            let __VLS_200;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_201 = __VLS_asFunctionalComponent1(__VLS_200, new __VLS_200({
                size: (10),
                ...{ class: "inline" },
            }));
            const __VLS_202 = __VLS_201({
                size: (10),
                ...{ class: "inline" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_201));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-0.5 mb-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] flex items-center space-x-0.5" },
                ...{ class: ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= 2500 ? 'text-success' : 'text-muted/50') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
            if ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= 2500) {
                let __VLS_205;
                /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
                CircleCheck;
                // @ts-ignore
                const __VLS_206 = __VLS_asFunctionalComponent1(__VLS_205, new __VLS_205({
                    size: (10),
                }));
                const __VLS_207 = __VLS_206({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_206));
            }
            else {
                let __VLS_210;
                /** @ts-ignore @type { | typeof __VLS_components.Circle} */
                Circle;
                // @ts-ignore
                const __VLS_211 = __VLS_asFunctionalComponent1(__VLS_210, new __VLS_210({
                    size: (10),
                }));
                const __VLS_212 = __VLS_211({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_211));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted/40" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
            (__VLS_ctx.selectedNpcState?.friendship ?? 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] flex items-center space-x-0.5" },
                ...{ class: (__VLS_ctx.inventoryStore.hasItem('jade_ring') ? 'text-success' : 'text-muted/50') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
            if (__VLS_ctx.inventoryStore.hasItem('jade_ring')) {
                let __VLS_215;
                /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
                CircleCheck;
                // @ts-ignore
                const __VLS_216 = __VLS_asFunctionalComponent1(__VLS_215, new __VLS_215({
                    size: (10),
                }));
                const __VLS_217 = __VLS_216({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_216));
            }
            else {
                let __VLS_220;
                /** @ts-ignore @type { | typeof __VLS_components.Circle} */
                Circle;
                // @ts-ignore
                const __VLS_221 = __VLS_asFunctionalComponent1(__VLS_220, new __VLS_220({
                    size: (10),
                }));
                const __VLS_222 = __VLS_221({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_221));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted/40" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
            const __VLS_225 = Button || Button;
            // @ts-ignore
            const __VLS_226 = __VLS_asFunctionalComponent1(__VLS_225, new __VLS_225({
                ...{ 'onClick': {} },
                ...{ class: "w-full text-danger border-danger/40" },
                icon: (__VLS_ctx.Heart),
                disabled: (!__VLS_ctx.canPropose),
            }));
            const __VLS_227 = __VLS_226({
                ...{ 'onClick': {} },
                ...{ class: "w-full text-danger border-danger/40" },
                icon: (__VLS_ctx.Heart),
                disabled: (!__VLS_ctx.canPropose),
            }, ...__VLS_functionalComponentArgsRest(__VLS_226));
            let __VLS_230;
            const __VLS_231 = {
                /** @type {typeof __VLS_230.click} */
                onClick: (__VLS_ctx.handlePropose),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
            const { default: __VLS_232 } = __VLS_228.slots;
            // @ts-ignore
            [selectedNpcState, selectedNpcState, selectedNpcState, selectedNpcState, inventoryStore, inventoryStore, Heart, canPropose, handlePropose,];
            var __VLS_228;
            var __VLS_229;
        }
    }
    if (__VLS_ctx.selectedNpcDef?.marriageable &&
        !__VLS_ctx.selectedNpcState?.married &&
        !__VLS_ctx.selectedNpcState?.dating &&
        __VLS_ctx.selectedNpcDef.gender === __VLS_ctx.playerStore.gender) {
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
        let __VLS_233;
        /** @ts-ignore @type { | typeof __VLS_components.Heart} */
        Heart;
        // @ts-ignore
        const __VLS_234 = __VLS_asFunctionalComponent1(__VLS_233, new __VLS_233({
            size: (12),
        }));
        const __VLS_235 = __VLS_234({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_234));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        if (__VLS_ctx.selectedNpcState?.zhiji) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-accent/60 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent/60']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (__VLS_ctx.selectedNpcDef.gender === 'male' ? '蓝颜知己' : '红颜知己');
            const __VLS_238 = Button || Button;
            // @ts-ignore
            const __VLS_239 = __VLS_asFunctionalComponent1(__VLS_238, new __VLS_238({
                ...{ 'onClick': {} },
                ...{ class: "w-full text-danger border-danger/40" },
            }));
            const __VLS_240 = __VLS_239({
                ...{ 'onClick': {} },
                ...{ class: "w-full text-danger border-danger/40" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_239));
            let __VLS_243;
            const __VLS_244 = {
                /** @type {typeof __VLS_243.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.selectedNpc))
                        throw 0;
                    if (!(__VLS_ctx.selectedNpcDef?.marriageable &&
                        !__VLS_ctx.selectedNpcState?.married &&
                        !__VLS_ctx.selectedNpcState?.dating &&
                        __VLS_ctx.selectedNpcDef.gender === __VLS_ctx.playerStore.gender))
                        throw 0;
                    if (!(__VLS_ctx.selectedNpcState?.zhiji))
                        throw 0;
                    return __VLS_ctx.showZhijiDissolveConfirm = true;
                    // @ts-ignore
                    [selectedNpcDef, selectedNpcDef, selectedNpcDef, selectedNpcState, selectedNpcState, selectedNpcState, playerStore, showZhijiDissolveConfirm,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
            const { default: __VLS_245 } = __VLS_241.slots;
            // @ts-ignore
            [];
            var __VLS_241;
            var __VLS_242;
        }
        else if (__VLS_ctx.npcStore.npcStates.some(s => s.zhiji)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted/50" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
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
                ...{ class: ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= 2000 ? 'text-success' : 'text-muted/50') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
            if ((__VLS_ctx.selectedNpcState?.friendship ?? 0) >= 2000) {
                let __VLS_246;
                /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
                CircleCheck;
                // @ts-ignore
                const __VLS_247 = __VLS_asFunctionalComponent1(__VLS_246, new __VLS_246({
                    size: (10),
                }));
                const __VLS_248 = __VLS_247({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_247));
            }
            else {
                let __VLS_251;
                /** @ts-ignore @type { | typeof __VLS_components.Circle} */
                Circle;
                // @ts-ignore
                const __VLS_252 = __VLS_asFunctionalComponent1(__VLS_251, new __VLS_251({
                    size: (10),
                }));
                const __VLS_253 = __VLS_252({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_252));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted/40" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
            (__VLS_ctx.selectedNpcState?.friendship ?? 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] flex items-center space-x-0.5" },
                ...{ class: (__VLS_ctx.inventoryStore.hasItem('zhiji_jade') ? 'text-success' : 'text-muted/50') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
            if (__VLS_ctx.inventoryStore.hasItem('zhiji_jade')) {
                let __VLS_256;
                /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
                CircleCheck;
                // @ts-ignore
                const __VLS_257 = __VLS_asFunctionalComponent1(__VLS_256, new __VLS_256({
                    size: (10),
                }));
                const __VLS_258 = __VLS_257({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_257));
            }
            else {
                let __VLS_261;
                /** @ts-ignore @type { | typeof __VLS_components.Circle} */
                Circle;
                // @ts-ignore
                const __VLS_262 = __VLS_asFunctionalComponent1(__VLS_261, new __VLS_261({
                    size: (10),
                }));
                const __VLS_263 = __VLS_262({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_262));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted/40" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
            const __VLS_266 = Button || Button;
            // @ts-ignore
            const __VLS_267 = __VLS_asFunctionalComponent1(__VLS_266, new __VLS_266({
                ...{ 'onClick': {} },
                ...{ class: "w-full text-accent border-accent/40" },
                icon: (__VLS_ctx.Heart),
                disabled: (!__VLS_ctx.canBecomeZhiji),
            }));
            const __VLS_268 = __VLS_267({
                ...{ 'onClick': {} },
                ...{ class: "w-full text-accent border-accent/40" },
                icon: (__VLS_ctx.Heart),
                disabled: (!__VLS_ctx.canBecomeZhiji),
            }, ...__VLS_functionalComponentArgsRest(__VLS_267));
            let __VLS_271;
            const __VLS_272 = {
                /** @type {typeof __VLS_271.click} */
                onClick: (__VLS_ctx.handleBecomeZhiji),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/40']} */ ;
            const { default: __VLS_273 } = __VLS_269.slots;
            // @ts-ignore
            [npcStore, selectedNpcState, selectedNpcState, selectedNpcState, inventoryStore, inventoryStore, Heart, canBecomeZhiji, handleBecomeZhiji,];
            var __VLS_269;
            var __VLS_270;
        }
    }
    if (__VLS_ctx.showZhijiDissolveConfirm) {
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
        (__VLS_ctx.selectedNpcDef?.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_274 = Button || Button;
        // @ts-ignore
        const __VLS_275 = __VLS_asFunctionalComponent1(__VLS_274, new __VLS_274({
            ...{ 'onClick': {} },
            ...{ class: "text-danger" },
        }));
        const __VLS_276 = __VLS_275({
            ...{ 'onClick': {} },
            ...{ class: "text-danger" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_275));
        let __VLS_279;
        const __VLS_280 = {
            /** @type {typeof __VLS_279.click} */
            onClick: (__VLS_ctx.handleDissolveZhiji),
        };
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        const { default: __VLS_281 } = __VLS_277.slots;
        // @ts-ignore
        [selectedNpcDef, showZhijiDissolveConfirm, handleDissolveZhiji,];
        var __VLS_277;
        var __VLS_278;
        const __VLS_282 = Button || Button;
        // @ts-ignore
        const __VLS_283 = __VLS_asFunctionalComponent1(__VLS_282, new __VLS_282({
            ...{ 'onClick': {} },
        }));
        const __VLS_284 = __VLS_283({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_283));
        let __VLS_287;
        const __VLS_288 = {
            /** @type {typeof __VLS_287.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedNpc))
                    throw 0;
                if (!(__VLS_ctx.showZhijiDissolveConfirm))
                    throw 0;
                return __VLS_ctx.showZhijiDissolveConfirm = false;
                // @ts-ignore
                [showZhijiDissolveConfirm,];
            },
        };
        const { default: __VLS_289 } = __VLS_285.slots;
        // @ts-ignore
        [];
        var __VLS_285;
        var __VLS_286;
    }
    if (__VLS_ctx.showDivorceConfirm) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "game-panel mb-3 border-danger/40" },
        });
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.selectedNpcDef?.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_290 = Button || Button;
        // @ts-ignore
        const __VLS_291 = __VLS_asFunctionalComponent1(__VLS_290, new __VLS_290({
            ...{ 'onClick': {} },
            ...{ class: "text-danger" },
        }));
        const __VLS_292 = __VLS_291({
            ...{ 'onClick': {} },
            ...{ class: "text-danger" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_291));
        let __VLS_295;
        const __VLS_296 = {
            /** @type {typeof __VLS_295.click} */
            onClick: (__VLS_ctx.handleDivorce),
        };
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        const { default: __VLS_297 } = __VLS_293.slots;
        // @ts-ignore
        [selectedNpcDef, showDivorceConfirm, handleDivorce,];
        var __VLS_293;
        var __VLS_294;
        const __VLS_298 = Button || Button;
        // @ts-ignore
        const __VLS_299 = __VLS_asFunctionalComponent1(__VLS_298, new __VLS_298({
            ...{ 'onClick': {} },
        }));
        const __VLS_300 = __VLS_299({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_299));
        let __VLS_303;
        const __VLS_304 = {
            /** @type {typeof __VLS_303.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedNpc))
                    throw 0;
                if (!(__VLS_ctx.showDivorceConfirm))
                    throw 0;
                return __VLS_ctx.showDivorceConfirm = false;
                // @ts-ignore
                [showDivorceConfirm,];
            },
        };
        const { default: __VLS_305 } = __VLS_301.slots;
        // @ts-ignore
        [];
        var __VLS_301;
        var __VLS_302;
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
        (__VLS_ctx.selectedNpcDef?.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.dialogueText);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.npcStore.isBirthday(__VLS_ctx.selectedNpc)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    }
    if (__VLS_ctx.selectedNpcState?.giftedToday) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_306;
        /** @ts-ignore @type { | typeof __VLS_components.Gift} */
        Gift;
        // @ts-ignore
        const __VLS_307 = __VLS_asFunctionalComponent1(__VLS_306, new __VLS_306({
            size: (32),
            ...{ class: "mb-2" },
        }));
        const __VLS_308 = __VLS_307({
            size: (32),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_307));
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    else if ((__VLS_ctx.selectedNpcState?.giftsThisWeek ?? 0) >= 2) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_311;
        /** @ts-ignore @type { | typeof __VLS_components.Gift} */
        Gift;
        // @ts-ignore
        const __VLS_312 = __VLS_asFunctionalComponent1(__VLS_311, new __VLS_311({
            size: (32),
            ...{ class: "mb-2" },
        }));
        const __VLS_313 = __VLS_312({
            size: (32),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_312));
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
        for (const [item] of __VLS_vFor((__VLS_ctx.giftableItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.selectedNpc))
                            throw 0;
                        if (!!(__VLS_ctx.selectedNpcState?.giftedToday))
                            throw 0;
                        if (!!((__VLS_ctx.selectedNpcState?.giftsThisWeek ?? 0) >= 2))
                            throw 0;
                        return __VLS_ctx.activeGiftKey = item.itemId + ':' + item.quality;
                        // @ts-ignore
                        [npcStore, selectedNpc, selectedNpcDef, selectedNpcState, selectedNpcState, dialogueText, dialogueText, giftableItems, activeGiftKey,];
                    } },
                key: (`${item.itemId}_${item.quality ?? 'normal'}`),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5 mr-1" },
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
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
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
            if (__VLS_ctx.getGiftPreference(item.itemId) !== 'neutral') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px]" },
                    ...{ class: (__VLS_ctx.GIFT_PREF_CLASS[__VLS_ctx.getGiftPreference(item.itemId)]) },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (__VLS_ctx.GIFT_PREF_LABELS[__VLS_ctx.getGiftPreference(item.itemId)]);
            }
            let __VLS_316;
            /** @ts-ignore @type { | typeof __VLS_components.Gift} */
            Gift;
            // @ts-ignore
            const __VLS_317 = __VLS_asFunctionalComponent1(__VLS_316, new __VLS_316({
                size: (12),
                ...{ class: "text-muted" },
            }));
            const __VLS_318 = __VLS_317({
                size: (12),
                ...{ class: "text-muted" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_317));
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            // @ts-ignore
            [qualityTextClass, getItemById, getGiftPreference, getGiftPreference, getGiftPreference, GIFT_PREF_CLASS, GIFT_PREF_LABELS,];
        }
        if (__VLS_ctx.giftableItems.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            let __VLS_321;
            /** @ts-ignore @type { | typeof __VLS_components.Package} */
            Package;
            // @ts-ignore
            const __VLS_322 = __VLS_asFunctionalComponent1(__VLS_321, new __VLS_321({
                size: (32),
                ...{ class: "mb-2" },
            }));
            const __VLS_323 = __VLS_322({
                size: (32),
                ...{ class: "mb-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_322));
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        }
    }
    let __VLS_326;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_327 = __VLS_asFunctionalComponent1(__VLS_326, new __VLS_326({
        name: "panel-fade",
    }));
    const __VLS_328 = __VLS_327({
        name: "panel-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_327));
    const { default: __VLS_331 } = __VLS_329.slots;
    if (__VLS_ctx.activeGiftItem && __VLS_ctx.activeGiftDef) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.selectedNpc))
                        throw 0;
                    if (!(__VLS_ctx.activeGiftItem && __VLS_ctx.activeGiftDef))
                        throw 0;
                    return __VLS_ctx.activeGiftKey = null;
                    // @ts-ignore
                    [giftableItems, activeGiftKey, activeGiftItem, activeGiftDef,];
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
                    if (!(__VLS_ctx.selectedNpc))
                        throw 0;
                    if (!(__VLS_ctx.activeGiftItem && __VLS_ctx.activeGiftDef))
                        throw 0;
                    return __VLS_ctx.activeGiftKey = null;
                    // @ts-ignore
                    [activeGiftKey,];
                } },
            ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
        let __VLS_332;
        /** @ts-ignore @type { | typeof __VLS_components.X} */
        X;
        // @ts-ignore
        const __VLS_333 = __VLS_asFunctionalComponent1(__VLS_332, new __VLS_332({
            size: (14),
        }));
        const __VLS_334 = __VLS_333({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_333));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm mb-2 pr-6" },
            ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.activeGiftItem.quality, 'text-accent')) },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['pr-6']} */ ;
        (__VLS_ctx.activeGiftDef.name);
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
        (__VLS_ctx.activeGiftDef.description);
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
        (__VLS_ctx.activeGiftItem.quantity);
        if (__VLS_ctx.activeGiftItem.quality !== 'normal') {
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
                ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.activeGiftItem.quality)) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.QUALITY_NAMES[__VLS_ctx.activeGiftItem.quality]);
        }
        if (__VLS_ctx.activeGiftReaction) {
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
            (__VLS_ctx.selectedNpcDef?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.activeGiftReaction.className) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.activeGiftReaction.text);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        const __VLS_337 = Button || Button;
        // @ts-ignore
        const __VLS_338 = __VLS_asFunctionalComponent1(__VLS_337, new __VLS_337({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Gift),
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_339 = __VLS_338({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Gift),
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_338));
        let __VLS_342;
        const __VLS_343 = {
            /** @type {typeof __VLS_342.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedNpc))
                    throw 0;
                if (!(__VLS_ctx.activeGiftItem && __VLS_ctx.activeGiftDef))
                    throw 0;
                return __VLS_ctx.handleGift(__VLS_ctx.activeGiftItem.itemId, __VLS_ctx.activeGiftItem.quality);
                // @ts-ignore
                [selectedNpcDef, qualityTextClass, qualityTextClass, activeGiftItem, activeGiftItem, activeGiftItem, activeGiftItem, activeGiftItem, activeGiftItem, activeGiftItem, activeGiftDef, activeGiftDef, QUALITY_NAMES, activeGiftReaction, activeGiftReaction, activeGiftReaction, Gift, handleGift,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_344 } = __VLS_340.slots;
        (__VLS_ctx.selectedNpcDef?.name);
        // @ts-ignore
        [selectedNpcDef,];
        var __VLS_340;
        var __VLS_341;
    }
    // @ts-ignore
    [];
    var __VLS_329;
}
// @ts-ignore
[];
var __VLS_112;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
