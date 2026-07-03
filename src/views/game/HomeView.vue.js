/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from 'vue';
import { ArrowDown, ArrowDown01, ArrowDownToLine, ArrowUp, Building, ChevronDown, ChevronUp, Mountain, Leaf, Pencil, Plus, Trash2, Unlock, Warehouse, X } from 'lucide-vue-next';
import { useHomeStore } from '@/stores/useHomeStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useProcessingStore } from '@/stores/useProcessingStore';
import { useWarehouseStore } from '@/stores/useWarehouseStore';
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory';
import { getItemById } from '@/data';
import { GREENHOUSE_UNLOCK_COST, GREENHOUSE_MATERIAL_COST, WAREHOUSE_UNLOCK_MATERIALS, getCaveUpgrade } from '@/data/buildings';
import { CHEST_DEFS, CHEST_TIER_ORDER } from '@/data/items';
import { addLog } from '@/composables/useGameLog';
import Button from '@/components/game/Button.vue';
const homeStore = useHomeStore();
const inventoryStore = useInventoryStore();
const playerStore = usePlayerStore();
const warehouseStore = useWarehouseStore();
const processingStore = useProcessingStore();
const showGreenhouseModal = ref(false);
const showWarehouseUnlockModal = ref(false);
const showAddChestModal = ref(false);
const showChestDepositModal = ref(false);
const openChestId = ref(null);
const renamingChestId = ref(null);
const renameInput = ref('');
const getItemName = (itemId) => {
    return getItemById(itemId)?.name ?? itemId;
};
// === 山洞 ===
const handleChooseCave = (choice) => {
    if (homeStore.chooseCave(choice)) {
        const name = choice === 'mushroom' ? '蘑菇洞' : '蝙蝠洞';
        addLog(`选择了${name}，每天会有被动产出。`);
    }
};
const currentCaveDef = computed(() => getCaveUpgrade(homeStore.caveLevel) ?? null);
const caveQualityLabel = computed(() => QUALITY_LABEL[homeStore.caveQuality]);
const caveQualityClass = computed(() => qualityTextClass(homeStore.caveQuality));
const caveChanceText = computed(() => {
    const def = currentCaveDef.value;
    if (!def)
        return '';
    if (homeStore.caveChoice === 'mushroom')
        return `${Math.round(def.mushroomChance * 100)}%`;
    if (homeStore.caveChoice === 'fruit_bat')
        return `${Math.round(def.fruitBatChance * 100)}%`;
    return '';
});
const canUpgradeCave = computed(() => {
    const upgrade = homeStore.nextCaveUpgrade;
    if (!upgrade)
        return false;
    if (playerStore.money < upgrade.cost)
        return false;
    return upgrade.materialCost.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity);
});
const handleUpgradeCave = () => {
    if (homeStore.upgradeCave()) {
        addLog(`山洞升级至${homeStore.caveName}！`);
    }
    else {
        addLog('铜钱或材料不足，无法升级山洞。');
    }
};
// === 温室 ===
const canUnlockGreenhouse = computed(() => {
    if (playerStore.money < GREENHOUSE_UNLOCK_COST)
        return false;
    return GREENHOUSE_MATERIAL_COST.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity);
});
const handleUnlockFromModal = () => {
    if (homeStore.unlockGreenhouse()) {
        addLog('温室已解锁！可在农场面板中切换至温室进行种植。');
        showGreenhouseModal.value = false;
    }
    else {
        addLog('铜钱或材料不足，无法解锁温室。');
    }
};
// === 仓库 ===
const canUnlockWarehouse = computed(() => {
    if (playerStore.money < warehouseStore.UNLOCK_COST)
        return false;
    return WAREHOUSE_UNLOCK_MATERIALS.every(mat => getCombinedItemCount(mat.itemId) >= mat.quantity);
});
const handleUnlockWarehouse = () => {
    if (warehouseStore.unlocked)
        return;
    if (!canUnlockWarehouse.value) {
        addLog('铜钱或材料不足，无法解锁仓库。');
        return;
    }
    for (const mat of WAREHOUSE_UNLOCK_MATERIALS) {
        removeCombinedItem(mat.itemId, mat.quantity);
    }
    playerStore.spendMoney(warehouseStore.UNLOCK_COST);
    warehouseStore.unlocked = true;
    showWarehouseUnlockModal.value = false;
    addLog(`仓库已解锁！（-${warehouseStore.UNLOCK_COST}文）`);
};
// === 箱子管理 ===
/** 箱子道具信息弹窗 */
const chestItemDetail = ref(null);
const chestItemDef = computed(() => {
    if (!chestItemDetail.value)
        return null;
    return getItemById(chestItemDetail.value.itemId) ?? null;
});
const QUALITY_LABEL = {
    normal: '普通',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
};
const qualityTextClass = (q, fallback = '') => {
    if (q === 'fine')
        return 'text-quality-fine';
    if (q === 'excellent')
        return 'text-quality-excellent';
    if (q === 'supreme')
        return 'text-quality-supreme';
    return fallback;
};
const VOID_ROLES = [
    { value: 'none', label: '无' },
    { value: 'input', label: '原料箱' },
    { value: 'output', label: '成品箱' }
];
const currentOpenChest = computed(() => {
    if (!openChestId.value)
        return null;
    return warehouseStore.getChest(openChestId.value) ?? null;
});
/** 背包中可存入箱子的物品（排除种子和锁定物品） */
const depositableItems = computed(() => inventoryStore.items.filter(i => {
    if (i.locked)
        return false;
    const def = getItemById(i.itemId);
    return def && def.category !== 'seed';
}));
/** 背包中可一键存入的重复物品（箱子中已有且未锁定、非种子） */
const duplicateDepositItems = computed(() => {
    if (!currentOpenChest.value)
        return [];
    const chestItemIds = new Set(currentOpenChest.value.items.map(i => i.itemId));
    return inventoryStore.items.filter(i => {
        if (i.locked)
            return false;
        const def = getItemById(i.itemId);
        if (!def || def.category === 'seed')
            return false;
        return chestItemIds.has(i.itemId);
    });
});
/** 制作箱子 */
const canCraftChest = (tier) => {
    if (warehouseStore.chests.length >= warehouseStore.maxChests)
        return false;
    return processingStore.canCraft(CHEST_DEFS[tier].craftCost, CHEST_DEFS[tier].craftMoney);
};
const handleCraftChest = (tier) => {
    if (!canCraftChest(tier)) {
        addLog('材料或铜钱不足。');
        return;
    }
    if (!processingStore.consumeCraftMaterials(CHEST_DEFS[tier].craftCost, CHEST_DEFS[tier].craftMoney))
        return;
    warehouseStore.addChest(tier);
    addLog(`制作了${CHEST_DEFS[tier].name}！（-${CHEST_DEFS[tier].craftMoney}文）`);
    if (warehouseStore.chests.length >= warehouseStore.maxChests) {
        showAddChestModal.value = false;
    }
};
/** 拆卸箱子确认 */
const dismantleChestId = ref(null);
const dismantleChestInfo = computed(() => {
    if (!dismantleChestId.value)
        return null;
    const chest = warehouseStore.getChest(dismantleChestId.value);
    if (!chest)
        return null;
    const def = CHEST_DEFS[chest.tier];
    const refund = def.craftCost
        .map(mat => ({
        itemId: mat.itemId,
        quantity: Math.floor(mat.quantity * 0.5)
    }))
        .filter(m => m.quantity > 0);
    return { label: chest.label, tier: chest.tier, itemCount: chest.items.length, refund };
});
const openDismantleConfirm = (chestId) => {
    dismantleChestId.value = chestId;
};
const confirmDismantle = () => {
    const chestId = dismantleChestId.value;
    if (!chestId)
        return;
    const chest = warehouseStore.getChest(chestId);
    if (!chest)
        return;
    const info = dismantleChestInfo.value;
    if (!info)
        return;
    // 箱内物品返还背包
    for (const item of [...chest.items]) {
        inventoryStore.addItem(item.itemId, item.quantity, item.quality);
    }
    chest.items.length = 0;
    // 拆除箱子
    const name = chest.label;
    warehouseStore.removeChest(chestId);
    // 返还50%材料
    for (const mat of info.refund) {
        inventoryStore.addItem(mat.itemId, mat.quantity);
    }
    const refundText = info.refund.map(m => `${getItemName(m.itemId)}×${m.quantity}`).join('、');
    addLog(`拆卸了${name}。${refundText ? `返还了${refundText}。` : ''}`);
    dismantleChestId.value = null;
    if (openChestId.value === chestId)
        openChestId.value = null;
};
/** 重命名箱子 */
const startRenameChest = (chestId, currentLabel) => {
    renamingChestId.value = chestId;
    renameInput.value = currentLabel;
};
const confirmRenameChest = () => {
    if (renamingChestId.value) {
        warehouseStore.renameChest(renamingChestId.value, renameInput.value);
    }
    renamingChestId.value = null;
};
/** 虚空箱角色 */
const handleSetVoidRole = (chestId, role) => {
    warehouseStore.setVoidRole(chestId, role);
    const chest = warehouseStore.getChest(chestId);
    if (!chest)
        return;
    if (role === 'none')
        addLog(`${chest.label}已取消角色设置。`);
    else if (role === 'input')
        addLog(`${chest.label}已设为原料箱，作坊加工将自动从此箱取材料。`);
    else
        addLog(`${chest.label}已设为成品箱，作坊产品将自动放入此箱。`);
};
const chestQtyModal = ref(null);
const chestQty = ref(1);
const openChestQtyModal = (mode, chestId, itemId, quality, max) => {
    if (max <= 1) {
        if (mode === 'withdraw')
            executeChestWithdraw(chestId, itemId, quality, 1);
        else
            executeChestDeposit(chestId, itemId, quality, 1);
        return;
    }
    chestQtyModal.value = { mode, chestId, itemId, quality, max };
    chestQty.value = max;
};
const setChestQty = (val) => {
    if (!chestQtyModal.value)
        return;
    chestQty.value = Math.max(1, Math.min(val, chestQtyModal.value.max));
};
const addChestQty = (delta) => setChestQty(chestQty.value + delta);
const onChestQtyInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val))
        setChestQty(val);
};
const executeChestWithdraw = (chestId, itemId, quality, qty) => {
    if (!warehouseStore.withdrawFromChest(chestId, itemId, qty, quality)) {
        addLog('背包已满，无法取出。');
        return;
    }
    addLog(`取出了${getItemName(itemId)}×${qty}。`);
};
const executeChestDeposit = (chestId, itemId, quality, qty) => {
    const actualQty = warehouseStore.depositToChest(chestId, itemId, qty, quality);
    if (actualQty <= 0) {
        addLog('箱子已满，无法存入。');
        return;
    }
    addLog(`存入了${getItemName(itemId)}×${actualQty}。`);
    if (depositableItems.value.length === 0 || warehouseStore.isChestFull(chestId)) {
        showChestDepositModal.value = false;
    }
};
const confirmChestQty = () => {
    if (!chestQtyModal.value)
        return;
    const { mode, chestId, itemId, quality } = chestQtyModal.value;
    if (mode === 'withdraw')
        executeChestWithdraw(chestId, itemId, quality, chestQty.value);
    else
        executeChestDeposit(chestId, itemId, quality, chestQty.value);
    chestQtyModal.value = null;
};
/** 一键存入重复物品 */
const handleDepositDuplicates = () => {
    if (!openChestId.value)
        return;
    const chestId = openChestId.value;
    const snapshot = duplicateDepositItems.value.map(i => ({ itemId: i.itemId, quality: i.quality, quantity: i.quantity }));
    let totalDeposited = 0;
    let kindCount = 0;
    for (const item of snapshot) {
        const actual = warehouseStore.depositToChest(chestId, item.itemId, item.quantity, item.quality);
        if (actual > 0) {
            totalDeposited += actual;
            kindCount++;
        }
    }
    if (totalDeposited > 0) {
        addLog(`一键存入了${kindCount}种物品，共${totalDeposited}个。`);
    }
    else {
        addLog('箱子已满，无法存入。');
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
    ...{ class: "text-accent text-sm mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Building} */
Building;
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
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.Mountain} */
Mountain;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_7 = __VLS_6({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
(__VLS_ctx.homeStore.caveUnlocked && __VLS_ctx.homeStore.caveChoice !== 'none' ? __VLS_ctx.homeStore.caveName : '山洞');
if (!__VLS_ctx.homeStore.caveUnlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
}
else if (__VLS_ctx.homeStore.caveChoice === 'none') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.homeStore.caveUnlocked))
                    throw 0;
                if (!(__VLS_ctx.homeStore.caveChoice === 'none'))
                    throw 0;
                return __VLS_ctx.handleChooseCave('mushroom');
                // @ts-ignore
                [homeStore, homeStore, homeStore, homeStore, homeStore, handleChooseCave,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.homeStore.caveUnlocked))
                    throw 0;
                if (!(__VLS_ctx.homeStore.caveChoice === 'none'))
                    throw 0;
                return __VLS_ctx.handleChooseCave('fruit_bat');
                // @ts-ignore
                [handleChooseCave,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (__VLS_ctx.homeStore.caveChoice === 'mushroom' ? '蘑菇洞 — 每天有概率产出蘑菇类物品。' : '蝙蝠洞 — 每天有概率产出各季水果。');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2 space-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.homeStore.caveName);
    (__VLS_ctx.homeStore.caveLevel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px]" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    (__VLS_ctx.homeStore.caveDaysActive);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px]" },
        ...{ class: (__VLS_ctx.caveQualityClass) },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    (__VLS_ctx.caveQualityLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px]" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    (__VLS_ctx.caveChanceText);
    if (__VLS_ctx.currentCaveDef && __VLS_ctx.currentCaveDef.doubleChance > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px]" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (Math.round(__VLS_ctx.currentCaveDef.doubleChance * 100));
    }
    if (__VLS_ctx.homeStore.nextCaveUpgrade) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.homeStore.nextCaveUpgrade.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-0.5 mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        for (const [mat] of __VLS_vFor((__VLS_ctx.homeStore.nextCaveUpgrade.materialCost))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (mat.itemId),
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.getItemName(mat.itemId));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px]" },
                ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            (__VLS_ctx.getCombinedItemCount(mat.itemId));
            (mat.quantity);
            // @ts-ignore
            [homeStore, homeStore, homeStore, homeStore, homeStore, homeStore, homeStore, caveQualityClass, caveQualityLabel, caveChanceText, currentCaveDef, currentCaveDef, currentCaveDef, getItemName, getCombinedItemCount, getCombinedItemCount,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px]" },
            ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.homeStore.nextCaveUpgrade.cost ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (__VLS_ctx.homeStore.nextCaveUpgrade.cost);
        const __VLS_10 = Button || Button;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeCave }) },
            disabled: (!__VLS_ctx.canUpgradeCave),
            icon: (__VLS_ctx.ArrowUp),
            iconSize: (12),
        }));
        const __VLS_12 = __VLS_11({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUpgradeCave }) },
            disabled: (!__VLS_ctx.canUpgradeCave),
            icon: (__VLS_ctx.ArrowUp),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        let __VLS_15;
        const __VLS_16 = {
            /** @type {typeof __VLS_15.click} */
            onClick: (__VLS_ctx.handleUpgradeCave),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_17 } = __VLS_13.slots;
        // @ts-ignore
        [homeStore, homeStore, playerStore, canUpgradeCave, canUpgradeCave, ArrowUp, handleUpgradeCave,];
        var __VLS_13;
        var __VLS_14;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-sm text-accent mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
let __VLS_18;
/** @ts-ignore @type { | typeof __VLS_components.Leaf} */
Leaf;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_20 = __VLS_19({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
if (!__VLS_ctx.homeStore.greenhouseUnlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.homeStore.greenhouseUnlocked))
                    throw 0;
                return __VLS_ctx.showGreenhouseModal = true;
                // @ts-ignore
                [homeStore, showGreenhouseModal,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent whitespace-nowrap" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    (__VLS_ctx.GREENHOUSE_UNLOCK_COST);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
}
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
let __VLS_23;
/** @ts-ignore @type { | typeof __VLS_components.Warehouse} */
Warehouse;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_25 = __VLS_24({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
if (__VLS_ctx.warehouseStore.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.warehouseStore.chests.length);
    (__VLS_ctx.warehouseStore.maxChests);
}
if (!__VLS_ctx.warehouseStore.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.warehouseStore.unlocked))
                    throw 0;
                return __VLS_ctx.showWarehouseUnlockModal = true;
                // @ts-ignore
                [GREENHOUSE_UNLOCK_COST, warehouseStore, warehouseStore, warehouseStore, warehouseStore, showWarehouseUnlockModal,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent whitespace-nowrap" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    (__VLS_ctx.warehouseStore.UNLOCK_COST);
}
else {
    if (__VLS_ctx.warehouseStore.chests.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5 mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        for (const [chest, chestIdx] of __VLS_vFor((__VLS_ctx.warehouseStore.chests))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.warehouseStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.warehouseStore.chests.length > 0))
                            throw 0;
                        return __VLS_ctx.openChestId = chest.id;
                        // @ts-ignore
                        [warehouseStore, warehouseStore, warehouseStore, openChestId,];
                    } },
                key: (chest.id),
                ...{ class: "border border-accent/10 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
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
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] px-1 rounded-xs border border-accent/30" },
                ...{ class: (chest.tier === 'void' ? 'text-quality-supreme' : 'text-accent') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
            (__VLS_ctx.CHEST_DEFS[chest.tier].name);
            if (__VLS_ctx.renamingChestId !== chest.id) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (chest.label);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ onKeyup: (__VLS_ctx.confirmRenameChest) },
                    ...{ onKeyup: (...[$event]) => {
                            if (!!(!__VLS_ctx.warehouseStore.unlocked))
                                throw 0;
                            if (!(__VLS_ctx.warehouseStore.chests.length > 0))
                                throw 0;
                            if (!!(__VLS_ctx.renamingChestId !== chest.id))
                                throw 0;
                            return __VLS_ctx.renamingChestId = null;
                            // @ts-ignore
                            [CHEST_DEFS, renamingChestId, renamingChestId, confirmRenameChest,];
                        } },
                    ...{ onClick: () => { } },
                    ...{ class: "text-xs bg-transparent border-b border-accent/40 outline-none w-20" },
                    maxlength: "8",
                });
                (__VLS_ctx.renameInput);
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-transparent']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/40']} */ ;
                /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-20']} */ ;
            }
            if (__VLS_ctx.renamingChestId !== chest.id) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.warehouseStore.unlocked))
                                throw 0;
                            if (!(__VLS_ctx.warehouseStore.chests.length > 0))
                                throw 0;
                            if (!(__VLS_ctx.renamingChestId !== chest.id))
                                throw 0;
                            return __VLS_ctx.startRenameChest(chest.id, chest.label);
                            // @ts-ignore
                            [renamingChestId, renameInput, startRenameChest,];
                        } },
                    ...{ class: "text-muted hover:text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-accent']} */ ;
                let __VLS_28;
                /** @ts-ignore @type { | typeof __VLS_components.Pencil} */
                Pencil;
                // @ts-ignore
                const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
                    size: (10),
                }));
                const __VLS_30 = __VLS_29({
                    size: (10),
                }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            }
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
            (chest.items.length);
            (__VLS_ctx.CHEST_DEFS[chest.tier].capacity);
            if (__VLS_ctx.warehouseStore.chests.length > 1 && chestIdx > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.warehouseStore.unlocked))
                                throw 0;
                            if (!(__VLS_ctx.warehouseStore.chests.length > 0))
                                throw 0;
                            if (!(__VLS_ctx.warehouseStore.chests.length > 1 && chestIdx > 0))
                                throw 0;
                            return __VLS_ctx.warehouseStore.moveChest(chest.id, 'up');
                            // @ts-ignore
                            [warehouseStore, warehouseStore, CHEST_DEFS,];
                        } },
                    ...{ class: "text-muted hover:text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-accent']} */ ;
                let __VLS_33;
                /** @ts-ignore @type { | typeof __VLS_components.ChevronUp} */
                ChevronUp;
                // @ts-ignore
                const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
                    size: (12),
                }));
                const __VLS_35 = __VLS_34({
                    size: (12),
                }, ...__VLS_functionalComponentArgsRest(__VLS_34));
            }
            if (__VLS_ctx.warehouseStore.chests.length > 1 && chestIdx < __VLS_ctx.warehouseStore.chests.length - 1) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.warehouseStore.unlocked))
                                throw 0;
                            if (!(__VLS_ctx.warehouseStore.chests.length > 0))
                                throw 0;
                            if (!(__VLS_ctx.warehouseStore.chests.length > 1 && chestIdx < __VLS_ctx.warehouseStore.chests.length - 1))
                                throw 0;
                            return __VLS_ctx.warehouseStore.moveChest(chest.id, 'down');
                            // @ts-ignore
                            [warehouseStore, warehouseStore, warehouseStore,];
                        } },
                    ...{ class: "text-muted hover:text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-accent']} */ ;
                let __VLS_38;
                /** @ts-ignore @type { | typeof __VLS_components.ChevronDown} */
                ChevronDown;
                // @ts-ignore
                const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
                    size: (12),
                }));
                const __VLS_40 = __VLS_39({
                    size: (12),
                }, ...__VLS_functionalComponentArgsRest(__VLS_39));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.warehouseStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.warehouseStore.chests.length > 0))
                            throw 0;
                        return __VLS_ctx.openDismantleConfirm(chest.id);
                        // @ts-ignore
                        [openDismantleConfirm,];
                    } },
                ...{ class: "text-muted hover:text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-danger']} */ ;
            let __VLS_43;
            /** @ts-ignore @type { | typeof __VLS_components.Trash2} */
            Trash2;
            // @ts-ignore
            const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
                size: (10),
            }));
            const __VLS_45 = __VLS_44({
                size: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_44));
            if (chest.tier === 'void') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                for (const [role] of __VLS_vFor((__VLS_ctx.VOID_ROLES))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.warehouseStore.unlocked))
                                    throw 0;
                                if (!(__VLS_ctx.warehouseStore.chests.length > 0))
                                    throw 0;
                                if (!(chest.tier === 'void'))
                                    throw 0;
                                return __VLS_ctx.handleSetVoidRole(chest.id, role.value);
                                // @ts-ignore
                                [VOID_ROLES, handleSetVoidRole,];
                            } },
                        key: (role.value),
                        ...{ class: "text-[10px] px-1 rounded-xs border" },
                        ...{ class: (chest.voidRole === role.value ? 'border-accent text-accent' : 'border-accent/20 text-muted') },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    (role.label);
                    // @ts-ignore
                    [];
                }
            }
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-4 text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        let __VLS_48;
        /** @ts-ignore @type { | typeof __VLS_components.Warehouse} */
        Warehouse;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
            size: (24),
        }));
        const __VLS_50 = __VLS_49({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    }
    if (__VLS_ctx.warehouseStore.chests.length < __VLS_ctx.warehouseStore.maxChests) {
        const __VLS_53 = Button || Button;
        // @ts-ignore
        const __VLS_54 = __VLS_asFunctionalComponent1(__VLS_53, new __VLS_53({
            ...{ 'onClick': {} },
            ...{ class: "w-full" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
        }));
        const __VLS_55 = __VLS_54({
            ...{ 'onClick': {} },
            ...{ class: "w-full" },
            icon: (__VLS_ctx.Plus),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_54));
        let __VLS_58;
        const __VLS_59 = {
            /** @type {typeof __VLS_58.click} */
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.warehouseStore.unlocked))
                    throw 0;
                if (!(__VLS_ctx.warehouseStore.chests.length < __VLS_ctx.warehouseStore.maxChests))
                    throw 0;
                return __VLS_ctx.showAddChestModal = true;
                // @ts-ignore
                [warehouseStore, warehouseStore, Plus, showAddChestModal,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        const { default: __VLS_60 } = __VLS_56.slots;
        // @ts-ignore
        [];
        var __VLS_56;
        var __VLS_57;
    }
}
let __VLS_61;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
    name: "panel-fade",
}));
const __VLS_63 = __VLS_62({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
const { default: __VLS_66 } = __VLS_64.slots;
if (__VLS_ctx.showGreenhouseModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showGreenhouseModal))
                    throw 0;
                return __VLS_ctx.showGreenhouseModal = false;
                // @ts-ignore
                [showGreenhouseModal, showGreenhouseModal,];
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
                if (!(__VLS_ctx.showGreenhouseModal))
                    throw 0;
                return __VLS_ctx.showGreenhouseModal = false;
                // @ts-ignore
                [showGreenhouseModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_67;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
        size: (14),
    }));
    const __VLS_69 = __VLS_68({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_68));
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
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
    for (const [mat] of __VLS_vFor((__VLS_ctx.GREENHOUSE_MATERIAL_COST))) {
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
        [getItemName, getCombinedItemCount, getCombinedItemCount, GREENHOUSE_MATERIAL_COST,];
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
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.GREENHOUSE_UNLOCK_COST ? '' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.GREENHOUSE_UNLOCK_COST);
    const __VLS_72 = Button || Button;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUnlockGreenhouse }) },
        disabled: (!__VLS_ctx.canUnlockGreenhouse),
        icon: (__VLS_ctx.Unlock),
        iconSize: (12),
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUnlockGreenhouse }) },
        disabled: (!__VLS_ctx.canUnlockGreenhouse),
        icon: (__VLS_ctx.Unlock),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_77;
    const __VLS_78 = {
        /** @type {typeof __VLS_77.click} */
        onClick: (__VLS_ctx.handleUnlockFromModal),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_79 } = __VLS_75.slots;
    // @ts-ignore
    [playerStore, GREENHOUSE_UNLOCK_COST, GREENHOUSE_UNLOCK_COST, canUnlockGreenhouse, canUnlockGreenhouse, Unlock, handleUnlockFromModal,];
    var __VLS_75;
    var __VLS_76;
}
// @ts-ignore
[];
var __VLS_64;
let __VLS_80;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
    name: "panel-fade",
}));
const __VLS_82 = __VLS_81({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
const { default: __VLS_85 } = __VLS_83.slots;
if (__VLS_ctx.showWarehouseUnlockModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showWarehouseUnlockModal))
                    throw 0;
                return __VLS_ctx.showWarehouseUnlockModal = false;
                // @ts-ignore
                [showWarehouseUnlockModal, showWarehouseUnlockModal,];
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
                if (!(__VLS_ctx.showWarehouseUnlockModal))
                    throw 0;
                return __VLS_ctx.showWarehouseUnlockModal = false;
                // @ts-ignore
                [showWarehouseUnlockModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_86;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
        size: (14),
    }));
    const __VLS_88 = __VLS_87({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_87));
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2 space-y-1" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    for (const [mat] of __VLS_vFor((__VLS_ctx.WAREHOUSE_UNLOCK_MATERIALS))) {
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
        [getItemName, getCombinedItemCount, getCombinedItemCount, WAREHOUSE_UNLOCK_MATERIALS,];
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
        ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.warehouseStore.UNLOCK_COST ? '' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.warehouseStore.UNLOCK_COST);
    const __VLS_91 = Button || Button;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent1(__VLS_91, new __VLS_91({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUnlockWarehouse }) },
        disabled: (!__VLS_ctx.canUnlockWarehouse),
        icon: (__VLS_ctx.Unlock),
        iconSize: (12),
    }));
    const __VLS_93 = __VLS_92({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canUnlockWarehouse }) },
        disabled: (!__VLS_ctx.canUnlockWarehouse),
        icon: (__VLS_ctx.Unlock),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
    let __VLS_96;
    const __VLS_97 = {
        /** @type {typeof __VLS_96.click} */
        onClick: (__VLS_ctx.handleUnlockWarehouse),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_98 } = __VLS_94.slots;
    // @ts-ignore
    [playerStore, warehouseStore, warehouseStore, Unlock, canUnlockWarehouse, canUnlockWarehouse, handleUnlockWarehouse,];
    var __VLS_94;
    var __VLS_95;
}
// @ts-ignore
[];
var __VLS_83;
let __VLS_99;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({
    name: "panel-fade",
}));
const __VLS_101 = __VLS_100({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_100));
const { default: __VLS_104 } = __VLS_102.slots;
if (__VLS_ctx.openChestId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.openChestId))
                    throw 0;
                return __VLS_ctx.openChestId = null;
                // @ts-ignore
                [openChestId, openChestId,];
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
    if (__VLS_ctx.currentOpenChest) {
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] px-1 rounded-xs border border-accent/30" },
            ...{ class: (__VLS_ctx.currentOpenChest.tier === 'void' ? 'text-quality-supreme' : 'text-accent') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        (__VLS_ctx.CHEST_DEFS[__VLS_ctx.currentOpenChest.tier].name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.currentOpenChest.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.currentOpenChest.items.length);
        (__VLS_ctx.CHEST_DEFS[__VLS_ctx.currentOpenChest.tier].capacity);
        const __VLS_105 = Button;
        // @ts-ignore
        const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }));
        const __VLS_107 = __VLS_106({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1" },
            icon: (__VLS_ctx.X),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_106));
        let __VLS_110;
        const __VLS_111 = {
            /** @type {typeof __VLS_110.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.openChestId))
                    throw 0;
                if (!(__VLS_ctx.currentOpenChest))
                    throw 0;
                return __VLS_ctx.openChestId = null;
                // @ts-ignore
                [openChestId, CHEST_DEFS, CHEST_DEFS, currentOpenChest, currentOpenChest, currentOpenChest, currentOpenChest, currentOpenChest, currentOpenChest, X,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        var __VLS_108;
        var __VLS_109;
        if (__VLS_ctx.currentOpenChest.items.length > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1 mb-2 max-h-48 overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            for (const [item, idx] of __VLS_vFor((__VLS_ctx.currentOpenChest.items))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.openChestId))
                                throw 0;
                            if (!(__VLS_ctx.currentOpenChest))
                                throw 0;
                            if (!(__VLS_ctx.currentOpenChest.items.length > 0))
                                throw 0;
                            return __VLS_ctx.chestItemDetail = { itemId: item.itemId, quality: item.quality, quantity: item.quantity };
                            // @ts-ignore
                            [currentOpenChest, currentOpenChest, chestItemDetail,];
                        } },
                    key: (idx),
                    ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1 mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs truncate mr-2 cursor-pointer hover:underline" },
                    ...{ class: (__VLS_ctx.qualityTextClass(item.quality)) },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
                (__VLS_ctx.getItemName(item.itemId));
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (item.quantity);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
                const __VLS_112 = Button || Button;
                // @ts-ignore
                const __VLS_113 = __VLS_asFunctionalComponent1(__VLS_112, new __VLS_112({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                }));
                const __VLS_114 = __VLS_113({
                    ...{ 'onClick': {} },
                    ...{ class: "py-0 px-1" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_113));
                let __VLS_117;
                const __VLS_118 = {
                    /** @type {typeof __VLS_117.click} */
                    onClick: (...[$event]) => {
                        if (!(__VLS_ctx.openChestId))
                            throw 0;
                        if (!(__VLS_ctx.currentOpenChest))
                            throw 0;
                        if (!(__VLS_ctx.currentOpenChest.items.length > 0))
                            throw 0;
                        return __VLS_ctx.openChestQtyModal('withdraw', __VLS_ctx.openChestId, item.itemId, item.quality, item.quantity);
                        // @ts-ignore
                        [getItemName, openChestId, qualityTextClass, openChestQtyModal,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                const { default: __VLS_119 } = __VLS_115.slots;
                // @ts-ignore
                [];
                var __VLS_115;
                var __VLS_116;
                // @ts-ignore
                [];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-6 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            let __VLS_120;
            /** @ts-ignore @type { | typeof __VLS_components.Warehouse} */
            Warehouse;
            // @ts-ignore
            const __VLS_121 = __VLS_asFunctionalComponent1(__VLS_120, new __VLS_120({
                size: (36),
                ...{ class: "text-accent/20 mb-2" },
            }));
            const __VLS_122 = __VLS_121({
                size: (36),
                ...{ class: "text-accent/20 mb-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_121));
            /** @type {__VLS_StyleScopedClasses['text-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted/50 mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        }
        if (__VLS_ctx.currentOpenChest && __VLS_ctx.currentOpenChest.items.length > 1) {
            const __VLS_125 = Button || Button;
            // @ts-ignore
            const __VLS_126 = __VLS_asFunctionalComponent1(__VLS_125, new __VLS_125({
                ...{ 'onClick': {} },
                ...{ class: "w-full mb-1" },
                icon: (__VLS_ctx.ArrowDown01),
                iconSize: (12),
            }));
            const __VLS_127 = __VLS_126({
                ...{ 'onClick': {} },
                ...{ class: "w-full mb-1" },
                icon: (__VLS_ctx.ArrowDown01),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_126));
            let __VLS_130;
            const __VLS_131 = {
                /** @type {typeof __VLS_130.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.openChestId))
                        throw 0;
                    if (!(__VLS_ctx.currentOpenChest))
                        throw 0;
                    if (!(__VLS_ctx.currentOpenChest && __VLS_ctx.currentOpenChest.items.length > 1))
                        throw 0;
                    return __VLS_ctx.warehouseStore.sortChest(__VLS_ctx.openChestId);
                    // @ts-ignore
                    [warehouseStore, openChestId, currentOpenChest, currentOpenChest, ArrowDown01,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            const { default: __VLS_132 } = __VLS_128.slots;
            // @ts-ignore
            [];
            var __VLS_128;
            var __VLS_129;
        }
        if (__VLS_ctx.duplicateDepositItems.length > 0) {
            const __VLS_133 = Button || Button;
            // @ts-ignore
            const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
                ...{ 'onClick': {} },
                ...{ class: "w-full mb-1" },
                icon: (__VLS_ctx.ArrowDownToLine),
                iconSize: (12),
            }));
            const __VLS_135 = __VLS_134({
                ...{ 'onClick': {} },
                ...{ class: "w-full mb-1" },
                icon: (__VLS_ctx.ArrowDownToLine),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_134));
            let __VLS_138;
            const __VLS_139 = {
                /** @type {typeof __VLS_138.click} */
                onClick: (__VLS_ctx.handleDepositDuplicates),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            const { default: __VLS_140 } = __VLS_136.slots;
            // @ts-ignore
            [duplicateDepositItems, ArrowDownToLine, handleDepositDuplicates,];
            var __VLS_136;
            var __VLS_137;
        }
        if (__VLS_ctx.depositableItems.length > 0) {
            const __VLS_141 = Button || Button;
            // @ts-ignore
            const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({
                ...{ 'onClick': {} },
                ...{ class: "w-full" },
                icon: (__VLS_ctx.ArrowDown),
                iconSize: (12),
            }));
            const __VLS_143 = __VLS_142({
                ...{ 'onClick': {} },
                ...{ class: "w-full" },
                icon: (__VLS_ctx.ArrowDown),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_142));
            let __VLS_146;
            const __VLS_147 = {
                /** @type {typeof __VLS_146.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.openChestId))
                        throw 0;
                    if (!(__VLS_ctx.currentOpenChest))
                        throw 0;
                    if (!(__VLS_ctx.depositableItems.length > 0))
                        throw 0;
                    return __VLS_ctx.showChestDepositModal = true;
                    // @ts-ignore
                    [depositableItems, ArrowDown, showChestDepositModal,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            const { default: __VLS_148 } = __VLS_144.slots;
            // @ts-ignore
            [];
            var __VLS_144;
            var __VLS_145;
        }
    }
}
// @ts-ignore
[];
var __VLS_102;
let __VLS_149;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_150 = __VLS_asFunctionalComponent1(__VLS_149, new __VLS_149({
    name: "panel-fade",
}));
const __VLS_151 = __VLS_150({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_150));
const { default: __VLS_154 } = __VLS_152.slots;
if (__VLS_ctx.showChestDepositModal && __VLS_ctx.openChestId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showChestDepositModal && __VLS_ctx.openChestId))
                    throw 0;
                return __VLS_ctx.showChestDepositModal = false;
                // @ts-ignore
                [openChestId, showChestDepositModal, showChestDepositModal,];
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
    const __VLS_155 = Button;
    // @ts-ignore
    const __VLS_156 = __VLS_asFunctionalComponent1(__VLS_155, new __VLS_155({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_157 = __VLS_156({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_156));
    let __VLS_160;
    const __VLS_161 = {
        /** @type {typeof __VLS_160.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showChestDepositModal && __VLS_ctx.openChestId))
                throw 0;
            return __VLS_ctx.showChestDepositModal = false;
            // @ts-ignore
            [X, showChestDepositModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_158;
    var __VLS_159;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.depositableItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showChestDepositModal && __VLS_ctx.openChestId))
                        throw 0;
                    return __VLS_ctx.openChestQtyModal('deposit', __VLS_ctx.openChestId, item.itemId, item.quality, item.quantity);
                    // @ts-ignore
                    [openChestId, openChestQtyModal, depositableItems,];
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
            ...{ class: "text-xs truncate mr-2" },
            ...{ class: (__VLS_ctx.qualityTextClass(item.quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        (__VLS_ctx.getItemName(item.itemId));
        if (item.quality !== 'normal') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px]" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            (__VLS_ctx.QUALITY_LABEL[item.quality]);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.quantity);
        // @ts-ignore
        [getItemName, qualityTextClass, QUALITY_LABEL,];
    }
}
// @ts-ignore
[];
var __VLS_152;
let __VLS_162;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
    name: "panel-fade",
}));
const __VLS_164 = __VLS_163({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
const { default: __VLS_167 } = __VLS_165.slots;
if (__VLS_ctx.chestQtyModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.chestQtyModal))
                    throw 0;
                return __VLS_ctx.chestQtyModal = null;
                // @ts-ignore
                [chestQtyModal, chestQtyModal,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[60]']} */ ;
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
    (__VLS_ctx.chestQtyModal.mode === 'withdraw' ? '取出' : '存入');
    const __VLS_168 = Button;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_170 = __VLS_169({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    let __VLS_173;
    const __VLS_174 = {
        /** @type {typeof __VLS_173.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.chestQtyModal))
                throw 0;
            return __VLS_ctx.chestQtyModal = null;
            // @ts-ignore
            [X, chestQtyModal, chestQtyModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_171;
    var __VLS_172;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mb-2" },
        ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.chestQtyModal.quality)) },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.getItemName(__VLS_ctx.chestQtyModal.itemId));
    if (__VLS_ctx.chestQtyModal.quality !== 'normal') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px]" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (__VLS_ctx.QUALITY_LABEL[__VLS_ctx.chestQtyModal.quality]);
    }
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
    const __VLS_175 = Button || Button;
    // @ts-ignore
    const __VLS_176 = __VLS_asFunctionalComponent1(__VLS_175, new __VLS_175({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.chestQty <= 1),
    }));
    const __VLS_177 = __VLS_176({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.chestQty <= 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_176));
    let __VLS_180;
    const __VLS_181 = {
        /** @type {typeof __VLS_180.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.chestQtyModal))
                throw 0;
            return __VLS_ctx.addChestQty(-1);
            // @ts-ignore
            [getItemName, qualityTextClass, QUALITY_LABEL, chestQtyModal, chestQtyModal, chestQtyModal, chestQtyModal, chestQty, addChestQty,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_182 } = __VLS_178.slots;
    // @ts-ignore
    [];
    var __VLS_178;
    var __VLS_179;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onChestQtyInput) },
        type: "number",
        value: (__VLS_ctx.chestQty),
        min: "1",
        max: (__VLS_ctx.chestQtyModal.max),
        ...{ class: "w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none" },
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
    const __VLS_183 = Button || Button;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent1(__VLS_183, new __VLS_183({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.chestQty >= __VLS_ctx.chestQtyModal.max),
    }));
    const __VLS_185 = __VLS_184({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.chestQty >= __VLS_ctx.chestQtyModal.max),
    }, ...__VLS_functionalComponentArgsRest(__VLS_184));
    let __VLS_188;
    const __VLS_189 = {
        /** @type {typeof __VLS_188.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.chestQtyModal))
                throw 0;
            return __VLS_ctx.addChestQty(1);
            // @ts-ignore
            [chestQtyModal, chestQtyModal, chestQty, chestQty, addChestQty, onChestQtyInput,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_190 } = __VLS_186.slots;
    // @ts-ignore
    [];
    var __VLS_186;
    var __VLS_187;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    const __VLS_191 = Button || Button;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent1(__VLS_191, new __VLS_191({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.chestQty <= 1),
    }));
    const __VLS_193 = __VLS_192({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.chestQty <= 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    let __VLS_196;
    const __VLS_197 = {
        /** @type {typeof __VLS_196.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.chestQtyModal))
                throw 0;
            return __VLS_ctx.setChestQty(1);
            // @ts-ignore
            [chestQty, setChestQty,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_198 } = __VLS_194.slots;
    // @ts-ignore
    [];
    var __VLS_194;
    var __VLS_195;
    const __VLS_199 = Button || Button;
    // @ts-ignore
    const __VLS_200 = __VLS_asFunctionalComponent1(__VLS_199, new __VLS_199({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.chestQty >= __VLS_ctx.chestQtyModal.max),
    }));
    const __VLS_201 = __VLS_200({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.chestQty >= __VLS_ctx.chestQtyModal.max),
    }, ...__VLS_functionalComponentArgsRest(__VLS_200));
    let __VLS_204;
    const __VLS_205 = {
        /** @type {typeof __VLS_204.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.chestQtyModal))
                throw 0;
            return __VLS_ctx.setChestQty(__VLS_ctx.chestQtyModal.max);
            // @ts-ignore
            [chestQtyModal, chestQtyModal, chestQty, setChestQty,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_206 } = __VLS_202.slots;
    // @ts-ignore
    [];
    var __VLS_202;
    var __VLS_203;
    const __VLS_207 = Button || Button;
    // @ts-ignore
    const __VLS_208 = __VLS_asFunctionalComponent1(__VLS_207, new __VLS_207({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
    }));
    const __VLS_209 = __VLS_208({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_208));
    let __VLS_212;
    const __VLS_213 = {
        /** @type {typeof __VLS_212.click} */
        onClick: (__VLS_ctx.confirmChestQty),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_214 } = __VLS_210.slots;
    (__VLS_ctx.chestQtyModal.mode === 'withdraw' ? '取出' : '存入');
    (__VLS_ctx.chestQty);
    // @ts-ignore
    [chestQtyModal, chestQty, confirmChestQty,];
    var __VLS_210;
    var __VLS_211;
}
// @ts-ignore
[];
var __VLS_165;
let __VLS_215;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_216 = __VLS_asFunctionalComponent1(__VLS_215, new __VLS_215({
    name: "panel-fade",
}));
const __VLS_217 = __VLS_216({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_216));
const { default: __VLS_220 } = __VLS_218.slots;
if (__VLS_ctx.dismantleChestId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.dismantleChestId))
                    throw 0;
                return __VLS_ctx.dismantleChestId = null;
                // @ts-ignore
                [dismantleChestId, dismantleChestId,];
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
    const __VLS_221 = Button;
    // @ts-ignore
    const __VLS_222 = __VLS_asFunctionalComponent1(__VLS_221, new __VLS_221({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_223 = __VLS_222({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_222));
    let __VLS_226;
    const __VLS_227 = {
        /** @type {typeof __VLS_226.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.dismantleChestId))
                throw 0;
            return __VLS_ctx.dismantleChestId = null;
            // @ts-ignore
            [X, dismantleChestId,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_224;
    var __VLS_225;
    if (__VLS_ctx.dismantleChestInfo) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.dismantleChestInfo.label);
        if (__VLS_ctx.dismantleChestInfo.itemCount > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            (__VLS_ctx.dismantleChestInfo.itemCount);
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
            ...{ class: "text-[10px] text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap gap-x-3 gap-y-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-y-0.5']} */ ;
        for (const [mat] of __VLS_vFor((__VLS_ctx.dismantleChestInfo.refund))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (mat.itemId),
                ...{ class: "text-[10px] text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (__VLS_ctx.getItemName(mat.itemId));
            (mat.quantity);
            // @ts-ignore
            [getItemName, dismantleChestInfo, dismantleChestInfo, dismantleChestInfo, dismantleChestInfo, dismantleChestInfo,];
        }
        if (__VLS_ctx.dismantleChestInfo.refund.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-3 justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const __VLS_228 = Button || Button;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent1(__VLS_228, new __VLS_228({
            ...{ 'onClick': {} },
        }));
        const __VLS_230 = __VLS_229({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        let __VLS_233;
        const __VLS_234 = {
            /** @type {typeof __VLS_233.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.dismantleChestId))
                    throw 0;
                if (!(__VLS_ctx.dismantleChestInfo))
                    throw 0;
                return __VLS_ctx.dismantleChestId = null;
                // @ts-ignore
                [dismantleChestId, dismantleChestInfo,];
            },
        };
        const { default: __VLS_235 } = __VLS_231.slots;
        // @ts-ignore
        [];
        var __VLS_231;
        var __VLS_232;
        const __VLS_236 = Button || Button;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent1(__VLS_236, new __VLS_236({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Trash2),
            iconSize: (12),
        }));
        const __VLS_238 = __VLS_237({
            ...{ 'onClick': {} },
            ...{ class: "btn-danger" },
            icon: (__VLS_ctx.Trash2),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        let __VLS_241;
        const __VLS_242 = {
            /** @type {typeof __VLS_241.click} */
            onClick: (__VLS_ctx.confirmDismantle),
        };
        /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
        const { default: __VLS_243 } = __VLS_239.slots;
        // @ts-ignore
        [Trash2, confirmDismantle,];
        var __VLS_239;
        var __VLS_240;
    }
}
// @ts-ignore
[];
var __VLS_218;
let __VLS_244;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent1(__VLS_244, new __VLS_244({
    name: "panel-fade",
}));
const __VLS_246 = __VLS_245({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
const { default: __VLS_249 } = __VLS_247.slots;
if (__VLS_ctx.chestItemDetail && __VLS_ctx.chestItemDef) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.chestItemDetail && __VLS_ctx.chestItemDef))
                    throw 0;
                return __VLS_ctx.chestItemDetail = null;
                // @ts-ignore
                [chestItemDetail, chestItemDetail, chestItemDef,];
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
                if (!(__VLS_ctx.chestItemDetail && __VLS_ctx.chestItemDef))
                    throw 0;
                return __VLS_ctx.chestItemDetail = null;
                // @ts-ignore
                [chestItemDetail,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_250;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_251 = __VLS_asFunctionalComponent1(__VLS_250, new __VLS_250({
        size: (14),
    }));
    const __VLS_252 = __VLS_251({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_251));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.chestItemDetail.quality, 'text-accent')) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.chestItemDef.name);
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
    (__VLS_ctx.chestItemDef.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
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
    (__VLS_ctx.chestItemDetail.quantity);
    if (__VLS_ctx.chestItemDetail.quality !== 'normal') {
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
            ...{ class: (__VLS_ctx.qualityTextClass(__VLS_ctx.chestItemDetail.quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.QUALITY_LABEL[__VLS_ctx.chestItemDetail.quality]);
    }
    if (__VLS_ctx.chestItemDef.sellPrice) {
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
        (__VLS_ctx.chestItemDef.sellPrice);
    }
    if (__VLS_ctx.chestItemDef.staminaRestore) {
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
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.chestItemDef.staminaRestore);
        if (__VLS_ctx.chestItemDef.healthRestore) {
            (__VLS_ctx.chestItemDef.healthRestore);
        }
    }
}
// @ts-ignore
[chestItemDetail, chestItemDetail, chestItemDetail, chestItemDetail, chestItemDetail, qualityTextClass, qualityTextClass, QUALITY_LABEL, chestItemDef, chestItemDef, chestItemDef, chestItemDef, chestItemDef, chestItemDef, chestItemDef, chestItemDef,];
var __VLS_247;
let __VLS_255;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent1(__VLS_255, new __VLS_255({
    name: "panel-fade",
}));
const __VLS_257 = __VLS_256({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
const { default: __VLS_260 } = __VLS_258.slots;
if (__VLS_ctx.showAddChestModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAddChestModal))
                    throw 0;
                return __VLS_ctx.showAddChestModal = false;
                // @ts-ignore
                [showAddChestModal, showAddChestModal,];
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
    const __VLS_261 = Button;
    // @ts-ignore
    const __VLS_262 = __VLS_asFunctionalComponent1(__VLS_261, new __VLS_261({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }));
    const __VLS_263 = __VLS_262({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1" },
        icon: (__VLS_ctx.X),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_262));
    let __VLS_266;
    const __VLS_267 = {
        /** @type {typeof __VLS_266.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.showAddChestModal))
                throw 0;
            return __VLS_ctx.showAddChestModal = false;
            // @ts-ignore
            [showAddChestModal, X,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
    var __VLS_264;
    var __VLS_265;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    for (const [tier] of __VLS_vFor((__VLS_ctx.CHEST_TIER_ORDER))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (tier),
            ...{ class: "border border-accent/20 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
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
            ...{ class: "flex items-center space-x-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs font-bold" },
            ...{ class: (tier === 'void' ? 'text-quality-supreme' : 'text-accent') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        (__VLS_ctx.CHEST_DEFS[tier].name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.CHEST_DEFS[tier].capacity);
        const __VLS_268 = Button || Button;
        // @ts-ignore
        const __VLS_269 = __VLS_asFunctionalComponent1(__VLS_268, new __VLS_268({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canCraftChest(tier) }) },
            disabled: (!__VLS_ctx.canCraftChest(tier)),
        }));
        const __VLS_270 = __VLS_269({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.canCraftChest(tier) }) },
            disabled: (!__VLS_ctx.canCraftChest(tier)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_269));
        let __VLS_273;
        const __VLS_274 = {
            /** @type {typeof __VLS_273.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAddChestModal))
                    throw 0;
                return __VLS_ctx.handleCraftChest(tier);
                // @ts-ignore
                [CHEST_DEFS, CHEST_DEFS, CHEST_TIER_ORDER, canCraftChest, canCraftChest, handleCraftChest,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_275 } = __VLS_271.slots;
        // @ts-ignore
        [];
        var __VLS_271;
        var __VLS_272;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.CHEST_DEFS[tier].description);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap gap-x-3 gap-y-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-y-0.5']} */ ;
        for (const [mat] of __VLS_vFor((__VLS_ctx.CHEST_DEFS[tier].craftCost))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (mat.itemId),
                ...{ class: "text-[10px]" },
                ...{ class: (__VLS_ctx.getCombinedItemCount(mat.itemId) >= mat.quantity ? 'text-muted' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            (__VLS_ctx.getItemName(mat.itemId));
            (__VLS_ctx.getCombinedItemCount(mat.itemId));
            (mat.quantity);
            // @ts-ignore
            [getItemName, getCombinedItemCount, getCombinedItemCount, CHEST_DEFS, CHEST_DEFS,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px]" },
            ...{ class: (__VLS_ctx.playerStore.money >= __VLS_ctx.CHEST_DEFS[tier].craftMoney ? 'text-muted' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (__VLS_ctx.CHEST_DEFS[tier].craftMoney);
        // @ts-ignore
        [playerStore, CHEST_DEFS, CHEST_DEFS,];
    }
}
// @ts-ignore
[];
var __VLS_258;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
