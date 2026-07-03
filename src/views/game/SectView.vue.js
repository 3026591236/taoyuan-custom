/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import Divider from '@/components/game/Divider.vue';
import { useCultivationStore } from '@/stores/useCultivationStore';
import { addLog, showFloat } from '@/composables/useGameLog';
const cultivationStore = useCultivationStore();
const SECTS = [
    {
        id: 'sword', name: '剑宗', emoji: '⚔️', motto: '剑气纵横三万里，一剑光寒十九洲',
        desc: '以剑入道，攻伐天下第一', bonusDesc: '攻击+30%',
        skills: [
            { name: '御剑术', desc: '飞剑攻击+15%/+30%/+50%' },
            { name: '剑意', desc: '暴击率+10%/+20%/+35%' },
            { name: '万剑归宗', desc: '战斗伤害+20%/+40%/+60%' }
        ]
    },
    {
        id: 'alchemy', name: '丹宗', emoji: '⚗️', motto: '一炉定乾坤，丹成天下闻',
        desc: '炼丹圣地，丹药品质无双', bonusDesc: '炼丹品质+1级',
        skills: [
            { name: '丹火', desc: '炼丹成功率+15%/+30%/+50%' },
            { name: '药理', desc: '丹药效果+20%/+40%/+60%' },
            { name: '造化丹术', desc: '有概率炼出高品质丹药+10%/+25%/+40%' }
        ]
    },
    {
        id: 'talisman', name: '符宗', emoji: '📜', motto: '一符镇天地，万法皆可封',
        desc: '以符入道，灵力运用天下无双', bonusDesc: '灵力消耗-25%',
        skills: [
            { name: '灵符术', desc: '灵力消耗-10%/-20%/-35%' },
            { name: '封印术', desc: '战斗中怪物攻击-10%/-20%/-30%' },
            { name: '天罡符阵', desc: '防御+15%/+30%/+50%' }
        ]
    }
];
const currentSect = computed(() => SECTS.find(s => s.id === cultivationStore.sect));
const joinSect = (id) => {
    cultivationStore.sect = id;
    cultivationStore.sectSkills = [0, 0, 0];
    cultivationStore.sectContribution = 0;
    addLog(`加入${SECTS.find(s => s.id === id)?.name}！`);
    showFloat(`拜入${SECTS.find(s => s.id === id)?.name}`, 'success');
};
const getSectSkillLevel = (idx) => (cultivationStore.sectSkills?.[idx] || 0);
const canUpgradeSkill = (idx) => {
    const level = getSectSkillLevel(idx);
    if (level >= 3)
        return false;
    const cost = (idx + 1) * 50 * (level + 1);
    return (cultivationStore.sectContribution || 0) >= cost;
};
const upgradeSkill = (idx) => {
    if (!canUpgradeSkill(idx))
        return;
    const level = getSectSkillLevel(idx);
    const cost = (idx + 1) * 50 * (level + 1);
    cultivationStore.sectContribution = (cultivationStore.sectContribution || 0) - cost;
    cultivationStore.sectSkills[idx] = level + 1;
    addLog(`${currentSect.value?.skills[idx]?.name ?? '技能'} 升级到 Lv.${level + 1}！`);
    showFloat('技能升级！', 'success');
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sect-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-3" },
});
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
const __VLS_0 = Divider;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    title: true,
    label: "🏛️ 门派",
}));
const __VLS_2 = __VLS_1({
    title: true,
    label: "🏛️ 门派",
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
else if (__VLS_ctx.cultivationStore.realmIndex < 10) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs text-muted text-center py-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
}
else if (!__VLS_ctx.cultivationStore.sect) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    for (const [sect] of __VLS_vFor((__VLS_ctx.SECTS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (sect.id),
            ...{ class: "border border-accent/20 rounded-xs p-3 space-y-2 sect-card" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['sect-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-3xl" },
        });
        /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
        (sect.emoji);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-accent font-bold text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (sect.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (sect.motto);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (sect.desc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (sect.bonusDesc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        for (const [skill, i] of __VLS_vFor((sect.skills))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
                ...{ class: "text-[10px] ml-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            (skill.name);
            (skill.desc);
            // @ts-ignore
            [cultivationStore, cultivationStore, cultivationStore, SECTS,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.cultivationStore.unlocked))
                        throw 0;
                    if (!!(__VLS_ctx.cultivationStore.realmIndex < 10))
                        throw 0;
                    if (!(!__VLS_ctx.cultivationStore.sect))
                        throw 0;
                    return __VLS_ctx.joinSect(sect.id);
                    // @ts-ignore
                    [joinSect,];
                } },
            ...{ class: "btn w-full justify-center text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (sect.name);
        // @ts-ignore
        [];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3 sect-card" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sect-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-3xl" },
    });
    /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
    (__VLS_ctx.currentSect?.emoji);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-accent font-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (__VLS_ctx.currentSect?.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.currentSect?.motto);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-[10px] text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.currentSect?.bonusDesc);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-xs text-muted mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    (__VLS_ctx.cultivationStore.sectContribution || 0);
    for (const [skill, i] of __VLS_vFor((__VLS_ctx.currentSect?.skills))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "border border-accent/15 rounded-xs p-2 space-y-1" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        (skill.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.getSectSkillLevel(i));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (skill.desc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px]" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        ((i + 1) * 50 * (__VLS_ctx.getSectSkillLevel(i) + 1));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.cultivationStore.unlocked))
                        throw 0;
                    if (!!(__VLS_ctx.cultivationStore.realmIndex < 10))
                        throw 0;
                    if (!!(!__VLS_ctx.cultivationStore.sect))
                        throw 0;
                    return __VLS_ctx.upgradeSkill(i);
                    // @ts-ignore
                    [cultivationStore, currentSect, currentSect, currentSect, currentSect, currentSect, getSectSkillLevel, getSectSkillLevel, upgradeSkill,];
                } },
            ...{ class: "btn w-full justify-center text-xs" },
            disabled: (!__VLS_ctx.canUpgradeSkill(i)),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        // @ts-ignore
        [canUpgradeSkill,];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
