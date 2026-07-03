/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { useGameStore, SEASON_NAMES, WEATHER_NAMES } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { DAY_START_HOUR, DAY_END_HOUR } from '@/data/timeConstants';
import { Zap, Heart, Clock, Coins } from 'lucide-vue-next';
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const staminaBarColor = computed(() => {
    const pct = playerStore.staminaPercent;
    if (pct <= 12)
        return 'bg-danger stamina-critical';
    if (pct <= 35)
        return 'bg-danger';
    if (pct <= 60)
        return 'bg-accent';
    return 'bg-success';
});
/** HP 条是否显示：在矿洞中或HP不满 */
const showHpBar = computed(() => {
    return gameStore.currentLocationGroup === 'mine' || playerStore.hp < playerStore.getMaxHp();
});
const hpBarColor = computed(() => {
    const pct = playerStore.getHpPercent();
    if (pct <= 25)
        return 'bg-danger stamina-critical';
    if (pct <= 60)
        return 'bg-danger';
    return 'bg-success';
});
/** 剩余时间百分比 */
const timePercent = computed(() => {
    const total = DAY_END_HOUR - DAY_START_HOUR; // 20 hours
    const remaining = DAY_END_HOUR - gameStore.hour;
    return Math.max(0, Math.round((remaining / total) * 100));
});
const timeBarColor = computed(() => {
    if (gameStore.isLateNight)
        return 'bg-danger';
    if (timePercent.value <= 25)
        return 'bg-danger';
    if (timePercent.value <= 50)
        return 'bg-accent';
    return 'bg-success';
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border-b border-accent/30 pb-2 md:pb-3 flex flex-col space-y-1" },
});
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:pb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between text-xs md:text-sm" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['md:text-sm']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-2 md:space-x-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:space-x-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-accent font-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted text-xs max-w-16 truncate" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
(__VLS_ctx.playerStore.playerName);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "hidden md:inline" },
});
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['md:inline']} */ ;
(__VLS_ctx.gameStore.year);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.SEASON_NAMES[__VLS_ctx.gameStore.season]);
(__VLS_ctx.gameStore.day);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted hidden md:inline" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['md:inline']} */ ;
(__VLS_ctx.gameStore.weekdayName);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: ({ 'text-danger': __VLS_ctx.gameStore.isLateNight }) },
});
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
(__VLS_ctx.gameStore.timeDisplay);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.WEATHER_NAMES[__VLS_ctx.gameStore.weather]);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-accent shrink-0" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Coins} */
Coins;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (12),
    ...{ class: "inline" },
}));
const __VLS_2 = __VLS_1({
    size: (12),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
(__VLS_ctx.playerStore.money);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between text-xs flex-wrap" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-2 md:space-x-4 flex-wrap" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:space-x-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: ({ 'text-danger stamina-critical': __VLS_ctx.playerStore.isExhausted }) },
});
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['stamina-critical']} */ ;
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.Zap} */
Zap;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    size: (12),
    ...{ class: "inline" },
}));
const __VLS_7 = __VLS_6({
    size: (12),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
(__VLS_ctx.playerStore.stamina);
(__VLS_ctx.playerStore.maxStamina);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "w-14 md:w-20 h-2 bg-bg rounded-xs border border-accent/20" },
});
/** @type {__VLS_StyleScopedClasses['w-14']} */ ;
/** @type {__VLS_StyleScopedClasses['md:w-20']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "h-full rounded-xs transition-all duration-300" },
    ...{ class: (__VLS_ctx.staminaBarColor) },
    ...{ style: ({ width: __VLS_ctx.playerStore.staminaPercent + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
if (__VLS_ctx.showHpBar) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: ({ 'text-danger stamina-critical': __VLS_ctx.playerStore.getIsLowHp() }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['stamina-critical']} */ ;
    let __VLS_10;
    /** @ts-ignore @type { | typeof __VLS_components.Heart} */
    Heart;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        size: (12),
        ...{ class: "inline" },
    }));
    const __VLS_12 = __VLS_11({
        size: (12),
        ...{ class: "inline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    (__VLS_ctx.playerStore.hp);
    (__VLS_ctx.playerStore.getMaxHp());
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "w-12 md:w-16 h-2 bg-bg rounded-xs border border-accent/20" },
    });
    /** @type {__VLS_StyleScopedClasses['w-12']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:w-16']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full rounded-xs transition-all duration-300" },
        ...{ class: (__VLS_ctx.hpBarColor) },
        ...{ style: ({ width: __VLS_ctx.playerStore.getHpPercent() + '%' }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    /** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
let __VLS_15;
/** @ts-ignore @type { | typeof __VLS_components.Clock} */
Clock;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    size: (12),
    ...{ class: "tinline" },
}));
const __VLS_17 = __VLS_16({
    size: (12),
    ...{ class: "tinline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
/** @type {__VLS_StyleScopedClasses['tinline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "w-12 md:w-16 h-2 bg-bg rounded-xs border border-accent/20" },
});
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "h-full rounded-xs transition-all duration-300" },
    ...{ class: (__VLS_ctx.timeBarColor) },
    ...{ style: ({ width: __VLS_ctx.timePercent + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
// @ts-ignore
[playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, playerStore, gameStore, gameStore, gameStore, gameStore, gameStore, gameStore, gameStore, SEASON_NAMES, WEATHER_NAMES, staminaBarColor, showHpBar, hpBarColor, timeBarColor, timePercent,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
