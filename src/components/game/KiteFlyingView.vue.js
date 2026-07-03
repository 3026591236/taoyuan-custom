/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onUnmounted } from 'vue';
import { Wind, ArrowLeft, ArrowRight } from 'lucide-vue-next';
import { sfxGameStart, sfxRewardClaim, sfxCountdownTick, sfxCountdownFinal, sfxKitePull, sfxWindGust, sfxRankFirst, sfxRankSecond, sfxRankThird } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
const phase = ref('ready');
const score = ref(0);
const kitePosition = ref(50); // 0-100, 50=中心
const timeLeft = ref(25);
const windDirection = ref(1); // 1=右, -1=左
const windStrength = ref(1);
const combo = ref(0);
const maxCombo = ref(0);
const windLabel = ref('微风');
/** 风筝速度（单位：%/秒），正=向右，负=向左 */
let kiteVelocity = 0;
let rafId = null;
let lastFrameTime = 0;
let scoreTick = 0; // 累计安全区时间（秒），每0.5秒得分
let countdownTimer = null;
let windChangeTimer = null;
const inSafeZone = computed(() => kitePosition.value >= 32 && kitePosition.value <= 68);
const prize = computed(() => {
    if (score.value >= 200)
        return 800;
    if (score.value >= 120)
        return 500;
    if (score.value >= 60)
        return 200;
    return 50;
});
/** requestAnimationFrame 主循环 */
const gameLoop = (timestamp) => {
    if (phase.value !== 'playing')
        return;
    const dt = lastFrameTime === 0 ? 0.016 : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;
    // 风力作为持续加速度（单位：%/秒²）
    const windAccel = windDirection.value * windStrength.value * 22;
    kiteVelocity += windAccel * dt;
    // 随机阵风：突然的额外冲量，让风筝难以预测
    if (Math.random() < dt * 1.5) {
        const gustForce = (Math.random() - 0.4) * windStrength.value * 18;
        kiteVelocity += gustForce;
    }
    // 阻尼：速度自然衰减，使风筝不会无限加速
    kiteVelocity *= Math.pow(0.95, dt * 60);
    // 更新位置
    kitePosition.value += kiteVelocity * dt;
    // 边界弹回
    if (kitePosition.value <= 0) {
        kitePosition.value = 0;
        kiteVelocity = Math.abs(kiteVelocity) * 0.3;
    }
    else if (kitePosition.value >= 100) {
        kitePosition.value = 100;
        kiteVelocity = -Math.abs(kiteVelocity) * 0.3;
    }
    // 在安全区内得分
    if (inSafeZone.value) {
        combo.value++;
        if (combo.value > maxCombo.value)
            maxCombo.value = combo.value;
        scoreTick += dt;
        if (scoreTick >= 0.5) {
            scoreTick -= 0.5;
            const comboBonus = Math.min(Math.floor(combo.value / 60), 2);
            score.value += 1 + comboBonus;
        }
    }
    else {
        combo.value = 0;
        scoreTick = 0;
    }
    rafId = requestAnimationFrame(gameLoop);
};
const startGame = () => {
    sfxGameStart();
    score.value = 0;
    kitePosition.value = 50;
    kiteVelocity = 0;
    timeLeft.value = 25;
    windDirection.value = Math.random() > 0.5 ? 1 : -1;
    windStrength.value = 1.0;
    windLabel.value = '微风';
    combo.value = 0;
    maxCombo.value = 0;
    scoreTick = 0;
    lastFrameTime = 0;
    phase.value = 'playing';
    // 启动 RAF 主循环
    rafId = requestAnimationFrame(gameLoop);
    // 倒计时
    countdownTimer = setInterval(() => {
        timeLeft.value--;
        if (timeLeft.value <= 3 && timeLeft.value > 0)
            sfxCountdownFinal();
        else if (timeLeft.value > 3)
            sfxCountdownTick();
        if (timeLeft.value <= 0) {
            endGame();
        }
    }, 1000);
    // 风向/风力变化
    scheduleWindChange();
};
const scheduleWindChange = () => {
    const delay = 2000 + Math.random() * 1500;
    windChangeTimer = setTimeout(() => {
        if (phase.value !== 'playing')
            return;
        // 可能换方向（后期更频繁换向）
        const elapsed = 25 - timeLeft.value;
        const flipChance = 0.35 + elapsed * 0.01;
        if (Math.random() < flipChance) {
            windDirection.value *= -1;
            sfxWindGust();
        }
        // 风力变化，随时间增强
        const minStrength = 1.0 + elapsed * 0.1;
        const maxStrength = 2.0 + elapsed * 0.15;
        windStrength.value = minStrength + Math.random() * (maxStrength - minStrength);
        if (windStrength.value < 2)
            windLabel.value = '微风';
        else if (windStrength.value < 3.5)
            windLabel.value = '清风';
        else
            windLabel.value = '强风';
        scheduleWindChange();
    }, delay);
};
/** 拉左：施加一个向左的冲量 */
const pullLeft = () => {
    if (phase.value !== 'playing')
        return;
    sfxKitePull();
    kiteVelocity -= 42;
};
/** 拉右：施加一个向右的冲量 */
const pullRight = () => {
    if (phase.value !== 'playing')
        return;
    sfxKitePull();
    kiteVelocity += 42;
};
const endGame = () => {
    if (rafId !== null)
        cancelAnimationFrame(rafId);
    if (countdownTimer)
        clearInterval(countdownTimer);
    if (windChangeTimer)
        clearTimeout(windChangeTimer);
    rafId = null;
    countdownTimer = null;
    windChangeTimer = null;
    phase.value = 'finished';
    // 结算音效
    if (score.value >= 200)
        sfxRankFirst();
    else if (score.value >= 120)
        sfxRankSecond();
    else
        sfxRankThird();
};
const handleClaim = () => {
    sfxRewardClaim();
    emit('complete', prize.value);
};
onUnmounted(() => {
    if (rafId !== null)
        cancelAnimationFrame(rafId);
    if (countdownTimer)
        clearInterval(countdownTimer);
    if (windChangeTimer)
        clearTimeout(windChangeTimer);
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
/** @ts-ignore @type { | typeof __VLS_components.Wind} */
Wind;
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
else if (__VLS_ctx.phase === 'playing') {
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
    (__VLS_ctx.timeLeft);
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
        ...{ class: "text-center mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.windDirection > 0 ? 'text-success' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.windDirection > 0 ? '→ 东风 →' : '← 西风 ←');
    (__VLS_ctx.windLabel);
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
        ...{ class: "absolute top-0 bottom-0 left-[32%] w-[36%] bg-success/10 border-x border-success/30" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-[32%]']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-[36%]']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-success/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-x']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute top-0 bottom-0 left-1/2 w-px bg-accent/20" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-1/2']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-px']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent/20']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute top-1 bottom-1 flex items-center justify-center" },
        ...{ style: ({ left: `calc(${__VLS_ctx.kitePosition}% - 10px)`, transition: 'none' }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-lg" },
        ...{ class: (__VLS_ctx.inSafeZone ? 'kite-float' : 'kite-shake') },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute bottom-0 w-full flex text-center" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "flex-32 text-danger/40" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-32']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "flex-36 text-success/40" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-36']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "flex-32 text-danger/40" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-32']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    const __VLS_13 = Button || Button;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 py-2" },
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_15 = __VLS_14({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 py-2" },
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    let __VLS_18;
    const __VLS_19 = {
        /** @type {typeof __VLS_18.click} */
        onClick: (__VLS_ctx.pullLeft),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    const { default: __VLS_20 } = __VLS_16.slots;
    // @ts-ignore
    [phase, timeLeft, score, windDirection, windDirection, windLabel, kitePosition, inSafeZone, ArrowLeft, pullLeft,];
    var __VLS_16;
    var __VLS_17;
    const __VLS_21 = Button || Button;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 py-2" },
    }));
    const __VLS_23 = __VLS_22({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 py-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    let __VLS_26;
    const __VLS_27 = {
        /** @type {typeof __VLS_26.click} */
        onClick: (__VLS_ctx.pullRight),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    const { default: __VLS_28 } = __VLS_24.slots;
    let __VLS_29;
    /** @ts-ignore @type { | typeof __VLS_components.ArrowRight} */
    ArrowRight;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
        size: (14),
    }));
    const __VLS_31 = __VLS_30({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    // @ts-ignore
    [pullRight,];
    var __VLS_24;
    var __VLS_25;
    if (__VLS_ctx.combo >= 3) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-center mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent combo-pulse" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['combo-pulse']} */ ;
        (__VLS_ctx.combo);
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
        ...{ class: "border border-accent/20 p-2 mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-2" },
        ...{ class: ({
                'text-accent': __VLS_ctx.score >= 200,
                'text-success': __VLS_ctx.score >= 120 && __VLS_ctx.score < 200,
                'text-muted': __VLS_ctx.score < 120
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.score >= 200 ? '御风高手！风筝稳如泰山！' : __VLS_ctx.score >= 120 ? '不错的技巧，风筝飞得很高。' : '风太大了，下次再接再厉。');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (__VLS_ctx.maxCombo);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.score);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.prize);
    const __VLS_34 = Button || Button;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_36 = __VLS_35({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    let __VLS_39;
    const __VLS_40 = {
        /** @type {typeof __VLS_39.click} */
        onClick: (__VLS_ctx.handleClaim),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_41 } = __VLS_37.slots;
    // @ts-ignore
    [score, score, score, score, score, score, score, combo, combo, maxCombo, prize, handleClaim,];
    var __VLS_37;
    var __VLS_38;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
