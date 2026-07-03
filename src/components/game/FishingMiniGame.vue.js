/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, onMounted, onUnmounted } from 'vue';
import { ArrowUp, Fish } from 'lucide-vue-next';
const props = defineProps();
const emit = defineEmits();
const CONTAINER_HEIGHT = 250;
const FISH_HEIGHT = 25;
// Reactive game state (drives template)
const fishPos = ref(CONTAINER_HEIGHT / 2 - FISH_HEIGHT / 2);
const hookPos = ref(0);
const score = ref(0);
const timeLeft = ref(props.timeLimit);
const isHolding = ref(false);
const isOverlap = ref(false);
const gameActive = ref(false);
// Internal tracking (non-reactive for performance)
let isPerfect = true;
let peakScore = 0;
let fishVelocity = 0;
let targetDirection = 0;
let animationId = 0;
let startTime = 0;
const startHold = () => {
    isHolding.value = true;
};
const stopHold = () => {
    isHolding.value = false;
};
const handleKeyDown = (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        isHolding.value = true;
    }
};
const handleKeyUp = (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        isHolding.value = false;
    }
};
const endGame = (rating) => {
    gameActive.value = false;
    cancelAnimationFrame(animationId);
    emit('complete', {
        rating,
        score: score.value,
        perfect: isPerfect && rating === 'perfect'
    });
};
const gameLoop = (timestamp) => {
    if (!gameActive.value)
        return;
    // Timer
    const elapsed = (timestamp - startTime) / 1000;
    timeLeft.value = Math.max(props.timeLimit - elapsed, 0);
    // 1. Update hook position
    if (isHolding.value) {
        hookPos.value = Math.min(hookPos.value + props.liftSpeed, CONTAINER_HEIGHT - props.hookHeight);
    }
    else {
        hookPos.value = Math.max(hookPos.value - props.gravity, 0);
    }
    // 2. Update fish position
    if (Math.random() < props.fishChangeDir) {
        targetDirection = (Math.random() - 0.5) * props.fishSpeed * 2;
    }
    fishVelocity += (targetDirection - fishVelocity) * 0.05;
    fishPos.value += fishVelocity;
    const maxFishPos = CONTAINER_HEIGHT - FISH_HEIGHT;
    if (fishPos.value <= 0) {
        fishPos.value = 0;
        targetDirection = Math.abs(targetDirection);
        fishVelocity = Math.abs(fishVelocity) * 0.5;
    }
    if (fishPos.value >= maxFishPos) {
        fishPos.value = maxFishPos;
        targetDirection = -Math.abs(targetDirection);
        fishVelocity = -Math.abs(fishVelocity) * 0.5;
    }
    // 3. Overlap detection
    // Hook is positioned from bottom: CSS bottom = hookPos
    // So hook occupies Y range: (CONTAINER_HEIGHT - hookPos - hookHeight) to (CONTAINER_HEIGHT - hookPos)
    // Fish is positioned from top: CSS top = fishPos
    // So fish occupies Y range: fishPos to (fishPos + FISH_HEIGHT)
    const hookTop = CONTAINER_HEIGHT - hookPos.value - props.hookHeight;
    const hookBottom = CONTAINER_HEIGHT - hookPos.value;
    const fishTop = fishPos.value;
    const fishBottom = fishPos.value + FISH_HEIGHT;
    isOverlap.value = !(hookBottom <= fishTop || hookTop >= fishBottom);
    // 4. Update score
    if (isOverlap.value) {
        score.value = Math.min(score.value + props.scoreGain, 100);
    }
    else {
        score.value = Math.max(score.value - props.scoreLoss, 0);
        if (score.value < peakScore)
            isPerfect = false;
    }
    peakScore = Math.max(peakScore, score.value);
    // 5. Check win (progress reaches 100%)
    if (score.value >= 100) {
        endGame(isPerfect ? 'perfect' : 'excellent');
        return;
    }
    // 6. Check timeout
    if (timeLeft.value <= 0) {
        endGame(score.value >= 60 ? 'good' : 'poor');
        return;
    }
    animationId = requestAnimationFrame(gameLoop);
};
const startGame = () => {
    gameActive.value = true;
    startTime = performance.now();
    fishPos.value = CONTAINER_HEIGHT / 2 - FISH_HEIGHT / 2;
    hookPos.value = 0;
    score.value = 0;
    timeLeft.value = props.timeLimit;
    isPerfect = true;
    peakScore = 0;
    fishVelocity = 0;
    targetDirection = (Math.random() - 0.5) * props.fishSpeed;
    animationId = requestAnimationFrame(gameLoop);
};
onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    startGame();
});
onUnmounted(() => {
    gameActive.value = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-accent mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Fish} */
Fish;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
    ...{ class: "inline" },
}));
const __VLS_2 = __VLS_1({
    size: (14),
    ...{ class: "inline" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['inline']} */ ;
(__VLS_ctx.fishName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex space-x-2 items-end justify-center" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
/** @type {__VLS_StyleScopedClasses['items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "w-3 bg-bg border border-accent/30 rounded-xs relative overflow-hidden" },
    ...{ style: ({ height: __VLS_ctx.CONTAINER_HEIGHT + 'px' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['w-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "absolute bottom-0 w-full bg-success rounded-[1px]" },
    ...{ style: ({ height: __VLS_ctx.score + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[1px]']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onMousedown: (__VLS_ctx.startHold) },
    ...{ onMouseup: (__VLS_ctx.stopHold) },
    ...{ onMouseleave: (__VLS_ctx.stopHold) },
    ...{ onTouchstart: (__VLS_ctx.startHold) },
    ...{ onTouchend: (__VLS_ctx.stopHold) },
    ...{ class: "w-10 bg-water/20 border border-accent/30 rounded-xs relative overflow-hidden select-none" },
    ...{ style: ({ height: __VLS_ctx.CONTAINER_HEIGHT + 'px' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-water/20']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['select-none']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "absolute w-full rounded-[1px]" },
    ...{ class: (__VLS_ctx.isOverlap ? 'bg-success/80' : 'bg-success/40') },
    ...{ style: ({ top: __VLS_ctx.CONTAINER_HEIGHT - __VLS_ctx.hookPos - __VLS_ctx.hookHeight + 'px', height: __VLS_ctx.hookHeight + 'px' }) },
});
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[1px]']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "absolute w-full bg-accent/60 rounded-[1px]" },
    ...{ style: ({ top: __VLS_ctx.fishPos + 'px', height: __VLS_ctx.FISH_HEIGHT + 'px' }) },
});
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-accent/60']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[1px]']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-xs text-muted w-8 text-center" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
(Math.ceil(__VLS_ctx.timeLeft));
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(Math.round(__VLS_ctx.score));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex space-x-2 mt-3 justify-center" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onMousedown: (__VLS_ctx.startHold) },
    ...{ onMouseup: (__VLS_ctx.stopHold) },
    ...{ onMouseleave: (__VLS_ctx.stopHold) },
    ...{ onTouchstart: (__VLS_ctx.startHold) },
    ...{ onTouchend: (__VLS_ctx.stopHold) },
    ...{ class: "btn text-xs flex-1" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.ArrowUp} */
ArrowUp;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    size: (14),
}));
const __VLS_7 = __VLS_6({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted text-center mt-1" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
// @ts-ignore
[fishName, CONTAINER_HEIGHT, CONTAINER_HEIGHT, CONTAINER_HEIGHT, score, score, startHold, startHold, startHold, startHold, stopHold, stopHold, stopHold, stopHold, stopHold, stopHold, isOverlap, hookPos, hookHeight, hookHeight, fishPos, FISH_HEIGHT, timeLeft,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
