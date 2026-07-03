/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onUnmounted } from 'vue';
import { ChefHat, Timer, Check, Cookie } from 'lucide-vue-next';
import { sfxGameStart, sfxRewardClaim, sfxCountdownTick, sfxCountdownFinal, sfxDoughStep, sfxDumplingDone, sfxMiniFail, sfxRankFirst, sfxRankSecond } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
const phase = ref('ready');
const steps = [
    { label: '擀皮', action: '擀皮' },
    { label: '放馅', action: '放馅' },
    { label: '捏合', action: '捏合' }
];
const timeLeft = ref(25);
const dumplingCount = ref(0);
const currentStep = ref(0);
const animating = ref(false);
const showError = ref(false);
const showComplete = ref(false);
const buttonOrder = ref([0, 1, 2]);
const showShuffle = ref(false);
let countdownTimer = null;
let animTimeout = null;
let errorTimeout = null;
let completeTimeout = null;
let shuffleTimeout = null;
const prize = computed(() => Math.min(1000, dumplingCount.value * 100));
/** 打乱按钮顺序：随机交换1-3个位置 */
const shuffleButtons = () => {
    const order = [...buttonOrder.value];
    const swapCount = 1 + Math.floor(Math.random() * 3); // 1-3次交换
    for (let s = 0; s < swapCount; s++) {
        const i = Math.floor(Math.random() * 3);
        let j = Math.floor(Math.random() * 3);
        while (j === i)
            j = Math.floor(Math.random() * 3);
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
    }
    // 确保确实变了
    if (order.every((v, idx) => v === buttonOrder.value[idx])) {
        // 如果没变就强制交换前两个
        const tmp = order[0];
        order[0] = order[1];
        order[1] = tmp;
    }
    buttonOrder.value = order;
    sfxCountdownFinal();
    showShuffle.value = true;
    if (shuffleTimeout)
        clearTimeout(shuffleTimeout);
    shuffleTimeout = setTimeout(() => {
        showShuffle.value = false;
    }, 1200);
};
const startGame = () => {
    sfxGameStart();
    phase.value = 'making';
    timeLeft.value = 25;
    dumplingCount.value = 0;
    currentStep.value = 0;
    buttonOrder.value = [0, 1, 2];
    showShuffle.value = false;
    countdownTimer = setInterval(() => {
        timeLeft.value--;
        if (timeLeft.value <= 5 && timeLeft.value > 0)
            sfxCountdownFinal();
        else if (timeLeft.value > 5)
            sfxCountdownTick();
        if (timeLeft.value <= 0) {
            endGame();
        }
    }, 1000);
};
const doStep = (stepIdx) => {
    if (phase.value !== 'making')
        return;
    if (stepIdx !== currentStep.value) {
        // 错误步骤
        sfxMiniFail();
        showError.value = true;
        currentStep.value = 0;
        if (errorTimeout)
            clearTimeout(errorTimeout);
        errorTimeout = setTimeout(() => {
            showError.value = false;
        }, 800);
        return;
    }
    showError.value = false;
    animating.value = true;
    if (animTimeout)
        clearTimeout(animTimeout);
    animTimeout = setTimeout(() => {
        animating.value = false;
    }, 300);
    if (currentStep.value === 2) {
        // 完成一个饺子
        sfxDumplingDone();
        dumplingCount.value++;
        showComplete.value = true;
        if (completeTimeout)
            clearTimeout(completeTimeout);
        completeTimeout = setTimeout(() => {
            showComplete.value = false;
            currentStep.value = 0;
            // 包到3个及以上后，每完成一个有概率打乱按钮顺序
            if (dumplingCount.value >= 3) {
                shuffleButtons();
            }
        }, 500);
    }
    else {
        sfxDoughStep();
        currentStep.value++;
    }
};
const endGame = () => {
    if (countdownTimer)
        clearInterval(countdownTimer);
    countdownTimer = null;
    phase.value = 'finished';
    // 结算音效
    if (dumplingCount.value >= 8)
        sfxRankFirst();
    else if (dumplingCount.value >= 5)
        sfxRankSecond();
};
const handleClaim = () => {
    sfxRewardClaim();
    emit('complete', prize.value);
};
onUnmounted(() => {
    if (countdownTimer)
        clearInterval(countdownTimer);
    if (animTimeout)
        clearTimeout(animTimeout);
    if (errorTimeout)
        clearTimeout(errorTimeout);
    if (completeTimeout)
        clearTimeout(completeTimeout);
    if (shuffleTimeout)
        clearTimeout(shuffleTimeout);
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
/** @ts-ignore @type { | typeof __VLS_components.ChefHat} */
ChefHat;
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
        onClick: (__VLS_ctx.startGame),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_12 } = __VLS_8.slots;
    // @ts-ignore
    [phase, startGame,];
    var __VLS_8;
    var __VLS_9;
}
else if (__VLS_ctx.phase === 'making') {
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.dumplingCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.timeLeft <= 5 ? 'text-danger time-pulse' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
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
    (__VLS_ctx.timeLeft);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "h-1 bg-bg border border-accent/20 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full transition-all duration-1000 ease-linear" },
        ...{ class: (__VLS_ctx.timeLeft <= 5 ? 'bg-danger/60' : 'bg-accent/60') },
        ...{ style: ({ width: `${(__VLS_ctx.timeLeft / 25) * 100}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    /** @type {__VLS_StyleScopedClasses['duration-1000']} */ ;
    /** @type {__VLS_StyleScopedClasses['ease-linear']} */ ;
    if (__VLS_ctx.dumplingCount > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap space-x-1 mb-2 justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        for (const [i] of __VLS_vFor((Math.min(__VLS_ctx.dumplingCount, 10)))) {
            let __VLS_18;
            /** @ts-ignore @type { | typeof __VLS_components.Cookie} */
            Cookie;
            // @ts-ignore
            const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
                key: (i),
                size: (14),
                ...{ class: "text-accent dumpling-icon" },
            }));
            const __VLS_20 = __VLS_19({
                key: (i),
                size: (14),
                ...{ class: "text-accent dumpling-icon" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_19));
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['dumpling-icon']} */ ;
            // @ts-ignore
            [phase, dumplingCount, dumplingCount, dumplingCount, timeLeft, timeLeft, timeLeft, timeLeft,];
        }
        if (__VLS_ctx.dumplingCount > 10) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.dumplingCount - 10);
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 p-3 mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.dumplingCount + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [s, i] of __VLS_vFor((__VLS_ctx.steps))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "text-xs px-3 py-1 border transition-all duration-150" },
            ...{ class: ({
                    'border-accent bg-accent/15 text-accent scale-105': __VLS_ctx.currentStep === i,
                    'border-success/50 bg-success/5 text-success': i < __VLS_ctx.currentStep,
                    'border-accent/15 text-muted': i > __VLS_ctx.currentStep
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['duration-150']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['scale-105']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-success/5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        if (i < __VLS_ctx.currentStep) {
            let __VLS_23;
            /** @ts-ignore @type { | typeof __VLS_components.Check} */
            Check;
            // @ts-ignore
            const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
                size: (10),
                ...{ class: "inline -mt-0.5 mr-0.5" },
            }));
            const __VLS_25 = __VLS_24({
                size: (10),
                ...{ class: "inline -mt-0.5 mr-0.5" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_24));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            /** @type {__VLS_StyleScopedClasses['-mt-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
        }
        (s.label);
        // @ts-ignore
        [dumplingCount, dumplingCount, dumplingCount, steps, currentStep, currentStep, currentStep, currentStep,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "h-16 flex items-center justify-center relative" },
    });
    /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    if (__VLS_ctx.currentStep === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: ({ 'dough-roll': __VLS_ctx.animating }) },
            ...{ class: "w-12 h-12 border-2 border-accent/50 rounded-full flex items-center justify-center text-sm text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['dough-roll']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    else if (__VLS_ctx.currentStep === 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: ({ 'fill-drop': __VLS_ctx.animating }) },
            ...{ class: "w-12 h-12 border-2 border-success/50 rounded-full flex items-center justify-center text-sm text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['fill-drop']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    else if (__VLS_ctx.currentStep === 2) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: ({ 'pinch-close': __VLS_ctx.animating }) },
            ...{ class: "flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['pinch-close']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "w-6 h-9 border-2 border-accent/50 rounded-l-full" },
        });
        /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-9']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-l-full']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "w-6 h-9 border-2 border-accent/50 rounded-r-full" },
        });
        /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-9']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-r-full']} */ ;
    }
    if (__VLS_ctx.showError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-danger text-xs mt-1 wrong-shake" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['wrong-shake']} */ ;
    }
    if (__VLS_ctx.showComplete) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dumpling-done text-sm text-success mt-1 flex items-center justify-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['dumpling-done']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_28;
        /** @ts-ignore @type { | typeof __VLS_components.Cookie} */
        Cookie;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
            size: (14),
        }));
        const __VLS_30 = __VLS_29({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    }
    if (__VLS_ctx.showShuffle) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-xs mb-2 text-center shuffle-flash" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['shuffle-flash']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    for (const [idx] of __VLS_vFor((__VLS_ctx.buttonOrder))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.phase === 'ready'))
                        throw 0;
                    if (!(__VLS_ctx.phase === 'making'))
                        throw 0;
                    return __VLS_ctx.doStep(idx);
                    // @ts-ignore
                    [currentStep, currentStep, currentStep, animating, animating, animating, showError, showComplete, showShuffle, buttonOrder, doStep,];
                } },
            key: (idx),
            ...{ class: "btn text-xs flex-1 py-2 transition-all duration-100" },
            ...{ class: ({
                    '!bg-accent/20 !border-accent/50': __VLS_ctx.currentStep === idx,
                    'opacity-60': __VLS_ctx.currentStep !== idx
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['duration-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['!bg-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['!border-accent/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
        (__VLS_ctx.steps[idx].action);
        // @ts-ignore
        [steps, currentStep, currentStep,];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.dumplingCount > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap space-x-1 mb-3 justify-center border border-accent/20 p-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        for (const [i] of __VLS_vFor((Math.min(__VLS_ctx.dumplingCount, 10)))) {
            let __VLS_33;
            /** @ts-ignore @type { | typeof __VLS_components.Cookie} */
            Cookie;
            // @ts-ignore
            const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
                key: (i),
                size: (16),
                ...{ class: "text-accent" },
            }));
            const __VLS_35 = __VLS_34({
                key: (i),
                size: (16),
                ...{ class: "text-accent" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_34));
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            // @ts-ignore
            [dumplingCount, dumplingCount,];
        }
        if (__VLS_ctx.dumplingCount > 10) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted self-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['self-center']} */ ;
            (__VLS_ctx.dumplingCount - 10);
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 p-2 mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.dumplingCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.prize);
    const __VLS_38 = Button || Button;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_40 = __VLS_39({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    let __VLS_43;
    const __VLS_44 = {
        /** @type {typeof __VLS_43.click} */
        onClick: (__VLS_ctx.handleClaim),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_45 } = __VLS_41.slots;
    // @ts-ignore
    [dumplingCount, dumplingCount, dumplingCount, prize, handleClaim,];
    var __VLS_41;
    var __VLS_42;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
