/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import Divider from '@/components/game/Divider.vue';
import { useCombatStore, REALM_ZONES } from '@/stores/useCombatStore';
import { useCultivationStore } from '@/stores/useCultivationStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
const combatStore = useCombatStore();
const cultivationStore = useCultivationStore();
const playerStore = usePlayerStore();
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
    label: "⚔️ 秘境探索",
}));
const __VLS_2 = __VLS_1({
    title: true,
    label: "⚔️ 秘境探索",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
if (!__VLS_ctx.combatStore.currentZone) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    for (const [zone] of __VLS_vFor((__VLS_ctx.REALM_ZONES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (zone.id),
            ...{ class: "border border-accent/20 rounded-xs p-3 space-y-2" },
            ...{ class: ({ 'opacity-50': (__VLS_ctx.cultivationStore.realmIndex || 0) < zone.minRealm }) },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-50']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-lg mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        (zone.emoji);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        (zone.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted ml-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
        (zone.desc);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.combatStore.currentZone))
                        throw 0;
                    return __VLS_ctx.combatStore.enterZone(zone.id);
                    // @ts-ignore
                    [combatStore, combatStore, REALM_ZONES, cultivationStore,];
                } },
            ...{ class: "btn text-xs" },
            disabled: ((__VLS_ctx.cultivationStore.realmIndex || 0) < zone.minRealm),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (zone.cost);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (zone.monsters.map(m => m.emoji + m.name).join(' '));
        if ((__VLS_ctx.cultivationStore.realmIndex || 0) < zone.minRealm) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-[10px] text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        }
        // @ts-ignore
        [cultivationStore, cultivationStore,];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative battle-arena" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['battle-arena']} */ ;
    if (__VLS_ctx.combatStore.showFlash) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "battle-flash" },
        });
        /** @type {__VLS_StyleScopedClasses['battle-flash']} */ ;
    }
    for (const [d] of __VLS_vFor((__VLS_ctx.combatStore.damageNumbers))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (d.id),
            ...{ class: "damage-number" },
            ...{ class: (d.type === 'player' ? 'damage-player' : 'damage-monster') },
            ...{ style: ({ left: d.x + '%', top: d.y + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['damage-number']} */ ;
        (d.value);
        // @ts-ignore
        [combatStore, combatStore,];
    }
    if (__VLS_ctx.combatStore.currentMonster) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-center p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-4xl mb-1" },
            ...{ class: ({ 'monster-hit': __VLS_ctx.combatStore.showFlash }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['monster-hit']} */ ;
        (__VLS_ctx.combatStore.currentMonster.emoji);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-accent font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        (__VLS_ctx.combatStore.currentMonster.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "w-full bg-bg/50 rounded-xs h-3 mt-1 overflow-hidden" },
        });
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hp-bar-monster h-full transition-all duration-300" },
            ...{ style: ({ width: (__VLS_ctx.combatStore.monsterHp / __VLS_ctx.combatStore.currentMonster.hp * 100) + '%' }) },
        });
        /** @type {__VLS_StyleScopedClasses['hp-bar-monster']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.combatStore.monsterHp);
        (__VLS_ctx.combatStore.currentMonster.hp);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center text-muted text-xs my-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['my-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-2xl mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-accent font-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (__VLS_ctx.playerStore.playerName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "w-full bg-bg/50 rounded-xs h-3 mt-1 overflow-hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "hp-bar-player h-full transition-all duration-300" },
        ...{ style: ({ width: (__VLS_ctx.combatStore.playerHp / __VLS_ctx.combatStore.playerMaxHp * 100) + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['hp-bar-player']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    /** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-[10px] text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.combatStore.playerHp);
    (__VLS_ctx.combatStore.playerMaxHp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 max-h-32 overflow-y-auto text-[10px] space-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-32']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-0.5']} */ ;
    for (const [log, i] of __VLS_vFor((__VLS_ctx.combatStore.combatLog.slice(-8)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: (log.includes('击败') ? 'text-accent' : log.includes('被') ? 'text-danger' : 'text-muted') },
        });
        (log);
        // @ts-ignore
        [combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, combatStore, playerStore,];
    }
    if (__VLS_ctx.combatStore.combatResult === 'win') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-center text-accent font-bold text-lg victory-text" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['victory-text']} */ ;
        if (__VLS_ctx.combatStore.drops.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            for (const [d, i] of __VLS_vFor((__VLS_ctx.combatStore.drops))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (i),
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (d.name);
                (d.qty);
                // @ts-ignore
                [combatStore, combatStore, combatStore,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.combatStore.collectDrops) },
                ...{ class: "btn w-full justify-center mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.combatStore.leaveCombat) },
            ...{ class: "btn w-full justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    }
    if (__VLS_ctx.combatStore.combatResult === 'lose') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-center text-danger font-bold text-lg" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.combatStore.leaveCombat) },
            ...{ class: "btn w-full justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    }
    if (__VLS_ctx.combatStore.isFighting) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-center text-xs text-muted animate-pulse" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-pulse']} */ ;
    }
}
// @ts-ignore
[combatStore, combatStore, combatStore, combatStore, combatStore,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
