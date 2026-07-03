/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { Swords, Gift, CircleCheck, Circle, Lock, ShoppingCart, BookOpen, X, HandHeart } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useGuildStore } from '@/stores/useGuildStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { MONSTER_GOALS, GUILD_SHOP_ITEMS, GUILD_DONATIONS } from '@/data/guild';
import { MONSTERS, BOSS_MONSTERS, ZONE_MONSTERS, SKULL_CAVERN_MONSTERS } from '@/data/mine';
import { MONSTER_DROP_WEAPONS, BOSS_DROP_WEAPONS, getWeaponById } from '@/data/weapons';
import { MONSTER_DROP_RINGS, BOSS_DROP_RINGS, getRingById } from '@/data/rings';
import { MONSTER_DROP_HATS, BOSS_DROP_HATS, getHatById } from '@/data/hats';
import { MONSTER_DROP_SHOES, BOSS_DROP_SHOES, getShoeById } from '@/data/shoes';
import { getItemById } from '@/data/items';
import { addLog } from '@/composables/useGameLog';
const guildStore = useGuildStore();
const playerStore = usePlayerStore();
const inventoryStore = useInventoryStore();
const tab = ref('goals');
const goalZone = ref('all');
const shopModalItem = ref(null);
const shopBuyQty = ref(1);
const selectedGoal = ref(null);
const selectedMonster = ref(null);
const openShopModal = (item) => {
    shopModalItem.value = item;
    shopBuyQty.value = 1;
};
/** 最大可购买数量 */
const maxShopBuyQty = computed(() => {
    const item = shopModalItem.value;
    if (!item)
        return 1;
    if (!guildStore.isShopItemUnlocked(item.itemId))
        return 0;
    if (item.equipType)
        return 1;
    let max = 999;
    if (item.contributionCost) {
        max = Math.min(max, Math.floor(guildStore.contributionPoints / item.contributionCost));
    }
    else if (item.price > 0) {
        max = Math.min(max, Math.floor(playerStore.money / item.price));
    }
    if (item.materials) {
        for (const mat of item.materials) {
            max = Math.min(max, Math.floor(inventoryStore.getItemCount(mat.itemId) / mat.quantity));
        }
    }
    if (item.dailyLimit)
        max = Math.min(max, guildStore.getDailyRemaining(item.itemId, item.dailyLimit));
    if (item.weeklyLimit)
        max = Math.min(max, guildStore.getWeeklyRemaining(item.itemId, item.weeklyLimit));
    if (item.totalLimit)
        max = Math.min(max, guildStore.getTotalRemaining(item.itemId, item.totalLimit));
    return Math.max(0, max);
});
const shopBuyTotalCost = computed(() => {
    if (!shopModalItem.value)
        return 0;
    if (shopModalItem.value.contributionCost)
        return shopModalItem.value.contributionCost * shopBuyQty.value;
    return shopModalItem.value.price * shopBuyQty.value;
});
const setShopBuyQty = (val) => {
    shopBuyQty.value = Math.max(1, Math.min(val, maxShopBuyQty.value));
};
const addShopBuyQty = (delta) => {
    setShopBuyQty(shopBuyQty.value + delta);
};
const onShopBuyQtyInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val))
        setShopBuyQty(val);
};
const handleBuyShopItem = () => {
    if (!shopModalItem.value)
        return;
    const itemId = shopModalItem.value.itemId;
    const qty = Math.min(shopBuyQty.value, maxShopBuyQty.value);
    for (let i = 0; i < qty; i++) {
        if (!guildStore.buyShopItem(itemId))
            break;
    }
    shopModalItem.value = null;
};
const handleClaimGoal = (monsterId) => {
    guildStore.claimGoal(monsterId);
    selectedGoal.value = null;
};
/** 计算讨伐目标的贡献点奖励 */
const getGoalBonusPoints = (goal) => {
    return Math.floor((goal.reward.money ?? 0) / 20) + goal.killTarget;
};
/** 捐献弹窗状态 */
const donateModalItem = ref(null);
const donateQuantity = ref(1);
const donateConfirmed = ref(false);
const openDonateModal = (item) => {
    donateModalItem.value = item;
    donateQuantity.value = 1;
    donateConfirmed.value = false;
};
const onDonateInput = (e) => {
    const val = parseInt(e.target.value);
    if (!donateModalItem.value || isNaN(val))
        return;
    donateQuantity.value = Math.max(1, Math.min(donateModalItem.value.count, val));
};
const executeDonate = () => {
    if (!donateModalItem.value)
        return;
    const result = guildStore.donateItem(donateModalItem.value.itemId, donateQuantity.value);
    if (result.success) {
        addLog(`捐献了${donateModalItem.value.name}×${donateQuantity.value}，获得 ${result.pointsGained} 贡献点。`);
    }
    donateModalItem.value = null;
    donateConfirmed.value = false;
};
/** 获取材料名称 */
const getMaterialName = (itemId) => {
    return getItemById(itemId)?.name ?? itemId;
};
/** 判断能否购买商品 */
const canBuyItem = (item) => {
    if (!guildStore.isShopItemUnlocked(item.itemId))
        return false;
    if (item.dailyLimit && guildStore.getDailyRemaining(item.itemId, item.dailyLimit) <= 0)
        return false;
    if (item.weeklyLimit && guildStore.getWeeklyRemaining(item.itemId, item.weeklyLimit) <= 0)
        return false;
    if (item.totalLimit && guildStore.getTotalRemaining(item.itemId, item.totalLimit) <= 0)
        return false;
    if (item.materials) {
        for (const mat of item.materials) {
            if (inventoryStore.getItemCount(mat.itemId) < mat.quantity)
                return false;
        }
    }
    if (item.contributionCost)
        return guildStore.contributionPoints >= item.contributionCost;
    return playerStore.money >= item.price;
};
const hasAnyKills = computed(() => Object.values(guildStore.monsterKills).some(v => v > 0));
/** 可捐献物品列表 */
const donatableItems = computed(() => {
    return GUILD_DONATIONS.map(donation => {
        const count = inventoryStore.getItemCount(donation.itemId);
        const def = getItemById(donation.itemId);
        return { itemId: donation.itemId, name: def?.name ?? donation.itemId, count, points: donation.points };
    });
});
const ZONE_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'shallow', label: '浅层' },
    { key: 'frost', label: '冰霜' },
    { key: 'lava', label: '熔岩' },
    { key: 'crystal', label: '水晶' },
    { key: 'shadow', label: '暗影' },
    { key: 'abyss', label: '深渊' },
    { key: 'boss', label: 'BOSS' },
    { key: 'skull', label: '骷髅矿穴' }
];
const filteredGoals = computed(() => {
    if (goalZone.value === 'all')
        return MONSTER_GOALS;
    return MONSTER_GOALS.filter(g => g.zone === goalZone.value);
});
const getKillCount = (monsterId) => {
    return guildStore.getKillCount(monsterId);
};
const isGoalClaimed = (monsterId) => {
    return guildStore.claimedGoals.includes(monsterId);
};
/** 怪物图鉴：合并普通怪+BOSS+骷髅矿穴 */
const allMonsters = computed(() => {
    const list = [];
    for (const m of Object.values(MONSTERS)) {
        list.push(m);
    }
    for (const m of Object.values(BOSS_MONSTERS)) {
        list.push(m);
    }
    for (const m of Object.values(SKULL_CAVERN_MONSTERS)) {
        list.push(m);
    }
    return list;
});
/** 怪物图鉴分组 */
const monsterGroups = computed(() => [
    { label: '普通怪物', monsters: Object.values(MONSTERS) },
    { label: 'BOSS', monsters: Object.values(BOSS_MONSTERS) },
    { label: '骷髅矿穴', monsters: Object.values(SKULL_CAVERN_MONSTERS) }
]);
const getDropName = (itemId) => {
    return getItemById(itemId)?.name ?? itemId;
};
/** 获取普通怪物所在区域 */
const getMonsterZone = (monsterId) => {
    for (const [zone, monsters] of Object.entries(ZONE_MONSTERS)) {
        if (monsters.some(m => m.id === monsterId))
            return zone;
    }
    return null;
};
/** 获取 BOSS 所在楼层 */
const getBossFloor = (monsterId) => {
    for (const [floor, monster] of Object.entries(BOSS_MONSTERS)) {
        if (monster.id === monsterId)
            return Number(floor);
    }
    return null;
};
/** 获取怪物的装备掉落列表 */
const getEquipDrops = (monster) => {
    const drops = [];
    const zone = getMonsterZone(monster.id);
    const bossFloor = getBossFloor(monster.id);
    if (zone) {
        for (const d of MONSTER_DROP_WEAPONS[zone] ?? []) {
            drops.push({ name: getWeaponById(d.weaponId)?.name ?? d.weaponId, chance: d.chance, firstKill: false });
        }
        for (const d of MONSTER_DROP_RINGS[zone] ?? []) {
            drops.push({ name: getRingById(d.ringId)?.name ?? d.ringId, chance: d.chance, firstKill: false });
        }
        for (const d of MONSTER_DROP_HATS[zone] ?? []) {
            drops.push({ name: getHatById(d.hatId)?.name ?? d.hatId, chance: d.chance, firstKill: false });
        }
        for (const d of MONSTER_DROP_SHOES[zone] ?? []) {
            drops.push({ name: getShoeById(d.shoeId)?.name ?? d.shoeId, chance: d.chance, firstKill: false });
        }
    }
    else if (bossFloor !== null) {
        const w = BOSS_DROP_WEAPONS[bossFloor];
        if (w)
            drops.push({ name: getWeaponById(w)?.name ?? w, chance: null, firstKill: true });
        const r = BOSS_DROP_RINGS[bossFloor];
        if (r)
            drops.push({ name: getRingById(r)?.name ?? r, chance: null, firstKill: false });
        const h = BOSS_DROP_HATS[bossFloor];
        if (h)
            drops.push({ name: getHatById(h)?.name ?? h, chance: null, firstKill: false });
        const s = BOSS_DROP_SHOES[bossFloor];
        if (s)
            drops.push({ name: getShoeById(s)?.name ?? s, chance: null, firstKill: false });
    }
    return drops;
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
/** @ts-ignore @type { | typeof __VLS_components.Swords} */
Swords;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.guildStore.guildLevel);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-2 text-xs" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.guildStore.contributionPoints);
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'goals' }) },
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'goals' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_10;
const __VLS_11 = {
    /** @type {typeof __VLS_10.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'goals';
        // @ts-ignore
        [guildStore, guildStore, tab, tab,];
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'donate' }) },
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'donate' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = {
    /** @type {typeof __VLS_18.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'donate';
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
const __VLS_21 = Button || Button;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'shop' }) },
}));
const __VLS_23 = __VLS_22({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'shop' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_26;
const __VLS_27 = {
    /** @type {typeof __VLS_26.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'shop';
        // @ts-ignore
        [tab, tab,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_28 } = __VLS_24.slots;
// @ts-ignore
[];
var __VLS_24;
var __VLS_25;
const __VLS_29 = Button || Button;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'bestiary' }) },
}));
const __VLS_31 = __VLS_30({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'bestiary' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
let __VLS_34;
const __VLS_35 = {
    /** @type {typeof __VLS_34.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'bestiary';
        // @ts-ignore
        [tab, tab,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_36 } = __VLS_32.slots;
// @ts-ignore
[];
var __VLS_32;
var __VLS_33;
if (__VLS_ctx.tab === 'goals') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    if (!__VLS_ctx.hasAnyKills) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-8 space-y-3 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        let __VLS_37;
        /** @ts-ignore @type { | typeof __VLS_components.Swords} */
        Swords;
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
            size: (48),
            ...{ class: "text-accent/30" },
        }));
        const __VLS_39 = __VLS_38({
            size: (48),
            ...{ class: "text-accent/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        /** @type {__VLS_StyleScopedClasses['text-accent/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/60 text-center max-w-60" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-60']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 md:grid-cols-none md:flex gap-1 md:space-x-1 mb-2 flex-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:space-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    for (const [z] of __VLS_vFor((__VLS_ctx.ZONE_FILTERS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'goals'))
                        throw 0;
                    return __VLS_ctx.goalZone = z.key;
                    // @ts-ignore
                    [tab, hasAnyKills, ZONE_FILTERS, goalZone,];
                } },
            key: (z.key),
            ...{ class: "btn text-xs" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.goalZone === z.key }) },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        (z.label);
        // @ts-ignore
        [goalZone,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-2 max-h-72 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [goal] of __VLS_vFor((__VLS_ctx.filteredGoals))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'goals'))
                        throw 0;
                    return __VLS_ctx.selectedGoal = goal;
                    // @ts-ignore
                    [filteredGoals, selectedGoal,];
                } },
            key: (goal.monsterId),
            ...{ class: "border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5 mr-1" },
            ...{ class: (__VLS_ctx.isGoalClaimed(goal.monsterId) ? 'border-success/30' : 'border-accent/20') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
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
        if (__VLS_ctx.isGoalClaimed(goal.monsterId)) {
            let __VLS_42;
            /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
            CircleCheck;
            // @ts-ignore
            const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
                size: (12),
                ...{ class: "text-success shrink-0" },
            }));
            const __VLS_44 = __VLS_43({
                size: (12),
                ...{ class: "text-success shrink-0" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_43));
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        }
        else {
            let __VLS_47;
            /** @ts-ignore @type { | typeof __VLS_components.Circle} */
            Circle;
            // @ts-ignore
            const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
                size: (12),
                ...{ class: "shrink-0" },
                ...{ class: (__VLS_ctx.getKillCount(goal.monsterId) >= goal.killTarget ? 'text-accent' : 'text-muted') },
            }));
            const __VLS_49 = __VLS_48({
                size: (12),
                ...{ class: "shrink-0" },
                ...{ class: (__VLS_ctx.getKillCount(goal.monsterId) >= goal.killTarget ? 'text-accent' : 'text-muted') },
            }, ...__VLS_functionalComponentArgsRest(__VLS_48));
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.isGoalClaimed(goal.monsterId) ? 'text-success' : 'text-text') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (goal.monsterName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.getKillCount(goal.monsterId));
        (goal.killTarget);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "h-1 bg-bg rounded-xs overflow-hidden" },
        });
        /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "h-full transition-all" },
            ...{ class: (__VLS_ctx.getKillCount(goal.monsterId) >= goal.killTarget ? 'bg-success' : 'bg-accent/60') },
            ...{ style: ({ width: Math.min(100, (__VLS_ctx.getKillCount(goal.monsterId) / goal.killTarget) * 100) + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        // @ts-ignore
        [isGoalClaimed, isGoalClaimed, isGoalClaimed, getKillCount, getKillCount, getKillCount, getKillCount,];
    }
}
let __VLS_52;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
    name: "panel-fade",
}));
const __VLS_54 = __VLS_53({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
const { default: __VLS_57 } = __VLS_55.slots;
if (__VLS_ctx.selectedGoal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedGoal))
                    throw 0;
                return __VLS_ctx.selectedGoal = null;
                // @ts-ignore
                [selectedGoal, selectedGoal,];
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
                if (!(__VLS_ctx.selectedGoal))
                    throw 0;
                return __VLS_ctx.selectedGoal = null;
                // @ts-ignore
                [selectedGoal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_58;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
        size: (14),
    }));
    const __VLS_60 = __VLS_59({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.isGoalClaimed(__VLS_ctx.selectedGoal.monsterId) ? 'text-success' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.selectedGoal.monsterName);
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
    (__VLS_ctx.selectedGoal.description);
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
    (__VLS_ctx.getKillCount(__VLS_ctx.selectedGoal.monsterId));
    (__VLS_ctx.selectedGoal.killTarget);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "h-1.5 bg-bg rounded-xs overflow-hidden mt-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full transition-all" },
        ...{ class: (__VLS_ctx.getKillCount(__VLS_ctx.selectedGoal.monsterId) >= __VLS_ctx.selectedGoal.killTarget ? 'bg-success' : 'bg-accent/60') },
        ...{ style: ({ width: Math.min(100, (__VLS_ctx.getKillCount(__VLS_ctx.selectedGoal.monsterId) / __VLS_ctx.selectedGoal.killTarget) * 100) + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.selectedGoal.reward.money);
    (__VLS_ctx.selectedGoal.reward.items
        ? ' + ' + __VLS_ctx.selectedGoal.reward.items.map(i => `${__VLS_ctx.getDropName(i.itemId)}×${i.quantity}`).join('、')
        : '');
    (__VLS_ctx.getGoalBonusPoints(__VLS_ctx.selectedGoal));
    if (__VLS_ctx.isGoalClaimed(__VLS_ctx.selectedGoal.monsterId)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-success/30 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-center items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_63;
        /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
        CircleCheck;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
            size: (12),
            ...{ class: "text-success" },
        }));
        const __VLS_65 = __VLS_64({
            size: (12),
            ...{ class: "text-success" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    else if (__VLS_ctx.getKillCount(__VLS_ctx.selectedGoal.monsterId) >= __VLS_ctx.selectedGoal.killTarget) {
        const __VLS_68 = Button || Button;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Gift),
            ...{ class: "btn text-xs w-full justify-center !bg-accent !text-bg" },
        }));
        const __VLS_70 = __VLS_69({
            ...{ 'onClick': {} },
            icon: (__VLS_ctx.Gift),
            ...{ class: "btn text-xs w-full justify-center !bg-accent !text-bg" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        let __VLS_73;
        const __VLS_74 = {
            /** @type {typeof __VLS_73.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedGoal))
                    throw 0;
                if (!!(__VLS_ctx.isGoalClaimed(__VLS_ctx.selectedGoal.monsterId)))
                    throw 0;
                if (!(__VLS_ctx.getKillCount(__VLS_ctx.selectedGoal.monsterId) >= __VLS_ctx.selectedGoal.killTarget))
                    throw 0;
                return __VLS_ctx.handleClaimGoal(__VLS_ctx.selectedGoal.monsterId);
                // @ts-ignore
                [selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, selectedGoal, isGoalClaimed, isGoalClaimed, getKillCount, getKillCount, getKillCount, getKillCount, getDropName, getGoalBonusPoints, Gift, handleClaimGoal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_75 } = __VLS_71.slots;
        // @ts-ignore
        [];
        var __VLS_71;
        var __VLS_72;
    }
}
// @ts-ignore
[];
var __VLS_55;
if (__VLS_ctx.tab === 'donate') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-2 max-h-72 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.donatableItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'donate'))
                        throw 0;
                    return item.count > 0 && __VLS_ctx.openDonateModal(item);
                    // @ts-ignore
                    [tab, donatableItems, openDonateModal,];
                } },
            key: (item.itemId),
            ...{ class: "flex items-center justify-between border rounded-xs px-3 py-2 mr-1" },
            ...{ class: (item.count > 0 ? 'border-accent/20 cursor-pointer hover:bg-accent/5' : 'border-accent/10 opacity-50') },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
            ...{ class: (item.count > 0 ? 'text-text' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (item.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.count);
        (item.points);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs ml-2" },
            ...{ class: (item.count > 0 ? 'text-accent' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (item.count * item.points);
        // @ts-ignore
        [];
    }
}
let __VLS_76;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
    name: "panel-fade",
}));
const __VLS_78 = __VLS_77({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
const { default: __VLS_81 } = __VLS_79.slots;
if (__VLS_ctx.donateModalItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.donateModalItem))
                    throw 0;
                return __VLS_ctx.donateModalItem = null;
                // @ts-ignore
                [donateModalItem, donateModalItem,];
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
                if (!(__VLS_ctx.donateModalItem))
                    throw 0;
                return __VLS_ctx.donateModalItem = null;
                // @ts-ignore
                [donateModalItem,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_82;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
        size: (14),
    }));
    const __VLS_84 = __VLS_83({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.donateModalItem.name);
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
    (__VLS_ctx.donateModalItem.count);
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
    (__VLS_ctx.donateModalItem.points);
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
    const __VLS_87 = Button || Button;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.donateQuantity <= 1),
    }));
    const __VLS_89 = __VLS_88({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.donateQuantity <= 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    let __VLS_92;
    const __VLS_93 = {
        /** @type {typeof __VLS_92.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.donateModalItem))
                throw 0;
            return __VLS_ctx.donateQuantity = Math.max(1, __VLS_ctx.donateQuantity - 1);
            // @ts-ignore
            [donateModalItem, donateModalItem, donateModalItem, donateQuantity, donateQuantity, donateQuantity,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_94 } = __VLS_90.slots;
    // @ts-ignore
    [];
    var __VLS_90;
    var __VLS_91;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onDonateInput) },
        type: "number",
        value: (__VLS_ctx.donateQuantity),
        min: "1",
        max: (__VLS_ctx.donateModalItem.count),
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
    const __VLS_95 = Button || Button;
    // @ts-ignore
    const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.donateQuantity >= __VLS_ctx.donateModalItem.count),
    }));
    const __VLS_97 = __VLS_96({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.donateQuantity >= __VLS_ctx.donateModalItem.count),
    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
    let __VLS_100;
    const __VLS_101 = {
        /** @type {typeof __VLS_100.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.donateModalItem))
                throw 0;
            return __VLS_ctx.donateQuantity = Math.min(__VLS_ctx.donateModalItem.count, __VLS_ctx.donateQuantity + 1);
            // @ts-ignore
            [donateModalItem, donateModalItem, donateModalItem, donateQuantity, donateQuantity, donateQuantity, donateQuantity, onDonateInput,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_102 } = __VLS_98.slots;
    // @ts-ignore
    [];
    var __VLS_98;
    var __VLS_99;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    const __VLS_103 = Button || Button;
    // @ts-ignore
    const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.donateQuantity <= 1),
    }));
    const __VLS_105 = __VLS_104({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.donateQuantity <= 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_104));
    let __VLS_108;
    const __VLS_109 = {
        /** @type {typeof __VLS_108.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.donateModalItem))
                throw 0;
            return __VLS_ctx.donateQuantity = 1;
            // @ts-ignore
            [donateQuantity, donateQuantity,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_110 } = __VLS_106.slots;
    // @ts-ignore
    [];
    var __VLS_106;
    var __VLS_107;
    const __VLS_111 = Button || Button;
    // @ts-ignore
    const __VLS_112 = __VLS_asFunctionalComponent1(__VLS_111, new __VLS_111({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.donateQuantity >= __VLS_ctx.donateModalItem.count),
    }));
    const __VLS_113 = __VLS_112({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.donateQuantity >= __VLS_ctx.donateModalItem.count),
    }, ...__VLS_functionalComponentArgsRest(__VLS_112));
    let __VLS_116;
    const __VLS_117 = {
        /** @type {typeof __VLS_116.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.donateModalItem))
                throw 0;
            return __VLS_ctx.donateQuantity = __VLS_ctx.donateModalItem.count;
            // @ts-ignore
            [donateModalItem, donateModalItem, donateQuantity, donateQuantity,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_118 } = __VLS_114.slots;
    // @ts-ignore
    [];
    var __VLS_114;
    var __VLS_115;
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
    (__VLS_ctx.donateQuantity * __VLS_ctx.donateModalItem.points);
    if (!__VLS_ctx.donateConfirmed) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        const __VLS_119 = Button || Button;
        // @ts-ignore
        const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
            ...{ 'onClick': {} },
            ...{ class: "btn text-xs w-full justify-center !bg-accent !text-bg" },
            icon: (__VLS_ctx.HandHeart),
        }));
        const __VLS_121 = __VLS_120({
            ...{ 'onClick': {} },
            ...{ class: "btn text-xs w-full justify-center !bg-accent !text-bg" },
            icon: (__VLS_ctx.HandHeart),
        }, ...__VLS_functionalComponentArgsRest(__VLS_120));
        let __VLS_124;
        const __VLS_125 = {
            /** @type {typeof __VLS_124.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.donateModalItem))
                    throw 0;
                if (!(!__VLS_ctx.donateConfirmed))
                    throw 0;
                return __VLS_ctx.donateConfirmed = true;
                // @ts-ignore
                [donateModalItem, donateQuantity, donateConfirmed, donateConfirmed, HandHeart,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_126 } = __VLS_122.slots;
        // @ts-ignore
        [];
        var __VLS_122;
        var __VLS_123;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-center text-danger mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.donateQuantity);
        (__VLS_ctx.donateModalItem.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        const __VLS_127 = Button || Button;
        // @ts-ignore
        const __VLS_128 = __VLS_asFunctionalComponent1(__VLS_127, new __VLS_127({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 btn text-xs justify-center" },
        }));
        const __VLS_129 = __VLS_128({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 btn text-xs justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_128));
        let __VLS_132;
        const __VLS_133 = {
            /** @type {typeof __VLS_132.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.donateModalItem))
                    throw 0;
                if (!!(!__VLS_ctx.donateConfirmed))
                    throw 0;
                return __VLS_ctx.donateConfirmed = false;
                // @ts-ignore
                [donateModalItem, donateQuantity, donateConfirmed,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_134 } = __VLS_130.slots;
        // @ts-ignore
        [];
        var __VLS_130;
        var __VLS_131;
        const __VLS_135 = Button || Button;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 btn text-xs justify-center !bg-accent !text-bg" },
            icon: (__VLS_ctx.HandHeart),
        }));
        const __VLS_137 = __VLS_136({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 btn text-xs justify-center !bg-accent !text-bg" },
            icon: (__VLS_ctx.HandHeart),
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
        let __VLS_140;
        const __VLS_141 = {
            /** @type {typeof __VLS_140.click} */
            onClick: (__VLS_ctx.executeDonate),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_142 } = __VLS_138.slots;
        // @ts-ignore
        [HandHeart, executeDonate,];
        var __VLS_138;
        var __VLS_139;
    }
}
// @ts-ignore
[];
var __VLS_79;
if (__VLS_ctx.tab === 'shop') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.GUILD_SHOP_ITEMS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'shop'))
                        throw 0;
                    return __VLS_ctx.openShopModal(item);
                    // @ts-ignore
                    [tab, GUILD_SHOP_ITEMS, openShopModal,];
                } },
            key: (item.itemId),
            ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm" },
            ...{ class: (__VLS_ctx.guildStore.isShopItemUnlocked(item.itemId) ? '' : 'text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (item.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.description);
        if (item.materials && __VLS_ctx.guildStore.isShopItemUnlocked(item.itemId)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            for (const [mat, idx] of __VLS_vFor((item.materials))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    key: (mat.itemId),
                    ...{ class: (__VLS_ctx.inventoryStore.getItemCount(mat.itemId) >= mat.quantity ? 'text-success' : 'text-danger') },
                });
                (__VLS_ctx.getMaterialName(mat.itemId));
                (mat.quantity);
                if (idx < item.materials.length - 1) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                }
                // @ts-ignore
                [guildStore, guildStore, inventoryStore, getMaterialName,];
            }
        }
        if (item.unlockGuildLevel && !__VLS_ctx.guildStore.isShopItemUnlocked(item.itemId)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-danger mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            let __VLS_143;
            /** @ts-ignore @type { | typeof __VLS_components.Lock} */
            Lock;
            // @ts-ignore
            const __VLS_144 = __VLS_asFunctionalComponent1(__VLS_143, new __VLS_143({
                size: (10),
                ...{ class: "inline" },
            }));
            const __VLS_145 = __VLS_144({
                size: (10),
                ...{ class: "inline" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_144));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            (item.unlockGuildLevel);
        }
        if (item.dailyLimit && __VLS_ctx.guildStore.isShopItemUnlocked(item.itemId)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            (__VLS_ctx.guildStore.getDailyRemaining(item.itemId, item.dailyLimit));
            (item.dailyLimit);
        }
        if (item.weeklyLimit && __VLS_ctx.guildStore.isShopItemUnlocked(item.itemId)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            (__VLS_ctx.guildStore.getWeeklyRemaining(item.itemId, item.weeklyLimit));
            (item.weeklyLimit);
        }
        if (item.totalLimit && __VLS_ctx.guildStore.isShopItemUnlocked(item.itemId)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            (__VLS_ctx.guildStore.getTotalRemaining(item.itemId, item.totalLimit));
            (item.totalLimit);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs whitespace-nowrap ml-2" },
            ...{ class: (item.contributionCost ? 'text-success' : 'text-accent') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (item.contributionCost ? `${item.contributionCost}贡献` : `${item.price}文`);
        // @ts-ignore
        [guildStore, guildStore, guildStore, guildStore, guildStore, guildStore, guildStore,];
    }
}
let __VLS_148;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent1(__VLS_148, new __VLS_148({
    name: "panel-fade",
}));
const __VLS_150 = __VLS_149({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
const { default: __VLS_153 } = __VLS_151.slots;
if (__VLS_ctx.shopModalItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                return __VLS_ctx.shopModalItem = null;
                // @ts-ignore
                [shopModalItem, shopModalItem,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-40']} */ ;
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
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                return __VLS_ctx.shopModalItem = null;
                // @ts-ignore
                [shopModalItem,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_154;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_155 = __VLS_asFunctionalComponent1(__VLS_154, new __VLS_154({
        size: (14),
    }));
    const __VLS_156 = __VLS_155({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_155));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.shopModalItem.name);
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
    (__VLS_ctx.shopModalItem.description);
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
    (__VLS_ctx.shopBuyQty > 1 ? '单价' : '价格');
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.shopModalItem.contributionCost ? 'text-success' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.shopModalItem.contributionCost ? `${__VLS_ctx.shopModalItem.contributionCost} 贡献点` : `${__VLS_ctx.shopModalItem.price}文`);
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
    (__VLS_ctx.inventoryStore.getItemCount(__VLS_ctx.shopModalItem.itemId));
    if (__VLS_ctx.shopModalItem.contributionCost) {
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
            ...{ class: (__VLS_ctx.guildStore.contributionPoints >= (__VLS_ctx.shopModalItem.contributionCost ?? 0) * __VLS_ctx.shopBuyQty ? 'text-text' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.guildStore.contributionPoints);
    }
    else {
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
            ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.shopModalItem.price * __VLS_ctx.shopBuyQty ? 'text-text' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.playerStore.money);
    }
    if (__VLS_ctx.shopModalItem.materials) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border-t border-accent/10 mt-1.5 pt-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['pt-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        for (const [mat] of __VLS_vFor((__VLS_ctx.shopModalItem.materials))) {
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
            (__VLS_ctx.getMaterialName(mat.itemId));
            (mat.quantity * __VLS_ctx.shopBuyQty);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.inventoryStore.getItemCount(mat.itemId) >= mat.quantity * __VLS_ctx.shopBuyQty ? 'text-success' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.inventoryStore.getItemCount(mat.itemId));
            (mat.quantity * __VLS_ctx.shopBuyQty);
            // @ts-ignore
            [guildStore, guildStore, inventoryStore, inventoryStore, inventoryStore, getMaterialName, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopBuyQty, shopBuyQty, shopBuyQty, shopBuyQty, shopBuyQty, shopBuyQty, playerStore, playerStore,];
        }
    }
    if (__VLS_ctx.shopModalItem.dailyLimit) {
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
        (__VLS_ctx.guildStore.getDailyRemaining(__VLS_ctx.shopModalItem.itemId, __VLS_ctx.shopModalItem.dailyLimit));
        (__VLS_ctx.shopModalItem.dailyLimit);
    }
    if (__VLS_ctx.shopModalItem.weeklyLimit) {
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
        (__VLS_ctx.guildStore.getWeeklyRemaining(__VLS_ctx.shopModalItem.itemId, __VLS_ctx.shopModalItem.weeklyLimit));
        (__VLS_ctx.shopModalItem.weeklyLimit);
    }
    if (__VLS_ctx.shopModalItem.totalLimit) {
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
        (__VLS_ctx.guildStore.getTotalRemaining(__VLS_ctx.shopModalItem.itemId, __VLS_ctx.shopModalItem.totalLimit));
        (__VLS_ctx.shopModalItem.totalLimit);
    }
    if (__VLS_ctx.maxShopBuyQty > 1) {
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
        const __VLS_159 = Button || Button;
        // @ts-ignore
        const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.shopBuyQty <= 1),
        }));
        const __VLS_161 = __VLS_160({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.shopBuyQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_160));
        let __VLS_164;
        const __VLS_165 = {
            /** @type {typeof __VLS_164.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                if (!(__VLS_ctx.maxShopBuyQty > 1))
                    throw 0;
                return __VLS_ctx.addShopBuyQty(-1);
                // @ts-ignore
                [guildStore, guildStore, guildStore, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopBuyQty, maxShopBuyQty, addShopBuyQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_166 } = __VLS_162.slots;
        // @ts-ignore
        [];
        var __VLS_162;
        var __VLS_163;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (__VLS_ctx.onShopBuyQtyInput) },
            type: "number",
            value: (__VLS_ctx.shopBuyQty),
            min: "1",
            max: (__VLS_ctx.maxShopBuyQty),
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
        const __VLS_167 = Button || Button;
        // @ts-ignore
        const __VLS_168 = __VLS_asFunctionalComponent1(__VLS_167, new __VLS_167({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.shopBuyQty >= __VLS_ctx.maxShopBuyQty),
        }));
        const __VLS_169 = __VLS_168({
            ...{ 'onClick': {} },
            ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
            disabled: (__VLS_ctx.shopBuyQty >= __VLS_ctx.maxShopBuyQty),
        }, ...__VLS_functionalComponentArgsRest(__VLS_168));
        let __VLS_172;
        const __VLS_173 = {
            /** @type {typeof __VLS_172.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                if (!(__VLS_ctx.maxShopBuyQty > 1))
                    throw 0;
                return __VLS_ctx.addShopBuyQty(1);
                // @ts-ignore
                [shopBuyQty, shopBuyQty, maxShopBuyQty, maxShopBuyQty, addShopBuyQty, onShopBuyQtyInput,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_174 } = __VLS_170.slots;
        // @ts-ignore
        [];
        var __VLS_170;
        var __VLS_171;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_175 = Button || Button;
        // @ts-ignore
        const __VLS_176 = __VLS_asFunctionalComponent1(__VLS_175, new __VLS_175({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.shopBuyQty <= 1),
        }));
        const __VLS_177 = __VLS_176({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.shopBuyQty <= 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_176));
        let __VLS_180;
        const __VLS_181 = {
            /** @type {typeof __VLS_180.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                if (!(__VLS_ctx.maxShopBuyQty > 1))
                    throw 0;
                return __VLS_ctx.setShopBuyQty(1);
                // @ts-ignore
                [shopBuyQty, setShopBuyQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_182 } = __VLS_178.slots;
        // @ts-ignore
        [];
        var __VLS_178;
        var __VLS_179;
        const __VLS_183 = Button || Button;
        // @ts-ignore
        const __VLS_184 = __VLS_asFunctionalComponent1(__VLS_183, new __VLS_183({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.shopBuyQty >= __VLS_ctx.maxShopBuyQty),
        }));
        const __VLS_185 = __VLS_184({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
            disabled: (__VLS_ctx.shopBuyQty >= __VLS_ctx.maxShopBuyQty),
        }, ...__VLS_functionalComponentArgsRest(__VLS_184));
        let __VLS_188;
        const __VLS_189 = {
            /** @type {typeof __VLS_188.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                if (!(__VLS_ctx.maxShopBuyQty > 1))
                    throw 0;
                return __VLS_ctx.setShopBuyQty(__VLS_ctx.maxShopBuyQty);
                // @ts-ignore
                [shopBuyQty, maxShopBuyQty, maxShopBuyQty, setShopBuyQty,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_190 } = __VLS_186.slots;
        // @ts-ignore
        [];
        var __VLS_186;
        var __VLS_187;
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
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.shopModalItem.contributionCost ? 'text-success' : 'text-accent') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.shopBuyTotalCost);
        (__VLS_ctx.shopModalItem.contributionCost ? '贡献点' : '文');
    }
    if (__VLS_ctx.shopModalItem.unlockGuildLevel && !__VLS_ctx.guildStore.isShopItemUnlocked(__VLS_ctx.shopModalItem.itemId)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        let __VLS_191;
        /** @ts-ignore @type { | typeof __VLS_components.Lock} */
        Lock;
        // @ts-ignore
        const __VLS_192 = __VLS_asFunctionalComponent1(__VLS_191, new __VLS_191({
            size: (10),
            ...{ class: "inline" },
        }));
        const __VLS_193 = __VLS_192({
            size: (10),
            ...{ class: "inline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_192));
        /** @type {__VLS_StyleScopedClasses['inline']} */ ;
        (__VLS_ctx.shopModalItem.unlockGuildLevel);
    }
    else {
        const __VLS_196 = Button || Button;
        // @ts-ignore
        const __VLS_197 = __VLS_asFunctionalComponent1(__VLS_196, new __VLS_196({
            ...{ 'onClick': {} },
            ...{ class: "btn text-xs w-full justify-center" },
            ...{ class: (__VLS_ctx.canBuyItem(__VLS_ctx.shopModalItem) ? '!bg-accent !text-bg' : 'opacity-50 cursor-not-allowed') },
            icon: (__VLS_ctx.ShoppingCart),
            disabled: (!__VLS_ctx.canBuyItem(__VLS_ctx.shopModalItem)),
        }));
        const __VLS_198 = __VLS_197({
            ...{ 'onClick': {} },
            ...{ class: "btn text-xs w-full justify-center" },
            ...{ class: (__VLS_ctx.canBuyItem(__VLS_ctx.shopModalItem) ? '!bg-accent !text-bg' : 'opacity-50 cursor-not-allowed') },
            icon: (__VLS_ctx.ShoppingCart),
            disabled: (!__VLS_ctx.canBuyItem(__VLS_ctx.shopModalItem)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_197));
        let __VLS_201;
        const __VLS_202 = {
            /** @type {typeof __VLS_201.click} */
            onClick: (__VLS_ctx.handleBuyShopItem),
        };
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_203 } = __VLS_199.slots;
        (__VLS_ctx.maxShopBuyQty > 1
            ? `购买 ×${__VLS_ctx.shopBuyQty}`
            : `购买 ${__VLS_ctx.shopModalItem.contributionCost ? `${__VLS_ctx.shopModalItem.contributionCost}贡献` : `${__VLS_ctx.shopModalItem.price}文`}`);
        // @ts-ignore
        [guildStore, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopBuyQty, maxShopBuyQty, shopBuyTotalCost, canBuyItem, canBuyItem, ShoppingCart, handleBuyShopItem,];
        var __VLS_199;
        var __VLS_200;
    }
}
// @ts-ignore
[];
var __VLS_151;
if (__VLS_ctx.tab === 'bestiary') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    if (__VLS_ctx.guildStore.encounteredMonsters.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-8 space-y-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        let __VLS_204;
        /** @ts-ignore @type { | typeof __VLS_components.BookOpen} */
        BookOpen;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent1(__VLS_204, new __VLS_204({
            size: (48),
            ...{ class: "text-accent/30" },
        }));
        const __VLS_206 = __VLS_205({
            size: (48),
            ...{ class: "text-accent/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
        /** @type {__VLS_StyleScopedClasses['text-accent/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/60 text-center max-w-60" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-60']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.guildStore.encounteredMonsters.length);
        (__VLS_ctx.allMonsters.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-h-72 overflow-y-auto flex flex-col space-y-3" },
        });
        /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        for (const [group] of __VLS_vFor((__VLS_ctx.monsterGroups))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (group.label),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (group.label);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1 mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            for (const [monster] of __VLS_vFor((group.monsters))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.tab === 'bestiary'))
                                throw 0;
                            if (!!(__VLS_ctx.guildStore.encounteredMonsters.length === 0))
                                throw 0;
                            return __VLS_ctx.guildStore.isEncountered(monster.id) && (__VLS_ctx.selectedMonster = monster);
                            // @ts-ignore
                            [guildStore, guildStore, guildStore, tab, allMonsters, monsterGroups, selectedMonster,];
                        } },
                    key: (monster.id),
                    ...{ class: "border rounded-xs p-1.5 text-xs text-center transition-colors truncate" },
                    ...{ class: (__VLS_ctx.guildStore.isEncountered(monster.id)
                            ? 'border-accent/20 cursor-pointer hover:bg-accent/5 text-text'
                            : 'border-accent/10 text-muted/30') },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                if (__VLS_ctx.guildStore.isEncountered(monster.id)) {
                    (monster.name);
                }
                else {
                    let __VLS_209;
                    /** @ts-ignore @type { | typeof __VLS_components.Lock} */
                    Lock;
                    // @ts-ignore
                    const __VLS_210 = __VLS_asFunctionalComponent1(__VLS_209, new __VLS_209({
                        size: (12),
                        ...{ class: "mx-auto text-muted/30" },
                    }));
                    const __VLS_211 = __VLS_210({
                        size: (12),
                        ...{ class: "mx-auto text-muted/30" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_210));
                    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
                }
                // @ts-ignore
                [guildStore, guildStore,];
            }
            // @ts-ignore
            [];
        }
    }
}
let __VLS_214;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_215 = __VLS_asFunctionalComponent1(__VLS_214, new __VLS_214({
    name: "panel-fade",
}));
const __VLS_216 = __VLS_215({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_215));
const { default: __VLS_219 } = __VLS_217.slots;
if (__VLS_ctx.selectedMonster) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedMonster))
                    throw 0;
                return __VLS_ctx.selectedMonster = null;
                // @ts-ignore
                [selectedMonster, selectedMonster,];
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
                if (!(__VLS_ctx.selectedMonster))
                    throw 0;
                return __VLS_ctx.selectedMonster = null;
                // @ts-ignore
                [selectedMonster,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_220;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent1(__VLS_220, new __VLS_220({
        size: (14),
    }));
    const __VLS_222 = __VLS_221({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.selectedMonster.name);
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
        ...{ class: "text-xs text-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    (__VLS_ctx.selectedMonster.hp);
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
    (__VLS_ctx.selectedMonster.attack);
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
    (__VLS_ctx.selectedMonster.defense);
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
    (__VLS_ctx.guildStore.getKillCount(__VLS_ctx.selectedMonster.id));
    if (__VLS_ctx.selectedMonster.drops.length > 0) {
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
        for (const [drop] of __VLS_vFor((__VLS_ctx.selectedMonster.drops))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (drop.itemId),
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
            (__VLS_ctx.getDropName(drop.itemId));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (Math.round(drop.chance * 100));
            // @ts-ignore
            [guildStore, getDropName, selectedMonster, selectedMonster, selectedMonster, selectedMonster, selectedMonster, selectedMonster, selectedMonster,];
        }
    }
    if (__VLS_ctx.getEquipDrops(__VLS_ctx.selectedMonster).length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2 mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        for (const [drop, idx] of __VLS_vFor((__VLS_ctx.getEquipDrops(__VLS_ctx.selectedMonster)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (idx),
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
            (drop.name);
            if (drop.firstKill) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            }
            if (drop.chance !== null) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (Math.round(drop.chance * 100));
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-success" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            }
            // @ts-ignore
            [selectedMonster, selectedMonster, getEquipDrops, getEquipDrops,];
        }
    }
}
// @ts-ignore
[];
var __VLS_217;
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
    ...{ class: "text-muted shrink-0" },
});
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
    ...{ style: ({ width: Math.round((__VLS_ctx.guildStore.completedGoalCount / __VLS_ctx.MONSTER_GOALS.length) * 100) + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-accent whitespace-nowrap" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
(Math.round((__VLS_ctx.guildStore.completedGoalCount / __VLS_ctx.MONSTER_GOALS.length) * 100));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid grid-cols-2 gap-x-3 gap-y-0.5" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-x-3']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-y-0.5']} */ ;
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
(__VLS_ctx.guildStore.completedGoalCount);
(__VLS_ctx.MONSTER_GOALS.length);
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
(__VLS_ctx.guildStore.claimedGoals.length);
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
(__VLS_ctx.guildStore.encounteredMonsters.length);
(__VLS_ctx.allMonsters.length);
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
(__VLS_ctx.guildStore.guildLevel);
// @ts-ignore
[guildStore, guildStore, guildStore, guildStore, guildStore, guildStore, allMonsters, MONSTER_GOALS, MONSTER_GOALS, MONSTER_GOALS,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
