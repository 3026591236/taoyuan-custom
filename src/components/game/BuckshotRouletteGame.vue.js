/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, nextTick, onMounted } from 'vue';
import { BUCKSHOT_BET_AMOUNT, BUCKSHOT_WIN_MULTIPLIER, dealerDecide } from '@/data/hanhai';
import { sfxGunshot, sfxGunEmpty, sfxCasinoWin, sfxCasinoLose } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
const props = defineProps();
const emit = defineEmits();
// 游戏状态
const shells = ref([...props.setup.shells]);
const shellIndex = ref(0);
const playerHP = ref(props.setup.playerHP);
const dealerHP = ref(props.setup.dealerHP);
const maxPlayerHP = props.setup.playerHP;
const maxDealerHP = props.setup.dealerHP;
const playerFirst = Math.random() < 0.5;
const isPlayerTurn = ref(playerFirst);
const gameOver = ref(false);
const won = ref(false);
const draw = ref(false);
const actionLog = ref([]);
const animating = ref(false);
// 受击动画
const playerHit = ref(false);
const dealerHit = ref(false);
const liveRemaining = computed(() => {
    let count = 0;
    for (let i = shellIndex.value; i < shells.value.length; i++) {
        if (shells.value[i] === 'live')
            count++;
    }
    return count;
});
const blankRemaining = computed(() => {
    let count = 0;
    for (let i = shellIndex.value; i < shells.value.length; i++) {
        if (shells.value[i] === 'blank')
            count++;
    }
    return count;
});
const addActionLog = (msg) => {
    actionLog.value.push(msg);
};
const triggerHitAnim = (target) => {
    if (target === 'player') {
        playerHit.value = true;
        setTimeout(() => {
            playerHit.value = false;
        }, 400);
    }
    else {
        dealerHit.value = true;
        setTimeout(() => {
            dealerHit.value = false;
        }, 400);
    }
};
const getCurrentShell = () => {
    if (shellIndex.value >= shells.value.length)
        return null;
    return shells.value[shellIndex.value];
};
const consumeShell = () => {
    shellIndex.value++;
};
const checkGameEnd = () => {
    if (playerHP.value <= 0) {
        gameOver.value = true;
        won.value = false;
        sfxCasinoLose();
        addActionLog('你倒下了……');
        return true;
    }
    if (dealerHP.value <= 0) {
        gameOver.value = true;
        won.value = true;
        sfxCasinoWin();
        addActionLog('庄家倒下了！');
        return true;
    }
    if (shellIndex.value >= shells.value.length) {
        // 弹药用完，比较剩余HP
        if (playerHP.value > dealerHP.value) {
            gameOver.value = true;
            won.value = true;
            sfxCasinoWin();
            addActionLog('弹药用尽，你的生命值更高——你赢了！');
        }
        else if (playerHP.value < dealerHP.value) {
            gameOver.value = true;
            won.value = false;
            sfxCasinoLose();
            addActionLog('弹药用尽，庄家生命值更高——你输了…');
        }
        else {
            // 平局，退还下注
            gameOver.value = true;
            draw.value = true;
            addActionLog('弹药用尽，生命值相同——平局！');
        }
        return true;
    }
    return false;
};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/** 玩家射击对方 */
const shootOpponent = async () => {
    if (animating.value || gameOver.value)
        return;
    animating.value = true;
    const shell = getCurrentShell();
    consumeShell();
    if (shell === 'live') {
        sfxGunshot();
        dealerHP.value = Math.max(0, dealerHP.value - 1);
        triggerHitAnim('dealer');
        addActionLog('你射向庄家——实弹！庄家 -1HP');
    }
    else {
        sfxGunEmpty();
        addActionLog('你射向庄家——空弹，未命中。');
    }
    await nextTick();
    if (!checkGameEnd()) {
        isPlayerTurn.value = false;
        await delay(800);
        animating.value = false;
        void dealerTurn();
    }
    else {
        animating.value = false;
    }
};
/** 玩家射击自己 */
const shootSelf = async () => {
    if (animating.value || gameOver.value)
        return;
    animating.value = true;
    const shell = getCurrentShell();
    consumeShell();
    if (shell === 'blank') {
        sfxGunEmpty();
        addActionLog('你射向自己——空弹！获得额外回合。');
        // 额外回合，不切换
        await delay(400);
        animating.value = false;
        if (checkGameEnd())
            return;
    }
    else {
        sfxGunshot();
        playerHP.value = Math.max(0, playerHP.value - 1);
        triggerHitAnim('player');
        addActionLog('你射向自己——实弹！你 -1HP');
        await nextTick();
        if (!checkGameEnd()) {
            isPlayerTurn.value = false;
            await delay(800);
            animating.value = false;
            void dealerTurn();
        }
        else {
            animating.value = false;
        }
    }
};
/** 庄家回合 */
const dealerTurn = async () => {
    if (gameOver.value)
        return;
    animating.value = true;
    await delay(800);
    if (shellIndex.value >= shells.value.length) {
        checkGameEnd();
        animating.value = false;
        return;
    }
    const decision = dealerDecide(shells.value, shellIndex.value, false);
    const shell = getCurrentShell();
    consumeShell();
    if (decision === 'opponent') {
        // 射玩家
        if (shell === 'live') {
            sfxGunshot();
            playerHP.value = Math.max(0, playerHP.value - 1);
            triggerHitAnim('player');
            addActionLog('庄家射向你——实弹！你 -1HP');
        }
        else {
            sfxGunEmpty();
            addActionLog('庄家射向你——空弹，未命中。');
        }
        await nextTick();
        if (!checkGameEnd()) {
            isPlayerTurn.value = true;
            animating.value = false;
        }
        else {
            animating.value = false;
        }
    }
    else {
        // 射自己
        if (shell === 'blank') {
            sfxGunEmpty();
            addActionLog('庄家射向自己——空弹！庄家获得额外回合。');
            await delay(600);
            if (!checkGameEnd()) {
                await dealerTurn();
            }
            else {
                animating.value = false;
            }
        }
        else {
            sfxGunshot();
            dealerHP.value = Math.max(0, dealerHP.value - 1);
            triggerHitAnim('dealer');
            addActionLog('庄家射向自己——实弹！庄家 -1HP');
            await nextTick();
            if (!checkGameEnd()) {
                isPlayerTurn.value = true;
                animating.value = false;
            }
            else {
                animating.value = false;
            }
        }
    }
};
onMounted(() => {
    if (playerFirst) {
        addActionLog('你先手。');
    }
    else {
        addActionLog('庄家先手。');
        void dealerTurn();
    }
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
    ...{ class: "game-panel max-w-xs w-full" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
const __VLS_0 = Divider;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    title: true,
    ...{ class: "!mb-1" },
    label: "恶魔轮盘",
}));
const __VLS_2 = __VLS_1({
    title: true,
    ...{ class: "!mb-1" },
    label: "恶魔轮盘",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['!mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between text-xs" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
for (const [i] of __VLS_vFor((__VLS_ctx.liveRemaining))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        key: ('l' + i),
        ...{ class: "text-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    // @ts-ignore
    [liveRemaining,];
}
for (const [i] of __VLS_vFor((__VLS_ctx.blankRemaining))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        key: ('b' + i),
        ...{ class: "text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    // @ts-ignore
    [blankRemaining,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted ml-1" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
(__VLS_ctx.liveRemaining);
(__VLS_ctx.blankRemaining);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between text-xs mt-0.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.shellIndex + 1);
(__VLS_ctx.shells.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-3 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex-1" },
});
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between text-xs mb-0.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: (__VLS_ctx.isPlayerTurn && !__VLS_ctx.gameOver ? 'text-accent' : 'text-muted') },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-text" },
});
/** @type {__VLS_StyleScopedClasses['text-text']} */ ;
(__VLS_ctx.playerHP);
(__VLS_ctx.maxPlayerHP);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "h-1.5 bg-panel rounded-full overflow-hidden" },
    ...{ class: ({ 'buckshot-flash-red': __VLS_ctx.playerHit }) },
});
/** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['buckshot-flash-red']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "h-full transition-all duration-300" },
    ...{ class: (__VLS_ctx.playerHP > 2 ? 'bg-success' : __VLS_ctx.playerHP > 1 ? 'bg-accent' : 'bg-danger') },
    ...{ style: ({ width: (__VLS_ctx.playerHP / __VLS_ctx.maxPlayerHP) * 100 + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted/40" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex-1" },
});
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between text-xs mb-0.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: (!__VLS_ctx.isPlayerTurn && !__VLS_ctx.gameOver ? 'text-danger' : 'text-muted') },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-text" },
});
/** @type {__VLS_StyleScopedClasses['text-text']} */ ;
(__VLS_ctx.dealerHP);
(__VLS_ctx.maxDealerHP);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "h-1.5 bg-panel rounded-full overflow-hidden" },
    ...{ class: ({ 'buckshot-flash-red': __VLS_ctx.dealerHit }) },
});
/** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['buckshot-flash-red']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "h-full transition-all duration-300" },
    ...{ class: (__VLS_ctx.dealerHP > 2 ? 'bg-success' : __VLS_ctx.dealerHP > 1 ? 'bg-accent' : 'bg-danger') },
    ...{ style: ({ width: (__VLS_ctx.dealerHP / __VLS_ctx.maxDealerHP) * 100 + '%' }) },
});
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
if (__VLS_ctx.isPlayerTurn && !__VLS_ctx.gameOver) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const __VLS_5 = Button || Button;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.animating),
    }));
    const __VLS_7 = __VLS_6({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.animating),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    let __VLS_10;
    const __VLS_11 = {
        /** @type {typeof __VLS_10.click} */
        onClick: (__VLS_ctx.shootOpponent),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_12 } = __VLS_8.slots;
    // @ts-ignore
    [liveRemaining, blankRemaining, shellIndex, shells, isPlayerTurn, isPlayerTurn, isPlayerTurn, gameOver, gameOver, gameOver, playerHP, playerHP, playerHP, playerHP, maxPlayerHP, maxPlayerHP, playerHit, dealerHP, dealerHP, dealerHP, dealerHP, maxDealerHP, maxDealerHP, dealerHit, animating, shootOpponent,];
    var __VLS_8;
    var __VLS_9;
    const __VLS_13 = Button || Button;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.animating),
    }));
    const __VLS_15 = __VLS_14({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.animating),
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    let __VLS_18;
    const __VLS_19 = {
        /** @type {typeof __VLS_18.click} */
        onClick: (__VLS_ctx.shootSelf),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_20 } = __VLS_16.slots;
    // @ts-ignore
    [animating, shootSelf,];
    var __VLS_16;
    var __VLS_17;
}
if (!__VLS_ctx.isPlayerTurn && !__VLS_ctx.gameOver) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted/40 text-center mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
}
if (__VLS_ctx.actionLog.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-3 max-h-24 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-24']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [log, i] of __VLS_vFor((__VLS_ctx.actionLog))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            key: (i),
            ...{ class: "text-[10px] leading-relaxed" },
            ...{ class: (i === __VLS_ctx.actionLog.length - 1 ? 'text-text' : 'text-muted/60') },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        (log);
        // @ts-ignore
        [isPlayerTurn, gameOver, actionLog, actionLog, actionLog,];
    }
}
if (__VLS_ctx.gameOver) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-3 text-center mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm" },
        ...{ class: (__VLS_ctx.won ? 'text-success' : __VLS_ctx.draw ? 'text-accent' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.won ? '你赢了！' : __VLS_ctx.draw ? '平局' : '你输了…');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mt-0.5" },
        ...{ class: (__VLS_ctx.won ? 'text-success' : __VLS_ctx.draw ? 'text-accent' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.won
        ? '+' + __VLS_ctx.BUCKSHOT_BET_AMOUNT * __VLS_ctx.BUCKSHOT_WIN_MULTIPLIER + '文'
        : __VLS_ctx.draw
            ? '退还' + __VLS_ctx.BUCKSHOT_BET_AMOUNT + '文'
            : '-' + __VLS_ctx.BUCKSHOT_BET_AMOUNT + '文');
    const __VLS_21 = Button || Button;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }));
    const __VLS_23 = __VLS_22({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    let __VLS_26;
    const __VLS_27 = {
        /** @type {typeof __VLS_26.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.gameOver))
                throw 0;
            return __VLS_ctx.emit('complete', __VLS_ctx.won, __VLS_ctx.draw);
            // @ts-ignore
            [gameOver, won, won, won, won, won, draw, draw, draw, draw, draw, BUCKSHOT_BET_AMOUNT, BUCKSHOT_BET_AMOUNT, BUCKSHOT_BET_AMOUNT, BUCKSHOT_WIN_MULTIPLIER, emit,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_28 } = __VLS_24.slots;
    // @ts-ignore
    [];
    var __VLS_24;
    var __VLS_25;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
