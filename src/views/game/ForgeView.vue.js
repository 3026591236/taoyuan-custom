/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from 'vue';
import Divider from '@/components/game/Divider.vue';
import { useCultivationStore } from '@/stores/useCultivationStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { addLog, showFloat } from '@/composables/useGameLog';
const cultivationStore = useCultivationStore();
const inv = useInventoryStore();
const forging = ref(false);
const forgeStage = ref('');
const ARTIFACT_SLOTS = {
    sword: '🗡️飞剑', armor: '🛡️护甲', talisman: '📜灵符',
    seal: '🔮法印', orb: '💠灵珠', array: '⭕阵盘'
};
const FORGE_RECIPES = [
    { id: 'iron_sword', name: '玄铁剑', emoji: '🗡️', slot: 'sword', quality: 'common', spiritStones: 10, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 3 }], effectDesc: '攻击+8', atk: 8, def: 0, aura: 0, cultivation: 0 },
    { id: 'spirit_sword', name: '灵光剑', emoji: '🗡️', slot: 'sword', quality: 'spirit', spiritStones: 30, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 5 }, { itemId: 'spirit_stone', name: '灵石', qty: 10 }], effectDesc: '攻击+20', atk: 20, def: 0, aura: 5, cultivation: 0 },
    { id: 'iron_armor', name: '玄铁甲', emoji: '🛡️', slot: 'armor', quality: 'common', spiritStones: 15, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 5 }], effectDesc: '防御+10', atk: 0, def: 10, aura: 0, cultivation: 0 },
    { id: 'spirit_armor', name: '灵光甲', emoji: '🛡️', slot: 'armor', quality: 'spirit', spiritStones: 35, materials: [{ itemId: 'iron_ore', name: '铁矿石', qty: 8 }, { itemId: 'spirit_stone', name: '灵石', qty: 12 }], effectDesc: '防御+22 灵气+3', atk: 0, def: 22, aura: 3, cultivation: 0 },
    { id: 'spirit_talisman', name: '聚灵符', emoji: '📜', slot: 'talisman', quality: 'common', spiritStones: 8, materials: [{ itemId: 'spirit_stone', name: '灵石', qty: 5 }], effectDesc: '灵气+10', atk: 0, def: 0, aura: 10, cultivation: 0 },
    { id: 'aura_orb', name: '灵珠', emoji: '💠', slot: 'orb', quality: 'spirit', spiritStones: 20, materials: [{ itemId: 'spirit_stone', name: '灵石', qty: 15 }], effectDesc: '灵气+15 修为+5', atk: 0, def: 0, aura: 15, cultivation: 5 },
    { id: 'thunder_seal', name: '雷印', emoji: '🔮', slot: 'seal', quality: 'immortal', spiritStones: 50, materials: [{ itemId: 'thunder_essence', name: '雷精', qty: 2 }, { itemId: 'spirit_stone', name: '灵石', qty: 20 }], effectDesc: '攻击+35 防御+15', atk: 35, def: 15, aura: 0, cultivation: 0 },
    { id: 'array_disk', name: '五行阵盘', emoji: '⭕', slot: 'array', quality: 'immortal', spiritStones: 60, materials: [{ itemId: 'nether_core', name: '冥核', qty: 1 }, { itemId: 'thunder_essence', name: '雷精', qty: 1 }, { itemId: 'spirit_stone', name: '灵石', qty: 25 }], effectDesc: '全属性+20', atk: 20, def: 20, aura: 20, cultivation: 20 },
];
const qualityColor = (q) => ({ common: 'text-gray-300', spirit: 'text-green-400', immortal: 'text-blue-400', divine: 'text-purple-400', saint: 'text-yellow-400' }[q] || '');
const qualityLabel = (q) => ({ common: '凡品', spirit: '灵品', immortal: '仙品', divine: '神品', saint: '圣品' }[q] || '');
const hasMaterial = (m) => (inv.items[m.itemId] || 0) >= m.qty;
const hasSpiritStones = (n) => (inv.items['spirit_stone'] || 0) >= n;
const canForge = (recipe) => {
    if (!recipe.materials.every(m => hasMaterial(m)))
        return false;
    if (!hasSpiritStones(recipe.spiritStones))
        return false;
    return true;
};
const forge = async (recipe) => {
    if (!canForge(recipe))
        return;
    // Consume materials
    for (const m of recipe.materials)
        inv.removeItem(m.itemId, m.qty);
    inv.removeItem('spirit_stone', recipe.spiritStones);
    // Forge animation
    forging.value = true;
    forgeStage.value = '🔥 点火...';
    await new Promise(r => setTimeout(r, 800));
    forgeStage.value = '🔨 锻打...';
    await new Promise(r => setTimeout(r, 800));
    forgeStage.value = '✨ 成型...';
    await new Promise(r => setTimeout(r, 600));
    // Determine quality (spirit root bonus)
    let quality = recipe.quality;
    const c = cultivationStore;
    if (c.spiritRoot !== 'mixed' && Math.random() < 0.3) {
        const qOrder = ['common', 'spirit', 'immortal', 'divine', 'saint'];
        const idx = qOrder.indexOf(quality);
        if (idx < qOrder.length - 1)
            quality = qOrder[idx + 1];
    }
    // Create artifact
    const artifact = { id: recipe.id + '_' + Date.now(), name: quality === recipe.quality ? recipe.name : recipe.name.replace(/^(玄铁|灵光|聚灵|五行)/, qualityLabel(quality)), emoji: recipe.emoji, slot: recipe.slot, quality, atk: recipe.atk * (quality !== recipe.quality ? 1.3 : 1), def: recipe.def * (quality !== recipe.quality ? 1.3 : 1), aura: recipe.aura * (quality !== recipe.quality ? 1.3 : 1), cultivation: recipe.cultivation * (quality !== recipe.quality ? 1.3 : 1) };
    if (!c.artifacts)
        c.artifacts = {};
    c.artifacts[recipe.slot] = artifact;
    forgeStage.value = quality !== recipe.quality ? `🌟 品质提升！${qualityLabel(quality)}！` : `✅ 炼制成功！`;
    await new Promise(r => setTimeout(r, 1000));
    forging.value = false;
    addLog(`炼制出 ${qualityLabel(quality)}${artifact.name}！`);
    showFloat(`炼制成功：${artifact.name}`, 'success');
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-3" },
});
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
const __VLS_0 = Divider;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    title: true,
    label: "🔨 炼器",
}));
const __VLS_2 = __VLS_1({
    title: true,
    label: "🔨 炼器",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
if (!__VLS_ctx.cultivationStore.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs text-muted text-center py-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    for (const [recipe] of __VLS_vFor((__VLS_ctx.FORGE_RECIPES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (recipe.id),
            ...{ class: "border border-accent/15 rounded-xs p-3 space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        (recipe.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] ml-1" },
            ...{ class: (__VLS_ctx.qualityColor(recipe.quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (__VLS_ctx.qualityLabel(recipe.quality));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (recipe.slot);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (recipe.effectDesc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px]" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        for (const [m, i] of __VLS_vFor((recipe.materials))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (i),
                ...{ class: "mr-2" },
                ...{ class: (__VLS_ctx.hasMaterial(m) ? 'text-accent' : 'text-danger') },
            });
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            (m.name);
            (m.qty);
            // @ts-ignore
            [cultivationStore, FORGE_RECIPES, qualityColor, qualityLabel, hasMaterial,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (__VLS_ctx.hasSpiritStones(recipe.spiritStones) ? 'text-accent' : 'text-danger') },
            ...{ class: "ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (recipe.spiritStones);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.cultivationStore.unlocked))
                        throw 0;
                    return __VLS_ctx.forge(recipe);
                    // @ts-ignore
                    [hasSpiritStones, forge,];
                } },
            ...{ class: "btn w-full justify-center text-xs" },
            disabled: (!__VLS_ctx.canForge(recipe)),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        // @ts-ignore
        [canForge,];
    }
}
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
if (__VLS_ctx.forging) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/70" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "forge-anvil text-6xl" },
    });
    /** @type {__VLS_StyleScopedClasses['forge-anvil']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-6xl']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "forge-fire text-4xl mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['forge-fire']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-accent font-bold mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    (__VLS_ctx.forgeStage);
}
// @ts-ignore
[forging, forgeStage,];
var __VLS_8;
const __VLS_11 = Divider;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    title: true,
    label: "法宝装备",
}));
const __VLS_13 = __VLS_12({
    title: true,
    label: "法宝装备",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid grid-cols-3 gap-2" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
for (const [slot, key] of __VLS_vFor((__VLS_ctx.ARTIFACT_SLOTS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (key),
        ...{ class: "border border-accent/15 rounded-xs p-2 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (slot);
    if (__VLS_ctx.cultivationStore.artifacts?.[key]) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-lg mt-1" },
            ...{ class: (__VLS_ctx.qualityColor(__VLS_ctx.cultivationStore.artifacts[key].quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        (__VLS_ctx.cultivationStore.artifacts[key].emoji);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-lg mt-1 text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    if (__VLS_ctx.cultivationStore.artifacts?.[key]) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px]" },
            ...{ class: (__VLS_ctx.qualityColor(__VLS_ctx.cultivationStore.artifacts[key].quality)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (__VLS_ctx.cultivationStore.artifacts[key].name);
    }
    // @ts-ignore
    [cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, cultivationStore, qualityColor, qualityColor, ARTIFACT_SLOTS,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
