/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import Divider from '@/components/game/Divider.vue';
import Button from '@/components/game/Button.vue';
import { useCultivationStore } from '@/stores/useCultivationStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
const cultivation = useCultivationStore();
const inventory = useInventoryStore();
const itemCount = (id) => inventory.getItemCount(id);
const caveSlotOptions = [
    { type: 'alchemy', name: '丹房', desc: '洞府内炼丹，灵气消耗减少20%', cost: 3000 },
    { type: 'farm', name: '灵圃', desc: '洞府内种灵植，灵气产出增加50%', cost: 2000 },
    { type: 'meditation', name: '静室', desc: '洞府内打坐，修为和灵力翻倍', cost: 4000 }
];
const beastFeedCount = computed(() => {
    const crop = cultivation.beastData?.feedCrop;
    return crop ? inventory.getItemCount(crop) : 0;
});
const beastFeedItemName = computed(() => {
    const crop = cultivation.beastData?.feedCrop;
    if (crop === 'dew_grass')
        return '凝露草';
    if (crop === 'spirit_rice')
        return '蕴灵稻';
    if (crop === 'vermilion_fruit')
        return '朱果';
    return crop ?? '';
});
const pillRecipes = [
    { id: 'mana_recovery_pill', name: '回灵丹', desc: '回复灵力，适合连续炼丹/调息。', materialText: '凝露草×2', aura: 20, mana: 0 },
    { id: 'qi_gathering_pill', name: '聚气丹', desc: '增加修为，是炼气期日常修炼丹。', materialText: '蕴灵稻×3、凝露草×1', aura: 60, mana: 10 },
    { id: 'foundation_pill', name: '筑基丹', desc: '辅助突破，降低下次突破灵气需求。', materialText: '朱果×2、凝露草×3、蕴灵稻×5', aura: 360, mana: 40 }
];
const artifacts = [
    { key: 'glimmerHoe', name: '流光锄', desc: '锄刃引动地脉，灵植收获时额外产出灵气。', aura: 220, money: 2000 },
    { key: 'spiritKettle', name: '引灵壶', desc: '炼化灵气时收益提高，修为增长更稳定。', aura: 320, money: 2600 },
    { key: 'spiritRain', name: '灵雨诀', desc: '以法诀唤灵雨，灵植收获额外引灵。', aura: 520, money: 3600 }
];
const cultivationPercent = computed(() => Math.min(100, Math.round((cultivation.cultivation / cultivation.maxCultivation) * 100)));
const manaPercent = computed(() => Math.min(100, Math.round((cultivation.mana / cultivation.maxMana) * 100)));
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['bar-fill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-3" },
});
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
const __VLS_0 = Divider;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    title: true,
    label: "灵田修行",
}));
const __VLS_2 = __VLS_1({
    title: true,
    label: "灵田修行",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-3 bg-panel/40" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-panel/40']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-sm text-accent mb-1" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
(__VLS_ctx.cultivation.unlocked ? '灵田已启蒙' : '田间似有灵机');
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted leading-relaxed" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid grid-cols-2 gap-2 text-xs" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stat-card" },
});
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.cultivation.realmName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stat-card" },
});
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.cultivation.spiritRootName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stat-card" },
});
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.cultivation.fieldTierName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stat-card" },
});
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.cultivation.aura);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stat-card col-span-2" },
});
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['col-span-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex justify-between mb-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.cultivation.cultivation);
(__VLS_ctx.cultivation.maxCultivation);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "bar" },
});
/** @type {__VLS_StyleScopedClasses['bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "bar-fill" },
    ...{ style: ({ width: __VLS_ctx.cultivationPercent + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['bar-fill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stat-card col-span-2" },
});
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['col-span-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex justify-between mb-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.cultivation.mana);
(__VLS_ctx.cultivation.maxMana);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "bar" },
});
/** @type {__VLS_StyleScopedClasses['bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "bar-fill mana" },
    ...{ style: ({ width: __VLS_ctx.manaPercent + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['bar-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['mana']} */ ;
if (!__VLS_ctx.cultivation.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel p-3 text-center space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    const __VLS_5 = Button || Button;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }));
    const __VLS_7 = __VLS_6({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    let __VLS_10;
    const __VLS_11 = {
        /** @type {typeof __VLS_10.click} */
        onClick: (__VLS_ctx.cultivation.unlock),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_12 } = __VLS_8.slots;
    // @ts-ignore
    [cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivationPercent, manaPercent,];
    var __VLS_8;
    var __VLS_9;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-1 md:grid-cols-2 gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    const __VLS_13 = Button || Button;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
    }));
    const __VLS_15 = __VLS_14({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    let __VLS_18;
    const __VLS_19 = {
        /** @type {typeof __VLS_18.click} */
        onClick: (__VLS_ctx.cultivation.meditate),
    };
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    const { default: __VLS_20 } = __VLS_16.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    // @ts-ignore
    [cultivation,];
    var __VLS_16;
    var __VLS_17;
    const __VLS_21 = Button || Button;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
    }));
    const __VLS_23 = __VLS_22({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    let __VLS_26;
    const __VLS_27 = {
        /** @type {typeof __VLS_26.click} */
        onClick: (__VLS_ctx.cultivation.refineAura),
    };
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    const { default: __VLS_28 } = __VLS_24.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    // @ts-ignore
    [cultivation,];
    var __VLS_24;
    var __VLS_25;
    const __VLS_29 = Button || Button;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
        disabled: (!__VLS_ctx.cultivation.canBreakthrough),
    }));
    const __VLS_31 = __VLS_30({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
        disabled: (!__VLS_ctx.cultivation.canBreakthrough),
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    let __VLS_34;
    const __VLS_35 = {
        /** @type {typeof __VLS_34.click} */
        onClick: (__VLS_ctx.cultivation.breakthrough),
    };
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    const { default: __VLS_36 } = __VLS_32.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    // @ts-ignore
    [cultivation, cultivation,];
    var __VLS_32;
    var __VLS_33;
    const __VLS_37 = Button || Button;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
    }));
    const __VLS_39 = __VLS_38({
        ...{ 'onClick': {} },
        ...{ class: "justify-between" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    let __VLS_42;
    const __VLS_43 = {
        /** @type {typeof __VLS_42.click} */
        onClick: (__VLS_ctx.cultivation.upgradeField),
    };
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    const { default: __VLS_44 } = __VLS_40.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    // @ts-ignore
    [cultivation,];
    var __VLS_40;
    var __VLS_41;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/10 rounded-xs p-3 text-xs text-muted leading-relaxed" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-accent mb-1" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mt-1" },
});
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
const __VLS_45 = Divider;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
    title: true,
    label: "炼丹炉",
}));
const __VLS_47 = __VLS_46({
    title: true,
    label: "炼丹炉",
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
if (!__VLS_ctx.cultivation.alchemyUnlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel p-3 text-center space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    const __VLS_50 = Button || Button;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (!__VLS_ctx.cultivation.unlocked),
    }));
    const __VLS_52 = __VLS_51({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (!__VLS_ctx.cultivation.unlocked),
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    let __VLS_55;
    const __VLS_56 = {
        /** @type {typeof __VLS_55.click} */
        onClick: (__VLS_ctx.cultivation.unlockAlchemy),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_57 } = __VLS_53.slots;
    // @ts-ignore
    [cultivation, cultivation, cultivation,];
    var __VLS_53;
    var __VLS_54;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-1 gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    for (const [recipe] of __VLS_vFor((__VLS_ctx.pillRecipes))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (recipe.id),
            ...{ class: "border border-accent/15 rounded-xs p-3 bg-panel/30" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-panel/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between gap-2 mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (recipe.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (recipe.desc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.itemCount(recipe.id));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (recipe.materialText);
        (recipe.aura);
        (recipe.mana);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-2 gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        const __VLS_58 = Button || Button;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
            ...{ 'onClick': {} },
            ...{ class: "justify-center" },
        }));
        const __VLS_60 = __VLS_59({
            ...{ 'onClick': {} },
            ...{ class: "justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_59));
        let __VLS_63;
        const __VLS_64 = {
            /** @type {typeof __VLS_63.click} */
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.cultivation.alchemyUnlocked))
                    throw 0;
                return __VLS_ctx.cultivation.craftPill(recipe.id);
                // @ts-ignore
                [cultivation, pillRecipes, itemCount,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_65 } = __VLS_61.slots;
        // @ts-ignore
        [];
        var __VLS_61;
        var __VLS_62;
        const __VLS_66 = Button || Button;
        // @ts-ignore
        const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
            ...{ 'onClick': {} },
            ...{ class: "justify-center" },
            disabled: (__VLS_ctx.itemCount(recipe.id) <= 0),
        }));
        const __VLS_68 = __VLS_67({
            ...{ 'onClick': {} },
            ...{ class: "justify-center" },
            disabled: (__VLS_ctx.itemCount(recipe.id) <= 0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_67));
        let __VLS_71;
        const __VLS_72 = {
            /** @type {typeof __VLS_71.click} */
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.cultivation.alchemyUnlocked))
                    throw 0;
                return __VLS_ctx.cultivation.usePill(recipe.id);
                // @ts-ignore
                [cultivation, itemCount,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_73 } = __VLS_69.slots;
        // @ts-ignore
        [];
        var __VLS_69;
        var __VLS_70;
        // @ts-ignore
        [];
    }
    if (__VLS_ctx.cultivation.foundationPillBlessing > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (__VLS_ctx.cultivation.foundationPillBlessing);
    }
}
const __VLS_74 = Divider;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent1(__VLS_74, new __VLS_74({
    title: true,
    label: "洞府",
}));
const __VLS_76 = __VLS_75({
    title: true,
    label: "洞府",
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
if (__VLS_ctx.cultivation.caveTier === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel p-3 text-center space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    const __VLS_79 = Button || Button;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (!__VLS_ctx.cultivation.unlocked),
    }));
    const __VLS_81 = __VLS_80({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (!__VLS_ctx.cultivation.unlocked),
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    let __VLS_84;
    const __VLS_85 = {
        /** @type {typeof __VLS_84.click} */
        onClick: (__VLS_ctx.cultivation.openCave),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_86 } = __VLS_82.slots;
    // @ts-ignore
    [cultivation, cultivation, cultivation, cultivation, cultivation,];
    var __VLS_82;
    var __VLS_83;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-2 gap-2 text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-card" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.cultivation.caveTierName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-card" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.cultivation.caveSlots.length);
    (__VLS_ctx.cultivation.caveMaxSlots);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-card" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.cultivation.caveAuraRegen);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-card" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.cultivation.caveSlotNames.join('、') || '空');
    const __VLS_87 = Button || Button;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-between" },
    }));
    const __VLS_89 = __VLS_88({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-between" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    let __VLS_92;
    const __VLS_93 = {
        /** @type {typeof __VLS_92.click} */
        onClick: (__VLS_ctx.cultivation.upgradeCave),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    const { default: __VLS_94 } = __VLS_90.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    // @ts-ignore
    [cultivation, cultivation, cultivation, cultivation, cultivation, cultivation,];
    var __VLS_90;
    var __VLS_91;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-1 md:grid-cols-3 gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    for (const [slot] of __VLS_vFor((__VLS_ctx.caveSlotOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (slot.type),
            ...{ class: "border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-panel/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-sm mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (slot.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-muted leading-relaxed min-h-[2rem]" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-[2rem]']} */ ;
        (slot.desc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-muted my-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['my-2']} */ ;
        (slot.cost);
        const __VLS_95 = Button || Button;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            disabled: (__VLS_ctx.cultivation.hasCaveSlot(slot.type) || __VLS_ctx.cultivation.caveSlots.length >= __VLS_ctx.cultivation.caveMaxSlots),
        }));
        const __VLS_97 = __VLS_96({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
            disabled: (__VLS_ctx.cultivation.hasCaveSlot(slot.type) || __VLS_ctx.cultivation.caveSlots.length >= __VLS_ctx.cultivation.caveMaxSlots),
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
        let __VLS_100;
        const __VLS_101 = {
            /** @type {typeof __VLS_100.click} */
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.cultivation.caveTier === 0))
                    throw 0;
                return __VLS_ctx.cultivation.placeCaveSlot(slot.type);
                // @ts-ignore
                [cultivation, cultivation, cultivation, cultivation, caveSlotOptions,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_102 } = __VLS_98.slots;
        (__VLS_ctx.cultivation.hasCaveSlot(slot.type) ? '已安置' : '安置');
        // @ts-ignore
        [cultivation,];
        var __VLS_98;
        var __VLS_99;
        // @ts-ignore
        [];
    }
}
const __VLS_103 = Divider;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({
    title: true,
    label: "灵兽",
}));
const __VLS_105 = __VLS_104({
    title: true,
    label: "灵兽",
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
if (!__VLS_ctx.cultivation.beast) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel p-3 text-center space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    const __VLS_108 = Button || Button;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (!__VLS_ctx.cultivation.unlocked || __VLS_ctx.cultivation.mana < 30),
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (!__VLS_ctx.cultivation.unlocked || __VLS_ctx.cultivation.mana < 30),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_113;
    const __VLS_114 = {
        /** @type {typeof __VLS_113.click} */
        onClick: (__VLS_ctx.cultivation.encounterBeast),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_115 } = __VLS_111.slots;
    // @ts-ignore
    [cultivation, cultivation, cultivation, cultivation,];
    var __VLS_111;
    var __VLS_112;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3 bg-panel/40 flex items-center gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-panel/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-3xl" },
    });
    /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
    (__VLS_ctx.cultivation.beastEmoji);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-2 mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.cultivation.beastName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.cultivation.beastLevel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.cultivation.beastData?.desc);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-success mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.cultivation.beastData?.bonusDesc);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-1 flex items-center space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-muted shrink-0" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
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
        ...{ style: ({ width: (__VLS_ctx.cultivation.beastBond % 100) + '%' }) },
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
    (__VLS_ctx.cultivation.beastBond);
    const __VLS_116 = Button || Button;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent1(__VLS_116, new __VLS_116({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-between" },
        disabled: (__VLS_ctx.beastFeedCount < (__VLS_ctx.cultivation.beastData?.feedQty ?? 99)),
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-between" },
        disabled: (__VLS_ctx.beastFeedCount < (__VLS_ctx.cultivation.beastData?.feedQty ?? 99)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_121;
    const __VLS_122 = {
        /** @type {typeof __VLS_121.click} */
        onClick: (__VLS_ctx.cultivation.feedBeast),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    const { default: __VLS_123 } = __VLS_119.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.cultivation.beastName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.beastFeedItemName);
    (__VLS_ctx.beastFeedCount);
    (__VLS_ctx.cultivation.beastData?.feedQty);
    // @ts-ignore
    [cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, cultivation, beastFeedCount, beastFeedCount, beastFeedItemName,];
    var __VLS_119;
    var __VLS_120;
}
const __VLS_124 = Divider;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({
    title: true,
    label: "农具法宝化",
}));
const __VLS_126 = __VLS_125({
    title: true,
    label: "农具法宝化",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid grid-cols-1 md:grid-cols-3 gap-2" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
for (const [artifact] of __VLS_vFor((__VLS_ctx.artifacts))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (artifact.key),
        ...{ class: "border border-accent/15 rounded-xs p-3 bg-panel/30 text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-panel/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (artifact.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-muted leading-relaxed min-h-[2.5rem]" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-h-[2.5rem]']} */ ;
    (artifact.desc);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-muted my-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['my-2']} */ ;
    (artifact.aura);
    (artifact.money);
    const __VLS_129 = Button || Button;
    // @ts-ignore
    const __VLS_130 = __VLS_asFunctionalComponent1(__VLS_129, new __VLS_129({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (__VLS_ctx.cultivation.artifacts[artifact.key]),
    }));
    const __VLS_131 = __VLS_130({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
        disabled: (__VLS_ctx.cultivation.artifacts[artifact.key]),
    }, ...__VLS_functionalComponentArgsRest(__VLS_130));
    let __VLS_134;
    const __VLS_135 = {
        /** @type {typeof __VLS_134.click} */
        onClick: (...[$event]) => {
            return __VLS_ctx.cultivation.unlockArtifact(artifact.key);
            // @ts-ignore
            [cultivation, cultivation, artifacts,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_136 } = __VLS_132.slots;
    (__VLS_ctx.cultivation.artifacts[artifact.key] ? '已法宝化' : '法宝化');
    // @ts-ignore
    [cultivation,];
    var __VLS_132;
    var __VLS_133;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
