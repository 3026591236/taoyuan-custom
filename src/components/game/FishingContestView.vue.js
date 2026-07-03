/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onUnmounted } from 'vue';
import { Fish, ArrowUp, Waves } from 'lucide-vue-next';
import { sfxGameStart, sfxCastLine, sfxFishBite, sfxMiniPerfect, sfxMiniGood, sfxMiniPoor, sfxMiniFail, sfxRankFirst, sfxRankSecond, sfxRankThird, sfxRankLose } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
/** 鱼的三个等级池 */
const FISH_TIERS = {
    perfect: [
        { name: '锦鲤', minW: 2.0, maxW: 5.0, baseScore: 50 },
        { name: '桂花鱼', minW: 1.5, maxW: 4.0, baseScore: 45 },
        { name: '鲟鱼', minW: 3.0, maxW: 8.0, baseScore: 55 }
    ],
    good: [
        { name: '鲈鱼', minW: 1.5, maxW: 4.0, baseScore: 30 },
        { name: '鲶鱼', minW: 2.0, maxW: 5.0, baseScore: 25 },
        { name: '鲤鱼', minW: 1.0, maxW: 3.5, baseScore: 20 }
    ],
    poor: [
        { name: '鲫鱼', minW: 0.5, maxW: 2.0, baseScore: 8 },
        { name: '草鱼', minW: 1.0, maxW: 3.0, baseScore: 12 }
    ]
};
const phase = ref('ready');
const currentRound = ref(1);
const catches = ref([]);
const rankings = ref([]);
const lastGrade = ref('poor');
// 张力游戏状态
const tensionPct = ref(0);
const fishVisualX = ref(40);
const fishVisualY = ref(40);
let tensionTimer = null;
let fishMoveTimer = null;
let phaseTimeout = null;
const playerTotal = computed(() => catches.value.reduce((sum, c) => sum + c.score, 0));
const playerRank = computed(() => {
    const idx = rankings.value.findIndex(e => e.name === '你');
    return idx === -1 ? 99 : idx + 1;
});
const gradeText = computed(() => {
    switch (lastGrade.value) {
        case 'perfect':
            return '完美收竿！大鱼上钩！';
        case 'good':
            return '不错的收获！';
        case 'poor':
            return '鱼太小了…';
        case 'escaped':
            return '鱼线断了！';
    }
});
const resultAnimClass = computed(() => {
    switch (lastGrade.value) {
        case 'perfect':
            return 'catch-perfect';
        case 'good':
            return 'catch-good';
        default:
            return 'catch-poor';
    }
});
/** 根据等级随机生成一条鱼 */
const randomFish = (grade) => {
    const pool = FISH_TIERS[grade];
    const fish = pool[Math.floor(Math.random() * pool.length)];
    const weight = +(fish.minW + Math.random() * (fish.maxW - fish.minW)).toFixed(1);
    // 权重乘数封顶1.8，避免极端高分
    const weightMult = Math.min(1.8, weight / fish.minW);
    const score = Math.round(fish.baseScore * weightMult);
    return { name: fish.name, weight, score };
};
const castLine = () => {
    if (currentRound.value === 1)
        sfxGameStart();
    sfxCastLine();
    phase.value = 'casting';
    phaseTimeout = setTimeout(() => {
        phase.value = 'waiting';
        // 1-3秒后鱼上钩
        const waitTime = 1000 + Math.random() * 2000;
        phaseTimeout = setTimeout(() => {
            startTension();
        }, waitTime);
    }, 800);
};
const startTension = () => {
    sfxFishBite();
    phase.value = 'tension';
    tensionPct.value = 0;
    fishVisualX.value = 30 + Math.random() * 40;
    fishVisualY.value = 20 + Math.random() * 60;
    // 张力上升速度随轮次大幅增加
    const baseSpeed = [1.2, 1.8, 2.6][currentRound.value - 1] ?? 1.2;
    let tickCount = 0;
    tensionTimer = setInterval(() => {
        tickCount++;
        // 大幅随机波动模拟鱼的挣扎（偏正向）
        const fluctuation = (Math.random() - 0.25) * 0.8;
        let speed = Math.max(0.3, baseSpeed + fluctuation);
        // 随机张力突刺：每隔一段时间可能出现突然的张力飙升
        if (tickCount % 20 === 0 && Math.random() < 0.4) {
            speed += 2.0 + Math.random() * 2.0;
        }
        tensionPct.value = Math.min(100, tensionPct.value + speed);
        if (tensionPct.value >= 100) {
            stopTimers();
            lastGrade.value = 'escaped';
            phase.value = 'round_result';
            advanceRound();
        }
    }, 50);
    // 鱼的视觉移动
    fishMoveTimer = setInterval(() => {
        fishVisualX.value = Math.max(5, Math.min(75, fishVisualX.value + (Math.random() - 0.5) * 15));
        fishVisualY.value = Math.max(5, Math.min(75, fishVisualY.value + (Math.random() - 0.5) * 15));
    }, 200);
};
const pullRod = () => {
    if (phase.value !== 'tension')
        return;
    stopTimers();
    const pct = tensionPct.value;
    let grade;
    if (pct >= 60 && pct <= 72) {
        grade = 'perfect';
    }
    else if ((pct >= 40 && pct < 60) || (pct > 72 && pct <= 85)) {
        grade = 'good';
    }
    else if (pct > 85) {
        grade = 'escaped';
    }
    else {
        grade = 'poor';
    }
    lastGrade.value = grade;
    // 按等级播放不同音效
    if (grade === 'perfect')
        sfxMiniPerfect();
    else if (grade === 'good')
        sfxMiniGood();
    else if (grade === 'poor')
        sfxMiniPoor();
    else
        sfxMiniFail();
    if (grade !== 'escaped') {
        const fishGrade = grade === 'perfect' ? 'perfect' : grade === 'good' ? 'good' : 'poor';
        const fish = randomFish(fishGrade);
        catches.value.push(fish);
    }
    phase.value = 'round_result';
    advanceRound();
};
const advanceRound = () => {
    phaseTimeout = setTimeout(() => {
        if (currentRound.value >= 3) {
            finishContest();
        }
        else {
            currentRound.value++;
            phase.value = 'ready';
        }
    }, 1800);
};
const finishContest = () => {
    // 每个NPC有不同实力：秋月是高手，陈伯经验丰富，小满运气型
    const npcProfiles = [
        { name: '秋月', perfectRate: 0.55, goodRate: 0.9 },
        { name: '陈伯', perfectRate: 0.45, goodRate: 0.85 },
        { name: '小满', perfectRate: 0.35, goodRate: 0.8 }
    ];
    const npcScores = npcProfiles.map(({ name, perfectRate, goodRate }) => {
        let total = 0;
        for (let i = 0; i < 3; i++) {
            const r = Math.random();
            const grade = r < perfectRate ? 'perfect' : r < goodRate ? 'good' : 'poor';
            total += randomFish(grade).score;
        }
        // NPC额外基础分加成（模拟NPC稳定发挥）
        total += 15 + Math.floor(Math.random() * 20);
        return { name, score: total };
    });
    const player = { name: '你', score: playerTotal.value };
    const all = [...npcScores, player];
    all.sort((a, b) => b.score - a.score);
    rankings.value = all;
    phase.value = 'finished';
};
const stopTimers = () => {
    if (tensionTimer)
        clearInterval(tensionTimer);
    if (fishMoveTimer)
        clearInterval(fishMoveTimer);
    tensionTimer = null;
    fishMoveTimer = null;
};
const handleClaim = () => {
    const rank = playerRank.value;
    if (rank === 1)
        sfxRankFirst();
    else if (rank === 2)
        sfxRankSecond();
    else if (rank === 3)
        sfxRankThird();
    else
        sfxRankLose();
    const prizes = { 1: 500, 2: 200, 3: 100 };
    emit('complete', prizes[playerRank.value] ?? 0);
};
onUnmounted(() => {
    stopTimers();
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
/** @ts-ignore @type { | typeof __VLS_components.Fish} */
Fish;
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
    if (__VLS_ctx.catches.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 p-2 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        for (const [c, i] of __VLS_vFor((__VLS_ctx.catches))) {
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
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (c.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (c.weight);
            (c.score);
            // @ts-ignore
            [phase, catches, catches,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between text-xs mt-1.5 pt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.playerTotal);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.currentRound);
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
        onClick: (__VLS_ctx.castLine),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_12 } = __VLS_8.slots;
    // @ts-ignore
    [playerTotal, currentRound, castLine,];
    var __VLS_8;
    var __VLS_9;
}
else if (__VLS_ctx.phase === 'casting') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center py-8" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cast-anim" },
    });
    /** @type {__VLS_StyleScopedClasses['cast-anim']} */ ;
    let __VLS_13;
    /** @ts-ignore @type { | typeof __VLS_components.Fish} */
    Fish;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        size: (28),
        ...{ class: "text-accent" },
    }));
    const __VLS_15 = __VLS_14({
        size: (28),
        ...{ class: "text-accent" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
}
else if (__VLS_ctx.phase === 'waiting') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center py-6" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "float-bob mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['float-bob']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_18;
    /** @ts-ignore @type { | typeof __VLS_components.Waves} */
    Waves;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        size: (28),
        ...{ class: "text-accent/50" },
    }));
    const __VLS_20 = __VLS_19({
        size: (28),
        ...{ class: "text-accent/50" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    /** @type {__VLS_StyleScopedClasses['text-accent/50']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-1.5 mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "w-1.5 h-1.5 bg-accent/40 dot-loading" },
    });
    /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['dot-loading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "w-1.5 h-1.5 bg-accent/40 dot-loading" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['dot-loading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "w-1.5 h-1.5 bg-accent/40 dot-loading" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['dot-loading']} */ ;
}
else if (__VLS_ctx.phase === 'tension') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center mb-2 text-accent bite-flash" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['bite-flash']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-3 items-stretch mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-stretch']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "w-8 h-44 bg-bg border border-accent/30 relative overflow-hidden shrink-0" },
    });
    /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-44']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute left-0 right-0 bg-success/15 border-y border-success/30" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-success/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-y']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-success/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute left-0 right-0 bg-danger/15 border-b border-danger/30" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-danger/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute bottom-0 left-0 right-0 transition-none" },
        ...{ class: (__VLS_ctx.tensionPct > 85 ? 'bg-danger/70' : __VLS_ctx.tensionPct >= 55 ? 'bg-success/60' : 'bg-accent/40') },
        ...{ style: ({ height: `${__VLS_ctx.tensionPct}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-none']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "absolute text-center w-full" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "absolute text-center w-full" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 h-44 bg-bg border border-accent/20 relative overflow-hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-44']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute inset-0 opacity-10 water-ripple" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['opacity-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['water-ripple']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute transition-none" },
        ...{ style: ({ top: `${__VLS_ctx.fishVisualY}%`, left: `${__VLS_ctx.fishVisualX}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-none']} */ ;
    let __VLS_23;
    /** @ts-ignore @type { | typeof __VLS_components.Fish} */
    Fish;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
        size: (18),
        ...{ class: "text-accent fish-thrash" },
    }));
    const __VLS_25 = __VLS_24({
        size: (18),
        ...{ class: "text-accent fish-thrash" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['fish-thrash']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "absolute bottom-0.5 right-1 text-muted" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.currentRound);
    const __VLS_28 = Button || Button;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
        ...{ 'onClick': {} },
        ...{ class: "w-full py-2.5" },
        icon: (__VLS_ctx.ArrowUp),
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onClick': {} },
        ...{ class: "w-full py-2.5" },
        icon: (__VLS_ctx.ArrowUp),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_33;
    const __VLS_34 = {
        /** @type {typeof __VLS_33.click} */
        onClick: (__VLS_ctx.pullRod),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
    const { default: __VLS_35 } = __VLS_31.slots;
    // @ts-ignore
    [phase, phase, phase, currentRound, tensionPct, tensionPct, tensionPct, fishVisualY, fishVisualX, ArrowUp, pullRod,];
    var __VLS_31;
    var __VLS_32;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted text-center mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
else if (__VLS_ctx.phase === 'round_result') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center py-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: (__VLS_ctx.resultAnimClass) },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-1" },
        ...{ class: ({
                'text-accent': __VLS_ctx.lastGrade === 'perfect',
                'text-success': __VLS_ctx.lastGrade === 'good',
                'text-danger': __VLS_ctx.lastGrade === 'escaped',
                'text-muted': __VLS_ctx.lastGrade === 'poor'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.gradeText);
    if (__VLS_ctx.lastGrade !== 'escaped') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-accent text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.catches[__VLS_ctx.catches.length - 1]?.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.catches[__VLS_ctx.catches.length - 1]?.weight);
        (__VLS_ctx.catches[__VLS_ctx.catches.length - 1]?.score);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
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
        ...{ class: "border border-accent/20 p-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    for (const [entry, i] of __VLS_vFor((__VLS_ctx.rankings))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (entry.name),
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "mr-2" },
            ...{ class: ({ 'text-accent': i === 0, 'text-success': entry.name === '你' }) },
        });
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (i + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: ({ 'text-success': entry.name === '你' }) },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
        (entry.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (entry.score);
        // @ts-ignore
        [phase, catches, catches, catches, catches, catches, catches, resultAnimClass, lastGrade, lastGrade, lastGrade, lastGrade, lastGrade, gradeText, rankings,];
    }
    if (__VLS_ctx.catches.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 p-2 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        for (const [c, i] of __VLS_vFor((__VLS_ctx.catches))) {
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
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (c.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (c.weight);
            (c.score);
            // @ts-ignore
            [catches, catches,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3 text-xs text-center border border-accent/20 p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    if (__VLS_ctx.playerRank === 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    }
    else if (__VLS_ctx.playerRank === 2) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    else if (__VLS_ctx.playerRank === 3) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-success" },
        });
        /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    }
    const __VLS_36 = Button || Button;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_41;
    const __VLS_42 = {
        /** @type {typeof __VLS_41.click} */
        onClick: (__VLS_ctx.handleClaim),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_43 } = __VLS_39.slots;
    // @ts-ignore
    [playerRank, playerRank, playerRank, handleClaim,];
    var __VLS_39;
    var __VLS_40;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
