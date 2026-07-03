/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import { User, X } from 'lucide-vue-next';
import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useNpcStore } from '@/stores/useNpcStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSkillStore } from '@/stores/useSkillStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useCultivationStore } from '@/stores/useCultivationStore';
import { TOOL_NAMES, TIER_NAMES, getNpcById } from '@/data';
import { getWeaponById, getEnchantmentById, getWeaponDisplayName } from '@/data/weapons';
import { getRingById } from '@/data/rings';
import { getHatById } from '@/data/hats';
import { getShoeById } from '@/data/shoes';
import { WALLET_ITEMS } from '@/data/wallet';
import { navigateToPanel } from '@/composables/useNavigation';
import { addLog } from '@/composables/useGameLog';
const playerStore = usePlayerStore();
const inventoryStore = useInventoryStore();
const skillStore = useSkillStore();
const walletStore = useWalletStore();
const cultivationStore = useCultivationStore();
const npcStore = useNpcStore();
const gameStore = useGameStore();
// === 身份 ===
const genderLabel = computed(() => (playerStore.gender === 'male' ? '男' : '女'));
// === 修仙 ===
const equippedArtifactCount = computed(() => {
    const a = cultivationStore.artifacts;
    return (a.glimmerHoe ? 1 : 0) + (a.spiritKettle ? 1 : 0) + (a.spiritRain ? 1 : 0);
});
const breakthroughPercent = computed(() => {
    if (!cultivationStore.unlocked)
        return 0;
    const needed = cultivationStore.maxCultivation;
    if (needed <= 0)
        return 0;
    return Math.min(100, (cultivationStore.cultivation / needed) * 100);
});
const handleBreakthrough = () => {
    if (!cultivationStore.canBreakthrough)
        return;
    cultivationStore.breakthrough();
};
// === 装备槽位 ===
const activeSlot = ref(null);
// === 武器 ===
const equippedWeaponName = computed(() => {
    const weapon = inventoryStore.ownedWeapons[inventoryStore.equippedWeaponIndex];
    if (!weapon)
        return '无';
    return getWeaponDisplayName(weapon.defId, weapon.enchantmentId);
});
const getWeaponStats = (weapon) => {
    const def = getWeaponById(weapon.defId);
    if (!def)
        return { attack: 0, critRate: 0 };
    let attack = def.attack;
    let critRate = def.critRate;
    if (weapon.enchantmentId) {
        const enchant = getEnchantmentById(weapon.enchantmentId);
        if (enchant) {
            attack += enchant.attackBonus;
            critRate += enchant.critBonus;
        }
    }
    return { attack, critRate };
};
const getEnchantName = (enchantmentId) => {
    return getEnchantmentById(enchantmentId)?.name ?? '';
};
const handleEquipWeapon = (index) => {
    if (inventoryStore.equipWeapon(index)) {
        const weapon = inventoryStore.ownedWeapons[index];
        const name = getWeaponDisplayName(weapon.defId, weapon.enchantmentId);
        addLog(`装备了${name}。`);
    }
};
// === 戒指 ===
const RING_EFFECT_SHORT = {
    attack_bonus: '攻击',
    crit_rate_bonus: '暴击',
    defense_bonus: '减伤',
    vampiric: '吸血',
    max_hp_bonus: '生命',
    stamina_reduction: '体力减免',
    mining_stamina: '挖矿体力减免',
    farming_stamina: '农耕体力减免',
    fishing_stamina: '钓鱼体力减免',
    crop_quality_bonus: '品质',
    crop_growth_bonus: '生长加速',
    fish_quality_bonus: '鱼品质',
    fishing_calm: '鱼速降低',
    sell_price_bonus: '售价',
    shop_discount: '折扣',
    gift_friendship: '好感',
    monster_drop_bonus: '掉落',
    exp_bonus: '经验',
    treasure_find: '宝箱',
    ore_bonus: '矿石',
    luck: '幸运',
    travel_speed: '旅行加速'
};
const formatRingEffects = (defId) => {
    const def = getRingById(defId);
    if (!def)
        return '';
    return def.effects
        .map(e => {
        const label = RING_EFFECT_SHORT[e.type];
        return e.value > 0 && e.value < 1 ? `${label}${Math.round(e.value * 100)}%` : `${label}+${e.value}`;
    })
        .join(' ');
};
const getRingInfo = (index) => {
    if (index < 0 || index >= inventoryStore.ownedRings.length)
        return null;
    const ring = inventoryStore.ownedRings[index];
    const def = getRingById(ring.defId);
    if (!def)
        return null;
    return { name: def.name, effectText: formatRingEffects(ring.defId) };
};
const equippedRing1 = computed(() => getRingInfo(inventoryStore.equippedRingSlot1));
const equippedRing2 = computed(() => getRingInfo(inventoryStore.equippedRingSlot2));
const ownedRingList = computed(() => inventoryStore.ownedRings.map((ring, index) => ({
    index,
    name: getRingById(ring.defId)?.name ?? ring.defId,
    effectText: formatRingEffects(ring.defId)
})));
const handleEquipRingFromPopup = (ringIndex) => {
    const slot = activeSlot.value === 'ring1' ? 0 : 1;
    if (inventoryStore.equipRing(ringIndex, slot)) {
        const def = getRingById(inventoryStore.ownedRings[ringIndex].defId);
        addLog(`将${def?.name ?? '戒指'}装备到槽位${slot + 1}。`);
        activeSlot.value = null;
    }
};
const handleUnequipRingFromPopup = () => {
    const slot = activeSlot.value === 'ring1' ? 0 : 1;
    const idx = slot === 0 ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2;
    const def = idx >= 0 ? getRingById(inventoryStore.ownedRings[idx].defId) : null;
    if (inventoryStore.unequipRing(slot)) {
        addLog(`卸下了${def?.name ?? '戒指'}。`);
        activeSlot.value = null;
    }
};
const isRingInCurrentSlot = (idx) => {
    if (activeSlot.value === 'ring1')
        return inventoryStore.equippedRingSlot1 === idx;
    return inventoryStore.equippedRingSlot2 === idx;
};
const isRingInOtherSlot = (idx) => {
    if (activeSlot.value === 'ring1')
        return inventoryStore.equippedRingSlot2 === idx;
    return inventoryStore.equippedRingSlot1 === idx;
};
// === 帽子 ===
const equippedHatName = computed(() => {
    const hat = inventoryStore.ownedHats[inventoryStore.equippedHatIndex];
    if (!hat)
        return null;
    return getHatById(hat.defId)?.name ?? null;
});
const formatEquipEffects = (effects) => {
    return effects
        .map(e => {
        const label = RING_EFFECT_SHORT[e.type];
        return e.value > 0 && e.value < 1 ? `${label}${Math.round(e.value * 100)}%` : `${label}+${e.value}`;
    })
        .join(' ');
};
const ownedHatList = computed(() => inventoryStore.ownedHats.map((hat, index) => {
    const def = getHatById(hat.defId);
    return {
        index,
        name: def?.name ?? hat.defId,
        effectText: def ? formatEquipEffects(def.effects) : ''
    };
}));
const handleEquipHatFromPopup = (index) => {
    if (inventoryStore.equipHat(index)) {
        const def = getHatById(inventoryStore.ownedHats[index].defId);
        addLog(`装备了${def?.name ?? '帽子'}。`);
        activeSlot.value = null;
    }
};
const handleUnequipHatFromPopup = () => {
    const idx = inventoryStore.equippedHatIndex;
    const def = idx >= 0 ? getHatById(inventoryStore.ownedHats[idx].defId) : null;
    if (inventoryStore.unequipHat()) {
        addLog(`卸下了${def?.name ?? '帽子'}。`);
        activeSlot.value = null;
    }
};
// === 鞋子 ===
const equippedShoeName = computed(() => {
    const shoe = inventoryStore.ownedShoes[inventoryStore.equippedShoeIndex];
    if (!shoe)
        return null;
    return getShoeById(shoe.defId)?.name ?? null;
});
const ownedShoeList = computed(() => inventoryStore.ownedShoes.map((shoe, index) => {
    const def = getShoeById(shoe.defId);
    return {
        index,
        name: def?.name ?? shoe.defId,
        effectText: def ? formatEquipEffects(def.effects) : ''
    };
}));
const handleEquipShoeFromPopup = (index) => {
    if (inventoryStore.equipShoe(index)) {
        const def = getShoeById(inventoryStore.ownedShoes[index].defId);
        addLog(`装备了${def?.name ?? '鞋子'}。`);
        activeSlot.value = null;
    }
};
const handleUnequipShoeFromPopup = () => {
    const idx = inventoryStore.equippedShoeIndex;
    const def = idx >= 0 ? getShoeById(inventoryStore.ownedShoes[idx].defId) : null;
    if (inventoryStore.unequipShoe()) {
        addLog(`卸下了${def?.name ?? '鞋子'}。`);
        activeSlot.value = null;
    }
};
// === 技能 ===
const SKILL_NAMES = {
    farming: '农耕',
    foraging: '采集',
    fishing: '钓鱼',
    mining: '挖矿',
    combat: '战斗'
};
const PERK_NAMES = {
    harvester: '丰收者',
    rancher: '牧人',
    lumberjack: '樵夫',
    herbalist: '药师',
    fisher: '渔夫',
    trapper: '捕手',
    miner: '矿工',
    geologist: '地质学家',
    fighter: '斗士',
    defender: '守护者',
    intensive: '精耕',
    artisan: '匠人',
    coopmaster: '牧场主',
    shepherd: '牧羊人',
    botanist: '植物学家',
    alchemist: '炼金师',
    forester: '伐木工',
    tracker: '追踪者',
    angler: '垂钓大师',
    aquaculture: '水产商',
    mariner: '水手',
    luremaster: '诱饵师',
    prospector: '探矿者',
    blacksmith: '铁匠',
    excavator: '挖掘者',
    mineralogist: '宝石学家',
    warrior: '武者',
    brute: '蛮力者',
    acrobat: '杂技师',
    tank: '重甲者'
};
// === 被动 ===
const unlockedWalletItems = computed(() => WALLET_ITEMS.filter(w => walletStore.has(w.id)));
// === 家庭 ===
const spouseInfo = computed(() => {
    const spouseState = npcStore.getSpouse();
    if (!spouseState)
        return null;
    const npcDef = getNpcById(spouseState.npcId);
    return npcDef ? { name: npcDef.name } : null;
});
const CHILD_STAGE_NAMES = {
    baby: '婴儿',
    toddler: '幼童',
    child: '孩童',
    teen: '少年'
};
// === 导航 ===
const goToUpgrade = () => {
    navigateToPanel('upgrade');
};
const goToSkills = () => {
    navigateToPanel('skills');
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
/** @ts-ignore @type { | typeof __VLS_components.User} */
User;
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
(__VLS_ctx.gameStore.year);
(__VLS_ctx.SEASON_NAMES[__VLS_ctx.gameStore.season]);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex gap-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "shrink-0 flex items-center justify-center" },
});
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    ...{ class: "char-silhouette" },
    viewBox: "0 0 80 140",
    width: "64",
    height: "112",
});
/** @type {__VLS_StyleScopedClasses['char-silhouette']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.ellipse)({
    cx: "40",
    cy: "22",
    rx: "14",
    ry: "16",
    ...{ class: "silhouette-body" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.ellipse)({
    cx: "40",
    cy: "10",
    rx: "10",
    ry: "7",
    ...{ class: "silhouette-hair" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-hair']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
    x: "37",
    y: "5",
    width: "6",
    height: "8",
    rx: "3",
    ...{ class: "silhouette-hair" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-hair']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M24 38 Q22 50 20 75 L30 75 L33 50 L40 48 L47 50 L50 75 L60 75 Q58 50 56 38 Q48 32 40 32 Q32 32 24 38Z",
    ...{ class: "silhouette-body" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
    x: "26",
    y: "55",
    width: "28",
    height: "4",
    rx: "2",
    ...{ class: "silhouette-belt" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-belt']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M24 38 Q14 42 10 55 Q12 58 18 56 Q22 52 24 48Z",
    ...{ class: "silhouette-body" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M56 38 Q66 42 70 55 Q68 58 62 56 Q58 52 56 48Z",
    ...{ class: "silhouette-body" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M28 75 L24 120 L34 120 L40 90 L46 120 L56 120 L52 75Z",
    ...{ class: "silhouette-body" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.ellipse)({
    cx: "29",
    cy: "124",
    rx: "8",
    ry: "4",
    ...{ class: "silhouette-shoe" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-shoe']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.ellipse)({
    cx: "51",
    cy: "124",
    rx: "8",
    ry: "4",
    ...{ class: "silhouette-shoe" },
});
/** @type {__VLS_StyleScopedClasses['silhouette-shoe']} */ ;
if (__VLS_ctx.cultivationStore.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "40",
        cy: "70",
        r: "50",
        fill: "none",
        ...{ class: "silhouette-aura" },
        ...{ class: ('aura-tier-' + Math.min(__VLS_ctx.cultivationStore.realmIndex, 4)) },
    });
    /** @type {__VLS_StyleScopedClasses['silhouette-aura']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex-1 min-w-0" },
});
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
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
(__VLS_ctx.playerStore.playerName);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.genderLabel);
if (__VLS_ctx.cultivationStore.unlocked) {
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
    (__VLS_ctx.cultivationStore.realmName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.cultivationStore.spiritRootName);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-1.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
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
    ...{ class: "h-full rounded-xs transition-all" },
    ...{ class: (__VLS_ctx.playerStore.staminaPercent > 35 ? 'bg-success' : 'bg-danger') },
    ...{ style: ({ width: __VLS_ctx.playerStore.staminaPercent + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs whitespace-nowrap" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
(__VLS_ctx.playerStore.stamina);
(__VLS_ctx.playerStore.maxStamina);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
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
    ...{ class: "h-full rounded-xs transition-all" },
    ...{ class: (__VLS_ctx.playerStore.getHpPercent() > 25 ? 'bg-success' : 'bg-danger') },
    ...{ style: ({ width: __VLS_ctx.playerStore.getHpPercent() + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs whitespace-nowrap" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
(__VLS_ctx.playerStore.hp);
(__VLS_ctx.playerStore.getMaxHp());
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
(__VLS_ctx.playerStore.money);
if (__VLS_ctx.cultivationStore.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-2 pt-2 border-t border-accent/10" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
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
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.cultivationStore.cultivation);
    (__VLS_ctx.cultivationStore.maxCultivation);
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
    (__VLS_ctx.cultivationStore.mana);
    (__VLS_ctx.cultivationStore.maxMana);
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
    (__VLS_ctx.cultivationStore.aura);
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
    (__VLS_ctx.cultivationStore.fieldTierName);
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
        ...{ class: (__VLS_ctx.cultivationStore.alchemyUnlocked ? 'text-accent' : 'text-muted/40') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.cultivationStore.alchemyUnlocked ? '已安置' : '未安置');
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
    (__VLS_ctx.equippedArtifactCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-1.5 flex items-center space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
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
        ...{ class: "h-full rounded-xs transition-all bg-accent" },
        ...{ style: ({ width: __VLS_ctx.breakthroughPercent + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs whitespace-nowrap" },
        ...{ class: (__VLS_ctx.cultivationStore.canBreakthrough ? 'text-accent' : 'text-muted') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    (__VLS_ctx.cultivationStore.canBreakthrough ? '可突破' : Math.round(__VLS_ctx.breakthroughPercent) + '%');
    if (__VLS_ctx.cultivationStore.canBreakthrough) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.handleBreakthrough) },
            ...{ class: "btn w-full justify-center mt-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
    }
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
    ...{ class: "text-xs text-muted mb-1.5" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid grid-cols-3 gap-1 mb-1" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.activeSlot = 'weapon';
            // @ts-ignore
            [gameStore, gameStore, SEASON_NAMES, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, genderLabel, equippedArtifactCount, breakthroughPercent, breakthroughPercent, handleBreakthrough, activeSlot,];
        } },
    ...{ class: "border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-accent truncate" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
(__VLS_ctx.equippedWeaponName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.activeSlot = 'ring1';
            // @ts-ignore
            [activeSlot, equippedWeaponName,];
        } },
    ...{ class: "border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs truncate" },
    ...{ class: (__VLS_ctx.equippedRing1 ? 'text-accent' : 'text-muted/40') },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
(__VLS_ctx.equippedRing1?.name ?? '空');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.activeSlot = 'ring2';
            // @ts-ignore
            [activeSlot, equippedRing1, equippedRing1,];
        } },
    ...{ class: "border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs truncate" },
    ...{ class: (__VLS_ctx.equippedRing2 ? 'text-accent' : 'text-muted/40') },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
(__VLS_ctx.equippedRing2?.name ?? '空');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid grid-cols-2 gap-1" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.activeSlot = 'hat';
            // @ts-ignore
            [activeSlot, equippedRing2, equippedRing2,];
        } },
    ...{ class: "border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs truncate" },
    ...{ class: (__VLS_ctx.equippedHatName ? 'text-accent' : 'text-muted/40') },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
(__VLS_ctx.equippedHatName ?? '空');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.activeSlot = 'shoe';
            // @ts-ignore
            [activeSlot, equippedHatName, equippedHatName,];
        } },
    ...{ class: "border border-accent/10 rounded-xs px-2 py-1 text-center cursor-pointer hover:bg-accent/5" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-[10px] text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs truncate" },
    ...{ class: (__VLS_ctx.equippedShoeName ? 'text-accent' : 'text-muted/40') },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
(__VLS_ctx.equippedShoeName ?? '空');
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    name: "panel-fade",
}));
const __VLS_7 = __VLS_6({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
const { default: __VLS_10 } = __VLS_8.slots;
if (__VLS_ctx.activeSlot) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSlot))
                    throw 0;
                return __VLS_ctx.activeSlot = null;
                // @ts-ignore
                [activeSlot, activeSlot, equippedShoeName, equippedShoeName,];
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
                if (!(__VLS_ctx.activeSlot))
                    throw 0;
                return __VLS_ctx.activeSlot = null;
                // @ts-ignore
                [activeSlot,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_11;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
        size: (14),
    }));
    const __VLS_13 = __VLS_12({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    if (__VLS_ctx.activeSlot === 'weapon') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [weapon, index] of __VLS_vFor((__VLS_ctx.inventoryStore.ownedWeapons))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeSlot))
                            throw 0;
                        if (!(__VLS_ctx.activeSlot === 'weapon'))
                            throw 0;
                        return __VLS_ctx.handleEquipWeapon(index);
                        // @ts-ignore
                        [activeSlot, inventoryStore, handleEquipWeapon,];
                    } },
                key: (index),
                ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1" },
                ...{ class: (index === __VLS_ctx.inventoryStore.equippedWeaponIndex ? 'border-accent/30' : 'border-accent/10') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ class: (index === __VLS_ctx.inventoryStore.equippedWeaponIndex ? 'text-accent' : '') },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getWeaponDisplayName(weapon.defId, weapon.enchantmentId));
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.getWeaponStats(weapon).attack);
            (Math.round(__VLS_ctx.getWeaponStats(weapon).critRate * 100));
            if (weapon.enchantmentId) {
                (__VLS_ctx.getEnchantName(weapon.enchantmentId));
            }
            if (index === __VLS_ctx.inventoryStore.equippedWeaponIndex) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-accent shrink-0 ml-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            }
            // @ts-ignore
            [inventoryStore, inventoryStore, inventoryStore, getWeaponDisplayName, getWeaponStats, getWeaponStats, getEnchantName,];
        }
    }
    else if (__VLS_ctx.activeSlot === 'ring1' || __VLS_ctx.activeSlot === 'ring2') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (__VLS_ctx.activeSlot === 'ring1' ? '戒指1' : '戒指2');
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        if ((__VLS_ctx.activeSlot === 'ring1' ? __VLS_ctx.inventoryStore.equippedRingSlot1 : __VLS_ctx.inventoryStore.equippedRingSlot2) >= 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (__VLS_ctx.handleUnequipRingFromPopup) },
                ...{ class: "flex items-center border border-danger/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-danger/5 mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        }
        if (__VLS_ctx.inventoryStore.ownedRings.length > 0) {
            for (const [ring, idx] of __VLS_vFor((__VLS_ctx.ownedRingList))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.activeSlot))
                                throw 0;
                            if (!!(__VLS_ctx.activeSlot === 'weapon'))
                                throw 0;
                            if (!(__VLS_ctx.activeSlot === 'ring1' || __VLS_ctx.activeSlot === 'ring2'))
                                throw 0;
                            if (!(__VLS_ctx.inventoryStore.ownedRings.length > 0))
                                throw 0;
                            return __VLS_ctx.handleEquipRingFromPopup(idx);
                            // @ts-ignore
                            [activeSlot, activeSlot, activeSlot, activeSlot, inventoryStore, inventoryStore, inventoryStore, handleUnequipRingFromPopup, ownedRingList, handleEquipRingFromPopup,];
                        } },
                    key: (idx),
                    ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1" },
                    ...{ class: (__VLS_ctx.isRingInCurrentSlot(idx) ? 'border-accent/30' : 'border-accent/10') },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "min-w-0" },
                });
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: (__VLS_ctx.isRingInCurrentSlot(idx) ? 'text-accent' : '') },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (ring.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-muted truncate" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                (ring.effectText);
                if (__VLS_ctx.isRingInCurrentSlot(idx)) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-accent shrink-0 ml-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                }
                else if (__VLS_ctx.isRingInOtherSlot(idx)) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-muted shrink-0 ml-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                    (__VLS_ctx.activeSlot === 'ring1' ? '槽2' : '槽1');
                }
                // @ts-ignore
                [activeSlot, isRingInCurrentSlot, isRingInCurrentSlot, isRingInCurrentSlot, isRingInOtherSlot,];
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
    }
    else if (__VLS_ctx.activeSlot === 'hat') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        if (__VLS_ctx.inventoryStore.equippedHatIndex >= 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (__VLS_ctx.handleUnequipHatFromPopup) },
                ...{ class: "flex items-center border border-danger/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-danger/5 mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        }
        if (__VLS_ctx.inventoryStore.ownedHats.length > 0) {
            for (const [hat] of __VLS_vFor((__VLS_ctx.ownedHatList))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.activeSlot))
                                throw 0;
                            if (!!(__VLS_ctx.activeSlot === 'weapon'))
                                throw 0;
                            if (!!(__VLS_ctx.activeSlot === 'ring1' || __VLS_ctx.activeSlot === 'ring2'))
                                throw 0;
                            if (!(__VLS_ctx.activeSlot === 'hat'))
                                throw 0;
                            if (!(__VLS_ctx.inventoryStore.ownedHats.length > 0))
                                throw 0;
                            return __VLS_ctx.handleEquipHatFromPopup(hat.index);
                            // @ts-ignore
                            [activeSlot, inventoryStore, inventoryStore, handleUnequipHatFromPopup, ownedHatList, handleEquipHatFromPopup,];
                        } },
                    key: (hat.index),
                    ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1" },
                    ...{ class: (hat.index === __VLS_ctx.inventoryStore.equippedHatIndex ? 'border-accent/30' : 'border-accent/10') },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "min-w-0" },
                });
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: (hat.index === __VLS_ctx.inventoryStore.equippedHatIndex ? 'text-accent' : '') },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (hat.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-muted truncate" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                (hat.effectText);
                if (hat.index === __VLS_ctx.inventoryStore.equippedHatIndex) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-accent shrink-0 ml-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                }
                // @ts-ignore
                [inventoryStore, inventoryStore, inventoryStore,];
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
    }
    else if (__VLS_ctx.activeSlot === 'shoe') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        if (__VLS_ctx.inventoryStore.equippedShoeIndex >= 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (__VLS_ctx.handleUnequipShoeFromPopup) },
                ...{ class: "flex items-center border border-danger/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-danger/5 mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-danger/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        }
        if (__VLS_ctx.inventoryStore.ownedShoes.length > 0) {
            for (const [shoe] of __VLS_vFor((__VLS_ctx.ownedShoeList))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.activeSlot))
                                throw 0;
                            if (!!(__VLS_ctx.activeSlot === 'weapon'))
                                throw 0;
                            if (!!(__VLS_ctx.activeSlot === 'ring1' || __VLS_ctx.activeSlot === 'ring2'))
                                throw 0;
                            if (!!(__VLS_ctx.activeSlot === 'hat'))
                                throw 0;
                            if (!(__VLS_ctx.activeSlot === 'shoe'))
                                throw 0;
                            if (!(__VLS_ctx.inventoryStore.ownedShoes.length > 0))
                                throw 0;
                            return __VLS_ctx.handleEquipShoeFromPopup(shoe.index);
                            // @ts-ignore
                            [activeSlot, inventoryStore, inventoryStore, handleUnequipShoeFromPopup, ownedShoeList, handleEquipShoeFromPopup,];
                        } },
                    key: (shoe.index),
                    ...{ class: "flex items-center justify-between border rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 mr-1" },
                    ...{ class: (shoe.index === __VLS_ctx.inventoryStore.equippedShoeIndex ? 'border-accent/30' : 'border-accent/10') },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "min-w-0" },
                });
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs" },
                    ...{ class: (shoe.index === __VLS_ctx.inventoryStore.equippedShoeIndex ? 'text-accent' : '') },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (shoe.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-[10px] text-muted truncate" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                (shoe.effectText);
                if (shoe.index === __VLS_ctx.inventoryStore.equippedShoeIndex) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-[10px] text-accent shrink-0 ml-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                }
                // @ts-ignore
                [inventoryStore, inventoryStore, inventoryStore,];
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
    }
}
// @ts-ignore
[];
var __VLS_8;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.goToUpgrade) },
    ...{ class: "text-xs text-accent hover:underline" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
for (const [tool] of __VLS_vFor((__VLS_ctx.inventoryStore.tools))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (tool.type),
        ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.TOOL_NAMES[tool.type]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted ml-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    (__VLS_ctx.TIER_NAMES[tool.tier]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (Math.round((1 - __VLS_ctx.inventoryStore.getToolStaminaMultiplier(tool.type)) * 100));
    // @ts-ignore
    [inventoryStore, inventoryStore, goToUpgrade, TOOL_NAMES, TIER_NAMES,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.goToSkills) },
    ...{ class: "text-xs text-accent hover:underline" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col space-y-0.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
for (const [skill] of __VLS_vFor((__VLS_ctx.skillStore.skills))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (skill.type),
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
    (__VLS_ctx.SKILL_NAMES[skill.type]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (skill.level);
    if (skill.perk5) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.PERK_NAMES[skill.perk5]);
    }
    if (skill.perk10) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.PERK_NAMES[skill.perk10]);
    }
    // @ts-ignore
    [goToSkills, skillStore, SKILL_NAMES, PERK_NAMES, PERK_NAMES,];
}
if (__VLS_ctx.unlockedWalletItems.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.unlockedWalletItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (item.id),
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
        (item.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (item.description);
        // @ts-ignore
        [unlockedWalletItems, unlockedWalletItems,];
    }
}
if (__VLS_ctx.spouseInfo) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
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
    (__VLS_ctx.spouseInfo.name);
    for (const [child] of __VLS_vFor((__VLS_ctx.npcStore.children))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (child.id),
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
        (child.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.CHILD_STAGE_NAMES[child.stage]);
        // @ts-ignore
        [spouseInfo, spouseInfo, npcStore, CHILD_STAGE_NAMES,];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
