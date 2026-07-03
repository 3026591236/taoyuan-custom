/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onUnmounted } from 'vue';
import { Ship, Zap, Timer, Trophy, Medal, Award } from 'lucide-vue-next';
import { sfxGameStart, sfxRewardClaim, sfxCountdownTick, sfxCountdownFinal, sfxPaddle, sfxRankFirst, sfxRankSecond, sfxRankThird } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
const phase = ref('ready');
const raceGoal = 100;
const raceDuration = 10;
const boats = ref([
    { name: '你', progress: 0 },
    { name: '阿石队', progress: 0 },
    { name: '小满队', progress: 0 }
]);
const timeLeft = ref(raceDuration);
const rowing = ref(false);
const rankings = ref([]);
const countdownNum = ref(3);
const clickCount = ref(0);
let raceTimer = null;
let countdownTimer = null;
let rowingTimeout = null;
let cdTimeout = null;
const playerRank = computed(() => {
    const idx = rankings.value.findIndex(b => b.name === '你');
    return idx === -1 ? 3 : idx + 1;
});
const boatColor = (i) => {
    if (i === 0)
        return 'text-accent';
    if (i === 1)
        return 'text-danger';
    return 'text-success';
};
const boatTrackClass = (i) => {
    if (i === 0)
        return 'bg-accent/50';
    if (i === 1)
        return 'bg-danger/30';
    return 'bg-success/30';
};
const rankColor = (i) => {
    if (i === 0)
        return 'text-accent';
    if (i === 1)
        return 'text-success';
    return 'text-muted';
};
const startCountdown = () => {
    sfxGameStart();
    phase.value = 'countdown';
    countdownNum.value = 3;
    const tick = () => {
        if (countdownNum.value <= 1) {
            startRace();
            return;
        }
        sfxCountdownTick();
        countdownNum.value--;
        cdTimeout = setTimeout(tick, 800);
    };
    cdTimeout = setTimeout(tick, 800);
};
const startRace = () => {
    phase.value = 'racing';
    timeLeft.value = raceDuration;
    clickCount.value = 0;
    // NPC自动划船
    raceTimer = setInterval(() => {
        boats.value[1].progress += Math.floor(Math.random() * 4) + 2;
        boats.value[2].progress += Math.floor(Math.random() * 4) + 2;
    }, 500);
    // 倒计时
    countdownTimer = setInterval(() => {
        timeLeft.value--;
        if (timeLeft.value <= 3 && timeLeft.value > 0)
            sfxCountdownFinal();
        else if (timeLeft.value > 3)
            sfxCountdownTick();
        if (timeLeft.value <= 0) {
            endRace();
        }
    }, 1000);
};
const paddle = () => {
    if (phase.value !== 'racing')
        return;
    sfxPaddle();
    boats.value[0].progress += 3;
    clickCount.value++;
    rowing.value = true;
    if (rowingTimeout)
        clearTimeout(rowingTimeout);
    rowingTimeout = setTimeout(() => {
        rowing.value = false;
    }, 150);
};
const endRace = () => {
    if (raceTimer)
        clearInterval(raceTimer);
    if (countdownTimer)
        clearInterval(countdownTimer);
    raceTimer = null;
    countdownTimer = null;
    const sorted = [...boats.value].sort((a, b) => b.progress - a.progress);
    rankings.value = sorted;
    phase.value = 'finished';
    // 按排名播放音效
    const rank = rankings.value.findIndex(b => b.name === '你') + 1;
    if (rank === 1)
        sfxRankFirst();
    else if (rank === 2)
        sfxRankSecond();
    else
        sfxRankThird();
};
const handleClaim = () => {
    sfxRewardClaim();
    const prizes = { 1: 800, 2: 400, 3: 200 };
    emit('complete', prizes[playerRank.value] ?? 200);
};
onUnmounted(() => {
    if (raceTimer)
        clearInterval(raceTimer);
    if (countdownTimer)
        clearInterval(countdownTimer);
    if (rowingTimeout)
        clearTimeout(rowingTimeout);
    if (cdTimeout)
        clearTimeout(cdTimeout);
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-panel max-w-sm w-full" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "text-accent text-sm mb-3 flex items-center space-x-1" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Ship} */
Ship;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
if (__VLS_ctx.phase === 'ready') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const __VLS_5 = Button || Button;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_7 = __VLS_6({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    let __VLS_10;
    const __VLS_11 = {
        /** @type {typeof __VLS_10.click} */
        onClick: (__VLS_ctx.startCountdown),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_12 } = __VLS_8.slots;
    // @ts-ignore
    [phase, startCountdown,];
    var __VLS_8;
    var __VLS_9;
}
else if (__VLS_ctx.phase === 'countdown') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center py-6" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "countdown-num text-accent text-2xl" },
    });
    /** @type {__VLS_StyleScopedClasses['countdown-num']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
    (__VLS_ctx.countdownNum);
}
else if (__VLS_ctx.phase === 'racing') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    let __VLS_13;
    /** @ts-ignore @type { | typeof __VLS_components.Timer} */
    Timer;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        size: (12),
        ...{ class: "inline -mt-0.5" },
    }));
    const __VLS_15 = __VLS_14({
        size: (12),
        ...{ class: "inline -mt-0.5" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    /** @type {__VLS_StyleScopedClasses['-mt-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm font-bold" },
        ...{ class: (__VLS_ctx.timeLeft <= 3 ? 'text-danger time-pulse' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (__VLS_ctx.timeLeft);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [boat, i] of __VLS_vFor((__VLS_ctx.boats))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "mb-2 last:mb-0" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['last:mb-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-2 mb-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs w-14" },
            ...{ class: (__VLS_ctx.boatColor(i)) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-14']} */ ;
        (boat.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted flex-1 text-right" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
        (boat.progress);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "h-5 bg-bg border relative overflow-hidden" },
            ...{ class: (i === 0 ? 'border-accent/40' : 'border-accent/15') },
        });
        /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "absolute top-0 bottom-0 right-0 w-px border-r border-dashed border-accent/30" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-px']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-r']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "h-full transition-all duration-100 flex items-center justify-end pr-0.5" },
            ...{ class: (__VLS_ctx.boatTrackClass(i)) },
            ...{ style: ({ width: `${Math.min(100, (boat.progress / __VLS_ctx.raceGoal) * 100)}%` }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['duration-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
        /** @type {__VLS_StyleScopedClasses['pr-0.5']} */ ;
        let __VLS_18;
        /** @ts-ignore @type { | typeof __VLS_components.Ship} */
        Ship;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
            size: (12),
            ...{ class: "relative z-10" },
            ...{ class: ({ 'boat-rock': i === 0 && __VLS_ctx.rowing }) },
        }));
        const __VLS_20 = __VLS_19({
            size: (12),
            ...{ class: "relative z-10" },
            ...{ class: ({ 'boat-rock': i === 0 && __VLS_ctx.rowing }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['boat-rock']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "wave-bg absolute inset-0 pointer-events-none opacity-15" },
        });
        /** @type {__VLS_StyleScopedClasses['wave-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-15']} */ ;
        // @ts-ignore
        [phase, phase, countdownNum, timeLeft, timeLeft, boats, boatColor, boatTrackClass, raceGoal, rowing,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    const __VLS_23 = Button || Button;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 py-3 text-sm active:!bg-accent active:!text-bg paddle-btn" },
        icon: (__VLS_ctx.Zap),
    }));
    const __VLS_25 = __VLS_24({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 py-3 text-sm active:!bg-accent active:!text-bg paddle-btn" },
        icon: (__VLS_ctx.Zap),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    let __VLS_28;
    const __VLS_29 = {
        /** @type {typeof __VLS_28.click} */
        onClick: (__VLS_ctx.paddle),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['active:!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['active:!text-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['paddle-btn']} */ ;
    const { default: __VLS_30 } = __VLS_26.slots;
    // @ts-ignore
    [Zap, paddle,];
    var __VLS_26;
    var __VLS_27;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center min-w-12" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-w-12']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-sm font-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (__VLS_ctx.clickCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted leading-none" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-none']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [entry, i] of __VLS_vFor((__VLS_ctx.rankings))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (entry.name),
            ...{ class: "flex items-center justify-between text-xs px-2 py-1.5 border-b border-accent/10 last:border-0" },
            ...{ class: ({ 'bg-accent/5': entry.name === '你' }) },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['last:border-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "w-5 flex justify-center" },
            ...{ class: (__VLS_ctx.rankColor(i)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        if (i === 0) {
            let __VLS_31;
            /** @ts-ignore @type { | typeof __VLS_components.Trophy} */
            Trophy;
            // @ts-ignore
            const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
                size: (12),
            }));
            const __VLS_33 = __VLS_32({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        }
        else if (i === 1) {
            let __VLS_36;
            /** @ts-ignore @type { | typeof __VLS_components.Medal} */
            Medal;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
                size: (12),
            }));
            const __VLS_38 = __VLS_37({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        }
        else {
            let __VLS_41;
            /** @ts-ignore @type { | typeof __VLS_components.Award} */
            Award;
            // @ts-ignore
            const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
                size: (12),
            }));
            const __VLS_43 = __VLS_42({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_42));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: ({ 'text-accent': entry.name === '你' }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (entry.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (entry.progress);
        // @ts-ignore
        [clickCount, rankings, rankColor,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 p-2 mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    if (__VLS_ctx.playerRank === 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent text-xs finish-flash" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['finish-flash']} */ ;
    }
    else if (__VLS_ctx.playerRank === 2) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-success text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    const __VLS_46 = Button || Button;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_48 = __VLS_47({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    let __VLS_51;
    const __VLS_52 = {
        /** @type {typeof __VLS_51.click} */
        onClick: (__VLS_ctx.handleClaim),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_53 } = __VLS_49.slots;
    // @ts-ignore
    [playerRank, playerRank, handleClaim,];
    var __VLS_49;
    var __VLS_50;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
