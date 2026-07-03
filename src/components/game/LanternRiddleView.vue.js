/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, onUnmounted } from 'vue';
import { Lightbulb, Lamp, Timer } from 'lucide-vue-next';
import { sfxGameStart, sfxRewardClaim, sfxCountdownTick, sfxCountdownFinal, sfxRiddleReveal, sfxRiddleWrong, sfxMiniGood, sfxMiniPerfect } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
const emit = defineEmits();
const phase = ref('ready');
const RIDDLE_POOL = [
    // === 传统灯谜 ===
    { question: '有面无口，有脚无手，听人讲话，陪人吃酒。（打一日用品）', options: ['桌子', '椅子', '茶壶', '灯笼'], answer: 0 },
    { question: '千条线，万条线，掉到水里看不见。（打一自然现象）', options: ['风', '雨', '雪', '雾'], answer: 1 },
    { question: '身穿绿衣裳，肚里水汪汪，生的子儿多，个个黑脸膛。（打一水果）', options: ['葡萄', '西瓜', '石榴', '荔枝'], answer: 1 },
    { question: '红公鸡，绿尾巴，身体钻到地底下。（打一蔬菜）', options: ['胡萝卜', '白萝卜', '红薯', '花生'], answer: 0 },
    { question: '弟兄七八个，围着柱子坐，大家一分手，衣服全扯破。（打一食物）', options: ['饺子', '包子', '蒜', '橘子'], answer: 2 },
    { question: '头戴红帽子，身穿白袍子，走路摆架子，说话伸脖子。（打一动物）', options: ['鸡', '鹅', '鹤', '鹦鹉'], answer: 1 },
    { question: '一物三口，有腿无手，谁要没它，难见亲友。（打一服饰）', options: ['帽子', '裤子', '鞋子', '手套'], answer: 1 },
    { question: '小小一姑娘，坐在水中央，身穿粉红袄，阵阵放清香。（打一植物）', options: ['睡莲', '荷花', '菊花', '兰花'], answer: 1 },
    { question: '一个老头，不跑不走，请他睡觉，他就摇头。（打一物品）', options: ['钟摆', '不倒翁', '秋千', '风车'], answer: 1 },
    { question: '有头无颈，有眼无眉，无脚能走，有翅难飞。（打一动物）', options: ['蛇', '鱼', '蚕', '蜗牛'], answer: 1 },
    { question: '驼背公公，力大无穷，爱驮什么？车水马龙。（打一物）', options: ['桥', '路', '船', '车'], answer: 0 },
    { question: '上不怕水，下不怕火，家家厨房，都有一个。（打一厨具）', options: ['菜刀', '锅', '碗', '案板'], answer: 1 },
    // === 中国文化/节日/诗词 ===
    { question: '「但愿人长久，千里共婵娟」中的「婵娟」指什么？', options: ['美人', '月亮', '太阳', '星辰'], answer: 1 },
    { question: '七夕节又叫什么节？', options: ['元宵节', '花朝节', '乞巧节', '上巳节'], answer: 2 },
    { question: '「爆竹声中一岁除」出自哪位诗人？', options: ['李白', '杜甫', '苏轼', '王安石'], answer: 3 },
    { question: '古代「五谷」中不包括以下哪一种？', options: ['稻', '麦', '棉', '黍'], answer: 2 },
    {
        question: '「清明时节雨纷纷」的下一句是？',
        options: ['路上行人欲断魂', '牧童遥指杏花村', '借问酒家何处有', '独在异乡为异客'],
        answer: 0
    },
    { question: '农历五月初五是什么节日？', options: ['中秋节', '重阳节', '端午节', '七夕节'], answer: 2 },
    { question: '「举头望明月」的下一句是？', options: ['疑是地上霜', '低头思故乡', '月是故乡明', '对影成三人'], answer: 1 },
    { question: '古代的「文房四宝」不包括以下哪项？', options: ['笔', '墨', '纸', '尺'], answer: 3 },
    { question: '「春眠不觉晓」的下一句是？', options: ['处处闻啼鸟', '花落知多少', '夜来风雨声', '春风花草香'], answer: 0 },
    { question: '二十四节气中，立春之后是哪个节气？', options: ['惊蛰', '雨水', '春分', '清明'], answer: 1 },
    { question: '古人说「岁寒三友」，指的是哪三种植物？', options: ['梅兰竹', '松竹梅', '兰菊梅', '松兰竹'], answer: 1 },
    { question: '「床前明月光」中的「床」最可能指什么？', options: ['睡床', '井栏', '胡床', '窗台'], answer: 1 },
    { question: '重阳节有什么传统习俗？', options: ['吃汤圆', '登高望远', '放河灯', '踏青'], answer: 1 },
    {
        question: '「人面不知何处去」的下一句是？',
        options: ['桃花依旧笑春风', '春风不度玉门关', '花开花落两由之', '落花时节又逢君'],
        answer: 0
    },
    { question: '端午节吃粽子是为了纪念谁？', options: ['孔子', '屈原', '李白', '诸葛亮'], answer: 1 },
    { question: '「采菊东篱下」的下一句是？', options: ['悠然见南山', '把酒问青天', '独钓寒江雪', '春来江水绿如蓝'], answer: 0 },
    // === 自然/农耕/动物 ===
    {
        question: '圆圆脸儿像苹果，又酸又甜营养多，既能做菜吃，又能当水果。（打一蔬果）',
        options: ['番茄', '苹果', '桃子', '杏子'],
        answer: 0
    },
    { question: '看看圆，摸摸麻，包着一肚小月牙。（打一食物）', options: ['核桃', '花生', '橘子', '石榴'], answer: 2 },
    { question: '白嫩小宝宝，洗澡吹泡泡，洗洗身体小，再洗不见了。（打一日用品）', options: ['毛巾', '肥皂', '牙膏', '香囊'], answer: 1 },
    {
        question: '一根竹管二尺长，开了七个小圆窗，对准一个窗口吹，悠悠乐声传四方。（打一乐器）',
        options: ['箫', '笛子', '埙', '琵琶'],
        answer: 1
    },
    { question: '说它是头牛，不能拉犁走，说它力气小，却能背屋走。（打一动物）', options: ['蜗牛', '犀牛', '水牛', '蚂蚁'], answer: 0 },
    { question: '有翅不是鸟，有腿不会跑，无巢住树上，鸣叫赛百鸟。（打一昆虫）', options: ['蜜蜂', '蝴蝶', '蝉', '蟋蟀'], answer: 2 },
    { question: '两叶花四朵，颜色白又黄，一年开一次，八月放清香。（打一植物）', options: ['兰花', '菊花', '桂花', '荷花'], answer: 2 },
    {
        question: '四四方方一座城，城里住着十万兵，派出将军去攻打，万马奔腾杀敌人。（打一物品）',
        options: ['棋盘', '算盘', '印章', '砚台'],
        answer: 0
    }
];
/** 前2题7秒，后3题6秒 */
const currentTimeLimit = ref(7);
const gameRiddles = ref([]);
const currentIndex = ref(0);
const countdown = ref(7);
const score = ref(0);
const correctCount = ref(0);
const lastCorrect = ref(false);
const answered = ref(false);
const results = ref([null, null, null, null, null]);
let countdownTimer = null;
let phaseTimeout = null;
const currentRiddle = ref(RIDDLE_POOL[0]);
const dotClass = (idx) => {
    const r = results.value[idx];
    if (r === true)
        return 'bg-success';
    if (r === false)
        return 'bg-danger';
    if (idx === currentIndex.value && phase.value !== 'finished')
        return 'bg-accent dot-pulse';
    return 'bg-accent/20';
};
const pickRiddles = () => {
    const pool = [...RIDDLE_POOL];
    const picked = [];
    for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
};
const startGame = () => {
    sfxGameStart();
    gameRiddles.value = pickRiddles();
    currentIndex.value = 0;
    score.value = 0;
    correctCount.value = 0;
    results.value = [null, null, null, null, null];
    showNextRiddle();
};
const showNextRiddle = () => {
    currentRiddle.value = gameRiddles.value[currentIndex.value];
    answered.value = false;
    currentTimeLimit.value = currentIndex.value < 2 ? 7 : 6;
    sfxRiddleReveal();
    phase.value = 'showing';
    phaseTimeout = setTimeout(() => {
        phase.value = 'answering';
        countdown.value = currentTimeLimit.value;
        countdownTimer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 3 && countdown.value > 0)
                sfxCountdownFinal();
            else if (countdown.value > 3)
                sfxCountdownTick();
            if (countdown.value <= 0) {
                answer(-1);
            }
        }, 1000);
    }, 800);
};
const answer = (choice) => {
    if (answered.value)
        return;
    answered.value = true;
    if (countdownTimer)
        clearInterval(countdownTimer);
    countdownTimer = null;
    const correct = choice === currentRiddle.value.answer;
    lastCorrect.value = correct;
    results.value[currentIndex.value] = correct;
    if (correct) {
        sfxMiniGood();
        correctCount.value++;
        score.value += 100;
    }
    else {
        sfxRiddleWrong();
    }
    phase.value = 'result';
    phaseTimeout = setTimeout(() => {
        currentIndex.value++;
        if (currentIndex.value >= 5) {
            if (correctCount.value === 5) {
                score.value += 300;
                sfxMiniPerfect();
            }
            phase.value = 'finished';
        }
        else {
            showNextRiddle();
        }
    }, 1500);
};
const handleClaim = () => {
    sfxRewardClaim();
    emit('complete', score.value);
};
onUnmounted(() => {
    if (countdownTimer)
        clearInterval(countdownTimer);
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
/** @ts-ignore @type { | typeof __VLS_components.Lightbulb} */
Lightbulb;
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
else if (__VLS_ctx.phase === 'showing') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center py-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "lantern-drop mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['lantern-drop']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inline-block border-2 border-accent/50 px-6 py-3" },
    });
    /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    let __VLS_13;
    /** @ts-ignore @type { | typeof __VLS_components.Lamp} */
    Lamp;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        size: (20),
        ...{ class: "text-accent mx-auto mb-1" },
    }));
    const __VLS_15 = __VLS_14({
        size: (20),
        ...{ class: "text-accent mx-auto mb-1" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-accent text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.currentIndex + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-2 mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    for (const [i] of __VLS_vFor((5))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.dotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, currentIndex, dotClass,];
    }
}
else if (__VLS_ctx.phase === 'answering') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
    for (const [i] of __VLS_vFor((5))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            key: (i),
            ...{ class: "w-2 h-2" },
            ...{ class: (__VLS_ctx.dotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, dotClass,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.countdown <= 3 ? 'text-danger time-pulse' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    let __VLS_18;
    /** @ts-ignore @type { | typeof __VLS_components.Timer} */
    Timer;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        size: (12),
        ...{ class: "inline -mt-0.5" },
    }));
    const __VLS_20 = __VLS_19({
        size: (12),
        ...{ class: "inline -mt-0.5" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    /** @type {__VLS_StyleScopedClasses['inline']} */ ;
    /** @type {__VLS_StyleScopedClasses['-mt-0.5']} */ ;
    (__VLS_ctx.countdown);
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
        ...{ class: (__VLS_ctx.countdown <= 3 ? 'bg-danger/60' : 'bg-accent/60') },
        ...{ style: ({ width: `${(__VLS_ctx.countdown / __VLS_ctx.currentTimeLimit) * 100}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    /** @type {__VLS_StyleScopedClasses['duration-1000']} */ ;
    /** @type {__VLS_StyleScopedClasses['ease-linear']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/30 p-3 mb-3 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-text leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    (__VLS_ctx.currentRiddle.question);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    for (const [opt, i] of __VLS_vFor((__VLS_ctx.currentRiddle.options))) {
        const __VLS_23 = Button || Button;
        // @ts-ignore
        const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
            ...{ 'onClick': {} },
            key: (i),
            ...{ class: "text-left w-full" },
            disabled: (__VLS_ctx.answered),
            ...{ class: ({ 'opacity-50': __VLS_ctx.answered }) },
        }));
        const __VLS_25 = __VLS_24({
            ...{ 'onClick': {} },
            key: (i),
            ...{ class: "text-left w-full" },
            disabled: (__VLS_ctx.answered),
            ...{ class: ({ 'opacity-50': __VLS_ctx.answered }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_24));
        let __VLS_28;
        const __VLS_29 = {
            /** @type {typeof __VLS_28.click} */
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.phase === 'ready'))
                    throw 0;
                if (!!(__VLS_ctx.phase === 'showing'))
                    throw 0;
                if (!(__VLS_ctx.phase === 'answering'))
                    throw 0;
                return __VLS_ctx.answer(i);
                // @ts-ignore
                [countdown, countdown, countdown, countdown, currentTimeLimit, currentRiddle, currentRiddle, answered, answered, answer,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-50']} */ ;
        const { default: __VLS_30 } = __VLS_26.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        (['甲', '乙', '丙', '丁'][i]);
        (opt);
        // @ts-ignore
        [];
        var __VLS_26;
        var __VLS_27;
        // @ts-ignore
        [];
    }
}
else if (__VLS_ctx.phase === 'result') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
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
            ...{ class: (__VLS_ctx.dotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [phase, dotClass,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: (__VLS_ctx.lastCorrect ? 'correct-flash' : 'wrong-shake') },
        ...{ class: "mb-3 py-3 border border-accent/20" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm mb-1" },
        ...{ class: (__VLS_ctx.lastCorrect ? 'text-success' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (__VLS_ctx.lastCorrect ? '答对了！+100文' : '答错了…');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.currentRiddle.options[__VLS_ctx.currentRiddle.answer]);
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
            ...{ class: (__VLS_ctx.dotClass(i - 1)) },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        // @ts-ignore
        [dotClass, currentRiddle, currentRiddle, lastCorrect, lastCorrect, lastCorrect, score,];
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
    (__VLS_ctx.correctCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.score);
    if (__VLS_ctx.correctCount === 5) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent finish-flash" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['finish-flash']} */ ;
    }
    const __VLS_31 = Button || Button;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }));
    const __VLS_33 = __VLS_32({
        ...{ 'onClick': {} },
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    let __VLS_36;
    const __VLS_37 = {
        /** @type {typeof __VLS_36.click} */
        onClick: (__VLS_ctx.handleClaim),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    const { default: __VLS_38 } = __VLS_34.slots;
    // @ts-ignore
    [score, correctCount, correctCount, handleClaim,];
    var __VLS_34;
    var __VLS_35;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
