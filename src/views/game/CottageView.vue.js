/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from 'vue';
import { ArrowUp, Calendar, Gift, Hammer, Home, Heart, MessageCircle, UserPlus, Users, Wine, X } from 'lucide-vue-next';
import { useCookingStore } from '@/stores/useCookingStore';
import { useGameStore } from '@/stores/useGameStore';
import { useHomeStore } from '@/stores/useHomeStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useNpcStore } from '@/stores/useNpcStore';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { SEASON_NAMES } from '@/stores/useGameStore';
import { getCombinedItemCount } from '@/composables/useCombinedInventory';
import { getItemById, getNpcById, NPCS } from '@/data';
import { SEASON_EVENTS } from '@/data/events';
import { ACTION_TIME_COSTS, WEEKDAYS, WEEKDAY_NAMES } from '@/data/timeConstants';
import { addLog } from '@/composables/useGameLog';
import { showChildProposal, triggerHeartEvent } from '@/composables/useDialogs';
import { handleEndDay } from '@/composables/useEndDay';
import Button from '@/components/game/Button.vue';
const homeStore = useHomeStore();
const inventoryStore = useInventoryStore();
const gameStore = useGameStore();
const npcStore = useNpcStore();
const playerStore = usePlayerStore();
const releaseConfirmChildId = ref(null);
const showUpgradeModal = ref(false);
const showAgingModal = ref(false);
const showCalendarModal = ref(false);
const showSpouseGiftModal = ref(false);
const showHireModal = ref(false);
const selectedHireTask = ref('water');
const hireConfirmNpcId = ref(null);
const dismissConfirmNpcId = ref(null);
const removeAgingConfirmIdx = ref(null);
const showCellarUpgradeModal = ref(false);
const removeAgingConfirmSlot = computed(() => removeAgingConfirmIdx.value !== null ? (homeStore.cellarSlots[removeAgingConfirmIdx.value] ?? null) : null);
const hireableNpcs = computed(() => npcStore.getHireableNpcs());
const currentHelpers = computed(() => npcStore.hiredHelpers);
const hireConfirmNpc = computed(() => (hireConfirmNpcId.value ? getNpcById(hireConfirmNpcId.value) : null));
const handleHire = (npcId) => {
    const result = npcStore.hireHelper(npcId, selectedHireTask.value);
    addLog(result.message);
    if (result.success) {
        hireConfirmNpcId.value = null;
        showHireModal.value = false;
    }
};
const closeHireModal = () => {
    showHireModal.value = false;
    hireConfirmNpcId.value = null;
};
const selectHireTask = (task) => {
    selectedHireTask.value = task;
    hireConfirmNpcId.value = null;
};
const handleDismiss = (npcId) => {
    const result = npcStore.dismissHelper(npcId);
    addLog(result.message);
    dismissConfirmNpcId.value = null;
};
// === 配偶互动 ===
const spouseState = computed(() => npcStore.getSpouse());
const spouseDef = computed(() => (spouseState.value ? getNpcById(spouseState.value.npcId) : null));
const spouseDialogue = ref(null);
const handleSpouseTalk = () => {
    if (!spouseState.value)
        return;
    if (gameStore.isPastBedtime) {
        addLog('太晚了，该休息了。');
        handleEndDay();
        return;
    }
    const result = npcStore.talkTo(spouseState.value.npcId);
    if (result) {
        spouseDialogue.value = result.message;
        addLog(`与${spouseDef.value?.name}聊天。(+${result.friendshipGain}好感)`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.talk);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut) {
            handleEndDay();
            return;
        }
        const heartEvent = npcStore.checkHeartEvent(spouseState.value.npcId);
        if (heartEvent)
            triggerHeartEvent(heartEvent);
    }
};
const getSpouseGiftPref = (itemId) => {
    if (!spouseDef.value)
        return 'neutral';
    if (spouseDef.value.lovedItems.includes(itemId))
        return 'loved';
    if (spouseDef.value.likedItems.includes(itemId))
        return 'liked';
    if (spouseDef.value.hatedItems.includes(itemId))
        return 'hated';
    return 'neutral';
};
const GIFT_PREF_LABELS = { loved: '最爱', liked: '喜欢', hated: '讨厌', neutral: '' };
const GIFT_PREF_CLASS = { loved: 'text-danger', liked: 'text-success', hated: 'text-muted', neutral: '' };
const GIFT_PREF_ORDER = { loved: 0, liked: 1, neutral: 2, hated: 3 };
const spouseGiftableItems = computed(() => {
    const filtered = inventoryStore.items.filter(i => {
        const def = getItemById(i.itemId);
        return def && def.category !== 'seed';
    });
    if (!spouseDef.value)
        return filtered;
    return [...filtered].sort((a, b) => GIFT_PREF_ORDER[getSpouseGiftPref(a.itemId)] - GIFT_PREF_ORDER[getSpouseGiftPref(b.itemId)]);
});
const handleSpouseGift = (itemId, quality) => {
    if (!spouseState.value)
        return;
    const cookingStore = useCookingStore();
    const cookingGiftBonus = cookingStore.activeBuff?.type === 'giftBonus' ? cookingStore.activeBuff.value : 1;
    const ringGiftBonus = inventoryStore.getRingEffectValue('gift_friendship');
    const giftMultiplier = cookingGiftBonus * (1 + ringGiftBonus);
    const result = npcStore.giveGift(spouseState.value.npcId, itemId, giftMultiplier, quality);
    if (result) {
        const itemName = getItemById(itemId)?.name ?? itemId;
        const name = spouseDef.value?.name;
        if (result.gain > 0) {
            addLog(`送给${name}${itemName}，${name}觉得${result.reaction}。(+${result.gain}好感)`);
        }
        else if (result.gain < 0) {
            addLog(`送给${name}${itemName}，${name}${result.reaction}这个……(${result.gain}好感)`);
        }
        else {
            addLog(`送给${name}${itemName}，${name}觉得${result.reaction}。`);
        }
        showSpouseGiftModal.value = false;
        const heartEvent = npcStore.checkHeartEvent(spouseState.value.npcId);
        if (heartEvent)
            triggerHeartEvent(heartEvent);
    }
};
const qualityTextClass = (q) => {
    if (q === 'fine')
        return 'text-quality-fine';
    if (q === 'excellent')
        return 'text-quality-excellent';
    if (q === 'supreme')
        return 'text-quality-supreme';
    return '';
};
const CHILD_STAGE_NAMES = {
    baby: '婴儿',
    toddler: '幼儿',
    child: '孩童',
    teen: '少年'
};
const PREGNANCY_STAGE_LABELS = {
    early: '初期（需要营养）',
    mid: '中期（需要陪伴）',
    late: '后期（需要休息）',
    ready: '待产期（准备迎接）'
};
const STAGE_TIPS = {
    early: '孕初期需要注意营养，送些食物或补品效果最好。',
    mid: '孕中期需要更多陪伴，多聊天可以大幅提升安产率。',
    late: '孕后期要注意休息，让配偶好好休养。',
    ready: '即将临盆，请选择接生方式并做好最后的准备。'
};
const MEDICAL_LABELS = {
    normal: '普通接生',
    advanced: '高级接生',
    luxury: '豪华接生'
};
const AGEABLE_ITEMS = ['watermelon_wine', 'osmanthus_wine', 'peach_wine', 'jujube_wine', 'corn_wine', 'rice_vinegar'];
// === 日历 ===
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const calendarSeason = ref(gameStore.season);
const selectedCalendarDay = ref(null);
const calendarDays = computed(() => {
    const s = calendarSeason.value;
    const entries = [];
    for (let d = 1; d <= 28; d++) {
        const festivals = SEASON_EVENTS.filter(e => e.season === s && e.day === d).map(e => ({ name: e.name, description: e.description }));
        const birthdays = NPCS.filter(npc => npc.birthday?.season === s && npc.birthday?.day === d).map(npc => ({ npcName: npc.name }));
        entries.push({ day: d, festivals, birthdays, isToday: s === gameStore.season && d === gameStore.day });
    }
    return entries;
});
const selectedDayEntry = computed(() => {
    if (selectedCalendarDay.value === null)
        return null;
    return calendarDays.value[selectedCalendarDay.value - 1] ?? null;
});
const handleSelectSeason = (s) => {
    calendarSeason.value = s;
    selectedCalendarDay.value = null;
};
const handleSelectDay = (entry) => {
    if (entry.festivals.length > 0 || entry.birthdays.length > 0) {
        selectedCalendarDay.value = selectedCalendarDay.value === entry.day ? null : entry.day;
    }
};
const currentBenefit = computed(() => {
    switch (homeStore.farmhouseLevel) {
        case 0:
            return '简陋的茅屋。';
        case 1:
            return '厨房升级，烹饪恢复+20%。';
        case 2:
            return '宅院扩建，每晚额外恢复10%体力。';
        case 3:
            return '地下酒窖开放，可陈酿美酒提升品质。';
        default:
            return '';
    }
});
const canUpgradeFarmhouse = computed(() => {
    const upgrade = homeStore.nextUpgrade;
    if (!upgrade)
        return false;
    if (playerStore.money < upgrade.cost)
        return false;
    return upgrade.materialCost.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity);
});
const ageableInInventory = computed(() => {
    return inventoryStore.items.filter(inv => AGEABLE_ITEMS.includes(inv.itemId));
});
const getItemName = (itemId) => {
    return getItemById(itemId)?.name ?? itemId;
};
const getChildName = (childId) => {
    return npcStore.children.find(c => c.id === childId)?.name ?? '孩子';
};
// === 操作处理 ===
const handleUpgradeFromModal = () => {
    const upgrade = homeStore.nextUpgrade;
    if (!upgrade)
        return;
    if (homeStore.upgradeFarmhouse()) {
        addLog(`农舍升级为「${upgrade.name}」！${upgrade.description}`);
        showUpgradeModal.value = false;
    }
    else {
        addLog('铜钱或材料不足，无法升级。');
    }
};
const handleInteractChild = (childId) => {
    const result = npcStore.interactWithChild(childId);
    if (result) {
        addLog(result.message);
        if (result.item) {
            inventoryStore.addItem(result.item);
            const itemDef = getItemById(result.item);
            addLog(`获得了${itemDef?.name ?? result.item}！`);
        }
    }
};
const handleReleaseChild = () => {
    if (releaseConfirmChildId.value === null)
        return;
    const result = npcStore.releaseChild(releaseConfirmChildId.value);
    addLog(result.message);
    releaseConfirmChildId.value = null;
};
const showChildProposalDialog = () => {
    showChildProposal();
};
const handlePregnancyCare = (action) => {
    const result = npcStore.performPregnancyCare(action);
    addLog(result.message);
    if (result.careGain > 0)
        addLog(`安产率 +${result.careGain}%`);
};
const handleChooseMedical = (plan) => {
    const result = npcStore.chooseMedicalPlan(plan);
    addLog(result.message);
};
const handleStartAgingFromModal = (itemId, quality) => {
    if (homeStore.startAging(itemId, quality)) {
        const name = getItemName(itemId);
        addLog(`将${name}放入酒窖陈酿。`);
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.aging);
        if (tr.message)
            addLog(tr.message);
        if (tr.passedOut)
            handleEndDay();
    }
    else {
        addLog('无法放入酒窖（已满或物品不可陈酿）。');
    }
    // 酒窖满或无剩余可陈酿物品时关闭弹窗
    if (homeStore.cellarSlots.length >= homeStore.cellarMaxSlots || ageableInInventory.value.length === 0) {
        showAgingModal.value = false;
    }
};
const handleRemoveAging = (index) => {
    // 取出前先记录剩余天数
    const slotBeforeRemove = homeStore.cellarSlots[index];
    const remainingDays = slotBeforeRemove?.daysAging ?? 0;
    const result = homeStore.removeAging(index);
    if (result) {
        inventoryStore.addItem(result.itemId, 1, result.quality);
        const name = getItemName(result.itemId);
        const totalDays = result.upgradeCount * 7 + remainingDays;
        let msg = `从酒窖取出了${name}`;
        if (result.addedValue > 0) {
            msg += `（陈酿${totalDays}天，增值+${result.addedValue}文）`;
        }
        addLog(msg + '。');
        // 满1年点亮图鉴
        if (result.upgradeCount >= 16) {
            const achievementStore = useAchievementStore();
            achievementStore.discoverItem('aged_' + result.itemId);
            addLog(`点亮了${name}陈酿图鉴！`);
        }
    }
    removeAgingConfirmIdx.value = null;
};
const canUpgradeCellar = computed(() => {
    const upgrade = homeStore.nextCellarUpgrade;
    if (!upgrade)
        return false;
    if (playerStore.money < upgrade.cost)
        return false;
    return upgrade.materialCost.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity);
});
const handleUpgradeCellar = () => {
    const upgrade = homeStore.nextCellarUpgrade;
    if (!upgrade)
        return;
    if (homeStore.upgradeCellar()) {
        addLog(`酒窖升级为「${upgrade.name}」！每次增值${upgrade.valuePerCycle}文，最大容量${upgrade.maxSlots}个。`);
        showCellarUpgradeModal.value = false;
    }
    else {
        addLog('铜钱或材料不足，无法升级酒窖。');
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
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3 flex items-center justify-between" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
const __VLS_0 = (__VLS_ctx.npcStore.getSpouse() ? __VLS_ctx.Heart : __VLS_ctx.Home);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.showCalendarModal = true;
            // @ts-ignore
            [npcStore, Heart, Home, showCalendarModal,];
        } },
    ...{ class: "text-muted hover:text-accent transition-colors" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.Calendar} */
Calendar;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    size: (14),
}));
const __VLS_7 = __VLS_6({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 mb-4" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between mb-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.homeStore.farmhouseName);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.homeStore.farmhouseLevel);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
(__VLS_ctx.currentBenefit);
if (__VLS_ctx.homeStore.nextUpgrade) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.homeStore.nextUpgrade))
                    throw 0;
                return __VLS_ctx.showUpgradeModal = true;
                // @ts-ignore
                [homeStore, homeStore, homeStore, currentBenefit, showUpgradeModal,];
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
    (__VLS_ctx.homeStore.nextUpgrade.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent whitespace-nowrap" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    (__VLS_ctx.homeStore.nextUpgrade.cost);
}
if (__VLS_ctx.npcStore.getSpouse()) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3 mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_10;
    /** @ts-ignore @type { | typeof __VLS_components.Users} */
    Users;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_12 = __VLS_11({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.spouseDef?.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    let __VLS_15;
    /** @ts-ignore @type { | typeof __VLS_components.Heart} */
    Heart;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
        size: (10),
        ...{ class: "inline" },
    }));
    const __VLS_17 = __VLS_16({
        size: (10),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    if (__VLS_ctx.spouseDialogue) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2 mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-accent mb-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
        (__VLS_ctx.spouseDef?.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.spouseDialogue);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    const __VLS_20 = Button || Button;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-0.5" },
        icon: (__VLS_ctx.MessageCircle),
        iconSize: (10),
        disabled: (__VLS_ctx.spouseState?.talkedToday),
    }));
    const __VLS_22 = __VLS_21({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-0.5" },
        icon: (__VLS_ctx.MessageCircle),
        iconSize: (10),
        disabled: (__VLS_ctx.spouseState?.talkedToday),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    let __VLS_25;
    const __VLS_26 = {
        /** @type {typeof __VLS_25.click} */
        onClick: (__VLS_ctx.handleSpouseTalk),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    const { default: __VLS_27 } = __VLS_23.slots;
    (__VLS_ctx.spouseState?.talkedToday ? '已聊天' : '聊天');
    // @ts-ignore
    [npcStore, homeStore, homeStore, spouseDef, spouseDef, spouseDialogue, spouseDialogue, MessageCircle, spouseState, spouseState, handleSpouseTalk,];
    var __VLS_23;
    var __VLS_24;
    const __VLS_28 = Button || Button;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-0.5" },
        icon: (__VLS_ctx.Gift),
        iconSize: (10),
        disabled: (__VLS_ctx.spouseState?.giftedToday || (__VLS_ctx.spouseState?.giftsThisWeek ?? 0) >= 2),
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center py-0.5" },
        icon: (__VLS_ctx.Gift),
        iconSize: (10),
        disabled: (__VLS_ctx.spouseState?.giftedToday || (__VLS_ctx.spouseState?.giftsThisWeek ?? 0) >= 2),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_33;
    const __VLS_34 = {
        /** @type {typeof __VLS_33.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.npcStore.getSpouse()))
                throw 0;
            return __VLS_ctx.showSpouseGiftModal = true;
            // @ts-ignore
            [spouseState, spouseState, Gift, showSpouseGiftModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    const { default: __VLS_35 } = __VLS_31.slots;
    (__VLS_ctx.spouseState?.giftedToday ? '已送礼' : (__VLS_ctx.spouseState?.giftsThisWeek ?? 0) >= 2 ? '本周已满' : '送礼');
    // @ts-ignore
    [spouseState, spouseState,];
    var __VLS_31;
    var __VLS_32;
    if (__VLS_ctx.npcStore.childProposalPending) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/30 rounded-xs p-2 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        const __VLS_36 = Button || Button;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_38 = __VLS_37({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        let __VLS_41;
        const __VLS_42 = {
            /** @type {typeof __VLS_41.click} */
            onClick: (__VLS_ctx.showChildProposalDialog),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_43 } = __VLS_39.slots;
        // @ts-ignore
        [npcStore, showChildProposalDialog,];
        var __VLS_39;
        var __VLS_40;
    }
    if (__VLS_ctx.npcStore.pregnancy) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-success/20 rounded-xs p-2 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-success mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.PREGNANCY_STAGE_LABELS[__VLS_ctx.npcStore.pregnancy.stage]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1 mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted w-8 shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
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
            ...{ class: "h-full rounded-xs bg-success transition-all" },
            ...{ style: ({ width: Math.floor((__VLS_ctx.npcStore.pregnancy.daysInStage / __VLS_ctx.npcStore.pregnancy.stageDays) * 100) + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        (__VLS_ctx.npcStore.pregnancy.daysInStage);
        (__VLS_ctx.npcStore.pregnancy.stageDays);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted w-8 shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
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
            ...{ class: (__VLS_ctx.npcStore.pregnancy.careScore >= 70 ? 'bg-success' : __VLS_ctx.npcStore.pregnancy.careScore >= 40 ? 'bg-accent' : 'bg-danger') },
            ...{ style: ({ width: __VLS_ctx.npcStore.pregnancy.careScore + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        (__VLS_ctx.npcStore.pregnancy.careScore);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/60 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.STAGE_TIPS[__VLS_ctx.npcStore.pregnancy.stage]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-2 gap-1 mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        const __VLS_44 = Button || Button;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
            disabled: (__VLS_ctx.npcStore.pregnancy.giftedForPregnancy),
        }));
        const __VLS_46 = __VLS_45({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
            disabled: (__VLS_ctx.npcStore.pregnancy.giftedForPregnancy),
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        let __VLS_49;
        const __VLS_50 = {
            /** @type {typeof __VLS_49.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.npcStore.getSpouse()))
                    throw 0;
                if (!(__VLS_ctx.npcStore.pregnancy))
                    throw 0;
                return __VLS_ctx.handlePregnancyCare('gift');
                // @ts-ignore
                [npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, PREGNANCY_STAGE_LABELS, STAGE_TIPS, handlePregnancyCare,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_51 } = __VLS_47.slots;
        (__VLS_ctx.npcStore.pregnancy.giftedForPregnancy ? '已送礼' : '送礼物');
        // @ts-ignore
        [npcStore,];
        var __VLS_47;
        var __VLS_48;
        const __VLS_52 = Button || Button;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
            disabled: (__VLS_ctx.npcStore.pregnancy.companionToday),
        }));
        const __VLS_54 = __VLS_53({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
            disabled: (__VLS_ctx.npcStore.pregnancy.companionToday),
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        let __VLS_57;
        const __VLS_58 = {
            /** @type {typeof __VLS_57.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.npcStore.getSpouse()))
                    throw 0;
                if (!(__VLS_ctx.npcStore.pregnancy))
                    throw 0;
                return __VLS_ctx.handlePregnancyCare('companion');
                // @ts-ignore
                [npcStore, handlePregnancyCare,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_59 } = __VLS_55.slots;
        (__VLS_ctx.npcStore.pregnancy.companionToday ? '已陪伴' : '陪伴聊天');
        // @ts-ignore
        [npcStore,];
        var __VLS_55;
        var __VLS_56;
        const __VLS_60 = Button || Button;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
        }));
        const __VLS_62 = __VLS_61({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        let __VLS_65;
        const __VLS_66 = {
            /** @type {typeof __VLS_65.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.npcStore.getSpouse()))
                    throw 0;
                if (!(__VLS_ctx.npcStore.pregnancy))
                    throw 0;
                return __VLS_ctx.handlePregnancyCare('supplement');
                // @ts-ignore
                [handlePregnancyCare,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_67 } = __VLS_63.slots;
        // @ts-ignore
        [];
        var __VLS_63;
        var __VLS_64;
        const __VLS_68 = Button || Button;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
            disabled: (__VLS_ctx.npcStore.pregnancy.caredToday),
        }));
        const __VLS_70 = __VLS_69({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-1 text-[10px] justify-center" },
            disabled: (__VLS_ctx.npcStore.pregnancy.caredToday),
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        let __VLS_73;
        const __VLS_74 = {
            /** @type {typeof __VLS_73.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.npcStore.getSpouse()))
                    throw 0;
                if (!(__VLS_ctx.npcStore.pregnancy))
                    throw 0;
                return __VLS_ctx.handlePregnancyCare('rest');
                // @ts-ignore
                [npcStore, handlePregnancyCare,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_75 } = __VLS_71.slots;
        (__VLS_ctx.npcStore.pregnancy.caredToday ? '已休息' : '安排休息');
        // @ts-ignore
        [npcStore,];
        var __VLS_71;
        var __VLS_72;
        if (__VLS_ctx.npcStore.pregnancy.stage === 'ready') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2 mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-accent mb-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            if (!__VLS_ctx.npcStore.pregnancy.medicalPlan) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-col space-y-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                const __VLS_76 = Button || Button;
                // @ts-ignore
                const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0.5 px-1 text-[10px] w-full justify-center" },
                }));
                const __VLS_78 = __VLS_77({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0.5 px-1 text-[10px] w-full justify-center" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_77));
                let __VLS_81;
                const __VLS_82 = {
                    /** @type {typeof __VLS_81.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.npcStore.getSpouse()))
                            throw 0;
                        if (!(__VLS_ctx.npcStore.pregnancy))
                            throw 0;
                        if (!(__VLS_ctx.npcStore.pregnancy.stage === 'ready'))
                            throw 0;
                        if (!(!__VLS_ctx.npcStore.pregnancy.medicalPlan))
                            throw 0;
                        return __VLS_ctx.handleChooseMedical('normal');
                        // @ts-ignore
                        [npcStore, npcStore, handleChooseMedical,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_83 } = __VLS_79.slots;
                // @ts-ignore
                [];
                var __VLS_79;
                var __VLS_80;
                const __VLS_84 = Button || Button;
                // @ts-ignore
                const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0.5 px-1 text-[10px] w-full justify-center" },
                }));
                const __VLS_86 = __VLS_85({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0.5 px-1 text-[10px] w-full justify-center" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_85));
                let __VLS_89;
                const __VLS_90 = {
                    /** @type {typeof __VLS_89.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.npcStore.getSpouse()))
                            throw 0;
                        if (!(__VLS_ctx.npcStore.pregnancy))
                            throw 0;
                        if (!(__VLS_ctx.npcStore.pregnancy.stage === 'ready'))
                            throw 0;
                        if (!(!__VLS_ctx.npcStore.pregnancy.medicalPlan))
                            throw 0;
                        return __VLS_ctx.handleChooseMedical('advanced');
                        // @ts-ignore
                        [handleChooseMedical,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_91 } = __VLS_87.slots;
                // @ts-ignore
                [];
                var __VLS_87;
                var __VLS_88;
                const __VLS_92 = Button || Button;
                // @ts-ignore
                const __VLS_93 = __VLS_asFunctionalComponent1(__VLS_92, new __VLS_92({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0.5 px-1 text-[10px] w-full justify-center text-accent" },
                }));
                const __VLS_94 = __VLS_93({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0.5 px-1 text-[10px] w-full justify-center text-accent" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_93));
                let __VLS_97;
                const __VLS_98 = {
                    /** @type {typeof __VLS_97.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.npcStore.getSpouse()))
                            throw 0;
                        if (!(__VLS_ctx.npcStore.pregnancy))
                            throw 0;
                        if (!(__VLS_ctx.npcStore.pregnancy.stage === 'ready'))
                            throw 0;
                        if (!(!__VLS_ctx.npcStore.pregnancy.medicalPlan))
                            throw 0;
                        return __VLS_ctx.handleChooseMedical('luxury');
                        // @ts-ignore
                        [handleChooseMedical,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                const { default: __VLS_99 } = __VLS_95.slots;
                // @ts-ignore
                [];
                var __VLS_95;
                var __VLS_96;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                (__VLS_ctx.MEDICAL_LABELS[__VLS_ctx.npcStore.pregnancy.medicalPlan]);
            }
        }
    }
    if (__VLS_ctx.npcStore.children.length === 0 && !__VLS_ctx.npcStore.pregnancy && !__VLS_ctx.npcStore.childProposalPending) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_100;
        /** @ts-ignore @type { | typeof __VLS_components.Users} */
        Users;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
            size: (32),
            ...{ class: "mb-2" },
        }));
        const __VLS_102 = __VLS_101({
            size: (32),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    if (__VLS_ctx.npcStore.children.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        for (const [child] of __VLS_vFor((__VLS_ctx.npcStore.children))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (child.id),
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
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (child.name);
            if (child.birthQuality === 'healthy') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-success ml-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
            }
            else if (child.birthQuality === 'premature') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted/60 ml-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            if (child.stage !== 'baby' && !child.interactedToday) {
                const __VLS_105 = Button || Button;
                // @ts-ignore
                const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Heart),
                }));
                const __VLS_107 = __VLS_106({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                    icon: (__VLS_ctx.Heart),
                }, ...__VLS_functionalComponentArgsRest(__VLS_106));
                let __VLS_110;
                const __VLS_111 = {
                    /** @type {typeof __VLS_110.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.npcStore.getSpouse()))
                            throw 0;
                        if (!(__VLS_ctx.npcStore.children.length > 0))
                            throw 0;
                        if (!(child.stage !== 'baby' && !child.interactedToday))
                            throw 0;
                        return __VLS_ctx.handleInteractChild(child.id);
                        // @ts-ignore
                        [npcStore, npcStore, npcStore, npcStore, npcStore, npcStore, Heart, MEDICAL_LABELS, handleInteractChild,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                const { default: __VLS_112 } = __VLS_108.slots;
                // @ts-ignore
                [];
                var __VLS_108;
                var __VLS_109;
            }
            else if (child.stage !== 'baby') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
            const __VLS_113 = Button || Button;
            // @ts-ignore
            const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1 text-danger" },
            }));
            const __VLS_115 = __VLS_114({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1 text-danger" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_114));
            let __VLS_118;
            const __VLS_119 = {
                /** @type {typeof __VLS_118.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.npcStore.getSpouse()))
                        throw 0;
                    if (!(__VLS_ctx.npcStore.children.length > 0))
                        throw 0;
                    return __VLS_ctx.releaseConfirmChildId = child.id;
                    // @ts-ignore
                    [releaseConfirmChildId,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            const { default: __VLS_120 } = __VLS_116.slots;
            // @ts-ignore
            [];
            var __VLS_116;
            var __VLS_117;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted mb-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
            (__VLS_ctx.CHILD_STAGE_NAMES[child.stage]);
            (child.daysOld);
            if (child.stage !== 'baby') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
                for (const [h] of __VLS_vFor((10))) {
                    let __VLS_121;
                    /** @ts-ignore @type { | typeof __VLS_components.Heart} */
                    Heart;
                    // @ts-ignore
                    const __VLS_122 = __VLS_asFunctionalComponent1(__VLS_121, new __VLS_121({
                        key: (h),
                        size: (10),
                        ...{ class: "flex-shrink-0" },
                        ...{ class: (child.friendship >= h * 30 ? 'text-danger' : 'text-muted/30') },
                        fill: (child.friendship >= h * 30 ? 'currentColor' : 'none'),
                    }));
                    const __VLS_123 = __VLS_122({
                        key: (h),
                        size: (10),
                        ...{ class: "flex-shrink-0" },
                        ...{ class: (child.friendship >= h * 30 ? 'text-danger' : 'text-muted/30') },
                        fill: (child.friendship >= h * 30 ? 'currentColor' : 'none'),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_122));
                    /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                    // @ts-ignore
                    [CHILD_STAGE_NAMES,];
                }
            }
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.releaseConfirmChildId !== null) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-2 game-panel border-danger/40" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.getChildName(__VLS_ctx.releaseConfirmChildId));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-2 gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        const __VLS_126 = Button || Button;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
            ...{ 'onClick': {} },
            ...{ class: "text-danger" },
        }));
        const __VLS_128 = __VLS_127({
            ...{ 'onClick': {} },
            ...{ class: "text-danger" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_127));
        let __VLS_131;
        const __VLS_132 = {
            /** @type {typeof __VLS_131.click} */
            onClick: (__VLS_ctx.handleReleaseChild),
        };
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        const { default: __VLS_133 } = __VLS_129.slots;
        // @ts-ignore
        [releaseConfirmChildId, releaseConfirmChildId, getChildName, handleReleaseChild,];
        var __VLS_129;
        var __VLS_130;
        const __VLS_134 = Button || Button;
        // @ts-ignore
        const __VLS_135 = __VLS_asFunctionalComponent1(__VLS_134, new __VLS_134({
            ...{ 'onClick': {} },
        }));
        const __VLS_136 = __VLS_135({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_135));
        let __VLS_139;
        const __VLS_140 = {
            /** @type {typeof __VLS_139.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.npcStore.getSpouse()))
                    throw 0;
                if (!(__VLS_ctx.releaseConfirmChildId !== null))
                    throw 0;
                return __VLS_ctx.releaseConfirmChildId = null;
                // @ts-ignore
                [releaseConfirmChildId,];
            },
        };
        const { default: __VLS_141 } = __VLS_137.slots;
        // @ts-ignore
        [];
        var __VLS_137;
        var __VLS_138;
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 mb-4" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
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
let __VLS_142;
/** @ts-ignore @type { | typeof __VLS_components.Hammer} */
Hammer;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent1(__VLS_142, new __VLS_142({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_144 = __VLS_143({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_143));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
if (__VLS_ctx.currentHelpers.length < 2) {
    const __VLS_147 = Button || Button;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        icon: (__VLS_ctx.UserPlus),
        iconSize: (12),
    }));
    const __VLS_149 = __VLS_148({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        icon: (__VLS_ctx.UserPlus),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    let __VLS_152;
    const __VLS_153 = {
        /** @type {typeof __VLS_152.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.currentHelpers.length < 2))
                throw 0;
            return __VLS_ctx.showHireModal = true;
            // @ts-ignore
            [currentHelpers, UserPlus, showHireModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    const { default: __VLS_154 } = __VLS_150.slots;
    // @ts-ignore
    [];
    var __VLS_150;
    var __VLS_151;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
if (__VLS_ctx.currentHelpers.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [h] of __VLS_vFor((__VLS_ctx.currentHelpers))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (h.npcId),
            ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.getNpcById(h.npcId)?.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (__VLS_ctx.npcStore.HELPER_TASK_NAMES[h.task]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (h.dailyWage);
        const __VLS_155 = Button;
        // @ts-ignore
        const __VLS_156 = __VLS_asFunctionalComponent1(__VLS_155, new __VLS_155({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1 btn-danger" },
            icon: (__VLS_ctx.X),
            iconSize: (10),
        }));
        const __VLS_157 = __VLS_156({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1 btn-danger" },
            icon: (__VLS_ctx.X),
            iconSize: (10),
        }, ...__VLS_functionalComponentArgsRest(__VLS_156));
        let __VLS_160;
        const __VLS_161 = {
            /** @type {typeof __VLS_160.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentHelpers.length > 0))
                    throw 0;
                return __VLS_ctx.dismissConfirmNpcId = h.npcId;
                // @ts-ignore
                [npcStore, currentHelpers, currentHelpers, getNpcById, X, dismissConfirmNpcId,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
        var __VLS_158;
        var __VLS_159;
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.currentHelpers.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-6 text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_162;
    /** @ts-ignore @type { | typeof __VLS_components.Hammer} */
    Hammer;
    // @ts-ignore
    const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
        size: (32),
        ...{ class: "mb-2" },
    }));
    const __VLS_164 = __VLS_163({
        size: (32),
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
}
if (__VLS_ctx.homeStore.hasCellar) {
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    let __VLS_167;
    /** @ts-ignore @type { | typeof __VLS_components.Wine} */
    Wine;
    // @ts-ignore
    const __VLS_168 = __VLS_asFunctionalComponent1(__VLS_167, new __VLS_167({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_169 = __VLS_168({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_168));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    (__VLS_ctx.homeStore.cellarLevel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted ml-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    (__VLS_ctx.homeStore.cellarSlots.length);
    (__VLS_ctx.homeStore.cellarMaxSlots);
    if (__VLS_ctx.homeStore.nextCellarUpgrade) {
        const __VLS_172 = Button || Button;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent1(__VLS_172, new __VLS_172({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
        }));
        const __VLS_174 = __VLS_173({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        let __VLS_177;
        const __VLS_178 = {
            /** @type {typeof __VLS_177.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.homeStore.hasCellar))
                    throw 0;
                if (!(__VLS_ctx.homeStore.nextCellarUpgrade))
                    throw 0;
                return __VLS_ctx.showCellarUpgradeModal = true;
                // @ts-ignore
                [homeStore, homeStore, homeStore, homeStore, homeStore, currentHelpers, showCellarUpgradeModal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        const { default: __VLS_179 } = __VLS_175.slots;
        let __VLS_180;
        /** @ts-ignore @type { | typeof __VLS_components.ArrowUp} */
        ArrowUp;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent1(__VLS_180, new __VLS_180({
            size: (12),
            ...{ class: "inline" },
        }));
        const __VLS_182 = __VLS_181({
            size: (12),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        // @ts-ignore
        [];
        var __VLS_175;
        var __VLS_176;
    }
    if (__VLS_ctx.homeStore.cellarSlots.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        for (const [slot, idx] of __VLS_vFor((__VLS_ctx.homeStore.cellarSlots))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (idx),
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
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (__VLS_ctx.getItemName(slot.itemId));
            if (slot.upgradeCount >= 16) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                (Math.floor(slot.upgradeCount / 16));
            }
            const __VLS_185 = Button || Button;
            // @ts-ignore
            const __VLS_186 = __VLS_asFunctionalComponent1(__VLS_185, new __VLS_185({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
            }));
            const __VLS_187 = __VLS_186({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_186));
            let __VLS_190;
            const __VLS_191 = {
                /** @type {typeof __VLS_190.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.homeStore.hasCellar))
                        throw 0;
                    if (!(__VLS_ctx.homeStore.cellarSlots.length > 0))
                        throw 0;
                    return __VLS_ctx.removeAgingConfirmIdx = idx;
                    // @ts-ignore
                    [homeStore, homeStore, getItemName, removeAgingConfirmIdx,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            const { default: __VLS_192 } = __VLS_188.slots;
            // @ts-ignore
            [];
            var __VLS_188;
            var __VLS_189;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mb-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (slot.addedValue);
            (slot.upgradeCount);
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
                ...{ class: "h-full rounded-xs bg-accent transition-all" },
                ...{ style: ({ width: Math.min(100, Math.floor((slot.daysAging / 7) * 100)) + '%' }) },
            });
            /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (slot.daysAging);
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.homeStore.cellarSlots.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-6 text-muted mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        let __VLS_193;
        /** @ts-ignore @type { | typeof __VLS_components.Wine} */
        Wine;
        // @ts-ignore
        const __VLS_194 = __VLS_asFunctionalComponent1(__VLS_193, new __VLS_193({
            size: (32),
            ...{ class: "mb-2" },
        }));
        const __VLS_195 = __VLS_194({
            size: (32),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_194));
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    if (__VLS_ctx.homeStore.cellarSlots.length < __VLS_ctx.homeStore.cellarMaxSlots && __VLS_ctx.ageableInInventory.length > 0) {
        const __VLS_198 = Button || Button;
        // @ts-ignore
        const __VLS_199 = __VLS_asFunctionalComponent1(__VLS_198, new __VLS_198({
            ...{ 'onClick': {} },
            ...{ class: "w-full" },
        }));
        const __VLS_200 = __VLS_199({
            ...{ 'onClick': {} },
            ...{ class: "w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_199));
        let __VLS_203;
        const __VLS_204 = {
            /** @type {typeof __VLS_203.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.homeStore.hasCellar))
                    throw 0;
                if (!(__VLS_ctx.homeStore.cellarSlots.length < __VLS_ctx.homeStore.cellarMaxSlots && __VLS_ctx.ageableInInventory.length > 0))
                    throw 0;
                return __VLS_ctx.showAgingModal = true;
                // @ts-ignore
                [homeStore, homeStore, homeStore, ageableInInventory, showAgingModal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        const { default: __VLS_205 } = __VLS_201.slots;
        // @ts-ignore
        [];
        var __VLS_201;
        var __VLS_202;
    }
}
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
if (__VLS_ctx.showUpgradeModal && __VLS_ctx.homeStore.nextUpgrade) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showUpgradeModal && __VLS_ctx.homeStore.nextUpgrade))
                    throw 0;
                return __VLS_ctx.showUpgradeModal = false;
                // @ts-ignore
                [homeStore, showUpgradeModal, showUpgradeModal,];
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
                if (!(__VLS_ctx.showUpgradeModal && __VLS_ctx.homeStore.nextUpgrade))
                    throw 0;
                return __VLS_ctx.showUpgradeModal = false;
                // @ts-ignore
                [showUpgradeModal,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.homeStore.nextUpgrade.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.homeStore.nextUpgrade.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2 space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [mat] of __VLS_vFor((__VLS_ctx.homeStore.nextUpgrade.materialCost))) {
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
        (__VLS_ctx.getItemName(mat.itemId));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getCombinedItemCount(mat.itemId));
        (mat.quantity);
        // @ts-ignore
        [homeStore, homeStore, homeStore, getItemName, getCombinedItemCount, getCombinedItemCount,];
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
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.homeStore.nextUpgrade.cost ? '' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.homeStore.nextUpgrade.cost);
    const __VLS_217 = Button || Button;
    // @ts-ignore
    const __VLS_218 = __VLS_asFunctionalComponent1(__VLS_217, new __VLS_217({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeFarmhouse }) },
        disabled: (!__VLS_ctx.canUpgradeFarmhouse),
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
    }));
    const __VLS_219 = __VLS_218({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeFarmhouse }) },
        disabled: (!__VLS_ctx.canUpgradeFarmhouse),
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_218));
    let __VLS_222;
    const __VLS_223 = {
        /** @type {typeof __VLS_222.click} */
        onClick: (__VLS_ctx.handleUpgradeFromModal),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_224 } = __VLS_220.slots;
    // @ts-ignore
    [homeStore, homeStore, playerStore, canUpgradeFarmhouse, canUpgradeFarmhouse, ArrowUp, handleUpgradeFromModal,];
    var __VLS_220;
    var __VLS_221;
}
// @ts-ignore
[];
var __VLS_209;
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
if (__VLS_ctx.showAgingModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAgingModal))
                    throw 0;
                return __VLS_ctx.showAgingModal = false;
                // @ts-ignore
                [showAgingModal, showAgingModal,];
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
    const __VLS_231 = Button;
    // @ts-ignore
    const __VLS_232 = __VLS_asFunctionalComponent1(__VLS_231, new __VLS_231({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_233 = __VLS_232({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_232));
    let __VLS_236;
    const __VLS_237 = {
        /** @type {typeof __VLS_236.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showAgingModal))
                throw 0;
            return __VLS_ctx.showAgingModal = false;
            // @ts-ignore
            [X, showAgingModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_234;
    var __VLS_235;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.ageableInInventory))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showAgingModal))
                        throw 0;
                    return __VLS_ctx.handleStartAgingFromModal(item.itemId, item.quality);
                    // @ts-ignore
                    [ageableInInventory, handleStartAgingFromModal,];
                } },
            key: (item.itemId + item.quality),
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
        (__VLS_ctx.getItemName(item.itemId));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.quantity);
        // @ts-ignore
        [getItemName,];
    }
}
// @ts-ignore
[];
var __VLS_228;
let __VLS_238;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_239 = __VLS_asFunctionalComponent1(__VLS_238, new __VLS_238({
    name: "panel-fade",
}));
const __VLS_240 = __VLS_239({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_239));
const { default: __VLS_243 } = __VLS_241.slots;
if (__VLS_ctx.showCalendarModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCalendarModal))
                    throw 0;
                return __VLS_ctx.showCalendarModal = false;
                // @ts-ignore
                [showCalendarModal, showCalendarModal,];
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
                if (!(__VLS_ctx.showCalendarModal))
                    throw 0;
                return __VLS_ctx.showCalendarModal = false;
                // @ts-ignore
                [showCalendarModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_244;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent1(__VLS_244, new __VLS_244({
        size: (14),
    }));
    const __VLS_246 = __VLS_245({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_249;
    /** @ts-ignore @type { | typeof __VLS_components.Calendar} */
    Calendar;
    // @ts-ignore
    const __VLS_250 = __VLS_asFunctionalComponent1(__VLS_249, new __VLS_249({
        size: (14),
        ...{ class: "inline" },
    }));
    const __VLS_251 = __VLS_250({
        size: (14),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_250));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-4 gap-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [s] of __VLS_vFor((__VLS_ctx.SEASONS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showCalendarModal))
                        throw 0;
                    return __VLS_ctx.handleSelectSeason(s);
                    // @ts-ignore
                    [SEASONS, handleSelectSeason,];
                } },
            key: (s),
            ...{ class: "text-[10px] px-2 py-0.5 border rounded-xs transition-colors" },
            ...{ class: (__VLS_ctx.calendarSeason === s ? 'bg-accent/20 border-accent/40 text-accent' : 'border-accent/10 text-muted hover:text-text') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        (__VLS_ctx.SEASON_NAMES[s]);
        // @ts-ignore
        [calendarSeason, SEASON_NAMES,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-7 gap-px" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-7']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-px']} */ ;
    for (const [wd] of __VLS_vFor((__VLS_ctx.WEEKDAYS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (wd),
            ...{ class: "text-center py-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px]" },
            ...{ class: (wd === 'sat' || wd === 'sun' ? 'text-accent' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (__VLS_ctx.WEEKDAY_NAMES[wd]);
        // @ts-ignore
        [WEEKDAYS, WEEKDAY_NAMES,];
    }
    for (const [entry] of __VLS_vFor((__VLS_ctx.calendarDays))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showCalendarModal))
                        throw 0;
                    return __VLS_ctx.handleSelectDay(entry);
                    // @ts-ignore
                    [calendarDays, handleSelectDay,];
                } },
            key: (entry.day),
            ...{ class: "text-center py-1 border border-transparent transition-colors" },
            ...{ class: ([
                    entry.isToday ? 'bg-accent/20 border-accent/40' : '',
                    entry.festivals.length > 0 || entry.birthdays.length > 0 ? 'cursor-pointer hover:bg-accent/10 rounded-sm' : '',
                    __VLS_ctx.selectedCalendarDay === entry.day ? 'border-accent/30' : ''
                ]) },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-transparent']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px]" },
            ...{ class: (entry.isToday ? 'text-accent' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (entry.day);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-center space-x-px mt-px min-h-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-px']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-px']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-1.5']} */ ;
        if (entry.festivals.length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
                ...{ class: "w-1 h-1 rounded-full bg-danger inline-block" },
            });
            /** @type {__VLS_StyleScopedClasses['w-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        }
        if (entry.birthdays.length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
                ...{ class: "w-1 h-1 rounded-full bg-success inline-block" },
            });
            /** @type {__VLS_StyleScopedClasses['w-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        }
        // @ts-ignore
        [selectedCalendarDay,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-3 mt-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted flex items-center space-x-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "w-1.5 h-1.5 rounded-full bg-danger inline-block" },
    });
    /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted flex items-center space-x-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "w-1.5 h-1.5 rounded-full bg-success inline-block" },
    });
    /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    if (__VLS_ctx.selectedDayEntry && (__VLS_ctx.selectedDayEntry.festivals.length > 0 || __VLS_ctx.selectedDayEntry.birthdays.length > 0)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2 mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-accent mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.SEASON_NAMES[__VLS_ctx.calendarSeason]);
        (__VLS_ctx.selectedCalendarDay);
        if (__VLS_ctx.selectedDayEntry.isToday) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger ml-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        }
        for (const [f] of __VLS_vFor((__VLS_ctx.selectedDayEntry.festivals))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (f.name),
                ...{ class: "mb-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            (f.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted ml-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            (f.description);
            // @ts-ignore
            [calendarSeason, SEASON_NAMES, selectedCalendarDay, selectedDayEntry, selectedDayEntry, selectedDayEntry, selectedDayEntry, selectedDayEntry,];
        }
        for (const [b] of __VLS_vFor((__VLS_ctx.selectedDayEntry.birthdays))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (b.npcName),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (b.npcName);
            // @ts-ignore
            [selectedDayEntry,];
        }
    }
}
// @ts-ignore
[];
var __VLS_241;
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
if (__VLS_ctx.showSpouseGiftModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showSpouseGiftModal))
                    throw 0;
                return __VLS_ctx.showSpouseGiftModal = false;
                // @ts-ignore
                [showSpouseGiftModal, showSpouseGiftModal,];
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
        ...{ class: "game-panel max-w-sm w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
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
    (__VLS_ctx.spouseDef?.name);
    const __VLS_260 = Button;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent1(__VLS_260, new __VLS_260({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_262 = __VLS_261({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    let __VLS_265;
    const __VLS_266 = {
        /** @type {typeof __VLS_265.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showSpouseGiftModal))
                throw 0;
            return __VLS_ctx.showSpouseGiftModal = false;
            // @ts-ignore
            [spouseDef, showSpouseGiftModal, X,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_263;
    var __VLS_264;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.spouseGiftableItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showSpouseGiftModal))
                        throw 0;
                    return __VLS_ctx.handleSpouseGift(item.itemId, item.quality);
                    // @ts-ignore
                    [spouseGiftableItems, handleSpouseGift,];
                } },
            key: (item.itemId + item.quality),
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
        if (__VLS_ctx.getSpouseGiftPref(item.itemId) !== 'neutral') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px]" },
                ...{ class: (__VLS_ctx.GIFT_PREF_CLASS[__VLS_ctx.getSpouseGiftPref(item.itemId)]) },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            (__VLS_ctx.GIFT_PREF_LABELS[__VLS_ctx.getSpouseGiftPref(item.itemId)]);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.quantity);
        // @ts-ignore
        [qualityTextClass, getItemById, getSpouseGiftPref, getSpouseGiftPref, getSpouseGiftPref, GIFT_PREF_CLASS, GIFT_PREF_LABELS,];
    }
    if (__VLS_ctx.spouseGiftableItems.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "py-4 text-center text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
}
// @ts-ignore
[spouseGiftableItems,];
var __VLS_257;
let __VLS_267;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
    name: "panel-fade",
}));
const __VLS_269 = __VLS_268({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
const { default: __VLS_272 } = __VLS_270.slots;
if (__VLS_ctx.showHireModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closeHireModal) },
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
        ...{ class: "game-panel max-w-sm w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
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
    const __VLS_273 = Button;
    // @ts-ignore
    const __VLS_274 = __VLS_asFunctionalComponent1(__VLS_273, new __VLS_273({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_275 = __VLS_274({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_274));
    let __VLS_278;
    const __VLS_279 = {
        /** @type {typeof __VLS_278.click} */
        onClick: (__VLS_ctx.closeHireModal),
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_276;
    var __VLS_277;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-4 gap-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [label, key] of __VLS_vFor((__VLS_ctx.npcStore.HELPER_TASK_NAMES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showHireModal))
                        throw 0;
                    return __VLS_ctx.selectHireTask(key);
                    // @ts-ignore
                    [npcStore, showHireModal, X, closeHireModal, closeHireModal, selectHireTask,];
                } },
            key: (key),
            ...{ class: "text-xs py-1 rounded-xs border" },
            ...{ class: (__VLS_ctx.selectedHireTask === key ? 'border-accent text-accent' : 'border-accent/20 text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        (label);
        // @ts-ignore
        [selectedHireTask,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.npcStore.HELPER_WAGES[__VLS_ctx.selectedHireTask]);
    if (__VLS_ctx.hireConfirmNpc) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/30 rounded-xs p-3 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        (__VLS_ctx.hireConfirmNpc.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        (__VLS_ctx.npcStore.HELPER_TASK_NAMES[__VLS_ctx.selectedHireTask]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.npcStore.HELPER_WAGES[__VLS_ctx.selectedHireTask]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_280 = Button || Button;
        // @ts-ignore
        const __VLS_281 = __VLS_asFunctionalComponent1(__VLS_280, new __VLS_280({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-xs" },
        }));
        const __VLS_282 = __VLS_281({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-xs" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_281));
        let __VLS_285;
        const __VLS_286 = {
            /** @type {typeof __VLS_285.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showHireModal))
                    throw 0;
                if (!(__VLS_ctx.hireConfirmNpc))
                    throw 0;
                return __VLS_ctx.handleHire(__VLS_ctx.hireConfirmNpcId);
                // @ts-ignore
                [npcStore, npcStore, npcStore, selectedHireTask, selectedHireTask, selectedHireTask, hireConfirmNpc, hireConfirmNpc, handleHire, hireConfirmNpcId,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        const { default: __VLS_287 } = __VLS_283.slots;
        // @ts-ignore
        [];
        var __VLS_283;
        var __VLS_284;
        const __VLS_288 = Button || Button;
        // @ts-ignore
        const __VLS_289 = __VLS_asFunctionalComponent1(__VLS_288, new __VLS_288({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-xs" },
        }));
        const __VLS_290 = __VLS_289({
            ...{ 'onClick': {} },
            ...{ class: "py-0.5 px-2 text-xs" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_289));
        let __VLS_293;
        const __VLS_294 = {
            /** @type {typeof __VLS_293.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showHireModal))
                    throw 0;
                if (!(__VLS_ctx.hireConfirmNpc))
                    throw 0;
                return __VLS_ctx.hireConfirmNpcId = null;
                // @ts-ignore
                [hireConfirmNpcId,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        const { default: __VLS_295 } = __VLS_291.slots;
        // @ts-ignore
        [];
        var __VLS_291;
        var __VLS_292;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-48 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [npc] of __VLS_vFor((__VLS_ctx.hireableNpcs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showHireModal))
                            throw 0;
                        if (!!(__VLS_ctx.hireConfirmNpc))
                            throw 0;
                        return __VLS_ctx.hireConfirmNpcId = npc.npcId;
                        // @ts-ignore
                        [hireConfirmNpcId, hireableNpcs,];
                    } },
                key: (npc.npcId),
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
            (npc.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            let __VLS_296;
            /** @ts-ignore @type { | typeof __VLS_components.Heart} */
            Heart;
            // @ts-ignore
            const __VLS_297 = __VLS_asFunctionalComponent1(__VLS_296, new __VLS_296({
                size: (10),
                ...{ class: "inline" },
            }));
            const __VLS_298 = __VLS_297({
                size: (10),
                ...{ class: "inline" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_297));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            (Math.floor(npc.friendship / 250));
            // @ts-ignore
            [];
        }
    }
    if (!__VLS_ctx.hireConfirmNpc && __VLS_ctx.hireableNpcs.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted text-center py-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    }
}
// @ts-ignore
[hireConfirmNpc, hireableNpcs,];
var __VLS_270;
let __VLS_301;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent1(__VLS_301, new __VLS_301({
    name: "panel-fade",
}));
const __VLS_303 = __VLS_302({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
const { default: __VLS_306 } = __VLS_304.slots;
if (__VLS_ctx.dismissConfirmNpcId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.dismissConfirmNpcId))
                    throw 0;
                return __VLS_ctx.dismissConfirmNpcId = null;
                // @ts-ignore
                [dismissConfirmNpcId, dismissConfirmNpcId,];
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
        ...{ class: "game-panel max-w-xs w-full text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-danger mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.getNpcById(__VLS_ctx.dismissConfirmNpcId)?.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3 justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const __VLS_307 = Button || Button;
    // @ts-ignore
    const __VLS_308 = __VLS_asFunctionalComponent1(__VLS_307, new __VLS_307({
        ...{ 'onClick': {} },
    }));
    const __VLS_309 = __VLS_308({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_308));
    let __VLS_312;
    const __VLS_313 = {
        /** @type {typeof __VLS_312.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.dismissConfirmNpcId))
                throw 0;
            return __VLS_ctx.dismissConfirmNpcId = null;
            // @ts-ignore
            [getNpcById, dismissConfirmNpcId, dismissConfirmNpcId,];
        },
    };
    const { default: __VLS_314 } = __VLS_310.slots;
    // @ts-ignore
    [];
    var __VLS_310;
    var __VLS_311;
    const __VLS_315 = Button || Button;
    // @ts-ignore
    const __VLS_316 = __VLS_asFunctionalComponent1(__VLS_315, new __VLS_315({
        ...{ 'onClick': {} },
        ...{ class: "btn-danger" },
    }));
    const __VLS_317 = __VLS_316({
        ...{ 'onClick': {} },
        ...{ class: "btn-danger" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_316));
    let __VLS_320;
    const __VLS_321 = {
        /** @type {typeof __VLS_320.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.dismissConfirmNpcId))
                throw 0;
            return __VLS_ctx.handleDismiss(__VLS_ctx.dismissConfirmNpcId);
            // @ts-ignore
            [dismissConfirmNpcId, handleDismiss,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
    const { default: __VLS_322 } = __VLS_318.slots;
    // @ts-ignore
    [];
    var __VLS_318;
    var __VLS_319;
}
// @ts-ignore
[];
var __VLS_304;
let __VLS_323;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_324 = __VLS_asFunctionalComponent1(__VLS_323, new __VLS_323({
    name: "panel-fade",
}));
const __VLS_325 = __VLS_324({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_324));
const { default: __VLS_328 } = __VLS_326.slots;
if (__VLS_ctx.removeAgingConfirmSlot) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.removeAgingConfirmSlot))
                    throw 0;
                return __VLS_ctx.removeAgingConfirmIdx = null;
                // @ts-ignore
                [removeAgingConfirmIdx, removeAgingConfirmSlot,];
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
        ...{ class: "game-panel max-w-xs w-full text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.getItemName(__VLS_ctx.removeAgingConfirmSlot.itemId));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.removeAgingConfirmSlot.addedValue);
    (__VLS_ctx.removeAgingConfirmSlot.upgradeCount);
    if (__VLS_ctx.removeAgingConfirmSlot.upgradeCount >= 16) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-success mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (Math.floor(__VLS_ctx.removeAgingConfirmSlot.upgradeCount / 16));
    }
    if (__VLS_ctx.removeAgingConfirmSlot.addedValue > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        (__VLS_ctx.removeAgingConfirmSlot.addedValue);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3 justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const __VLS_329 = Button || Button;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent1(__VLS_329, new __VLS_329({
        ...{ 'onClick': {} },
    }));
    const __VLS_331 = __VLS_330({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
    let __VLS_334;
    const __VLS_335 = {
        /** @type {typeof __VLS_334.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.removeAgingConfirmSlot))
                throw 0;
            return __VLS_ctx.removeAgingConfirmIdx = null;
            // @ts-ignore
            [getItemName, removeAgingConfirmIdx, removeAgingConfirmSlot, removeAgingConfirmSlot, removeAgingConfirmSlot, removeAgingConfirmSlot, removeAgingConfirmSlot, removeAgingConfirmSlot, removeAgingConfirmSlot,];
        },
    };
    const { default: __VLS_336 } = __VLS_332.slots;
    // @ts-ignore
    [];
    var __VLS_332;
    var __VLS_333;
    const __VLS_337 = Button || Button;
    // @ts-ignore
    const __VLS_338 = __VLS_asFunctionalComponent1(__VLS_337, new __VLS_337({
        ...{ 'onClick': {} },
    }));
    const __VLS_339 = __VLS_338({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_338));
    let __VLS_342;
    const __VLS_343 = {
        /** @type {typeof __VLS_342.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.removeAgingConfirmSlot))
                throw 0;
            return __VLS_ctx.handleRemoveAging(__VLS_ctx.removeAgingConfirmIdx);
            // @ts-ignore
            [removeAgingConfirmIdx, handleRemoveAging,];
        },
    };
    const { default: __VLS_344 } = __VLS_340.slots;
    // @ts-ignore
    [];
    var __VLS_340;
    var __VLS_341;
}
// @ts-ignore
[];
var __VLS_326;
let __VLS_345;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_346 = __VLS_asFunctionalComponent1(__VLS_345, new __VLS_345({
    name: "panel-fade",
}));
const __VLS_347 = __VLS_346({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_346));
const { default: __VLS_350 } = __VLS_348.slots;
if (__VLS_ctx.showCellarUpgradeModal && __VLS_ctx.homeStore.nextCellarUpgrade) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCellarUpgradeModal && __VLS_ctx.homeStore.nextCellarUpgrade))
                    throw 0;
                return __VLS_ctx.showCellarUpgradeModal = false;
                // @ts-ignore
                [homeStore, showCellarUpgradeModal, showCellarUpgradeModal,];
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
                if (!(__VLS_ctx.showCellarUpgradeModal && __VLS_ctx.homeStore.nextCellarUpgrade))
                    throw 0;
                return __VLS_ctx.showCellarUpgradeModal = false;
                // @ts-ignore
                [showCellarUpgradeModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_351;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_352 = __VLS_asFunctionalComponent1(__VLS_351, new __VLS_351({
        size: (14),
    }));
    const __VLS_353 = __VLS_352({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_352));
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
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.homeStore.nextCellarUpgrade.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.homeStore.nextCellarUpgrade.valuePerCycle);
    (__VLS_ctx.homeStore.nextCellarUpgrade.maxSlots);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2 space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [mat] of __VLS_vFor((__VLS_ctx.homeStore.nextCellarUpgrade.materialCost))) {
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
        (__VLS_ctx.getItemName(mat.itemId));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getCombinedItemCount(mat.itemId));
        (mat.quantity);
        // @ts-ignore
        [homeStore, homeStore, homeStore, homeStore, getItemName, getCombinedItemCount, getCombinedItemCount,];
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
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.homeStore.nextCellarUpgrade.cost ? '' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.homeStore.nextCellarUpgrade.cost);
    const __VLS_356 = Button || Button;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent1(__VLS_356, new __VLS_356({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeCellar }) },
        disabled: (!__VLS_ctx.canUpgradeCellar),
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
    }));
    const __VLS_358 = __VLS_357({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeCellar }) },
        disabled: (!__VLS_ctx.canUpgradeCellar),
        icon: (__VLS_ctx.ArrowUp),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    let __VLS_361;
    const __VLS_362 = {
        /** @type {typeof __VLS_361.click} */
        onClick: (__VLS_ctx.handleUpgradeCellar),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_363 } = __VLS_359.slots;
    // @ts-ignore
    [homeStore, homeStore, playerStore, ArrowUp, canUpgradeCellar, canUpgradeCellar, handleUpgradeCellar,];
    var __VLS_359;
    var __VLS_360;
}
// @ts-ignore
[];
var __VLS_348;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
