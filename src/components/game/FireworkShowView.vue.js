/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onUnmounted } from 'vue';
import { Sparkles, Sparkle, Asterisk } from 'lucide-vue-next';
import { sfxGameStart, sfxRewardClaim, sfxCountdownTick, sfxCountdownFinal, sfxFireworkLaunch, sfxFireworkBoom, sfxMiniPerfect, sfxMiniFail, sfxRankFirst } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
const phase = ref('ready');
const round = ref(0);
const score = ref(0);
const completedRounds = ref(0);
const sequence = ref([]);
const playerInput = ref([]);
const activeFirework = ref(-1);
const correctFlash = ref(-1);
const wrongFlash = ref(-1);
/** 记录每轮通过/失败: true=通过, false=失败, null=未到 */
const roundResults = ref([null, null, null, null, null]);
/** 回忆阶段倒计时 */
const recallTimeLeft = ref(0);
const recallTimeLimit = ref(0);
const fireworkColors = ['#c8a45c', '#c34043', '#5a9e6f', '#c8a45c', '#c34043', '#5a9e6f'];
let showTimeout = null;
let phaseTimeout = null;
let recallTimer = null;
const phaseText = computed(() => {
    switch (phase.value) {
        case 'watching':
            return '看好烟花顺序...';
        case 'repeating':
            return '按顺序点击！';
        case 'round_success':
            return '记忆正确！+150文';
        case 'round_fail':
            return '记错了...';
        default:
            return '';
    }
});
const roundDotClass = (idx) => {
    const r = roundResults.value[idx];
    if (r === true)
        return 'bg-success';
    if (r === false)
        return 'bg-danger';
    if (idx === round.value && phase.value !== 'finished')
        return 'bg-accent dot-pulse';
    return 'bg-accent/20';
};
const generateSequence = (length) => {
    const seq = [];
    for (let i = 0; i < length; i++) {
        seq.push(Math.floor(Math.random() * 6));
    }
    return seq;
};
const startGame = () => {
    sfxGameStart();
    round.value = 0;
    score.value = 0;
    completedRounds.value = 0;
    roundResults.value = [null, null, null, null, null];
    startRound();
};
const startRound = () => {
    const seqLength = round.value + 2; // 第1轮2个，第5轮6个
    sequence.value = generateSequence(seqLength);
    playerInput.value = [];
    phase.value = 'watching';
    // 展示间隔随轮次加快: 第1轮500ms → 第5轮350ms
    const showDelay = Math.max(350, 500 - round.value * 40);
    const flashDuration = Math.max(350, 500 - round.value * 40);
    // 展示序列
    let idx = 0;
    const showNext = () => {
        if (idx < sequence.value.length) {
            activeFirework.value = sequence.value[idx];
            sfxFireworkLaunch();
            setTimeout(() => sfxFireworkBoom(), 200);
            showTimeout = setTimeout(() => {
                activeFirework.value = -1;
                idx++;
                showTimeout = setTimeout(showNext, showDelay * 0.5);
            }, flashDuration);
        }
        else {
            // 展示完毕，进入玩家输入，开始倒计时
            phase.value = 'repeating';
            // 回忆时间: 基础5秒 + 每个位置1.5秒，随轮次略减
            const timePerSlot = Math.max(1.0, 1.5 - round.value * 0.1);
            recallTimeLimit.value = Math.ceil(5 + seqLength * timePerSlot);
            recallTimeLeft.value = recallTimeLimit.value;
            recallTimer = setInterval(() => {
                recallTimeLeft.value--;
                if (recallTimeLeft.value <= 3 && recallTimeLeft.value > 0)
                    sfxCountdownFinal();
                else if (recallTimeLeft.value > 3)
                    sfxCountdownTick();
                if (recallTimeLeft.value <= 0) {
                    // 超时，本轮失败
                    sfxMiniFail();
                    if (recallTimer)
                        clearInterval(recallTimer);
                    recallTimer = null;
                    roundResults.value[round.value] = false;
                    phase.value = 'round_fail';
                    phaseTimeout = setTimeout(() => {
                        phase.value = 'finished';
                    }, 1200);
                }
            }, 1000);
        }
    };
    showTimeout = setTimeout(showNext, 500);
};
const clickPad = (idx) => {
    if (phase.value !== 'repeating')
        return;
    const expectedIdx = playerInput.value.length;
    const expected = sequence.value[expectedIdx];
    if (idx === expected) {
        // 正确
        sfxFireworkBoom();
        playerInput.value.push(idx);
        correctFlash.value = idx;
        activeFirework.value = idx;
        setTimeout(() => {
            correctFlash.value = -1;
            activeFirework.value = -1;
        }, 300);
        if (playerInput.value.length === sequence.value.length) {
            // 本轮全部正确
            if (recallTimer)
                clearInterval(recallTimer);
            recallTimer = null;
            completedRounds.value++;
            score.value += 150;
            roundResults.value[round.value] = true;
            sfxMiniPerfect();
            phase.value = 'round_success';
            phaseTimeout = setTimeout(() => {
                round.value++;
                if (round.value >= 5) {
                    score.value += 200; // 全通奖励
                    sfxRankFirst();
                    phase.value = 'finished';
                }
                else {
                    startRound();
                }
            }, 1000);
        }
    }
    else {
        // 错误
        sfxMiniFail();
        wrongFlash.value = idx;
        setTimeout(() => {
            wrongFlash.value = -1;
        }, 400);
        if (recallTimer)
            clearInterval(recallTimer);
        recallTimer = null;
        roundResults.value[round.value] = false;
        phase.value = 'round_fail';
        phaseTimeout = setTimeout(() => {
            phase.value = 'finished';
        }, 1200);
    }
};
const handleClaim = () => {
    sfxRewardClaim();
    emit('complete', score.value);
};
onUnmounted(() => {
    if (showTimeout)
        clearTimeout(showTimeout);
    if (phaseTimeout)
        clearTimeout(phaseTimeout);
    if (recallTimer)
        clearInterval(recallTimer);
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
/** @ts-ignore @type { | typeof __VLS_components.Sparkles} */
Sparkles;
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
else if (__VLS_ctx.phase !== 'finished') {
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
    (__VLS_ctx.round + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.score);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1.5 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    for (const [i] of __VLS_vFor((5))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.roundDotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, round, score, roundDotClass,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center mb-3 py-1 border border-accent/10" },
        ...{ class: ({
                'text-accent': __VLS_ctx.phase === 'watching',
                'text-success': __VLS_ctx.phase === 'repeating',
                'text-danger': __VLS_ctx.phase === 'round_fail'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    (__VLS_ctx.phaseText);
    if (__VLS_ctx.phase === 'repeating') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.playerInput.length);
        (__VLS_ctx.sequence.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.recallTimeLeft <= 3 ? 'text-danger time-pulse' : 'text-accent') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.recallTimeLeft);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "h-1 bg-bg border border-accent/20" },
        });
        /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "h-full transition-all duration-1000 ease-linear" },
            ...{ class: (__VLS_ctx.recallTimeLeft <= 3 ? 'bg-danger/60' : 'bg-accent/60') },
            ...{ style: ({ width: `${(__VLS_ctx.recallTimeLeft / __VLS_ctx.recallTimeLimit) * 100}%` }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['duration-1000']} */ ;
        /** @type {__VLS_StyleScopedClasses['ease-linear']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 gap-2 mb-4 p-2 night-sky border border-accent/10" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['night-sky']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    for (const [i] of __VLS_vFor((6))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.phase === 'ready'))
                        throw 0;
                    if (!(__VLS_ctx.phase !== 'finished'))
                        throw 0;
                    return __VLS_ctx.clickPad(i - 1);
                    // @ts-ignore
                    [phase, phase, phase, phase, phaseText, playerInput, sequence, recallTimeLeft, recallTimeLeft, recallTimeLeft, recallTimeLeft, recallTimeLimit, clickPad,];
                } },
            key: (i),
            ...{ class: "h-16 border relative overflow-hidden flex items-center justify-center transition-all duration-100" },
            ...{ class: ({
                    'border-accent/30 hover:border-accent/60': __VLS_ctx.phase === 'repeating',
                    'border-accent/10': __VLS_ctx.phase !== 'repeating',
                    'pointer-events-none': __VLS_ctx.phase !== 'repeating'
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['duration-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-accent/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
        if (__VLS_ctx.activeFirework === i - 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "firework-bloom absolute inset-0 flex items-center justify-center" },
            });
            /** @type {__VLS_StyleScopedClasses['firework-bloom']} */ ;
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "firework-particle" },
                ...{ style: ({ '--fw-color': __VLS_ctx.fireworkColors[i - 1] }) },
            });
            /** @type {__VLS_StyleScopedClasses['firework-particle']} */ ;
            let __VLS_13;
            /** @ts-ignore @type { | typeof __VLS_components.Sparkle} */
            Sparkle;
            // @ts-ignore
            const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
                size: (18),
            }));
            const __VLS_15 = __VLS_14({
                size: (18),
            }, ...__VLS_functionalComponentArgsRest(__VLS_14));
            let __VLS_18;
            /** @ts-ignore @type { | typeof __VLS_components.Asterisk} */
            Asterisk;
            // @ts-ignore
            const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
                size: (10),
                ...{ class: "particle p1" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }));
            const __VLS_20 = __VLS_19({
                size: (10),
                ...{ class: "particle p1" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_19));
            /** @type {__VLS_StyleScopedClasses['particle']} */ ;
            /** @type {__VLS_StyleScopedClasses['p1']} */ ;
            let __VLS_23;
            /** @ts-ignore @type { | typeof __VLS_components.Asterisk} */
            Asterisk;
            // @ts-ignore
            const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
                size: (10),
                ...{ class: "particle p2" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }));
            const __VLS_25 = __VLS_24({
                size: (10),
                ...{ class: "particle p2" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_24));
            /** @type {__VLS_StyleScopedClasses['particle']} */ ;
            /** @type {__VLS_StyleScopedClasses['p2']} */ ;
            let __VLS_28;
            /** @ts-ignore @type { | typeof __VLS_components.Asterisk} */
            Asterisk;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
                size: (10),
                ...{ class: "particle p3" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }));
            const __VLS_30 = __VLS_29({
                size: (10),
                ...{ class: "particle p3" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            /** @type {__VLS_StyleScopedClasses['particle']} */ ;
            /** @type {__VLS_StyleScopedClasses['p3']} */ ;
            let __VLS_33;
            /** @ts-ignore @type { | typeof __VLS_components.Asterisk} */
            Asterisk;
            // @ts-ignore
            const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
                size: (10),
                ...{ class: "particle p4" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }));
            const __VLS_35 = __VLS_34({
                size: (10),
                ...{ class: "particle p4" },
                ...{ style: ({ color: __VLS_ctx.fireworkColors[i - 1] }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_34));
            /** @type {__VLS_StyleScopedClasses['particle']} */ ;
            /** @type {__VLS_StyleScopedClasses['p4']} */ ;
        }
        if (__VLS_ctx.correctFlash === i - 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "correct-bloom absolute inset-0 bg-success/20" },
            });
            /** @type {__VLS_StyleScopedClasses['correct-bloom']} */ ;
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-success/20']} */ ;
        }
        if (__VLS_ctx.wrongFlash === i - 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "wrong-flash-bg absolute inset-0 bg-danger/20" },
            });
            /** @type {__VLS_StyleScopedClasses['wrong-flash-bg']} */ ;
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-danger/20']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs relative z-10" },
            ...{ class: (__VLS_ctx.phase === 'repeating' ? 'text-accent/50' : 'text-accent/20') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-10']} */ ;
        (i);
        // @ts-ignore
        [phase, phase, phase, phase, activeFirework, fireworkColors, fireworkColors, fireworkColors, fireworkColors, fireworkColors, correctFlash, wrongFlash,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1.5 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [i] of __VLS_vFor((5))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.roundDotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [roundDotClass,];
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
        ...{ class: "text-xs mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    (__VLS_ctx.completedRounds);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.score);
    if (__VLS_ctx.completedRounds === 5) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent finish-flash" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['finish-flash']} */ ;
    }
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
    [score, completedRounds, completedRounds, handleClaim,];
    var __VLS_41;
    var __VLS_42;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
