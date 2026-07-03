/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { ArrowUp, Wrench, Clock, CircleCheck, X } from 'lucide-vue-next';
import { useGameStore } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useNpcStore } from '@/stores/useNpcStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory';
import { getUpgradeCost, TOOL_NAMES, TIER_NAMES, getItemById } from '@/data';
import { ACTION_TIME_COSTS } from '@/data/timeConstants';
import { addLog } from '@/composables/useGameLog';
import { handleEndDay } from '@/composables/useEndDay';
/** 升级目标等级 → 所需小满好感 */
const TIER_FRIENDSHIP_REQ = {
    iron: 'acquaintance',
    steel: 'friendly',
    iridium: 'bestFriend'
};
/** 各等级体力消耗倍率（与 useInventoryStore 一致） */
const STAMINA_MULTIPLIERS = { basic: 1.0, iron: 0.8, steel: 0.6, iridium: 0.4 };
const ROD_HOOK = { basic: 40, iron: 45, steel: 50, iridium: 60 };
const ROD_TIME = { basic: 30, iron: 33, steel: 36, iridium: 40 };
const staminaText = (tier) => {
    const r = Math.round((1 - STAMINA_MULTIPLIERS[tier]) * 100);
    return r > 0 ? `-${r}%` : '无加成';
};
const LEVEL_ORDER = ['stranger', 'acquaintance', 'friendly', 'bestFriend'];
const LEVEL_NAMES = {
    stranger: '陌生',
    acquaintance: '相识',
    friendly: '熟识',
    bestFriend: '挚友'
};
const meetsLevel = (current, required) => LEVEL_ORDER.indexOf(current) >= LEVEL_ORDER.indexOf(required);
const inventoryStore = useInventoryStore();
const playerStore = usePlayerStore();
const npcStore = useNpcStore();
const gameStore = useGameStore();
// === 弹窗状态 ===
const selectedTool = ref(null);
const selectedToolObj = computed(() => {
    if (!selectedTool.value)
        return null;
    return inventoryStore.getTool(selectedTool.value) ?? null;
});
const selectedUpgradeCost = computed(() => {
    if (!selectedToolObj.value)
        return null;
    return getUpgradeCost(selectedToolObj.value.type, selectedToolObj.value.tier) ?? null;
});
const selectedFriendshipReq = computed(() => {
    if (!selectedUpgradeCost.value)
        return null;
    return TIER_FRIENDSHIP_REQ[selectedUpgradeCost.value.toTier] ?? null;
});
/** 该工具是否正在升级中 */
const isUpgrading = (type) => {
    return inventoryStore.pendingUpgrade?.toolType === type;
};
const canUpgrade = (type) => {
    // 已有工具在升级中，不能再升级
    if (inventoryStore.pendingUpgrade)
        return false;
    const tool = inventoryStore.getTool(type);
    if (!tool)
        return false;
    const cost = getUpgradeCost(type, tool.tier);
    if (!cost)
        return false;
    const requiredLevel = TIER_FRIENDSHIP_REQ[cost.toTier];
    if (requiredLevel && !meetsLevel(npcStore.getFriendshipLevel('xiao_man'), requiredLevel))
        return false;
    if (playerStore.money < cost.money)
        return false;
    for (const mat of cost.materials) {
        if (getCombinedItemCount(mat.itemId) < mat.quantity)
            return false;
    }
    return true;
};
/** 返回升级被阻止的原因（用于 UI 提示），可升级时返回空字符串 */
const getUpgradeBlockReason = (type) => {
    if (inventoryStore.pendingUpgrade)
        return '小满正在锻造其他工具';
    const tool = inventoryStore.getTool(type);
    if (!tool)
        return '';
    const cost = getUpgradeCost(type, tool.tier);
    if (!cost)
        return '';
    const requiredLevel = TIER_FRIENDSHIP_REQ[cost.toTier];
    if (requiredLevel && !meetsLevel(npcStore.getFriendshipLevel('xiao_man'), requiredLevel)) {
        return `需要小满好感达到「${LEVEL_NAMES[requiredLevel]}」`;
    }
    if (playerStore.money < cost.money)
        return '铜钱不足';
    for (const mat of cost.materials) {
        if (getCombinedItemCount(mat.itemId) < mat.quantity) {
            const itemName = getItemById(mat.itemId)?.name ?? mat.itemId;
            return `${itemName}不足（${getCombinedItemCount(mat.itemId)}/${mat.quantity}）`;
        }
    }
    return '';
};
const handleUpgradeAndClose = (type) => {
    const tool = inventoryStore.getTool(type);
    if (!tool)
        return;
    const cost = getUpgradeCost(type, tool.tier);
    if (!cost)
        return;
    if (!canUpgrade(type)) {
        addLog('条件不足，无法升级。');
        return;
    }
    playerStore.spendMoney(cost.money);
    for (const mat of cost.materials) {
        removeCombinedItem(mat.itemId, mat.quantity);
    }
    inventoryStore.startUpgrade(type, cost.toTier);
    addLog(`你把${TOOL_NAMES[type]}和材料交给了小满，${cost.money}文。2天后可以取回升级后的工具。`);
    selectedTool.value = null;
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.toolUpgrade);
    if (tr.message)
        addLog(tr.message);
    if (tr.passedOut) {
        handleEndDay();
        return;
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
/** @ts-ignore @type { | typeof __VLS_components.Wrench} */
Wrench;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
if (__VLS_ctx.inventoryStore.pendingUpgrade) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/30 rounded-xs px-3 py-2 mb-3 flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.Clock} */
    Clock;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        size: (12),
        ...{ class: "text-accent shrink-0" },
    }));
    const __VLS_7 = __VLS_6({
        size: (12),
        ...{ class: "text-accent shrink-0" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.TOOL_NAMES[__VLS_ctx.inventoryStore.pendingUpgrade.toolType]);
    (__VLS_ctx.TIER_NAMES[__VLS_ctx.inventoryStore.pendingUpgrade.targetTier]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted whitespace-nowrap ml-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
    (__VLS_ctx.inventoryStore.pendingUpgrade.daysRemaining);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-1.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
for (const [tool] of __VLS_vFor((__VLS_ctx.inventoryStore.tools))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                return __VLS_ctx.selectedTool = tool.type;
                // @ts-ignore
                [inventoryStore, inventoryStore, inventoryStore, inventoryStore, inventoryStore, TOOL_NAMES, TIER_NAMES, selectedTool,];
            } },
        key: (tool.type),
        ...{ class: "flex items-center justify-between border rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5" },
        ...{ class: (__VLS_ctx.isUpgrading(tool.type) ? 'border-accent/30' : 'border-accent/20') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "min-w-0" },
    });
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm" },
        ...{ class: (__VLS_ctx.isUpgrading(tool.type) ? 'text-accent' : '') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.TOOL_NAMES[tool.type]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.TIER_NAMES[tool.tier]);
    if (__VLS_ctx.isUpgrading(tool.type)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent whitespace-nowrap ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
    }
    else if (__VLS_ctx.getUpgradeCost(tool.type, tool.tier)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted whitespace-nowrap ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (__VLS_ctx.TIER_NAMES[__VLS_ctx.getUpgradeCost(tool.type, tool.tier).toTier]);
    }
    else {
        let __VLS_10;
        /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
        CircleCheck;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
            size: (14),
            ...{ class: "text-success shrink-0 ml-2" },
        }));
        const __VLS_12 = __VLS_11({
            size: (14),
            ...{ class: "text-success shrink-0 ml-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
    }
    // @ts-ignore
    [TOOL_NAMES, TIER_NAMES, TIER_NAMES, isUpgrading, isUpgrading, isUpgrading, getUpgradeCost, getUpgradeCost,];
}
let __VLS_15;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    name: "panel-fade",
}));
const __VLS_17 = __VLS_16({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
const { default: __VLS_20 } = __VLS_18.slots;
if (__VLS_ctx.selectedTool) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedTool))
                    throw 0;
                return __VLS_ctx.selectedTool = null;
                // @ts-ignore
                [selectedTool, selectedTool,];
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
                if (!(__VLS_ctx.selectedTool))
                    throw 0;
                return __VLS_ctx.selectedTool = null;
                // @ts-ignore
                [selectedTool,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_21;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        size: (14),
    }));
    const __VLS_23 = __VLS_22({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.isUpgrading(__VLS_ctx.selectedTool) ? 'text-accent' : 'text-text') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.TOOL_NAMES[__VLS_ctx.selectedTool]);
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
    (__VLS_ctx.TIER_NAMES[__VLS_ctx.selectedToolObj.tier]);
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
    (__VLS_ctx.staminaText(__VLS_ctx.selectedToolObj.tier));
    if (__VLS_ctx.selectedTool === 'fishingRod') {
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
        (__VLS_ctx.ROD_HOOK[__VLS_ctx.selectedToolObj.tier]);
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
        (__VLS_ctx.ROD_TIME[__VLS_ctx.selectedToolObj.tier]);
    }
    if (__VLS_ctx.isUpgrading(__VLS_ctx.selectedTool)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
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
        (__VLS_ctx.TIER_NAMES[__VLS_ctx.inventoryStore.pendingUpgrade.targetTier]);
    }
    if (__VLS_ctx.isUpgrading(__VLS_ctx.selectedTool)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-2 mt-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
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
            ...{ class: "h-full rounded-xs bg-accent transition-all" },
            ...{ style: ({ width: ((2 - __VLS_ctx.inventoryStore.pendingUpgrade.daysRemaining) / 2) * 100 + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted whitespace-nowrap" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        (2 - __VLS_ctx.inventoryStore.pendingUpgrade.daysRemaining);
    }
    if (!__VLS_ctx.isUpgrading(__VLS_ctx.selectedTool) && __VLS_ctx.selectedUpgradeCost) {
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
        (__VLS_ctx.TIER_NAMES[__VLS_ctx.selectedUpgradeCost.toTier]);
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
            ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.selectedUpgradeCost.money ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.selectedUpgradeCost.money);
        for (const [mat] of __VLS_vFor((__VLS_ctx.selectedUpgradeCost.materials))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (mat.itemId),
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
            (__VLS_ctx.getItemById(mat.itemId)?.name ?? mat.itemId);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getCombinedItemCount(mat.itemId));
            (mat.quantity);
            // @ts-ignore
            [inventoryStore, inventoryStore, inventoryStore, TOOL_NAMES, TIER_NAMES, TIER_NAMES, TIER_NAMES, selectedTool, selectedTool, selectedTool, selectedTool, selectedTool, selectedTool, isUpgrading, isUpgrading, isUpgrading, isUpgrading, selectedToolObj, selectedToolObj, selectedToolObj, selectedToolObj, staminaText, ROD_HOOK, ROD_TIME, selectedUpgradeCost, selectedUpgradeCost, selectedUpgradeCost, selectedUpgradeCost, selectedUpgradeCost, playerStore, getItemById, getCombinedItemCount, getCombinedItemCount,];
        }
        if (__VLS_ctx.selectedFriendshipReq) {
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
                ...{ class: (__VLS_ctx.meetsLevel(__VLS_ctx.npcStore.getFriendshipLevel('xiao_man'), __VLS_ctx.selectedFriendshipReq) ? '' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.LEVEL_NAMES[__VLS_ctx.npcStore.getFriendshipLevel('xiao_man')]);
            (__VLS_ctx.LEVEL_NAMES[__VLS_ctx.selectedFriendshipReq]);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-success/20 rounded-xs p-2 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/20']} */ ;
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
        (__VLS_ctx.staminaText(__VLS_ctx.selectedToolObj.tier));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.staminaText(__VLS_ctx.selectedUpgradeCost.toTier));
        if (__VLS_ctx.selectedTool === 'fishingRod') {
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
            (__VLS_ctx.ROD_HOOK[__VLS_ctx.selectedToolObj.tier]);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (__VLS_ctx.ROD_HOOK[__VLS_ctx.selectedUpgradeCost.toTier]);
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
            (__VLS_ctx.ROD_TIME[__VLS_ctx.selectedToolObj.tier]);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (__VLS_ctx.ROD_TIME[__VLS_ctx.selectedUpgradeCost.toTier]);
        }
        if (__VLS_ctx.getUpgradeBlockReason(__VLS_ctx.selectedTool)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-danger mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (__VLS_ctx.getUpgradeBlockReason(__VLS_ctx.selectedTool));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.selectedTool))
                        throw 0;
                    if (!(!__VLS_ctx.isUpgrading(__VLS_ctx.selectedTool) && __VLS_ctx.selectedUpgradeCost))
                        throw 0;
                    return __VLS_ctx.handleUpgradeAndClose(__VLS_ctx.selectedTool);
                    // @ts-ignore
                    [selectedTool, selectedTool, selectedTool, selectedTool, selectedToolObj, selectedToolObj, selectedToolObj, staminaText, staminaText, ROD_HOOK, ROD_HOOK, ROD_TIME, ROD_TIME, selectedUpgradeCost, selectedUpgradeCost, selectedUpgradeCost, selectedFriendshipReq, selectedFriendshipReq, selectedFriendshipReq, meetsLevel, npcStore, npcStore, LEVEL_NAMES, LEVEL_NAMES, getUpgradeBlockReason, getUpgradeBlockReason, handleUpgradeAndClose,];
                } },
            ...{ class: "btn text-xs w-full justify-center" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgrade(__VLS_ctx.selectedTool) }) },
            disabled: (!__VLS_ctx.canUpgrade(__VLS_ctx.selectedTool)),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        let __VLS_26;
        /** @ts-ignore @type { | typeof __VLS_components.ArrowUp} */
        ArrowUp;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
            size: (12),
        }));
        const __VLS_28 = __VLS_27({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        (__VLS_ctx.selectedUpgradeCost.money);
    }
    else if (!__VLS_ctx.isUpgrading(__VLS_ctx.selectedTool)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-success/30 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_31;
        /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
        CircleCheck;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
            size: (12),
            ...{ class: "text-success" },
        }));
        const __VLS_33 = __VLS_32({
            size: (12),
            ...{ class: "text-success" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
}
// @ts-ignore
[selectedTool, selectedTool, selectedTool, isUpgrading, selectedUpgradeCost, canUpgrade, canUpgrade,];
var __VLS_18;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
