/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, watch } from 'vue';
import { Apple, Archive, ArrowDown01, ArrowRight, BookMarked, Filter, Lock, LockOpen, Package, Trash2, X, Zap } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { useCookingStore } from '@/stores/useCookingStore';
import { useGameStore } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSkillStore } from '@/stores/useSkillStore';
import { getItemById, getItemSource } from '@/data';
import { getRecipeById } from '@/data/recipes';
import { getWeaponById, getWeaponDisplayName, getWeaponSellPrice, getEnchantmentById, WEAPON_TYPE_NAMES } from '@/data/weapons';
import { getRingById } from '@/data/rings';
import { getHatById } from '@/data/hats';
import { getShoeById } from '@/data/shoes';
import { QUALITY_NAMES } from '@/composables/useFarmActions';
import { addLog } from '@/composables/useGameLog';
const inventoryStore = useInventoryStore();
const playerStore = usePlayerStore();
const skillStore = useSkillStore();
const gameStore = useGameStore();
const cookingStore = useCookingStore();
const settingsStore = useSettingsStore();
// === 页签 ===
const tab = ref('items');
// === 物品筛选 ===
const FILTER_CATEGORIES = [
    'seed',
    'crop',
    'fruit',
    'fish',
    'animal_product',
    'processed',
    'food',
    'ore',
    'gem',
    'material',
    'machine',
    'sprinkler',
    'fertilizer',
    'bait',
    'tackle',
    'bomb',
    'sapling',
    'gift',
    'fossil',
    'artifact',
    'misc'
];
const CATEGORY_NAMES = {
    seed: '种子',
    crop: '作物',
    fruit: '水果',
    fish: '鱼类',
    animal_product: '畜产',
    processed: '加工品',
    food: '料理',
    ore: '矿石',
    gem: '宝石',
    material: '材料',
    machine: '机器',
    sprinkler: '洒水器',
    fertilizer: '肥料',
    bait: '鱼饵',
    tackle: '钓具',
    bomb: '炸弹',
    sapling: '树苗',
    gift: '礼物',
    fossil: '化石',
    artifact: '文物',
    misc: '杂货'
};
const showFilterModal = ref(false);
const tempFilter = ref(new Set());
const isFilterActive = computed(() => settingsStore.inventoryFilter.length > 0);
const filteredItems = computed(() => {
    if (settingsStore.inventoryFilter.length === 0)
        return inventoryStore.items;
    const allowed = new Set(settingsStore.inventoryFilter);
    return inventoryStore.items.filter(item => {
        const def = getItemById(item.itemId);
        return def && allowed.has(def.category);
    });
});
const openFilterModal = () => {
    tempFilter.value = new Set(settingsStore.inventoryFilter);
    showFilterModal.value = true;
};
const toggleCategory = (cat) => {
    if (tempFilter.value.has(cat)) {
        tempFilter.value.delete(cat);
    }
    else {
        tempFilter.value.add(cat);
    }
};
const handleSaveFilter = () => {
    settingsStore.inventoryFilter = [...tempFilter.value];
    showFilterModal.value = false;
};
const handleClearFilter = () => {
    tempFilter.value = new Set();
};
// === 装备方案 ===
const showPresetModal = ref(false);
const renamingPresetId = ref(null);
const renameValue = ref('');
const activePresetId = computed(() => inventoryStore.activePresetId);
const activePresetName = computed(() => {
    if (!activePresetId.value)
        return null;
    return inventoryStore.equipmentPresets.find(p => p.id === activePresetId.value)?.name ?? null;
});
const handleCreatePreset = () => {
    inventoryStore.createEquipmentPreset('方案' + (inventoryStore.equipmentPresets.length + 1));
};
const startRename = (preset) => {
    renamingPresetId.value = preset.id;
    renameValue.value = preset.name;
};
const confirmRename = (id) => {
    if (renamingPresetId.value === null)
        return;
    inventoryStore.renameEquipmentPreset(id, renameValue.value);
    renamingPresetId.value = null;
};
const handleSaveToPreset = (id) => {
    if (renamingPresetId.value)
        confirmRename(renamingPresetId.value);
    inventoryStore.saveCurrentToPreset(id);
    addLog('已保存当前装备到方案。');
};
const handleApplyPreset = (id) => {
    if (renamingPresetId.value)
        confirmRename(renamingPresetId.value);
    const result = inventoryStore.applyEquipmentPreset(id);
    addLog(result.message);
};
const handleDeletePreset = (id) => {
    if (renamingPresetId.value)
        confirmRename(renamingPresetId.value);
    inventoryStore.deleteEquipmentPreset(id);
};
// === 戒指辅助 ===
const equippedRing1Name = computed(() => {
    const idx = inventoryStore.equippedRingSlot1;
    const ring = inventoryStore.ownedRings[idx];
    if (!ring)
        return null;
    return getRingById(ring.defId)?.name ?? null;
});
const equippedRing2Name = computed(() => {
    const idx = inventoryStore.equippedRingSlot2;
    const ring = inventoryStore.ownedRings[idx];
    if (!ring)
        return null;
    return getRingById(ring.defId)?.name ?? null;
});
const isRingEquipped = (idx) => {
    return inventoryStore.equippedRingSlot1 === idx || inventoryStore.equippedRingSlot2 === idx;
};
/** 检查戒指是否因同defId冲突被另一槽位阻止 */
const isRingBlockedForSlot = (ringIdx, slot) => {
    const otherSlotIdx = slot === 0 ? inventoryStore.equippedRingSlot2 : inventoryStore.equippedRingSlot1;
    if (otherSlotIdx < 0 || otherSlotIdx === ringIdx)
        return false;
    if (otherSlotIdx >= inventoryStore.ownedRings.length)
        return false;
    return inventoryStore.ownedRings[ringIdx]?.defId === inventoryStore.ownedRings[otherSlotIdx]?.defId;
};
/** 切换戒指槽位（点击高亮按钮 → 卸下；点击非高亮按钮 → 装备/换位） */
const handleToggleRingSlot = (ringIdx, slot) => {
    const slotRef = slot === 0 ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2;
    if (slotRef === ringIdx) {
        inventoryStore.unequipRing(slot);
    }
    else {
        if (isRingBlockedForSlot(ringIdx, slot))
            return;
        inventoryStore.equipRing(ringIdx, slot);
    }
};
// === 戒指效果显示 ===
const RING_EFFECT_NAMES = {
    attack_bonus: '攻击力',
    crit_rate_bonus: '暴击率',
    defense_bonus: '防御',
    vampiric: '吸血',
    max_hp_bonus: '最大HP',
    stamina_reduction: '体力消耗',
    mining_stamina: '采矿体力',
    farming_stamina: '农作体力',
    fishing_stamina: '钓鱼体力',
    crop_quality_bonus: '作物品质',
    crop_growth_bonus: '作物生长',
    fish_quality_bonus: '鱼类品质',
    fishing_calm: '钓鱼稳定',
    sell_price_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    monster_drop_bonus: '掉落率',
    exp_bonus: '经验加成',
    treasure_find: '宝箱概率',
    ore_bonus: '矿石加成',
    luck: '幸运',
    travel_speed: '旅行加速'
};
const PERCENTAGE_EFFECTS = new Set([
    'crit_rate_bonus',
    'vampiric',
    'stamina_reduction',
    'mining_stamina',
    'farming_stamina',
    'fishing_stamina',
    'crop_quality_bonus',
    'crop_growth_bonus',
    'fish_quality_bonus',
    'fishing_calm',
    'sell_price_bonus',
    'shop_discount',
    'gift_friendship',
    'monster_drop_bonus',
    'exp_bonus',
    'treasure_find',
    'ore_bonus',
    'luck',
    'travel_speed'
]);
const formatEffectValue = (eff) => {
    if (PERCENTAGE_EFFECTS.has(eff.type))
        return `${Math.round(eff.value * 100)}%`;
    return `${eff.value}`;
};
// === 武器弹窗 ===
const activeWeaponIdx = ref(null);
const activeWeaponDef = computed(() => {
    if (activeWeaponIdx.value === null)
        return null;
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value];
    if (!weapon)
        return null;
    return getWeaponById(weapon.defId) ?? null;
});
const activeWeaponName = computed(() => {
    if (activeWeaponIdx.value === null)
        return '';
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value];
    if (!weapon)
        return '';
    return getWeaponDisplayName(weapon.defId, weapon.enchantmentId);
});
const activeWeaponEnchant = computed(() => {
    if (activeWeaponIdx.value === null)
        return null;
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value];
    if (!weapon?.enchantmentId)
        return null;
    return getEnchantmentById(weapon.enchantmentId) ?? null;
});
const activeWeaponPrice = computed(() => {
    if (activeWeaponIdx.value === null)
        return 0;
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value];
    if (!weapon)
        return 0;
    return getWeaponSellPrice(weapon.defId, weapon.enchantmentId);
});
const handleEquipWeapon = () => {
    if (activeWeaponIdx.value === null)
        return;
    inventoryStore.equipWeapon(activeWeaponIdx.value);
    activeWeaponIdx.value = null;
};
const handleSellWeapon = () => {
    if (activeWeaponIdx.value === null)
        return;
    const result = inventoryStore.sellWeapon(activeWeaponIdx.value);
    addLog(result.message);
    activeWeaponIdx.value = null;
};
// === 戒指弹窗 ===
const activeRingIdx = ref(null);
const activeRingDef = computed(() => {
    if (activeRingIdx.value === null)
        return null;
    const ring = inventoryStore.ownedRings[activeRingIdx.value];
    if (!ring)
        return null;
    return getRingById(ring.defId) ?? null;
});
const handleEquipRingFromPopup = (slot) => {
    if (activeRingIdx.value === null)
        return;
    if (isRingBlockedForSlot(activeRingIdx.value, slot))
        return;
    const slotRef = slot === 0 ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2;
    if (slotRef === activeRingIdx.value) {
        inventoryStore.unequipRing(slot);
    }
    else {
        inventoryStore.equipRing(activeRingIdx.value, slot);
    }
};
const handleSellRing = () => {
    if (activeRingIdx.value === null)
        return;
    const result = inventoryStore.sellRing(activeRingIdx.value);
    addLog(result.message);
    activeRingIdx.value = null;
};
// === 帽子辅助 ===
const equippedHatName = computed(() => {
    const idx = inventoryStore.equippedHatIndex;
    const hat = inventoryStore.ownedHats[idx];
    if (!hat)
        return null;
    return getHatById(hat.defId)?.name ?? null;
});
const handleToggleHat = (idx) => {
    if (inventoryStore.equippedHatIndex === idx) {
        inventoryStore.unequipHat();
    }
    else {
        inventoryStore.equipHat(idx);
    }
};
// === 帽子弹窗 ===
const activeHatIdx = ref(null);
const activeHatDef = computed(() => {
    if (activeHatIdx.value === null)
        return null;
    const hat = inventoryStore.ownedHats[activeHatIdx.value];
    if (!hat)
        return null;
    return getHatById(hat.defId) ?? null;
});
const handleToggleHatFromPopup = () => {
    if (activeHatIdx.value === null)
        return;
    handleToggleHat(activeHatIdx.value);
};
const handleSellHat = () => {
    if (activeHatIdx.value === null)
        return;
    const result = inventoryStore.sellHat(activeHatIdx.value);
    addLog(result.message);
    activeHatIdx.value = null;
};
// === 鞋子辅助 ===
const equippedShoeName = computed(() => {
    const idx = inventoryStore.equippedShoeIndex;
    const shoe = inventoryStore.ownedShoes[idx];
    if (!shoe)
        return null;
    return getShoeById(shoe.defId)?.name ?? null;
});
const handleToggleShoe = (idx) => {
    if (inventoryStore.equippedShoeIndex === idx) {
        inventoryStore.unequipShoe();
    }
    else {
        inventoryStore.equipShoe(idx);
    }
};
// === 鞋子弹窗 ===
const activeShoeIdx = ref(null);
const activeShoeDef = computed(() => {
    if (activeShoeIdx.value === null)
        return null;
    const shoe = inventoryStore.ownedShoes[activeShoeIdx.value];
    if (!shoe)
        return null;
    return getShoeById(shoe.defId) ?? null;
});
const handleToggleShoeFromPopup = () => {
    if (activeShoeIdx.value === null)
        return;
    handleToggleShoe(activeShoeIdx.value);
};
const handleSellShoe = () => {
    if (activeShoeIdx.value === null)
        return;
    const result = inventoryStore.sellShoe(activeShoeIdx.value);
    addLog(result.message);
    activeShoeIdx.value = null;
};
// === 临时背包 ===
const activeTempIdx = ref(null);
const activeTempItem = computed(() => {
    if (activeTempIdx.value === null)
        return null;
    return inventoryStore.tempItems[activeTempIdx.value] ?? null;
});
const activeTempItemDef = computed(() => {
    if (!activeTempItem.value)
        return null;
    return getItemById(activeTempItem.value.itemId) ?? null;
});
const handleMoveFromTemp = () => {
    if (activeTempIdx.value === null)
        return;
    const success = inventoryStore.moveFromTemp(activeTempIdx.value);
    if (success) {
        addLog('物品已转移到背包。');
        activeTempIdx.value = null;
    }
    else {
        addLog('背包空间不足，部分物品仍在临时背包中。');
    }
};
const handleMoveAllFromTemp = () => {
    const moved = inventoryStore.moveAllFromTemp();
    if (moved > 0) {
        addLog(`已将${moved}项物品从临时背包转移到背包。`);
    }
    if (inventoryStore.tempItems.length > 0) {
        addLog('部分物品因空间不足仍在临时背包中。');
    }
};
const handleDiscardTemp = () => {
    if (activeTempIdx.value === null)
        return;
    const item = inventoryStore.tempItems[activeTempIdx.value];
    const name = getItemById(item?.itemId ?? '')?.name ?? '';
    inventoryStore.discardTempItem(activeTempIdx.value);
    addLog(`丢弃了${name}。`);
    activeTempIdx.value = null;
};
// === 物品弹窗 ===
const activeItemKey = ref(null);
const activeItem = computed(() => {
    if (!activeItemKey.value)
        return null;
    const [itemId, quality] = activeItemKey.value.split(':');
    return inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality) ?? null;
});
const activeItemDef = computed(() => {
    if (!activeItem.value)
        return null;
    return getItemById(activeItem.value.itemId) ?? null;
});
/** 烹饪品的buff描述 */
const activeItemBuff = computed(() => {
    if (!activeItem.value)
        return null;
    const itemId = activeItem.value.itemId;
    if (!itemId.startsWith('food_'))
        return null;
    const recipe = getRecipeById(itemId.slice(5));
    return recipe?.effect.buff ?? null;
});
const isEdible = (itemId) => {
    const def = getItemById(itemId);
    return !!def?.edible && !!def.staminaRestore;
};
const handleEat = (itemId, quality) => {
    const def = getItemById(itemId);
    if (!def?.edible || !def.staminaRestore)
        return;
    const staminaFull = playerStore.stamina >= playerStore.maxStamina;
    const hpFull = playerStore.hp >= playerStore.getMaxHp();
    if (staminaFull && hpFull) {
        addLog('体力和生命值都已满，不需要食用。');
        return;
    }
    // 烹饪品走 cookingStore.eat()，以正确应用buff、厨房加成等
    if (itemId.startsWith('food_')) {
        const recipeId = itemId.slice(5); // 去掉 'food_' 前缀
        const result = cookingStore.eat(recipeId, quality);
        if (result.success) {
            addLog(result.message);
        }
        else {
            addLog(result.message);
        }
        // 物品消耗完则关闭弹窗
        if (!inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)) {
            activeItemKey.value = null;
        }
        return;
    }
    if (!inventoryStore.removeItem(itemId, 1, quality))
        return;
    // 炼金师专精：食物恢复+50%
    const alchemistBonus = skillStore.getSkill('foraging').perk10 === 'alchemist' ? 1.5 : 1.0;
    const staminaRestore = Math.floor(def.staminaRestore * alchemistBonus);
    playerStore.restoreStamina(staminaRestore);
    let msg = `食用了${def.name}，恢复${staminaRestore}体力`;
    if (def.healthRestore) {
        const healthRestore = Math.floor(def.healthRestore * alchemistBonus);
        playerStore.restoreHealth(healthRestore);
        msg += `、${healthRestore}生命值`;
    }
    msg += '。';
    addLog(msg);
    // 物品消耗完则关闭弹窗
    if (!inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)) {
        activeItemKey.value = null;
    }
};
/** 可使用的特殊物品 */
const USABLE_ITEMS = new Set(['rain_totem', 'stamina_fruit']);
const isUsable = (itemId) => {
    return USABLE_ITEMS.has(itemId);
};
const handleUse = (itemId, quality) => {
    if (itemId === 'rain_totem') {
        if (!inventoryStore.removeItem(itemId, 1, quality))
            return;
        gameStore.setTomorrowWeather('rainy');
        addLog('你使用了雨图腾，明天将会下雨。');
    }
    if (itemId === 'stamina_fruit') {
        if (playerStore.staminaCapLevel >= 4) {
            addLog('体力上限已达到最高，无法再使用仙桃。');
            return;
        }
        if (!inventoryStore.removeItem(itemId, 1, quality))
            return;
        playerStore.upgradeMaxStamina();
        addLog(`食用了仙桃，体力上限永久提升至${playerStore.maxStamina}！`);
    }
    // 物品消耗完则关闭弹窗
    if (!inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)) {
        activeItemKey.value = null;
    }
};
// === 丢弃物品 ===
const discardMode = ref(false);
const discardQty = ref(1);
watch(activeItemKey, () => {
    discardMode.value = false;
});
/** 进入丢弃模式 */
const enterDiscardMode = () => {
    discardMode.value = true;
    discardQty.value = 1;
};
/** 确认丢弃 */
const confirmDiscard = () => {
    if (!activeItem.value)
        return;
    const { itemId, quality } = activeItem.value;
    const name = activeItemDef.value?.name ?? '';
    const qty = Math.min(discardQty.value, activeItem.value.quantity);
    if (qty <= 0)
        return;
    if (!inventoryStore.removeItem(itemId, qty, quality))
        return;
    addLog(`丢弃了${name}×${qty}。`);
    discardMode.value = false;
    // 物品消耗完则关闭弹窗
    if (!inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)) {
        activeItemKey.value = null;
    }
};
/** 取消丢弃 */
const cancelDiscard = () => {
    discardMode.value = false;
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
/** @ts-ignore @type { | typeof __VLS_components.Package} */
Package;
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
(__VLS_ctx.inventoryStore.items.length);
(__VLS_ctx.inventoryStore.capacity);
if (__VLS_ctx.inventoryStore.tempItems.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    (__VLS_ctx.inventoryStore.tempItems.length);
}
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'items' }) },
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'items' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_10;
const __VLS_11 = {
    /** @type {typeof __VLS_10.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'items';
        // @ts-ignore
        [inventoryStore, inventoryStore, inventoryStore, inventoryStore, tab, tab,];
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'tools' }) },
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'tools' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = {
    /** @type {typeof __VLS_18.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'tools';
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
    ...{ class: ({ '!bg-danger !text-text': __VLS_ctx.tab === 'temp', 'text-danger': __VLS_ctx.tab !== 'temp' && __VLS_ctx.inventoryStore.tempItems.length > 0 }) },
}));
const __VLS_23 = __VLS_22({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-danger !text-text': __VLS_ctx.tab === 'temp', 'text-danger': __VLS_ctx.tab !== 'temp' && __VLS_ctx.inventoryStore.tempItems.length > 0 }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_26;
const __VLS_27 = {
    /** @type {typeof __VLS_26.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'temp';
        // @ts-ignore
        [inventoryStore, tab, tab, tab,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
const { default: __VLS_28 } = __VLS_24.slots;
(__VLS_ctx.inventoryStore.tempItems.length > 0 ? `(${__VLS_ctx.inventoryStore.tempItems.length})` : '');
// @ts-ignore
[inventoryStore, inventoryStore,];
var __VLS_24;
var __VLS_25;
if (__VLS_ctx.tab === 'items') {
    if (__VLS_ctx.inventoryStore.items.length > 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-end mb-1.5 space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        const __VLS_29 = Button || Button;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.isFilterActive }) },
            icon: (__VLS_ctx.Filter),
            iconSize: (12),
        }));
        const __VLS_31 = __VLS_30({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.isFilterActive }) },
            icon: (__VLS_ctx.Filter),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        let __VLS_34;
        const __VLS_35 = {
            /** @type {typeof __VLS_34.click} */
            onClick: (__VLS_ctx.openFilterModal),
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_36 } = __VLS_32.slots;
        // @ts-ignore
        [inventoryStore, tab, isFilterActive, Filter, openFilterModal,];
        var __VLS_32;
        var __VLS_33;
        const __VLS_37 = Button || Button;
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.ArrowDown01),
            iconSize: (12),
        }));
        const __VLS_39 = __VLS_38({
            ...{ 'onClick': {} },
            ...{ class: "py-0 px-1.5" },
            icon: (__VLS_ctx.ArrowDown01),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        let __VLS_42;
        const __VLS_43 = {
            /** @type {typeof __VLS_42.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.tab === 'items'))
                    throw 0;
                if (!(__VLS_ctx.inventoryStore.items.length > 1))
                    throw 0;
                return __VLS_ctx.inventoryStore.sortItems();
                // @ts-ignore
                [inventoryStore, ArrowDown01,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        const { default: __VLS_44 } = __VLS_40.slots;
        // @ts-ignore
        [];
        var __VLS_40;
        var __VLS_41;
    }
    if (__VLS_ctx.filteredItems.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        for (const [item, idx] of __VLS_vFor((__VLS_ctx.filteredItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'items'))
                            throw 0;
                        if (!(__VLS_ctx.filteredItems.length > 0))
                            throw 0;
                        return __VLS_ctx.activeItemKey = item.itemId + ':' + item.quality;
                        // @ts-ignore
                        [filteredItems, filteredItems, activeItemKey,];
                    } },
                key: (idx),
                ...{ class: "border border-accent/20 rounded-xs p-1.5 text-center cursor-pointer hover:bg-accent/5 transition-colors relative" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['relative']} */ ;
            if (item.locked) {
                let __VLS_45;
                /** @ts-ignore @type { | typeof __VLS_components.Lock} */
                Lock;
                // @ts-ignore
                const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
                    size: (10),
                    ...{ class: "absolute top-0.5 left-0.5 text-accent/60" },
                }));
                const __VLS_47 = __VLS_46({
                    size: (10),
                    ...{ class: "absolute top-0.5 left-0.5 text-accent/60" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_46));
                /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
                /** @type {__VLS_StyleScopedClasses['top-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['left-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent/60']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs truncate" },
                ...{ class: ({
                        'text-quality-fine': item.quality === 'fine',
                        'text-quality-excellent': item.quality === 'excellent',
                        'text-quality-supreme': item.quality === 'supreme'
                    }) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
            (__VLS_ctx.getItemById(item.itemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (item.quantity);
            // @ts-ignore
            [getItemById,];
        }
        for (const [i] of __VLS_vFor((__VLS_ctx.isFilterActive ? 0 : Math.max(0, __VLS_ctx.inventoryStore.capacity - __VLS_ctx.inventoryStore.items.length)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: ('empty-' + i),
                ...{ class: "border border-accent/10 rounded-xs p-1.5 text-center text-xs text-muted/30" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            // @ts-ignore
            [inventoryStore, inventoryStore, isFilterActive,];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_50;
        /** @ts-ignore @type { | typeof __VLS_components.Package} */
        Package;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
            size: (24),
        }));
        const __VLS_52 = __VLS_51({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    }
}
if (__VLS_ctx.tab === 'temp') {
    if (__VLS_ctx.inventoryStore.tempItems.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        if (!__VLS_ctx.inventoryStore.isFull) {
            const __VLS_55 = Button || Button;
            // @ts-ignore
            const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
            }));
            const __VLS_57 = __VLS_56({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_56));
            let __VLS_60;
            const __VLS_61 = {
                /** @type {typeof __VLS_60.click} */
                onClick: (__VLS_ctx.handleMoveAllFromTemp),
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            const { default: __VLS_62 } = __VLS_58.slots;
            // @ts-ignore
            [inventoryStore, inventoryStore, tab, handleMoveAllFromTemp,];
            var __VLS_58;
            var __VLS_59;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        for (const [item, idx] of __VLS_vFor((__VLS_ctx.inventoryStore.tempItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'temp'))
                            throw 0;
                        if (!(__VLS_ctx.inventoryStore.tempItems.length > 0))
                            throw 0;
                        return __VLS_ctx.activeTempIdx = idx;
                        // @ts-ignore
                        [inventoryStore, activeTempIdx,];
                    } },
                key: ('temp-' + idx),
                ...{ class: "border border-danger/30 rounded-xs p-1.5 text-center cursor-pointer hover:bg-danger/5 transition-colors" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs truncate" },
                ...{ class: ({
                        'text-quality-fine': item.quality === 'fine',
                        'text-quality-excellent': item.quality === 'excellent',
                        'text-quality-supreme': item.quality === 'supreme'
                    }) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
            (__VLS_ctx.getItemById(item.itemId)?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (item.quantity);
            // @ts-ignore
            [getItemById,];
        }
        for (const [i] of __VLS_vFor((Math.max(0, 10 - __VLS_ctx.inventoryStore.tempItems.length)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: ('temp-empty-' + i),
                ...{ class: "border border-danger/10 rounded-xs p-1.5 text-center text-xs text-muted/30" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            // @ts-ignore
            [inventoryStore,];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-4 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        let __VLS_63;
        /** @ts-ignore @type { | typeof __VLS_components.Archive} */
        Archive;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
            size: (24),
        }));
        const __VLS_65 = __VLS_64({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    }
}
if (__VLS_ctx.tab === 'tools') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-end mb-1.5 space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    if (__VLS_ctx.activePresetName) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-success truncate" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        (__VLS_ctx.activePresetName);
    }
    const __VLS_68 = Button || Button;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        icon: (__VLS_ctx.ArrowDown01),
        iconSize: (12),
    }));
    const __VLS_70 = __VLS_69({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        icon: (__VLS_ctx.ArrowDown01),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    let __VLS_73;
    const __VLS_74 = {
        /** @type {typeof __VLS_73.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.tab === 'tools'))
                throw 0;
            return __VLS_ctx.inventoryStore.sortEquipment();
            // @ts-ignore
            [inventoryStore, tab, ArrowDown01, activePresetName, activePresetName,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    const { default: __VLS_75 } = __VLS_71.slots;
    // @ts-ignore
    [];
    var __VLS_71;
    var __VLS_72;
    const __VLS_76 = Button || Button;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        icon: (__VLS_ctx.BookMarked),
        iconSize: (12),
    }));
    const __VLS_78 = __VLS_77({
        ...{ 'onClick': {} },
        ...{ class: "py-0 px-1.5" },
        icon: (__VLS_ctx.BookMarked),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    let __VLS_81;
    const __VLS_82 = {
        /** @type {typeof __VLS_81.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.tab === 'tools'))
                throw 0;
            return __VLS_ctx.showPresetModal = true;
            // @ts-ignore
            [BookMarked, showPresetModal,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    const { default: __VLS_83 } = __VLS_79.slots;
    // @ts-ignore
    [];
    var __VLS_79;
    var __VLS_80;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-40 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-40']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [weapon, idx] of __VLS_vFor((__VLS_ctx.inventoryStore.ownedWeapons))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'tools'))
                        throw 0;
                    return __VLS_ctx.activeWeaponIdx = idx;
                    // @ts-ignore
                    [inventoryStore, activeWeaponIdx,];
                } },
            key: (idx),
            ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5" },
            ...{ class: (idx === __VLS_ctx.inventoryStore.equippedWeaponIndex ? 'border-accent/30' : 'border-accent/10') },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (idx === __VLS_ctx.inventoryStore.equippedWeaponIndex ? 'text-accent' : '') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getWeaponDisplayName(weapon.defId, weapon.enchantmentId));
        if (idx === __VLS_ctx.inventoryStore.equippedWeaponIndex) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.getWeaponSellPrice(weapon.defId, weapon.enchantmentId));
        }
        // @ts-ignore
        [inventoryStore, inventoryStore, inventoryStore, getWeaponDisplayName, getWeaponSellPrice,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    if (__VLS_ctx.inventoryStore.ownedHats.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs px-2 py-1 text-center mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.equippedHatName ? 'text-accent' : 'text-muted/40') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.equippedHatName ?? '空');
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-h-40 overflow-y-auto flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['max-h-40']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        for (const [hat, idx] of __VLS_vFor((__VLS_ctx.inventoryStore.ownedHats))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'tools'))
                            throw 0;
                        if (!(__VLS_ctx.inventoryStore.ownedHats.length > 0))
                            throw 0;
                        return __VLS_ctx.activeHatIdx = idx;
                        // @ts-ignore
                        [inventoryStore, inventoryStore, equippedHatName, equippedHatName, activeHatIdx,];
                    } },
                key: (idx),
                ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedHatIndex === idx ? 'border-accent/30' : 'border-accent/10') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedHatIndex === idx ? 'text-accent' : '') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getHatById(hat.defId)?.name ?? hat.defId);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.getHatById(hat.defId)?.description);
            const __VLS_84 = Button || Button;
            // @ts-ignore
            const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 shrink-0 ml-2" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedHatIndex === idx ? '!bg-accent !text-bg' : '') },
            }));
            const __VLS_86 = __VLS_85({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 shrink-0 ml-2" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedHatIndex === idx ? '!bg-accent !text-bg' : '') },
            }, ...__VLS_functionalComponentArgsRest(__VLS_85));
            let __VLS_89;
            const __VLS_90 = {
                /** @type {typeof __VLS_89.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'tools'))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.ownedHats.length > 0))
                        throw 0;
                    return __VLS_ctx.handleToggleHat(idx);
                    // @ts-ignore
                    [inventoryStore, inventoryStore, inventoryStore, getHatById, getHatById, handleToggleHat,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            const { default: __VLS_91 } = __VLS_87.slots;
            (__VLS_ctx.inventoryStore.equippedHatIndex === idx ? '卸下' : '装备');
            // @ts-ignore
            [inventoryStore,];
            var __VLS_87;
            var __VLS_88;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/40 text-center py-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    if (__VLS_ctx.inventoryStore.ownedShoes.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/10 rounded-xs px-2 py-1 text-center mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.equippedShoeName ? 'text-accent' : 'text-muted/40') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.equippedShoeName ?? '空');
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-h-40 overflow-y-auto flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['max-h-40']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        for (const [shoe, idx] of __VLS_vFor((__VLS_ctx.inventoryStore.ownedShoes))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'tools'))
                            throw 0;
                        if (!(__VLS_ctx.inventoryStore.ownedShoes.length > 0))
                            throw 0;
                        return __VLS_ctx.activeShoeIdx = idx;
                        // @ts-ignore
                        [inventoryStore, inventoryStore, equippedShoeName, equippedShoeName, activeShoeIdx,];
                    } },
                key: (idx),
                ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedShoeIndex === idx ? 'border-accent/30' : 'border-accent/10') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedShoeIndex === idx ? 'text-accent' : '') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getShoeById(shoe.defId)?.name ?? shoe.defId);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.getShoeById(shoe.defId)?.description);
            const __VLS_92 = Button || Button;
            // @ts-ignore
            const __VLS_93 = __VLS_asFunctionalComponent1(__VLS_92, new __VLS_92({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 shrink-0 ml-2" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedShoeIndex === idx ? '!bg-accent !text-bg' : '') },
            }));
            const __VLS_94 = __VLS_93({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 shrink-0 ml-2" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedShoeIndex === idx ? '!bg-accent !text-bg' : '') },
            }, ...__VLS_functionalComponentArgsRest(__VLS_93));
            let __VLS_97;
            const __VLS_98 = {
                /** @type {typeof __VLS_97.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'tools'))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.ownedShoes.length > 0))
                        throw 0;
                    return __VLS_ctx.handleToggleShoe(idx);
                    // @ts-ignore
                    [inventoryStore, inventoryStore, inventoryStore, getShoeById, getShoeById, handleToggleShoe,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            const { default: __VLS_99 } = __VLS_95.slots;
            (__VLS_ctx.inventoryStore.equippedShoeIndex === idx ? '卸下' : '装备');
            // @ts-ignore
            [inventoryStore,];
            var __VLS_95;
            var __VLS_96;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/40 text-center py-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    if (__VLS_ctx.inventoryStore.ownedRings.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex space-x-1 mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 border border-accent/10 rounded-xs px-2 py-1 text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.equippedRing1Name ? 'text-accent' : 'text-muted/40') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.equippedRing1Name ?? '空');
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 border border-accent/10 rounded-xs px-2 py-1 text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.equippedRing2Name ? 'text-accent' : 'text-muted/40') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.equippedRing2Name ?? '空');
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-h-40 overflow-y-auto flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['max-h-40']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        for (const [ring, idx] of __VLS_vFor((__VLS_ctx.inventoryStore.ownedRings))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'tools'))
                            throw 0;
                        if (!(__VLS_ctx.inventoryStore.ownedRings.length > 0))
                            throw 0;
                        return __VLS_ctx.activeRingIdx = idx;
                        // @ts-ignore
                        [inventoryStore, inventoryStore, equippedRing1Name, equippedRing1Name, equippedRing2Name, equippedRing2Name, activeRingIdx,];
                    } },
                key: (idx),
                ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5" },
                ...{ class: (__VLS_ctx.isRingEquipped(idx) ? 'border-accent/30' : 'border-accent/10') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (__VLS_ctx.isRingEquipped(idx) ? 'text-accent' : '') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getRingById(ring.defId)?.name ?? ring.defId);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.getRingById(ring.defId)?.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1 shrink-0 ml-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            const __VLS_100 = Button || Button;
            // @ts-ignore
            const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedRingSlot1 === idx
                        ? '!bg-accent !text-bg'
                        : __VLS_ctx.isRingBlockedForSlot(idx, 0)
                            ? 'opacity-30 cursor-not-allowed'
                            : '') },
                disabled: (__VLS_ctx.isRingBlockedForSlot(idx, 0)),
            }));
            const __VLS_102 = __VLS_101({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedRingSlot1 === idx
                        ? '!bg-accent !text-bg'
                        : __VLS_ctx.isRingBlockedForSlot(idx, 0)
                            ? 'opacity-30 cursor-not-allowed'
                            : '') },
                disabled: (__VLS_ctx.isRingBlockedForSlot(idx, 0)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_101));
            let __VLS_105;
            const __VLS_106 = {
                /** @type {typeof __VLS_105.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'tools'))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.ownedRings.length > 0))
                        throw 0;
                    return __VLS_ctx.handleToggleRingSlot(idx, 0);
                    // @ts-ignore
                    [inventoryStore, isRingEquipped, isRingEquipped, getRingById, getRingById, isRingBlockedForSlot, isRingBlockedForSlot, handleToggleRingSlot,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            const { default: __VLS_107 } = __VLS_103.slots;
            // @ts-ignore
            [];
            var __VLS_103;
            var __VLS_104;
            const __VLS_108 = Button || Button;
            // @ts-ignore
            const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedRingSlot2 === idx
                        ? '!bg-accent !text-bg'
                        : __VLS_ctx.isRingBlockedForSlot(idx, 1)
                            ? 'opacity-30 cursor-not-allowed'
                            : '') },
                disabled: (__VLS_ctx.isRingBlockedForSlot(idx, 1)),
            }));
            const __VLS_110 = __VLS_109({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
                ...{ class: (__VLS_ctx.inventoryStore.equippedRingSlot2 === idx
                        ? '!bg-accent !text-bg'
                        : __VLS_ctx.isRingBlockedForSlot(idx, 1)
                            ? 'opacity-30 cursor-not-allowed'
                            : '') },
                disabled: (__VLS_ctx.isRingBlockedForSlot(idx, 1)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_109));
            let __VLS_113;
            const __VLS_114 = {
                /** @type {typeof __VLS_113.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'tools'))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.ownedRings.length > 0))
                        throw 0;
                    return __VLS_ctx.handleToggleRingSlot(idx, 1);
                    // @ts-ignore
                    [inventoryStore, isRingBlockedForSlot, isRingBlockedForSlot, handleToggleRingSlot,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            const { default: __VLS_115 } = __VLS_111.slots;
            // @ts-ignore
            [];
            var __VLS_111;
            var __VLS_112;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/40 text-center py-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    }
    if (__VLS_ctx.inventoryStore.activeSets.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-2 mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        for (const [set] of __VLS_vFor((__VLS_ctx.inventoryStore.activeSets))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (set.id),
                ...{ class: "border border-accent/10 rounded-xs p-2 mb-1.5 last:mb-0" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['last:mb-0']} */ ;
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
            (set.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (set.equippedCount);
            for (const [bonus] of __VLS_vFor((set.bonuses))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (bonus.count),
                    ...{ class: "text-[10px]" },
                    ...{ class: (bonus.active ? 'text-success' : 'text-muted/40') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (bonus.count);
                (bonus.description);
                // @ts-ignore
                [inventoryStore, inventoryStore,];
            }
            // @ts-ignore
            [];
        }
    }
}
let __VLS_116;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent1(__VLS_116, new __VLS_116({
    name: "panel-fade",
}));
const __VLS_118 = __VLS_117({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
const { default: __VLS_121 } = __VLS_119.slots;
if (__VLS_ctx.showPresetModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showPresetModal))
                    throw 0;
                return __VLS_ctx.showPresetModal = false;
                // @ts-ignore
                [showPresetModal, showPresetModal,];
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
                if (!(__VLS_ctx.showPresetModal))
                    throw 0;
                return __VLS_ctx.showPresetModal = false;
                // @ts-ignore
                [showPresetModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_122;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent1(__VLS_122, new __VLS_122({
        size: (14),
    }));
    const __VLS_124 = __VLS_123({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.inventoryStore.equipmentPresets.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1.5 mb-3 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [preset] of __VLS_vFor((__VLS_ctx.inventoryStore.equipmentPresets))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (preset.id),
                ...{ class: "border rounded-xs p-2" },
                ...{ class: (__VLS_ctx.activePresetId === preset.id ? 'border-accent/40' : 'border-accent/10') },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            if (__VLS_ctx.renamingPresetId === preset.id) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ onKeyup: (...[$event]) => {
                            if (!(__VLS_ctx.showPresetModal))
                                throw 0;
                            if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                                throw 0;
                            if (!(__VLS_ctx.renamingPresetId === preset.id))
                                throw 0;
                            return __VLS_ctx.confirmRename(preset.id);
                            // @ts-ignore
                            [inventoryStore, inventoryStore, activePresetId, renamingPresetId, confirmRename,];
                        } },
                    ...{ onBlur: (...[$event]) => {
                            if (!(__VLS_ctx.showPresetModal))
                                throw 0;
                            if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                                throw 0;
                            if (!(__VLS_ctx.renamingPresetId === preset.id))
                                throw 0;
                            return __VLS_ctx.confirmRename(preset.id);
                            // @ts-ignore
                            [confirmRename,];
                        } },
                    ...{ class: "bg-transparent border border-accent/30 rounded-xs px-1 py-0.5 text-xs text-text w-full mr-2 outline-none" },
                });
                (__VLS_ctx.renameValue);
                /** @type {__VLS_StyleScopedClasses['bg-transparent']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-accent truncate" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                (preset.name);
            }
            if (__VLS_ctx.activePresetId === preset.id) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-success shrink-0 ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            const __VLS_127 = Button || Button;
            // @ts-ignore
            const __VLS_128 = __VLS_asFunctionalComponent1(__VLS_127, new __VLS_127({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 flex-1 justify-center" },
                disabled: (__VLS_ctx.activePresetId === preset.id),
            }));
            const __VLS_129 = __VLS_128({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 flex-1 justify-center" },
                disabled: (__VLS_ctx.activePresetId === preset.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_128));
            let __VLS_132;
            const __VLS_133 = {
                /** @type {typeof __VLS_132.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showPresetModal))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                        throw 0;
                    return __VLS_ctx.handleApplyPreset(preset.id);
                    // @ts-ignore
                    [activePresetId, activePresetId, renameValue, handleApplyPreset,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
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
                ...{ class: "py-0 px-1.5 flex-1 justify-center" },
            }));
            const __VLS_137 = __VLS_136({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 flex-1 justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_136));
            let __VLS_140;
            const __VLS_141 = {
                /** @type {typeof __VLS_140.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showPresetModal))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                        throw 0;
                    return __VLS_ctx.handleSaveToPreset(preset.id);
                    // @ts-ignore
                    [handleSaveToPreset,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_142 } = __VLS_138.slots;
            // @ts-ignore
            [];
            var __VLS_138;
            var __VLS_139;
            const __VLS_143 = Button || Button;
            // @ts-ignore
            const __VLS_144 = __VLS_asFunctionalComponent1(__VLS_143, new __VLS_143({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
            }));
            const __VLS_145 = __VLS_144({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_144));
            let __VLS_148;
            const __VLS_149 = {
                /** @type {typeof __VLS_148.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showPresetModal))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                        throw 0;
                    return __VLS_ctx.startRename(preset);
                    // @ts-ignore
                    [startRename,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            const { default: __VLS_150 } = __VLS_146.slots;
            // @ts-ignore
            [];
            var __VLS_146;
            var __VLS_147;
            const __VLS_151 = Button || Button;
            // @ts-ignore
            const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-danger" },
                disabled: (__VLS_ctx.activePresetId === preset.id),
            }));
            const __VLS_153 = __VLS_152({
                ...{ 'onClick': {} },
                ...{ class: "py-0 px-1.5 text-danger" },
                disabled: (__VLS_ctx.activePresetId === preset.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_152));
            let __VLS_156;
            const __VLS_157 = {
                /** @type {typeof __VLS_156.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showPresetModal))
                        throw 0;
                    if (!(__VLS_ctx.inventoryStore.equipmentPresets.length > 0))
                        throw 0;
                    return __VLS_ctx.handleDeletePreset(preset.id);
                    // @ts-ignore
                    [activePresetId, handleDeletePreset,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['py-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            const { default: __VLS_158 } = __VLS_154.slots;
            // @ts-ignore
            [];
            var __VLS_154;
            var __VLS_155;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-6 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        let __VLS_159;
        /** @ts-ignore @type { | typeof __VLS_components.BookMarked} */
        BookMarked;
        // @ts-ignore
        const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
            size: (24),
            ...{ class: "text-muted/30" },
        }));
        const __VLS_161 = __VLS_160({
            size: (24),
            ...{ class: "text-muted/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_160));
        /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted/60 mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    }
    const __VLS_164 = Button || Button;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent1(__VLS_164, new __VLS_164({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (__VLS_ctx.inventoryStore.equipmentPresets.length >= 5),
    }));
    const __VLS_166 = __VLS_165({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (__VLS_ctx.inventoryStore.equipmentPresets.length >= 5),
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    let __VLS_169;
    const __VLS_170 = {
        /** @type {typeof __VLS_169.click} */
        onClick: (__VLS_ctx.handleCreatePreset),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_171 } = __VLS_167.slots;
    // @ts-ignore
    [inventoryStore, handleCreatePreset,];
    var __VLS_167;
    var __VLS_168;
}
// @ts-ignore
[];
var __VLS_119;
let __VLS_172;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent1(__VLS_172, new __VLS_172({
    name: "panel-fade",
}));
const __VLS_174 = __VLS_173({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
const { default: __VLS_177 } = __VLS_175.slots;
if (__VLS_ctx.showFilterModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showFilterModal))
                    throw 0;
                return __VLS_ctx.showFilterModal = false;
                // @ts-ignore
                [showFilterModal, showFilterModal,];
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
                if (!(__VLS_ctx.showFilterModal))
                    throw 0;
                return __VLS_ctx.showFilterModal = false;
                // @ts-ignore
                [showFilterModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_178;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_179 = __VLS_asFunctionalComponent1(__VLS_178, new __VLS_178({
        size: (14),
    }));
    const __VLS_180 = __VLS_179({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_179));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 gap-1.5 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [cat] of __VLS_vFor((__VLS_ctx.FILTER_CATEGORIES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showFilterModal))
                        throw 0;
                    return __VLS_ctx.toggleCategory(cat);
                    // @ts-ignore
                    [FILTER_CATEGORIES, toggleCategory,];
                } },
            key: (cat),
            ...{ class: "border rounded-xs px-1.5 py-1 text-center text-xs cursor-pointer transition-colors" },
            ...{ class: (__VLS_ctx.tempFilter.has(cat) ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/20 text-muted hover:bg-accent/5') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        (__VLS_ctx.CATEGORY_NAMES[cat]);
        // @ts-ignore
        [tempFilter, CATEGORY_NAMES,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    const __VLS_183 = Button || Button;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent1(__VLS_183, new __VLS_183({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
    }));
    const __VLS_185 = __VLS_184({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_184));
    let __VLS_188;
    const __VLS_189 = {
        /** @type {typeof __VLS_188.click} */
        onClick: (__VLS_ctx.handleClearFilter),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_190 } = __VLS_186.slots;
    // @ts-ignore
    [handleClearFilter,];
    var __VLS_186;
    var __VLS_187;
    const __VLS_191 = Button || Button;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent1(__VLS_191, new __VLS_191({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
    }));
    const __VLS_193 = __VLS_192({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center !bg-accent !text-bg" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    let __VLS_196;
    const __VLS_197 = {
        /** @type {typeof __VLS_196.click} */
        onClick: (__VLS_ctx.handleSaveFilter),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_198 } = __VLS_194.slots;
    // @ts-ignore
    [handleSaveFilter,];
    var __VLS_194;
    var __VLS_195;
}
// @ts-ignore
[];
var __VLS_175;
let __VLS_199;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_200 = __VLS_asFunctionalComponent1(__VLS_199, new __VLS_199({
    name: "panel-fade",
}));
const __VLS_201 = __VLS_200({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_200));
const { default: __VLS_204 } = __VLS_202.slots;
if (__VLS_ctx.activeTempItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeTempItem))
                    throw 0;
                return __VLS_ctx.activeTempIdx = null;
                // @ts-ignore
                [activeTempIdx, activeTempItem,];
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
                if (!(__VLS_ctx.activeTempItem))
                    throw 0;
                return __VLS_ctx.activeTempIdx = null;
                // @ts-ignore
                [activeTempIdx,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_205;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_206 = __VLS_asFunctionalComponent1(__VLS_205, new __VLS_205({
        size: (14),
    }));
    const __VLS_207 = __VLS_206({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_206));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: ({
                'text-quality-fine': __VLS_ctx.activeTempItem.quality === 'fine',
                'text-quality-excellent': __VLS_ctx.activeTempItem.quality === 'excellent',
                'text-quality-supreme': __VLS_ctx.activeTempItem.quality === 'supreme',
                'text-accent': __VLS_ctx.activeTempItem.quality === 'normal'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeTempItemDef?.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-danger ml-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
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
    (__VLS_ctx.activeTempItemDef?.description);
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
    (__VLS_ctx.activeTempItem.quantity);
    if (__VLS_ctx.activeTempItem.quality !== 'normal') {
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
            ...{ class: ({
                    'text-quality-fine': __VLS_ctx.activeTempItem.quality === 'fine',
                    'text-quality-excellent': __VLS_ctx.activeTempItem.quality === 'excellent',
                    'text-quality-supreme': __VLS_ctx.activeTempItem.quality === 'supreme'
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
        (__VLS_ctx.QUALITY_NAMES[__VLS_ctx.activeTempItem.quality]);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    const __VLS_210 = Button || Button;
    // @ts-ignore
    const __VLS_211 = __VLS_asFunctionalComponent1(__VLS_210, new __VLS_210({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: (__VLS_ctx.inventoryStore.isFull ? 'opacity-50' : '') },
        icon: (__VLS_ctx.ArrowRight),
        iconSize: (12),
        disabled: (__VLS_ctx.inventoryStore.isFull),
    }));
    const __VLS_212 = __VLS_211({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        ...{ class: (__VLS_ctx.inventoryStore.isFull ? 'opacity-50' : '') },
        icon: (__VLS_ctx.ArrowRight),
        iconSize: (12),
        disabled: (__VLS_ctx.inventoryStore.isFull),
    }, ...__VLS_functionalComponentArgsRest(__VLS_211));
    let __VLS_215;
    const __VLS_216 = {
        /** @type {typeof __VLS_215.click} */
        onClick: (__VLS_ctx.handleMoveFromTemp),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_217 } = __VLS_213.slots;
    // @ts-ignore
    [inventoryStore, inventoryStore, activeTempItem, activeTempItem, activeTempItem, activeTempItem, activeTempItem, activeTempItem, activeTempItem, activeTempItem, activeTempItem, activeTempItem, activeTempItemDef, activeTempItemDef, QUALITY_NAMES, ArrowRight, handleMoveFromTemp,];
    var __VLS_213;
    var __VLS_214;
    const __VLS_218 = Button || Button;
    // @ts-ignore
    const __VLS_219 = __VLS_asFunctionalComponent1(__VLS_218, new __VLS_218({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }));
    const __VLS_220 = __VLS_219({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_219));
    let __VLS_223;
    const __VLS_224 = {
        /** @type {typeof __VLS_223.click} */
        onClick: (__VLS_ctx.handleDiscardTemp),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
    const { default: __VLS_225 } = __VLS_221.slots;
    // @ts-ignore
    [handleDiscardTemp,];
    var __VLS_221;
    var __VLS_222;
}
// @ts-ignore
[];
var __VLS_202;
let __VLS_226;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent1(__VLS_226, new __VLS_226({
    name: "panel-fade",
}));
const __VLS_228 = __VLS_227({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
const { default: __VLS_231 } = __VLS_229.slots;
if (__VLS_ctx.activeItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeItem))
                    throw 0;
                return __VLS_ctx.activeItemKey = null;
                // @ts-ignore
                [activeItemKey, activeItem,];
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
                if (!(__VLS_ctx.activeItem))
                    throw 0;
                return __VLS_ctx.activeItemKey = null;
                // @ts-ignore
                [activeItemKey,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_232;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent1(__VLS_232, new __VLS_232({
        size: (14),
    }));
    const __VLS_234 = __VLS_233({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: ({
                'text-quality-fine': __VLS_ctx.activeItem.quality === 'fine',
                'text-quality-excellent': __VLS_ctx.activeItem.quality === 'excellent',
                'text-quality-supreme': __VLS_ctx.activeItem.quality === 'supreme',
                'text-accent': __VLS_ctx.activeItem.quality === 'normal'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeItemDef?.name);
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
    (__VLS_ctx.activeItemDef?.description);
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
    (__VLS_ctx.activeItem.quantity);
    if (__VLS_ctx.activeItem.quality !== 'normal') {
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
            ...{ class: ({
                    'text-quality-fine': __VLS_ctx.activeItem.quality === 'fine',
                    'text-quality-excellent': __VLS_ctx.activeItem.quality === 'excellent',
                    'text-quality-supreme': __VLS_ctx.activeItem.quality === 'supreme'
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-quality-fine']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-quality-excellent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
        (__VLS_ctx.QUALITY_NAMES[__VLS_ctx.activeItem.quality]);
    }
    if (__VLS_ctx.activeItemDef?.sellPrice) {
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
        (__VLS_ctx.activeItemDef.sellPrice);
    }
    if (__VLS_ctx.activeItemDef?.staminaRestore) {
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
        (__VLS_ctx.activeItemDef.staminaRestore);
        if (__VLS_ctx.activeItemDef.healthRestore) {
            (__VLS_ctx.activeItemDef.healthRestore);
        }
    }
    if (__VLS_ctx.activeItemBuff) {
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
        (__VLS_ctx.activeItemBuff.description);
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
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.getItemSource(__VLS_ctx.activeItem.itemId));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    const __VLS_237 = Button || Button;
    // @ts-ignore
    const __VLS_238 = __VLS_asFunctionalComponent1(__VLS_237, new __VLS_237({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        icon: (__VLS_ctx.activeItem.locked ? __VLS_ctx.LockOpen : __VLS_ctx.Lock),
        iconSize: (12),
    }));
    const __VLS_239 = __VLS_238({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        icon: (__VLS_ctx.activeItem.locked ? __VLS_ctx.LockOpen : __VLS_ctx.Lock),
        iconSize: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_238));
    let __VLS_242;
    const __VLS_243 = {
        /** @type {typeof __VLS_242.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.activeItem))
                throw 0;
            return __VLS_ctx.inventoryStore.toggleLock(__VLS_ctx.activeItem.itemId, __VLS_ctx.activeItem.quality);
            // @ts-ignore
            [inventoryStore, QUALITY_NAMES, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItem, activeItemDef, activeItemDef, activeItemDef, activeItemDef, activeItemDef, activeItemDef, activeItemDef, activeItemDef, activeItemBuff, activeItemBuff, getItemSource, LockOpen, Lock,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_244 } = __VLS_240.slots;
    (__VLS_ctx.activeItem.locked ? '解锁' : '锁定');
    // @ts-ignore
    [activeItem,];
    var __VLS_240;
    var __VLS_241;
    if (__VLS_ctx.isEdible(__VLS_ctx.activeItem.itemId)) {
        const __VLS_245 = Button || Button;
        // @ts-ignore
        const __VLS_246 = __VLS_asFunctionalComponent1(__VLS_245, new __VLS_245({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Apple),
            iconSize: (12),
        }));
        const __VLS_247 = __VLS_246({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Apple),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_246));
        let __VLS_250;
        const __VLS_251 = {
            /** @type {typeof __VLS_250.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeItem))
                    throw 0;
                if (!(__VLS_ctx.isEdible(__VLS_ctx.activeItem.itemId)))
                    throw 0;
                return __VLS_ctx.handleEat(__VLS_ctx.activeItem.itemId, __VLS_ctx.activeItem.quality);
                // @ts-ignore
                [activeItem, activeItem, activeItem, isEdible, Apple, handleEat,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_252 } = __VLS_248.slots;
        // @ts-ignore
        [];
        var __VLS_248;
        var __VLS_249;
    }
    if (__VLS_ctx.isUsable(__VLS_ctx.activeItem.itemId)) {
        const __VLS_253 = Button || Button;
        // @ts-ignore
        const __VLS_254 = __VLS_asFunctionalComponent1(__VLS_253, new __VLS_253({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Zap),
            iconSize: (12),
        }));
        const __VLS_255 = __VLS_254({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            icon: (__VLS_ctx.Zap),
            iconSize: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_254));
        let __VLS_258;
        const __VLS_259 = {
            /** @type {typeof __VLS_258.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeItem))
                    throw 0;
                if (!(__VLS_ctx.isUsable(__VLS_ctx.activeItem.itemId)))
                    throw 0;
                return __VLS_ctx.handleUse(__VLS_ctx.activeItem.itemId, __VLS_ctx.activeItem.quality);
                // @ts-ignore
                [activeItem, activeItem, activeItem, isUsable, Zap, handleUse,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_260 } = __VLS_256.slots;
        // @ts-ignore
        [];
        var __VLS_256;
        var __VLS_257;
    }
    if (!__VLS_ctx.activeItem.locked) {
        if (__VLS_ctx.discardMode) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "number",
                min: (1),
                max: (__VLS_ctx.activeItem.quantity),
                ...{ class: "flex-1 bg-bg border border-accent/20 rounded-xs px-1.5 py-0.5 text-xs text-text w-12 text-center" },
            });
            (__VLS_ctx.discardQty);
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-12']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            const __VLS_261 = Button || Button;
            // @ts-ignore
            const __VLS_262 = __VLS_asFunctionalComponent1(__VLS_261, new __VLS_261({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center !bg-danger !text-text" },
            }));
            const __VLS_263 = __VLS_262({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center !bg-danger !text-text" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_262));
            let __VLS_266;
            const __VLS_267 = {
                /** @type {typeof __VLS_266.click} */
                onClick: (__VLS_ctx.confirmDiscard),
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['!bg-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['!text-text']} */ ;
            const { default: __VLS_268 } = __VLS_264.slots;
            // @ts-ignore
            [activeItem, activeItem, discardMode, discardQty, confirmDiscard,];
            var __VLS_264;
            var __VLS_265;
            const __VLS_269 = Button || Button;
            // @ts-ignore
            const __VLS_270 = __VLS_asFunctionalComponent1(__VLS_269, new __VLS_269({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }));
            const __VLS_271 = __VLS_270({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_270));
            let __VLS_274;
            const __VLS_275 = {
                /** @type {typeof __VLS_274.click} */
                onClick: (__VLS_ctx.cancelDiscard),
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_276 } = __VLS_272.slots;
            // @ts-ignore
            [cancelDiscard,];
            var __VLS_272;
            var __VLS_273;
        }
        else {
            const __VLS_277 = Button || Button;
            // @ts-ignore
            const __VLS_278 = __VLS_asFunctionalComponent1(__VLS_277, new __VLS_277({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center text-danger border-danger/40" },
                icon: (__VLS_ctx.Trash2),
                iconSize: (12),
            }));
            const __VLS_279 = __VLS_278({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center text-danger border-danger/40" },
                icon: (__VLS_ctx.Trash2),
                iconSize: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_278));
            let __VLS_282;
            const __VLS_283 = {
                /** @type {typeof __VLS_282.click} */
                onClick: (__VLS_ctx.enterDiscardMode),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
            const { default: __VLS_284 } = __VLS_280.slots;
            // @ts-ignore
            [Trash2, enterDiscardMode,];
            var __VLS_280;
            var __VLS_281;
        }
    }
}
// @ts-ignore
[];
var __VLS_229;
let __VLS_285;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_286 = __VLS_asFunctionalComponent1(__VLS_285, new __VLS_285({
    name: "panel-fade",
}));
const __VLS_287 = __VLS_286({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_286));
const { default: __VLS_290 } = __VLS_288.slots;
if (__VLS_ctx.activeWeaponIdx !== null && __VLS_ctx.activeWeaponDef) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeWeaponIdx !== null && __VLS_ctx.activeWeaponDef))
                    throw 0;
                return __VLS_ctx.activeWeaponIdx = null;
                // @ts-ignore
                [activeWeaponIdx, activeWeaponIdx, activeWeaponDef,];
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
                if (!(__VLS_ctx.activeWeaponIdx !== null && __VLS_ctx.activeWeaponDef))
                    throw 0;
                return __VLS_ctx.activeWeaponIdx = null;
                // @ts-ignore
                [activeWeaponIdx,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_291;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_292 = __VLS_asFunctionalComponent1(__VLS_291, new __VLS_291({
        size: (14),
    }));
    const __VLS_293 = __VLS_292({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_292));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeWeaponName);
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
    (__VLS_ctx.activeWeaponDef.description);
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
    (__VLS_ctx.WEAPON_TYPE_NAMES[__VLS_ctx.activeWeaponDef.type]);
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
    (__VLS_ctx.activeWeaponDef.attack);
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
    (Math.round(__VLS_ctx.activeWeaponDef.critRate * 100));
    if (__VLS_ctx.activeWeaponEnchant) {
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
        (__VLS_ctx.activeWeaponEnchant.name);
        (__VLS_ctx.activeWeaponEnchant.description);
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeWeaponPrice);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    if (__VLS_ctx.activeWeaponIdx !== __VLS_ctx.inventoryStore.equippedWeaponIndex) {
        const __VLS_296 = Button || Button;
        // @ts-ignore
        const __VLS_297 = __VLS_asFunctionalComponent1(__VLS_296, new __VLS_296({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_298 = __VLS_297({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_297));
        let __VLS_301;
        const __VLS_302 = {
            /** @type {typeof __VLS_301.click} */
            onClick: (__VLS_ctx.handleEquipWeapon),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_303 } = __VLS_299.slots;
        // @ts-ignore
        [inventoryStore, activeWeaponIdx, activeWeaponDef, activeWeaponDef, activeWeaponDef, activeWeaponDef, activeWeaponName, WEAPON_TYPE_NAMES, activeWeaponEnchant, activeWeaponEnchant, activeWeaponEnchant, activeWeaponPrice, handleEquipWeapon,];
        var __VLS_299;
        var __VLS_300;
    }
    if (__VLS_ctx.activeWeaponIdx !== __VLS_ctx.inventoryStore.equippedWeaponIndex && __VLS_ctx.inventoryStore.ownedWeapons.length > 1) {
        const __VLS_304 = Button || Button;
        // @ts-ignore
        const __VLS_305 = __VLS_asFunctionalComponent1(__VLS_304, new __VLS_304({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center text-danger border-danger/40" },
        }));
        const __VLS_306 = __VLS_305({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center text-danger border-danger/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_305));
        let __VLS_309;
        const __VLS_310 = {
            /** @type {typeof __VLS_309.click} */
            onClick: (__VLS_ctx.handleSellWeapon),
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
        const { default: __VLS_311 } = __VLS_307.slots;
        (__VLS_ctx.activeWeaponPrice);
        // @ts-ignore
        [inventoryStore, inventoryStore, activeWeaponIdx, activeWeaponPrice, handleSellWeapon,];
        var __VLS_307;
        var __VLS_308;
    }
    if (__VLS_ctx.activeWeaponIdx === __VLS_ctx.inventoryStore.equippedWeaponIndex) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    }
}
// @ts-ignore
[inventoryStore, activeWeaponIdx,];
var __VLS_288;
let __VLS_312;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent1(__VLS_312, new __VLS_312({
    name: "panel-fade",
}));
const __VLS_314 = __VLS_313({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
const { default: __VLS_317 } = __VLS_315.slots;
if (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.activeRingDef) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeRingIdx !== null && __VLS_ctx.activeRingDef))
                    throw 0;
                return __VLS_ctx.activeRingIdx = null;
                // @ts-ignore
                [activeRingIdx, activeRingIdx, activeRingDef,];
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
                if (!(__VLS_ctx.activeRingIdx !== null && __VLS_ctx.activeRingDef))
                    throw 0;
                return __VLS_ctx.activeRingIdx = null;
                // @ts-ignore
                [activeRingIdx,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_318;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_319 = __VLS_asFunctionalComponent1(__VLS_318, new __VLS_318({
        size: (14),
    }));
    const __VLS_320 = __VLS_319({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_319));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeRingDef.name);
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
    (__VLS_ctx.activeRingDef.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [eff] of __VLS_vFor((__VLS_ctx.activeRingDef.effects))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (eff.type),
            ...{ class: "flex items-center justify-between mt-0.5 first:mt-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['first:mt-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.RING_EFFECT_NAMES[eff.type] ?? eff.type);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.formatEffectValue(eff));
        // @ts-ignore
        [activeRingDef, activeRingDef, activeRingDef, RING_EFFECT_NAMES, formatEffectValue,];
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeRingDef.sellPrice);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    const __VLS_323 = Button || Button;
    // @ts-ignore
    const __VLS_324 = __VLS_asFunctionalComponent1(__VLS_323, new __VLS_323({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 0) ? 'opacity-30 cursor-not-allowed' : '') },
        disabled: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 0)),
    }));
    const __VLS_325 = __VLS_324({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 0) ? 'opacity-30 cursor-not-allowed' : '') },
        disabled: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 0)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_324));
    let __VLS_328;
    const __VLS_329 = {
        /** @type {typeof __VLS_328.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.activeRingIdx !== null && __VLS_ctx.activeRingDef))
                throw 0;
            return __VLS_ctx.handleEquipRingFromPopup(0);
            // @ts-ignore
            [activeRingIdx, activeRingIdx, activeRingIdx, activeRingIdx, isRingBlockedForSlot, isRingBlockedForSlot, activeRingDef, handleEquipRingFromPopup,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_330 } = __VLS_326.slots;
    (__VLS_ctx.inventoryStore.equippedRingSlot1 === __VLS_ctx.activeRingIdx ? '卸下槽1' : '装备槽1');
    // @ts-ignore
    [inventoryStore, activeRingIdx,];
    var __VLS_326;
    var __VLS_327;
    const __VLS_331 = Button || Button;
    // @ts-ignore
    const __VLS_332 = __VLS_asFunctionalComponent1(__VLS_331, new __VLS_331({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 1) ? 'opacity-30 cursor-not-allowed' : '') },
        disabled: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 1)),
    }));
    const __VLS_333 = __VLS_332({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 1) ? 'opacity-30 cursor-not-allowed' : '') },
        disabled: (__VLS_ctx.activeRingIdx !== null && __VLS_ctx.isRingBlockedForSlot(__VLS_ctx.activeRingIdx, 1)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_332));
    let __VLS_336;
    const __VLS_337 = {
        /** @type {typeof __VLS_336.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.activeRingIdx !== null && __VLS_ctx.activeRingDef))
                throw 0;
            return __VLS_ctx.handleEquipRingFromPopup(1);
            // @ts-ignore
            [activeRingIdx, activeRingIdx, activeRingIdx, activeRingIdx, isRingBlockedForSlot, isRingBlockedForSlot, handleEquipRingFromPopup,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_338 } = __VLS_334.slots;
    (__VLS_ctx.inventoryStore.equippedRingSlot2 === __VLS_ctx.activeRingIdx ? '卸下槽2' : '装备槽2');
    // @ts-ignore
    [inventoryStore, activeRingIdx,];
    var __VLS_334;
    var __VLS_335;
    const __VLS_339 = Button || Button;
    // @ts-ignore
    const __VLS_340 = __VLS_asFunctionalComponent1(__VLS_339, new __VLS_339({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }));
    const __VLS_341 = __VLS_340({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_340));
    let __VLS_344;
    const __VLS_345 = {
        /** @type {typeof __VLS_344.click} */
        onClick: (__VLS_ctx.handleSellRing),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
    const { default: __VLS_346 } = __VLS_342.slots;
    (__VLS_ctx.activeRingDef.sellPrice);
    // @ts-ignore
    [activeRingDef, handleSellRing,];
    var __VLS_342;
    var __VLS_343;
}
// @ts-ignore
[];
var __VLS_315;
let __VLS_347;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_348 = __VLS_asFunctionalComponent1(__VLS_347, new __VLS_347({
    name: "panel-fade",
}));
const __VLS_349 = __VLS_348({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_348));
const { default: __VLS_352 } = __VLS_350.slots;
if (__VLS_ctx.activeHatIdx !== null && __VLS_ctx.activeHatDef) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeHatIdx !== null && __VLS_ctx.activeHatDef))
                    throw 0;
                return __VLS_ctx.activeHatIdx = null;
                // @ts-ignore
                [activeHatIdx, activeHatIdx, activeHatDef,];
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
                if (!(__VLS_ctx.activeHatIdx !== null && __VLS_ctx.activeHatDef))
                    throw 0;
                return __VLS_ctx.activeHatIdx = null;
                // @ts-ignore
                [activeHatIdx,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_353;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_354 = __VLS_asFunctionalComponent1(__VLS_353, new __VLS_353({
        size: (14),
    }));
    const __VLS_355 = __VLS_354({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_354));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeHatDef.name);
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
    (__VLS_ctx.activeHatDef.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [eff] of __VLS_vFor((__VLS_ctx.activeHatDef.effects))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (eff.type),
            ...{ class: "flex items-center justify-between mt-0.5 first:mt-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['first:mt-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.RING_EFFECT_NAMES[eff.type] ?? eff.type);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.formatEffectValue(eff));
        // @ts-ignore
        [RING_EFFECT_NAMES, formatEffectValue, activeHatDef, activeHatDef, activeHatDef,];
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeHatDef.sellPrice);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    const __VLS_358 = Button || Button;
    // @ts-ignore
    const __VLS_359 = __VLS_asFunctionalComponent1(__VLS_358, new __VLS_358({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }));
    const __VLS_360 = __VLS_359({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_359));
    let __VLS_363;
    const __VLS_364 = {
        /** @type {typeof __VLS_363.click} */
        onClick: (__VLS_ctx.handleToggleHatFromPopup),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_365 } = __VLS_361.slots;
    (__VLS_ctx.inventoryStore.equippedHatIndex === __VLS_ctx.activeHatIdx ? '卸下' : '装备');
    // @ts-ignore
    [inventoryStore, activeHatIdx, activeHatDef, handleToggleHatFromPopup,];
    var __VLS_361;
    var __VLS_362;
    const __VLS_366 = Button || Button;
    // @ts-ignore
    const __VLS_367 = __VLS_asFunctionalComponent1(__VLS_366, new __VLS_366({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }));
    const __VLS_368 = __VLS_367({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_367));
    let __VLS_371;
    const __VLS_372 = {
        /** @type {typeof __VLS_371.click} */
        onClick: (__VLS_ctx.handleSellHat),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
    const { default: __VLS_373 } = __VLS_369.slots;
    (__VLS_ctx.activeHatDef.sellPrice);
    // @ts-ignore
    [activeHatDef, handleSellHat,];
    var __VLS_369;
    var __VLS_370;
}
// @ts-ignore
[];
var __VLS_350;
let __VLS_374;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_375 = __VLS_asFunctionalComponent1(__VLS_374, new __VLS_374({
    name: "panel-fade",
}));
const __VLS_376 = __VLS_375({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_375));
const { default: __VLS_379 } = __VLS_377.slots;
if (__VLS_ctx.activeShoeIdx !== null && __VLS_ctx.activeShoeDef) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeShoeIdx !== null && __VLS_ctx.activeShoeDef))
                    throw 0;
                return __VLS_ctx.activeShoeIdx = null;
                // @ts-ignore
                [activeShoeIdx, activeShoeIdx, activeShoeDef,];
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
                if (!(__VLS_ctx.activeShoeIdx !== null && __VLS_ctx.activeShoeDef))
                    throw 0;
                return __VLS_ctx.activeShoeIdx = null;
                // @ts-ignore
                [activeShoeIdx,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_380;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_381 = __VLS_asFunctionalComponent1(__VLS_380, new __VLS_380({
        size: (14),
    }));
    const __VLS_382 = __VLS_381({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_381));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeShoeDef.name);
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
    (__VLS_ctx.activeShoeDef.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [eff] of __VLS_vFor((__VLS_ctx.activeShoeDef.effects))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (eff.type),
            ...{ class: "flex items-center justify-between mt-0.5 first:mt-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['first:mt-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.RING_EFFECT_NAMES[eff.type] ?? eff.type);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.formatEffectValue(eff));
        // @ts-ignore
        [RING_EFFECT_NAMES, formatEffectValue, activeShoeDef, activeShoeDef, activeShoeDef,];
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeShoeDef.sellPrice);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    const __VLS_385 = Button || Button;
    // @ts-ignore
    const __VLS_386 = __VLS_asFunctionalComponent1(__VLS_385, new __VLS_385({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }));
    const __VLS_387 = __VLS_386({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_386));
    let __VLS_390;
    const __VLS_391 = {
        /** @type {typeof __VLS_390.click} */
        onClick: (__VLS_ctx.handleToggleShoeFromPopup),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_392 } = __VLS_388.slots;
    (__VLS_ctx.inventoryStore.equippedShoeIndex === __VLS_ctx.activeShoeIdx ? '卸下' : '装备');
    // @ts-ignore
    [inventoryStore, activeShoeIdx, activeShoeDef, handleToggleShoeFromPopup,];
    var __VLS_388;
    var __VLS_389;
    const __VLS_393 = Button || Button;
    // @ts-ignore
    const __VLS_394 = __VLS_asFunctionalComponent1(__VLS_393, new __VLS_393({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }));
    const __VLS_395 = __VLS_394({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center text-danger border-danger/40" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_394));
    let __VLS_398;
    const __VLS_399 = {
        /** @type {typeof __VLS_398.click} */
        onClick: (__VLS_ctx.handleSellShoe),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/40']} */ ;
    const { default: __VLS_400 } = __VLS_396.slots;
    (__VLS_ctx.activeShoeDef.sellPrice);
    // @ts-ignore
    [activeShoeDef, handleSellShoe,];
    var __VLS_396;
    var __VLS_397;
}
// @ts-ignore
[];
var __VLS_377;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
