/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { BookOpen, CircleCheck, Circle, Send, X, ScrollText, Lock } from 'lucide-vue-next';
import Button from '@/components/game/Button.vue';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useAnimalStore } from '@/stores/useAnimalStore';
import { useGuildStore } from '@/stores/useGuildStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useMuseumStore } from '@/stores/useMuseumStore';
import { useNpcStore } from '@/stores/useNpcStore';
import { useQuestStore } from '@/stores/useQuestStore';
import { useSecretNoteStore } from '@/stores/useSecretNoteStore';
import { useShopStore } from '@/stores/useShopStore';
import { useSkillStore } from '@/stores/useSkillStore';
import { ACHIEVEMENTS, COMMUNITY_BUNDLES } from '@/data/achievements';
import { ITEMS, getItemById } from '@/data/items';
import { HYBRID_DEFS } from '@/data/breeding';
import { SECRET_NOTES } from '@/data/secretNotes';
import { WEAPONS, ENCHANTMENTS, WEAPON_TYPE_NAMES } from '@/data/weapons';
import { getRingById } from '@/data/rings';
import { getHatById } from '@/data/hats';
import { getShoeById } from '@/data/shoes';
import { sfxClick } from '@/composables/useAudio';
import { addLog } from '@/composables/useGameLog';
const achievementStore = useAchievementStore();
const inventoryStore = useInventoryStore();
const shopStore = useShopStore();
const animalStore = useAnimalStore();
const secretNoteStore = useSecretNoteStore();
const skillStore = useSkillStore();
const npcStore = useNpcStore();
const questStore = useQuestStore();
const museumStore = useMuseumStore();
const guildStore = useGuildStore();
const tab = ref('collection');
const allItems = ITEMS;
// === 图鉴分类筛选 ===
const selectedCategory = ref(null);
/** 统计各分类物品数量，生成分类按钮列表 */
const collectionCategories = computed(() => {
    const countMap = new Map();
    for (const item of allItems) {
        countMap.set(item.category, (countMap.get(item.category) ?? 0) + 1);
    }
    return [...countMap.entries()].map(([key, count]) => ({
        key,
        label: CATEGORY_NAMES[key] ?? key,
        count
    }));
});
/** 按分类筛选后的物品列表 */
const filteredItems = computed(() => {
    if (!selectedCategory.value)
        return allItems;
    return allItems.filter(i => i.category === selectedCategory.value);
});
/** 筛选后已发现数量 */
const filteredDiscoveredCount = computed(() => {
    return filteredItems.value.filter(i => achievementStore.isDiscovered(i.id)).length;
});
// === 图鉴虚拟滚动 ===
const collectionRef = ref(null);
const collectionScrollTop = ref(0);
const ROW_H = 34;
const VBUFFER = 5;
const collectionCols = ref(window.innerWidth >= 768 ? 5 : 3);
const updateCols = () => {
    collectionCols.value = window.innerWidth >= 768 ? 5 : 3;
};
onMounted(() => window.addEventListener('resize', updateCols));
onUnmounted(() => window.removeEventListener('resize', updateCols));
let rafId = 0;
const onCollectionScroll = (e) => {
    if (rafId)
        return;
    rafId = requestAnimationFrame(() => {
        collectionScrollTop.value = e.target.scrollTop;
        rafId = 0;
    });
};
const containerH = ref(288);
onMounted(() => {
    if (collectionRef.value)
        containerH.value = collectionRef.value.clientHeight;
});
const totalRows = computed(() => Math.ceil(filteredItems.value.length / collectionCols.value));
const visibleRange = computed(() => {
    const start = Math.max(0, Math.floor(collectionScrollTop.value / ROW_H) - VBUFFER);
    const end = Math.min(totalRows.value, Math.ceil((collectionScrollTop.value + containerH.value) / ROW_H) + VBUFFER);
    return { start, end };
});
const visibleItems = computed(() => {
    const { start, end } = visibleRange.value;
    return filteredItems.value.slice(start * collectionCols.value, end * collectionCols.value);
});
const topPad = computed(() => visibleRange.value.start * ROW_H);
const bottomPad = computed(() => Math.max(0, (totalRows.value - visibleRange.value.end) * ROW_H));
watch(tab, () => {
    collectionScrollTop.value = 0;
});
watch(selectedCategory, () => {
    collectionScrollTop.value = 0;
    if (collectionRef.value)
        collectionRef.value.scrollTop = 0;
});
/** 成就详情弹窗 */
const activeAchievement = ref(null);
/** 祠堂任务弹窗 */
const activeBundle = ref(null);
/** 祠堂任务完成进度文本 */
const getBundleProgress = (bundle) => {
    const done = bundle.requiredItems.filter(r => getSubmittedCount(bundle.id, r.itemId) >= r.quantity).length;
    return `${done}/${bundle.requiredItems.length}`;
};
/** 秘密笔记弹窗 */
const activeNote = ref(null);
/** 出货详情弹窗 */
const activeShippingId = ref(null);
const activeShippingItem = computed(() => {
    if (!activeShippingId.value)
        return null;
    return getItemById(activeShippingId.value) ?? null;
});
const NOTE_TYPE_COLORS = {
    tip: 'text-accent',
    treasure: 'text-success',
    npc: 'text-water',
    story: 'text-muted'
};
const NOTE_TYPE_LABELS = {
    tip: '提示',
    treasure: '宝藏',
    npc: '人物',
    story: '故事'
};
const noteTypeColor = (type) => NOTE_TYPE_COLORS[type] ?? 'text-accent';
const handleUseNote = (noteId) => {
    const result = secretNoteStore.useNote(noteId);
    if (result.success) {
        addLog(result.message);
    }
};
/** 图鉴详情弹窗 */
const activeCollectionId = ref(null);
const activeCollectionItem = computed(() => {
    if (!activeCollectionId.value)
        return null;
    return getItemById(activeCollectionId.value) ?? null;
});
/** 当前详情的武器定义（若为武器类） */
const activeWeaponDef = computed(() => {
    if (!activeCollectionItem.value || activeCollectionItem.value.category !== 'weapon')
        return null;
    return WEAPONS[activeCollectionItem.value.id] ?? null;
});
/** 当前详情的装备效果列表（戒指/帽子/鞋子） */
const activeEquipEffects = computed(() => {
    if (!activeCollectionItem.value)
        return [];
    const id = activeCollectionItem.value.id;
    const cat = activeCollectionItem.value.category;
    if (cat === 'ring')
        return getRingById(id)?.effects ?? [];
    if (cat === 'hat')
        return getHatById(id)?.effects ?? [];
    if (cat === 'shoe')
        return getShoeById(id)?.effects ?? [];
    return [];
});
/** 装备效果名称映射 */
const EFFECT_NAMES = {
    attack_bonus: '攻击力',
    crit_rate_bonus: '暴击率',
    defense_bonus: '减伤',
    vampiric: '吸血',
    max_hp_bonus: '最大HP',
    stamina_reduction: '体力消耗降低',
    mining_stamina: '采矿体力降低',
    farming_stamina: '农耕体力降低',
    fishing_stamina: '钓鱼体力降低',
    crop_quality_bonus: '作物品质',
    crop_growth_bonus: '作物生长加速',
    fish_quality_bonus: '鱼类品质',
    fishing_calm: '鱼温顺度',
    sell_price_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    monster_drop_bonus: '怪物掉落',
    exp_bonus: '经验加成',
    treasure_find: '宝箱发现率',
    ore_bonus: '额外矿石',
    luck: '幸运',
    travel_speed: '旅行加速'
};
/** 格式化效果值 */
const FLAT_VALUE_EFFECTS = new Set(['attack_bonus', 'max_hp_bonus', 'ore_bonus']);
const formatEffectValue = (eff) => {
    if (FLAT_VALUE_EFFECTS.has(eff.type))
        return `+${eff.value}`;
    return `+${Math.round(eff.value * 100)}%`;
};
/** 按分类给物品名称上色 */
const CATEGORY_COLOR_MAP = {
    crop: 'text-success',
    fish: 'text-water',
    ore: 'text-earth',
    gem: 'text-quality-supreme',
    food: 'text-quality-fine',
    fruit: 'text-success',
    animal_product: 'text-quality-fine',
    processed: 'text-accent',
    material: 'text-muted',
    misc: 'text-muted',
    gift: 'text-quality-excellent',
    seed: 'text-success/60',
    machine: 'text-muted',
    sprinkler: 'text-water',
    fertilizer: 'text-success/60',
    sapling: 'text-success/60',
    bait: 'text-water',
    tackle: 'text-water',
    bomb: 'text-danger',
    fossil: 'text-earth',
    artifact: 'text-quality-fine',
    weapon: 'text-danger',
    ring: 'text-quality-supreme',
    hat: 'text-accent',
    shoe: 'text-quality-excellent'
};
const getCategoryColor = (category) => {
    return CATEGORY_COLOR_MAP[category] ?? 'text-accent';
};
// === 出货收集 ===
const CATEGORY_NAMES = {
    seed: '种子',
    crop: '农作物',
    hybrid: '杂交作物',
    fish: '鱼类',
    animal_product: '畜产品',
    processed: '加工品',
    fruit: '水果',
    ore: '矿石',
    gem: '宝石',
    material: '材料',
    misc: '杂货',
    food: '料理',
    gift: '礼品',
    machine: '机器',
    sprinkler: '洒水器',
    fertilizer: '肥料',
    sapling: '树苗',
    bait: '鱼饵',
    tackle: '浮漂',
    bomb: '炸弹',
    fossil: '化石',
    artifact: '古物',
    weapon: '武器',
    ring: '戒指',
    hat: '帽子',
    shoe: '鞋子'
};
/** 可出货的类别（排除种子、机器、工具类） */
const SHIPPABLE_CATEGORIES = ['crop', 'fish', 'animal_product', 'processed', 'fruit', 'ore', 'gem', 'material', 'misc', 'food', 'gift'];
const shippableItems = computed(() => ITEMS.filter(i => SHIPPABLE_CATEGORIES.includes(i.category)));
const hybridItemIds = new Set(HYBRID_DEFS.map(h => h.resultCropId));
const itemsByCategory = computed(() => {
    const groups = {};
    for (const item of shippableItems.value) {
        const cat = item.category === 'crop' && hybridItemIds.has(item.id) ? 'hybrid' : item.category;
        if (!groups[cat])
            groups[cat] = [];
        groups[cat].push(item);
    }
    return groups;
});
const isCompleted = (id) => {
    return achievementStore.completedAchievements.includes(id);
};
const getItemName = (id) => {
    return getItemById(id)?.name ?? id;
};
const getSubmittedCount = (bundleId, itemId) => {
    return achievementStore.getBundleProgress(bundleId)[itemId] ?? 0;
};
/** 计算成就进度百分比（用于进度条） */
const getProgressPercent = (a) => {
    if (isCompleted(a.id))
        return 100;
    const c = a.condition;
    const s = achievementStore.stats;
    let current = 0;
    let target = 1;
    switch (c.type) {
        case 'itemCount':
            current = achievementStore.discoveredCount;
            target = c.count;
            break;
        case 'cropHarvest':
            current = s.totalCropsHarvested;
            target = c.count;
            break;
        case 'fishCaught':
            current = s.totalFishCaught;
            target = c.count;
            break;
        case 'moneyEarned':
            current = s.totalMoneyEarned;
            target = c.amount;
            break;
        case 'mineFloor':
            current = s.highestMineFloor;
            target = c.floor;
            break;
        case 'skullCavernFloor':
            current = s.skullCavernBestFloor;
            target = c.floor;
            break;
        case 'recipesCooked':
            current = s.totalRecipesCooked;
            target = c.count;
            break;
        case 'monstersKilled':
            current = s.totalMonstersKilled;
            target = c.count;
            break;
        case 'shippedCount':
            current = shopStore.shippedItems.length;
            target = c.count;
            break;
        case 'fullShipment':
            current = shopStore.shippedItems.length;
            target = shippableItems.value.length;
            break;
        case 'animalCount':
            current = animalStore.animals.length;
            target = c.count;
            break;
        case 'questsCompleted':
            current = questStore.completedQuestCount;
            target = c.count;
            break;
        case 'hybridsDiscovered':
            current = s.totalHybridsDiscovered;
            target = c.count;
            break;
        case 'breedingsDone':
            current = s.totalBreedingsDone;
            target = c.count;
            break;
        case 'hybridTier':
            current = s.highestHybridTier;
            target = c.tier;
            break;
        case 'hybridsShipped': {
            const hIds = new Set(HYBRID_DEFS.map(h => h.resultCropId));
            current = shopStore.shippedItems.filter(id => hIds.has(id)).length;
            target = c.count;
            break;
        }
        case 'skillLevel': {
            const skill = skillStore.skills.find(sk => sk.type === c.skillType);
            current = skill?.level ?? 0;
            target = c.level;
            break;
        }
        case 'allSkillsMax':
            current = skillStore.skills.filter(sk => sk.level === 10).length;
            target = skillStore.skills.length;
            break;
        case 'npcFriendship': {
            const LEVEL_RANK = { stranger: 0, acquaintance: 1, friendly: 2, bestFriend: 3 };
            const requiredRank = LEVEL_RANK[c.level] ?? 0;
            current = npcStore.npcStates.filter(n => (LEVEL_RANK[npcStore.getFriendshipLevel(n.npcId)] ?? 0) >= requiredRank).length;
            target = npcStore.npcStates.length;
            break;
        }
        case 'npcBestFriend':
            current = npcStore.npcStates.filter(n => npcStore.getFriendshipLevel(n.npcId) === 'bestFriend').length;
            target = c.count;
            break;
        case 'npcAllFriendly':
            current = npcStore.npcStates.filter(n => {
                const l = npcStore.getFriendshipLevel(n.npcId);
                return l === 'friendly' || l === 'bestFriend';
            }).length;
            target = npcStore.npcStates.length;
            break;
        case 'married':
            return npcStore.getSpouse() ? 100 : 0;
        case 'hasChild':
            return npcStore.children.length > 0 ? 100 : 0;
        case 'allBundlesComplete':
            current = achievementStore.completedBundles.length;
            target = COMMUNITY_BUNDLES.length;
            break;
        case 'museumDonations':
            current = museumStore.donatedCount;
            target = c.count;
            break;
        case 'guildGoalsCompleted':
            current = guildStore.completedGoalCount;
            target = c.count;
            break;
        default:
            return 0;
    }
    return target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
};
const getProgressText = (a) => {
    const c = a.condition;
    const s = achievementStore.stats;
    switch (c.type) {
        case 'itemCount':
            return `${achievementStore.discoveredCount}/${c.count}`;
        case 'cropHarvest':
            return `${s.totalCropsHarvested}/${c.count}`;
        case 'fishCaught':
            return `${s.totalFishCaught}/${c.count}`;
        case 'moneyEarned':
            return `${s.totalMoneyEarned}/${c.amount}`;
        case 'mineFloor':
            return `${s.highestMineFloor}/${c.floor}`;
        case 'skullCavernFloor':
            return `${s.skullCavernBestFloor}/${c.floor}`;
        case 'recipesCooked':
            return `${s.totalRecipesCooked}/${c.count}`;
        case 'monstersKilled':
            return `${s.totalMonstersKilled}/${c.count}`;
        case 'shippedCount':
            return `${shopStore.shippedItems.length}/${c.count}`;
        case 'fullShipment':
            return `${shopStore.shippedItems.length}/${shippableItems.value.length}`;
        case 'animalCount':
            return `${animalStore.animals.length}/${c.count}`;
        case 'questsCompleted':
            return `${questStore.completedQuestCount}/${c.count}`;
        case 'hybridsDiscovered':
            return `${s.totalHybridsDiscovered}/${c.count}`;
        case 'breedingsDone':
            return `${s.totalBreedingsDone}/${c.count}`;
        case 'hybridTier':
            return `${s.highestHybridTier}/${c.tier}`;
        case 'hybridsShipped': {
            const hIds = new Set(HYBRID_DEFS.map(h => h.resultCropId));
            return `${shopStore.shippedItems.filter(id => hIds.has(id)).length}/${c.count}`;
        }
        case 'skillLevel': {
            const skill = skillStore.skills.find(sk => sk.type === c.skillType);
            return `${skill?.level ?? 0}/${c.level}`;
        }
        case 'allSkillsMax': {
            const maxCount = skillStore.skills.filter(sk => sk.level === 10).length;
            return `${maxCount}/${skillStore.skills.length}`;
        }
        case 'npcFriendship': {
            const LEVEL_RANK = { stranger: 0, acquaintance: 1, friendly: 2, bestFriend: 3 };
            const requiredRank = LEVEL_RANK[c.level] ?? 0;
            const metCount = npcStore.npcStates.filter(n => (LEVEL_RANK[npcStore.getFriendshipLevel(n.npcId)] ?? 0) >= requiredRank).length;
            return `${metCount}/${npcStore.npcStates.length}`;
        }
        case 'npcBestFriend': {
            const bestCount = npcStore.npcStates.filter(n => npcStore.getFriendshipLevel(n.npcId) === 'bestFriend').length;
            return `${bestCount}/${c.count}`;
        }
        case 'npcAllFriendly': {
            const friendlyCount = npcStore.npcStates.filter(n => {
                const level = npcStore.getFriendshipLevel(n.npcId);
                return level === 'friendly' || level === 'bestFriend';
            }).length;
            return `${friendlyCount}/${npcStore.npcStates.length}`;
        }
        case 'married':
            return npcStore.getSpouse() ? '已完成' : '未完成';
        case 'hasChild':
            return npcStore.children.length > 0 ? '已完成' : '未完成';
        case 'allBundlesComplete':
            return `${achievementStore.completedBundles.length}/${COMMUNITY_BUNDLES.length}`;
        case 'museumDonations':
            return `${museumStore.donatedCount}/${c.count}`;
        case 'guildGoalsCompleted':
            return `${guildStore.completedGoalCount}/${c.count}`;
        default:
            return '';
    }
};
const handleSubmit = (bundleId, itemId) => {
    const bundle = COMMUNITY_BUNDLES.find(b => b.id === bundleId);
    const req = bundle?.requiredItems.find(r => r.itemId === itemId);
    if (!req)
        return;
    const submitted = getSubmittedCount(bundleId, itemId);
    const needed = req.quantity - submitted;
    const available = inventoryStore.getItemCount(itemId);
    const toSubmit = Math.min(needed, available);
    if (toSubmit <= 0)
        return;
    if (achievementStore.submitToBundle(bundleId, itemId, toSubmit)) {
        sfxClick();
        addLog(`向「${bundle?.name}」提交了${getItemName(itemId)}×${toSubmit}。`);
        if (achievementStore.isBundleComplete(bundleId)) {
            addLog(`「${bundle?.name}」完成！获得了奖励！`);
        }
    }
    else {
        addLog('提交失败。');
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
/** @ts-ignore @type { | typeof __VLS_components.BookOpen} */
BookOpen;
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
(__VLS_ctx.achievementStore.perfectionPercent);
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'collection' }) },
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'collection' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_10;
const __VLS_11 = {
    /** @type {typeof __VLS_10.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'collection';
        // @ts-ignore
        [achievementStore, tab, tab,];
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'achievements' }) },
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'achievements' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = {
    /** @type {typeof __VLS_18.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'achievements';
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'bundles' }) },
}));
const __VLS_23 = __VLS_22({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'bundles' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_26;
const __VLS_27 = {
    /** @type {typeof __VLS_26.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'bundles';
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
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'shipping' }) },
}));
const __VLS_31 = __VLS_30({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'shipping' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
let __VLS_34;
const __VLS_35 = {
    /** @type {typeof __VLS_34.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'shipping';
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
const __VLS_37 = Button || Button;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'notes' }) },
}));
const __VLS_39 = __VLS_38({
    ...{ 'onClick': {} },
    ...{ class: "flex-1 justify-center" },
    ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.tab === 'notes' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
let __VLS_42;
const __VLS_43 = {
    /** @type {typeof __VLS_42.click} */
    onClick: (...[$event]) => {
        return __VLS_ctx.tab = 'notes';
        // @ts-ignore
        [tab, tab,];
    },
};
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
const { default: __VLS_44 } = __VLS_40.slots;
// @ts-ignore
[];
var __VLS_40;
var __VLS_41;
if (__VLS_ctx.tab === 'collection') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.filteredDiscoveredCount);
    (__VLS_ctx.filteredItems.length);
    if (__VLS_ctx.selectedCategory) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent ml-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
        (__VLS_ctx.CATEGORY_NAMES[__VLS_ctx.selectedCategory] ?? __VLS_ctx.selectedCategory);
    }
    if (__VLS_ctx.selectedCategory) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'collection'))
                        throw 0;
                    if (!(__VLS_ctx.selectedCategory))
                        throw 0;
                    return __VLS_ctx.selectedCategory = null;
                    // @ts-ignore
                    [tab, filteredDiscoveredCount, filteredItems, selectedCategory, selectedCategory, selectedCategory, selectedCategory, selectedCategory, CATEGORY_NAMES,];
                } },
            ...{ class: "text-[10px] px-1.5 py-0.5 border border-accent/20 rounded-xs text-muted hover:text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [cat] of __VLS_vFor((__VLS_ctx.collectionCategories))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'collection'))
                        throw 0;
                    return __VLS_ctx.selectedCategory = __VLS_ctx.selectedCategory === cat.key ? null : cat.key;
                    // @ts-ignore
                    [selectedCategory, selectedCategory, collectionCategories,];
                } },
            key: (cat.key),
            ...{ class: "text-[10px] px-1.5 py-0.5 border rounded-xs mr-1 mb-1" },
            ...{ class: (__VLS_ctx.selectedCategory === cat.key ? 'border-accent text-accent' : 'border-accent/15 text-muted/60 hover:text-muted') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (cat.label);
        (cat.count);
        // @ts-ignore
        [selectedCategory,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onScroll: (__VLS_ctx.onCollectionScroll) },
        ref: "collectionRef",
        ...{ class: "max-h-60 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: ({ paddingTop: __VLS_ctx.topPad + 'px', paddingBottom: __VLS_ctx.bottomPad + 'px' }) },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.visibleItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'collection'))
                        throw 0;
                    return __VLS_ctx.achievementStore.isDiscovered(item.id) && (__VLS_ctx.activeCollectionId = item.id);
                    // @ts-ignore
                    [achievementStore, onCollectionScroll, topPad, bottomPad, visibleItems, activeCollectionId,];
                } },
            key: (item.id),
            ...{ class: "border rounded-xs p-1.5 text-xs text-center truncate mr-1" },
            ...{ class: (__VLS_ctx.achievementStore.isDiscovered(item.id)
                    ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + __VLS_ctx.getCategoryColor(item.category)
                    : 'border-accent/10 text-muted/30') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        if (__VLS_ctx.achievementStore.isDiscovered(item.id)) {
            (item.name);
        }
        else {
            let __VLS_45;
            /** @ts-ignore @type { | typeof __VLS_components.Lock} */
            Lock;
            // @ts-ignore
            const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }));
            const __VLS_47 = __VLS_46({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_46));
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        }
        // @ts-ignore
        [achievementStore, achievementStore, getCategoryColor,];
    }
}
let __VLS_50;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    name: "panel-fade",
}));
const __VLS_52 = __VLS_51({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
const { default: __VLS_55 } = __VLS_53.slots;
if (__VLS_ctx.activeCollectionItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeCollectionItem))
                    throw 0;
                return __VLS_ctx.activeCollectionId = null;
                // @ts-ignore
                [activeCollectionId, activeCollectionItem,];
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
                if (!(__VLS_ctx.activeCollectionItem))
                    throw 0;
                return __VLS_ctx.activeCollectionId = null;
                // @ts-ignore
                [activeCollectionId,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_56;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
        size: (14),
    }));
    const __VLS_58 = __VLS_57({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.getCategoryColor(__VLS_ctx.activeCollectionItem.category)) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeCollectionItem.name);
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
    (__VLS_ctx.activeCollectionItem.description);
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
    (__VLS_ctx.CATEGORY_NAMES[__VLS_ctx.activeCollectionItem.category] ?? __VLS_ctx.activeCollectionItem.category);
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
    (__VLS_ctx.activeCollectionItem.sellPrice);
    if (__VLS_ctx.activeCollectionItem.edible && __VLS_ctx.activeCollectionItem.staminaRestore) {
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
        (__VLS_ctx.activeCollectionItem.staminaRestore);
        if (__VLS_ctx.activeCollectionItem.healthRestore) {
            (__VLS_ctx.activeCollectionItem.healthRestore);
        }
    }
    if (__VLS_ctx.activeWeaponDef) {
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
            ...{ class: "text-xs text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
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
        if (__VLS_ctx.activeWeaponDef.fixedEnchantment) {
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
                ...{ class: "text-xs text-quality-supreme" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-quality-supreme']} */ ;
            (__VLS_ctx.ENCHANTMENTS[__VLS_ctx.activeWeaponDef.fixedEnchantment]?.name);
        }
    }
    if (__VLS_ctx.activeEquipEffects.length > 0) {
        for (const [eff, i] of __VLS_vFor((__VLS_ctx.activeEquipEffects))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
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
            (__VLS_ctx.EFFECT_NAMES[eff.type] ?? eff.type);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (__VLS_ctx.formatEffectValue(eff));
            // @ts-ignore
            [CATEGORY_NAMES, getCategoryColor, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeCollectionItem, activeWeaponDef, activeWeaponDef, activeWeaponDef, activeWeaponDef, activeWeaponDef, activeWeaponDef, WEAPON_TYPE_NAMES, ENCHANTMENTS, activeEquipEffects, activeEquipEffects, EFFECT_NAMES, formatEffectValue,];
        }
    }
    if (__VLS_ctx.achievementStore.getDiscoveryTime(__VLS_ctx.activeCollectionItem.id)) {
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
        (__VLS_ctx.achievementStore.getDiscoveryTime(__VLS_ctx.activeCollectionItem.id));
    }
}
// @ts-ignore
[achievementStore, achievementStore, activeCollectionItem, activeCollectionItem,];
var __VLS_53;
if (__VLS_ctx.tab === 'achievements') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.achievementStore.completedAchievements.length);
    (__VLS_ctx.ACHIEVEMENTS.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1 max-h-72 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [a] of __VLS_vFor((__VLS_ctx.ACHIEVEMENTS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'achievements'))
                        throw 0;
                    return __VLS_ctx.isCompleted(a.id) && (__VLS_ctx.activeAchievement = a);
                    // @ts-ignore
                    [achievementStore, tab, ACHIEVEMENTS, ACHIEVEMENTS, isCompleted, activeAchievement,];
                } },
            key: (a.id),
            ...{ class: "border rounded-xs p-1.5 text-xs text-center transition-colors truncate mr-1" },
            ...{ class: (__VLS_ctx.isCompleted(a.id) ? 'border-accent/20 cursor-pointer hover:bg-accent/5 text-success' : 'border-accent/10 text-muted/30') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        if (__VLS_ctx.isCompleted(a.id)) {
            (a.name);
        }
        else {
            let __VLS_61;
            /** @ts-ignore @type { | typeof __VLS_components.Lock} */
            Lock;
            // @ts-ignore
            const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }));
            const __VLS_63 = __VLS_62({
                size: (12),
                ...{ class: "mx-auto text-muted/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_62));
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
        }
        // @ts-ignore
        [isCompleted, isCompleted,];
    }
}
let __VLS_66;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
    name: "panel-fade",
}));
const __VLS_68 = __VLS_67({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
const { default: __VLS_71 } = __VLS_69.slots;
if (__VLS_ctx.activeAchievement) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeAchievement))
                    throw 0;
                return __VLS_ctx.activeAchievement = null;
                // @ts-ignore
                [activeAchievement, activeAchievement,];
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
                if (!(__VLS_ctx.activeAchievement))
                    throw 0;
                return __VLS_ctx.activeAchievement = null;
                // @ts-ignore
                [activeAchievement,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_72;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
        size: (14),
    }));
    const __VLS_74 = __VLS_73({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.isCompleted(__VLS_ctx.activeAchievement.id)) {
        let __VLS_77;
        /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
        CircleCheck;
        // @ts-ignore
        const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({
            size: (14),
            ...{ class: "text-success shrink-0" },
        }));
        const __VLS_79 = __VLS_78({
            size: (14),
            ...{ class: "text-success shrink-0" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_78));
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    }
    else {
        let __VLS_82;
        /** @ts-ignore @type { | typeof __VLS_components.Circle} */
        Circle;
        // @ts-ignore
        const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
            size: (14),
            ...{ class: "text-muted/40 shrink-0" },
        }));
        const __VLS_84 = __VLS_83({
            size: (14),
            ...{ class: "text-muted/40 shrink-0" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_83));
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm" },
        ...{ class: (__VLS_ctx.isCompleted(__VLS_ctx.activeAchievement.id) ? 'text-success' : 'text-text') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.activeAchievement.name);
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
    (__VLS_ctx.activeAchievement.description);
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.isCompleted(__VLS_ctx.activeAchievement.id) ? 'text-success' : 'text-text') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.getProgressText(__VLS_ctx.activeAchievement));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "h-1.5 bg-bg rounded-xs border border-accent/10" },
    });
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full rounded-xs transition-all" },
        ...{ class: (__VLS_ctx.isCompleted(__VLS_ctx.activeAchievement.id) ? 'bg-success' : 'bg-accent') },
        ...{ style: ({ width: __VLS_ctx.getProgressPercent(__VLS_ctx.activeAchievement) + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap space-x-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    if (__VLS_ctx.activeAchievement.reward.money) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.activeAchievement.reward.money);
    }
    for (const [ri] of __VLS_vFor((__VLS_ctx.activeAchievement.reward.items ?? []))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (ri.itemId),
            ...{ class: "text-xs text-text" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
        (__VLS_ctx.getItemName(ri.itemId));
        (ri.quantity);
        // @ts-ignore
        [isCompleted, isCompleted, isCompleted, isCompleted, activeAchievement, activeAchievement, activeAchievement, activeAchievement, activeAchievement, activeAchievement, activeAchievement, activeAchievement, activeAchievement, activeAchievement, activeAchievement, getProgressText, getProgressPercent, getItemName,];
    }
}
// @ts-ignore
[];
var __VLS_69;
if (__VLS_ctx.tab === 'bundles') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1.5 max-h-72 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [bundle] of __VLS_vFor((__VLS_ctx.COMMUNITY_BUNDLES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tab === 'bundles'))
                        throw 0;
                    return __VLS_ctx.activeBundle = bundle;
                    // @ts-ignore
                    [tab, COMMUNITY_BUNDLES, activeBundle,];
                } },
            key: (bundle.id),
            ...{ class: "border rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5 mr-1" },
            ...{ class: (__VLS_ctx.achievementStore.isBundleComplete(bundle.id) ? 'border-success/30' : 'border-accent/20') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
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
        if (__VLS_ctx.achievementStore.isBundleComplete(bundle.id)) {
            let __VLS_87;
            /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
            CircleCheck;
            // @ts-ignore
            const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
                size: (12),
                ...{ class: "text-success shrink-0" },
            }));
            const __VLS_89 = __VLS_88({
                size: (12),
                ...{ class: "text-success shrink-0" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_88));
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        }
        else {
            let __VLS_92;
            /** @ts-ignore @type { | typeof __VLS_components.Circle} */
            Circle;
            // @ts-ignore
            const __VLS_93 = __VLS_asFunctionalComponent1(__VLS_92, new __VLS_92({
                size: (12),
                ...{ class: "text-muted shrink-0" },
            }));
            const __VLS_94 = __VLS_93({
                size: (12),
                ...{ class: "text-muted shrink-0" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_93));
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.achievementStore.isBundleComplete(bundle.id) ? 'text-success' : 'text-accent') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (bundle.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted whitespace-nowrap ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (__VLS_ctx.getBundleProgress(bundle));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-0.5 pl-4.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['pl-4.5']} */ ;
        (bundle.description);
        // @ts-ignore
        [achievementStore, achievementStore, achievementStore, getBundleProgress,];
    }
}
let __VLS_97;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent1(__VLS_97, new __VLS_97({
    name: "panel-fade",
}));
const __VLS_99 = __VLS_98({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
const { default: __VLS_102 } = __VLS_100.slots;
if (__VLS_ctx.activeBundle) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeBundle))
                    throw 0;
                return __VLS_ctx.activeBundle = null;
                // @ts-ignore
                [activeBundle, activeBundle,];
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
                if (!(__VLS_ctx.activeBundle))
                    throw 0;
                return __VLS_ctx.activeBundle = null;
                // @ts-ignore
                [activeBundle,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_103;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({
        size: (14),
    }));
    const __VLS_105 = __VLS_104({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_104));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.achievementStore.isBundleComplete(__VLS_ctx.activeBundle.id) ? 'text-success' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeBundle.name);
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
    (__VLS_ctx.activeBundle.description);
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
    for (const [req] of __VLS_vFor((__VLS_ctx.activeBundle.requiredItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (req.itemId),
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
        (__VLS_ctx.getItemName(req.itemId));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.getSubmittedCount(__VLS_ctx.activeBundle.id, req.itemId) >= req.quantity ? 'text-success' : '') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getSubmittedCount(__VLS_ctx.activeBundle.id, req.itemId));
        (req.quantity);
        // @ts-ignore
        [achievementStore, getItemName, activeBundle, activeBundle, activeBundle, activeBundle, activeBundle, activeBundle, getSubmittedCount, getSubmittedCount,];
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeBundle.reward.description);
    if (!__VLS_ctx.achievementStore.isBundleComplete(__VLS_ctx.activeBundle.id)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        for (const [req] of __VLS_vFor((__VLS_ctx.activeBundle.requiredItems.filter(r => __VLS_ctx.getSubmittedCount(__VLS_ctx.activeBundle.id, r.itemId) < r.quantity)))) {
            const __VLS_108 = Button || Button;
            // @ts-ignore
            const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
                ...{ 'onClick': {} },
                key: ('submit_' + req.itemId),
                ...{ class: "w-full justify-center" },
                icon: (__VLS_ctx.Send),
                iconSize: (12),
                disabled: (!__VLS_ctx.inventoryStore.hasItem(req.itemId)),
            }));
            const __VLS_110 = __VLS_109({
                ...{ 'onClick': {} },
                key: ('submit_' + req.itemId),
                ...{ class: "w-full justify-center" },
                icon: (__VLS_ctx.Send),
                iconSize: (12),
                disabled: (!__VLS_ctx.inventoryStore.hasItem(req.itemId)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_109));
            let __VLS_113;
            const __VLS_114 = {
                /** @type {typeof __VLS_113.click} */
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeBundle))
                        throw 0;
                    if (!(!__VLS_ctx.achievementStore.isBundleComplete(__VLS_ctx.activeBundle.id)))
                        throw 0;
                    return __VLS_ctx.handleSubmit(__VLS_ctx.activeBundle.id, req.itemId);
                    // @ts-ignore
                    [achievementStore, activeBundle, activeBundle, activeBundle, activeBundle, activeBundle, getSubmittedCount, Send, inventoryStore, handleSubmit,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_115 } = __VLS_111.slots;
            (__VLS_ctx.getItemName(req.itemId));
            // @ts-ignore
            [getItemName,];
            var __VLS_111;
            var __VLS_112;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-success/30 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_116;
        /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
        CircleCheck;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent1(__VLS_116, new __VLS_116({
            size: (12),
            ...{ class: "text-success" },
        }));
        const __VLS_118 = __VLS_117({
            size: (12),
            ...{ class: "text-success" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
}
// @ts-ignore
[];
var __VLS_100;
if (__VLS_ctx.tab === 'shipping') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.shopStore.shippedItems.length);
    (__VLS_ctx.shippableItems.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-2 max-h-72 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [items, category] of __VLS_vFor((__VLS_ctx.itemsByCategory))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (category),
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
        (__VLS_ctx.CATEGORY_NAMES[category] ?? category);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        for (const [item] of __VLS_vFor((items))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'shipping'))
                            throw 0;
                        return __VLS_ctx.shopStore.shippedItems.includes(item.id) && (__VLS_ctx.activeShippingId = item.id);
                        // @ts-ignore
                        [tab, CATEGORY_NAMES, shopStore, shopStore, shippableItems, itemsByCategory, activeShippingId,];
                    } },
                key: (item.id),
                ...{ class: "border rounded-xs p-1 text-xs text-center truncate" },
                ...{ class: (__VLS_ctx.shopStore.shippedItems.includes(item.id)
                        ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + __VLS_ctx.getCategoryColor(item.category)
                        : 'border-accent/10 text-muted/30') },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            if (__VLS_ctx.shopStore.shippedItems.includes(item.id)) {
                (item.name);
            }
            else {
                let __VLS_121;
                /** @ts-ignore @type { | typeof __VLS_components.Lock} */
                Lock;
                // @ts-ignore
                const __VLS_122 = __VLS_asFunctionalComponent1(__VLS_121, new __VLS_121({
                    size: (12),
                    ...{ class: "mx-auto text-muted/30" },
                }));
                const __VLS_123 = __VLS_122({
                    size: (12),
                    ...{ class: "mx-auto text-muted/30" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_122));
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            }
            // @ts-ignore
            [getCategoryColor, shopStore, shopStore,];
        }
        // @ts-ignore
        [];
    }
}
let __VLS_126;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
    name: "panel-fade",
}));
const __VLS_128 = __VLS_127({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
const { default: __VLS_131 } = __VLS_129.slots;
if (__VLS_ctx.activeShippingItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeShippingItem))
                    throw 0;
                return __VLS_ctx.activeShippingId = null;
                // @ts-ignore
                [activeShippingId, activeShippingItem,];
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
                if (!(__VLS_ctx.activeShippingItem))
                    throw 0;
                return __VLS_ctx.activeShippingId = null;
                // @ts-ignore
                [activeShippingId,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_132;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent1(__VLS_132, new __VLS_132({
        size: (14),
    }));
    const __VLS_134 = __VLS_133({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: (__VLS_ctx.getCategoryColor(__VLS_ctx.activeShippingItem.category)) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.activeShippingItem.name);
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
    (__VLS_ctx.activeShippingItem.description);
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
    (__VLS_ctx.CATEGORY_NAMES[__VLS_ctx.activeShippingItem.category] ?? __VLS_ctx.activeShippingItem.category);
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
    (__VLS_ctx.activeShippingItem.sellPrice);
    if (__VLS_ctx.activeShippingItem.edible && __VLS_ctx.activeShippingItem.staminaRestore) {
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
        (__VLS_ctx.activeShippingItem.staminaRestore);
        if (__VLS_ctx.activeShippingItem.healthRestore) {
            (__VLS_ctx.activeShippingItem.healthRestore);
        }
    }
}
// @ts-ignore
[CATEGORY_NAMES, getCategoryColor, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem, activeShippingItem,];
var __VLS_129;
if (__VLS_ctx.tab === 'notes') {
    if (__VLS_ctx.secretNoteStore.collectedCount === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col items-center justify-center py-10 space-y-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        let __VLS_137;
        /** @ts-ignore @type { | typeof __VLS_components.ScrollText} */
        ScrollText;
        // @ts-ignore
        const __VLS_138 = __VLS_asFunctionalComponent1(__VLS_137, new __VLS_137({
            size: (48),
            ...{ class: "text-accent/30" },
        }));
        const __VLS_139 = __VLS_138({
            size: (48),
            ...{ class: "text-accent/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_138));
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
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
        (__VLS_ctx.secretNoteStore.collectedCount);
        (__VLS_ctx.secretNoteStore.totalNotes);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-3 md:grid-cols-5 gap-1 max-h-72 overflow-y-auto mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grid-cols-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-72']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        for (const [note] of __VLS_vFor((__VLS_ctx.SECRET_NOTES))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.tab === 'notes'))
                            throw 0;
                        if (!!(__VLS_ctx.secretNoteStore.collectedCount === 0))
                            throw 0;
                        return __VLS_ctx.secretNoteStore.isCollected(note.id) ? (__VLS_ctx.activeNote = note) : null;
                        // @ts-ignore
                        [tab, secretNoteStore, secretNoteStore, secretNoteStore, secretNoteStore, SECRET_NOTES, activeNote,];
                    } },
                key: (note.id),
                ...{ class: "border rounded-xs p-1.5 text-center text-xs transition-colors truncate mr-1" },
                ...{ class: (__VLS_ctx.secretNoteStore.isCollected(note.id)
                        ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + __VLS_ctx.noteTypeColor(note.type)
                        : 'border-accent/10 text-muted/30') },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            if (__VLS_ctx.secretNoteStore.isCollected(note.id)) {
                (note.id);
                (note.title);
            }
            else {
                (note.id);
                let __VLS_142;
                /** @ts-ignore @type { | typeof __VLS_components.Lock} */
                Lock;
                // @ts-ignore
                const __VLS_143 = __VLS_asFunctionalComponent1(__VLS_142, new __VLS_142({
                    size: (10),
                    ...{ class: "inline text-muted/30" },
                }));
                const __VLS_144 = __VLS_143({
                    size: (10),
                    ...{ class: "inline text-muted/30" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_143));
                /** @type {__VLS_StyleScopedClasses['inline']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            }
            // @ts-ignore
            [secretNoteStore, secretNoteStore, noteTypeColor,];
        }
    }
}
let __VLS_147;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
    name: "panel-fade",
}));
const __VLS_149 = __VLS_148({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_148));
const { default: __VLS_152 } = __VLS_150.slots;
if (__VLS_ctx.activeNote) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeNote))
                    throw 0;
                return __VLS_ctx.activeNote = null;
                // @ts-ignore
                [activeNote, activeNote,];
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
                if (!(__VLS_ctx.activeNote))
                    throw 0;
                return __VLS_ctx.activeNote = null;
                // @ts-ignore
                [activeNote,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_153;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_154 = __VLS_asFunctionalComponent1(__VLS_153, new __VLS_153({
        size: (14),
    }));
    const __VLS_155 = __VLS_154({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_154));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_158;
    /** @ts-ignore @type { | typeof __VLS_components.ScrollText} */
    ScrollText;
    // @ts-ignore
    const __VLS_159 = __VLS_asFunctionalComponent1(__VLS_158, new __VLS_158({
        size: (14),
        ...{ class: "text-accent" },
    }));
    const __VLS_160 = __VLS_159({
        size: (14),
        ...{ class: "text-accent" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_159));
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.activeNote.id);
    (__VLS_ctx.activeNote.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mb-1" },
        ...{ class: (__VLS_ctx.noteTypeColor(__VLS_ctx.activeNote.type)) },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (__VLS_ctx.NOTE_TYPE_LABELS[__VLS_ctx.activeNote.type] ?? __VLS_ctx.activeNote.type);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.activeNote.content);
    if (__VLS_ctx.activeNote.usable && !__VLS_ctx.secretNoteStore.isUsed(__VLS_ctx.activeNote.id)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        const __VLS_163 = Button || Button;
        // @ts-ignore
        const __VLS_164 = __VLS_asFunctionalComponent1(__VLS_163, new __VLS_163({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
        }));
        const __VLS_165 = __VLS_164({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center !bg-accent !text-bg" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_164));
        let __VLS_168;
        const __VLS_169 = {
            /** @type {typeof __VLS_168.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeNote))
                    throw 0;
                if (!(__VLS_ctx.activeNote.usable && !__VLS_ctx.secretNoteStore.isUsed(__VLS_ctx.activeNote.id)))
                    throw 0;
                return __VLS_ctx.handleUseNote(__VLS_ctx.activeNote.id);
                // @ts-ignore
                [secretNoteStore, activeNote, activeNote, activeNote, activeNote, activeNote, activeNote, activeNote, activeNote, activeNote, noteTypeColor, NOTE_TYPE_LABELS, handleUseNote,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
        const { default: __VLS_170 } = __VLS_166.slots;
        // @ts-ignore
        [];
        var __VLS_166;
        var __VLS_167;
    }
    else if (__VLS_ctx.activeNote.usable && __VLS_ctx.secretNoteStore.isUsed(__VLS_ctx.activeNote.id)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-success/30 rounded-xs p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_171;
        /** @ts-ignore @type { | typeof __VLS_components.CircleCheck} */
        CircleCheck;
        // @ts-ignore
        const __VLS_172 = __VLS_asFunctionalComponent1(__VLS_171, new __VLS_171({
            size: (12),
            ...{ class: "text-success" },
        }));
        const __VLS_173 = __VLS_172({
            size: (12),
            ...{ class: "text-success" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_172));
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
}
// @ts-ignore
[secretNoteStore, activeNote, activeNote,];
var __VLS_150;
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
    ...{ class: "h-full bg-accent rounded-xs transition-all" },
    ...{ style: ({ width: __VLS_ctx.achievementStore.perfectionPercent + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-accent whitespace-nowrap" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
(__VLS_ctx.achievementStore.perfectionPercent);
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
(__VLS_ctx.achievementStore.stats.totalCropsHarvested);
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
(__VLS_ctx.achievementStore.stats.totalFishCaught);
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
(__VLS_ctx.achievementStore.stats.totalRecipesCooked);
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
(__VLS_ctx.achievementStore.stats.totalMoneyEarned);
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
(__VLS_ctx.achievementStore.stats.highestMineFloor);
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
(__VLS_ctx.achievementStore.stats.totalMonstersKilled);
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
(__VLS_ctx.achievementStore.stats.totalBreedingsDone);
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
(__VLS_ctx.achievementStore.stats.totalHybridsDiscovered);
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
(__VLS_ctx.achievementStore.stats.highestHybridTier > 0 ? __VLS_ctx.achievementStore.stats.highestHybridTier + '代' : '-');
// @ts-ignore
[achievementStore, achievementStore, achievementStore, achievementStore, achievementStore, achievementStore, achievementStore, achievementStore, achievementStore, achievementStore, achievementStore, achievementStore,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
