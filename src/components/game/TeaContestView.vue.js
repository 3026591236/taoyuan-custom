/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onUnmounted } from 'vue';
import { Coffee, Droplets, Check } from 'lucide-vue-next';
import { sfxGameStart, sfxRewardClaim, sfxTeaPour, sfxTeaBell, sfxMiniGood, sfxMiniPoor, sfxMiniPerfect, sfxMiniFail, sfxRankFirst, sfxRankSecond } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
const BREW_STEPS = [
    { label: '控制水温', shortLabel: '温', hint: '将水烧到合适温度', action: '定温！', lowLabel: '凉', highLabel: '烫' },
    { label: '投茶', shortLabel: '茶', hint: '放入适量茶叶', action: '放茶！', lowLabel: '少', highLabel: '多' },
    { label: '出汤时机', shortLabel: '汤', hint: '在最佳时机出汤', action: '出汤！', lowLabel: '淡', highLabel: '苦' }
];
const phase = ref('ready');
const roundIndex = ref(0);
const brewStep = ref(0);
const fillPct = ref(0);
const targetPosition = ref(50);
const totalScore = ref(0);
const roundScore = ref(0);
const lastStepScore = ref(0);
const lastStepGrade = ref('poor');
const lastRoundGrade = ref('poor');
const roundResults = ref([]);
let fillTimer = null;
let phaseTimeout = null;
// 填充速度随轮次和步骤增加
const getFillSpeed = () => {
    const roundBonus = roundIndex.value * 0.4;
    const stepBonus = brewStep.value * 0.2;
    return 1.0 + roundBonus + stepBonus;
};
const prize = computed(() => {
    if (totalScore.value >= 400)
        return 800;
    if (totalScore.value >= 270)
        return 500;
    if (totalScore.value >= 150)
        return 200;
    return 50;
});
const currentStepDef = computed(() => BREW_STEPS[brewStep.value]);
const roundDotClass = (idx) => {
    if (idx >= roundResults.value.length) {
        if (idx === roundIndex.value && phase.value !== 'finished')
            return 'bg-accent dot-pulse';
        return 'bg-accent/20';
    }
    const r = roundResults.value[idx];
    if (r.grade === 'perfect')
        return 'bg-accent';
    if (r.grade === 'good')
        return 'bg-success';
    return 'bg-danger';
};
const startGame = () => {
    sfxGameStart();
    roundIndex.value = 0;
    totalScore.value = 0;
    roundScore.value = 0;
    roundResults.value = [];
    startBrewStep();
};
const startBrewStep = () => {
    phase.value = 'brewing';
    fillPct.value = 0;
    // 随机目标位置 (25-80范围)
    targetPosition.value = 25 + Math.random() * 55;
    const speed = getFillSpeed();
    fillTimer = setInterval(() => {
        fillPct.value = Math.min(100, fillPct.value + speed);
        if (fillPct.value >= 100) {
            // 自动超时，强制结算（最差分数）
            lockStep();
        }
    }, 50);
};
const lockStep = () => {
    sfxTeaPour();
    if (fillTimer)
        clearInterval(fillTimer);
    fillTimer = null;
    const offset = Math.abs(fillPct.value - targetPosition.value);
    let grade;
    let score;
    if (offset <= 4) {
        grade = 'perfect';
        score = 50;
    }
    else if (offset <= 12) {
        grade = 'good';
        score = 30;
    }
    else {
        grade = 'poor';
        score = 10;
    }
    // 步骤判定音效
    setTimeout(() => {
        if (grade === 'perfect')
            sfxTeaBell();
        else if (grade === 'good')
            sfxMiniGood();
        else
            sfxMiniPoor();
    }, 100);
    lastStepGrade.value = grade;
    lastStepScore.value = score;
    roundScore.value += score;
    totalScore.value += score;
    phase.value = 'step_result';
    phaseTimeout = setTimeout(() => {
        brewStep.value++;
        if (brewStep.value >= 3) {
            // 本轮结束
            let roundGrade = 'poor';
            if (roundScore.value >= 120)
                roundGrade = 'perfect';
            else if (roundScore.value >= 70)
                roundGrade = 'good';
            lastRoundGrade.value = roundGrade;
            roundResults.value.push({ grade: roundGrade, score: roundScore.value });
            // 轮次结果音效
            if (roundGrade === 'perfect')
                sfxMiniPerfect();
            else if (roundGrade === 'poor')
                sfxMiniFail();
            phase.value = 'round_result';
            phaseTimeout = setTimeout(() => {
                roundIndex.value++;
                if (roundIndex.value >= 3) {
                    phase.value = 'finished';
                }
                else {
                    brewStep.value = 0;
                    roundScore.value = 0;
                    startBrewStep();
                }
            }, 1500);
        }
        else {
            startBrewStep();
        }
    }, 800);
};
const handleClaim = () => {
    if (totalScore.value >= 400)
        sfxRankFirst();
    else if (totalScore.value >= 270)
        sfxRankSecond();
    else
        sfxRewardClaim();
    emit('complete', prize.value);
};
onUnmounted(() => {
    if (fillTimer)
        clearInterval(fillTimer);
    if (phaseTimeout)
        clearTimeout(phaseTimeout);
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
/** @ts-ignore @type { | typeof __VLS_components.Coffee} */
Coffee;
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
else if (__VLS_ctx.phase === 'brewing') {
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
    (__VLS_ctx.roundIndex + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.totalScore);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1.5 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [i] of __VLS_vFor((3))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.roundDotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, roundIndex, totalScore, roundDotClass,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [s, i] of __VLS_vFor((__VLS_ctx.BREW_STEPS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "text-xs px-2 py-0.5 border" },
            ...{ class: ({
                    'border-accent bg-accent/15 text-accent': __VLS_ctx.brewStep === i,
                    'border-success/50 bg-success/5 text-success': i < __VLS_ctx.brewStep,
                    'border-accent/15 text-muted': i > __VLS_ctx.brewStep
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-success/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-success/5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        if (i < __VLS_ctx.brewStep) {
            let __VLS_13;
            /** @ts-ignore @type { | typeof __VLS_components.Check} */
            Check;
            // @ts-ignore
            const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
                size: (10),
                ...{ class: "inline -mt-0.5 mr-0.5" },
            }));
            const __VLS_15 = __VLS_14({
                size: (10),
                ...{ class: "inline -mt-0.5 mr-0.5" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_14));
            /** @type {__VLS_StyleScopedClasses['inline']} */ ;
            /** @type {__VLS_StyleScopedClasses['-mt-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
        }
        (s.shortLabel);
        // @ts-ignore
        [BREW_STEPS, brewStep, brewStep, brewStep, brewStep,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-accent text-center mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.currentStepDef.label);
    (__VLS_ctx.currentStepDef.hint);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative h-10 bg-bg border border-accent/20 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute top-0 bottom-0 w-6 border-x border-success/50 bg-success/15" },
        ...{ style: ({ left: `calc(${__VLS_ctx.targetPosition}% - 12px)` }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-x']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-success/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-success/15']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute top-0 bottom-0 w-1 bg-accent/40" },
        ...{ style: ({ left: `${__VLS_ctx.targetPosition}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "absolute -top-3.5 text-success" },
        ...{ style: {} },
        ...{ style: ({ left: `calc(${__VLS_ctx.targetPosition}% - 6px)` }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['-top-3.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute top-0 bottom-0 left-0 transition-none" },
        ...{ class: (__VLS_ctx.fillPct > 95 ? 'bg-danger/40' : 'bg-accent/30') },
        ...{ style: ({ width: `${__VLS_ctx.fillPct}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-none']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute top-0 bottom-0 w-0.5 bg-text" },
        ...{ style: ({ left: `${__VLS_ctx.fillPct}%`, transition: 'none' }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-text']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute bottom-0 left-1 right-1 flex justify-between" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.currentStepDef.lowLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.currentStepDef.highLabel);
    const __VLS_18 = Button || Button;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        ...{ 'onClick': {} },
        ...{ class: "w-full py-2" },
        icon: (__VLS_ctx.Droplets),
    }));
    const __VLS_20 = __VLS_19({
        ...{ 'onClick': {} },
        ...{ class: "w-full py-2" },
        icon: (__VLS_ctx.Droplets),
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    let __VLS_23;
    const __VLS_24 = {
        /** @type {typeof __VLS_23.click} */
        onClick: (__VLS_ctx.lockStep),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    const { default: __VLS_25 } = __VLS_21.slots;
    (__VLS_ctx.currentStepDef.action);
    // @ts-ignore
    [currentStepDef, currentStepDef, currentStepDef, currentStepDef, currentStepDef, targetPosition, targetPosition, targetPosition, fillPct, fillPct, fillPct, Droplets, lockStep,];
    var __VLS_21;
    var __VLS_22;
}
else if (__VLS_ctx.phase === 'step_result') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center py-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1.5 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [i] of __VLS_vFor((3))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.roundDotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, roundDotClass,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: (__VLS_ctx.lastStepGrade === 'perfect' ? 'step-perfect' : __VLS_ctx.lastStepGrade === 'good' ? '' : 'step-miss') },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
        ...{ class: ({
                'text-accent': __VLS_ctx.lastStepGrade === 'perfect',
                'text-success': __VLS_ctx.lastStepGrade === 'good',
                'text-muted': __VLS_ctx.lastStepGrade === 'poor'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.lastStepGrade === 'perfect' ? '精准！' : __VLS_ctx.lastStepGrade === 'good' ? '还行。' : '偏了…');
    (__VLS_ctx.lastStepScore);
}
else if (__VLS_ctx.phase === 'round_result') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center py-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1.5 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [i] of __VLS_vFor((3))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.roundDotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, roundDotClass, lastStepGrade, lastStepGrade, lastStepGrade, lastStepGrade, lastStepGrade, lastStepGrade, lastStepGrade, lastStepScore,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: (__VLS_ctx.lastRoundGrade === 'perfect' ? 'pot-hit' : __VLS_ctx.lastRoundGrade === 'good' ? '' : 'wrong-shake') },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-1" },
        ...{ class: ({
                'text-accent': __VLS_ctx.lastRoundGrade === 'perfect',
                'text-success': __VLS_ctx.lastRoundGrade === 'good',
                'text-danger': __VLS_ctx.lastRoundGrade === 'poor'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    (__VLS_ctx.lastRoundGrade === 'perfect' ? '绝品好茶！' : __VLS_ctx.lastRoundGrade === 'good' ? '茶味尚可。' : '这泡砸了…');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.roundScore);
}
else if (__VLS_ctx.phase === 'finished') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1.5 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [i] of __VLS_vFor((3))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.roundDotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, roundDotClass, lastRoundGrade, lastRoundGrade, lastRoundGrade, lastRoundGrade, lastRoundGrade, lastRoundGrade, lastRoundGrade, roundScore,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [r, i] of __VLS_vFor((__VLS_ctx.roundResults))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "flex items-center justify-between text-xs py-0.5 border-b border-accent/10 last:border-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['last:border-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (i + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: ({
                    'text-accent': r.grade === 'perfect',
                    'text-success': r.grade === 'good',
                    'text-danger': r.grade === 'poor'
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        (r.grade === 'perfect' ? '绝品' : r.grade === 'good' ? '尚可' : '失手');
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (r.score);
        // @ts-ignore
        [roundResults,];
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
    (__VLS_ctx.totalScore);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.prize);
    const __VLS_26 = Button || Button;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_28 = __VLS_27({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    let __VLS_31;
    const __VLS_32 = {
        /** @type {typeof __VLS_31.click} */
        onClick: (__VLS_ctx.handleClaim),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_33 } = __VLS_29.slots;
    // @ts-ignore
    [totalScore, prize, handleClaim,];
    var __VLS_29;
    var __VLS_30;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
