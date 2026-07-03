/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onMounted, nextTick } from 'vue';
import { SUIT_LABELS, RANK_LABELS, evaluateBestHand, compareHands, texasDealerAI, dealTexas } from '@/data/hanhai';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { sfxChipBet, sfxFoldCards, sfxCardFlip, sfxCasinoWin, sfxCasinoLose } from '@/composables/useAudio';
import Button from '@/components/game/Button.vue';
import Divider from '@/components/game/Divider.vue';
const playerStore = usePlayerStore();
const props = defineProps();
const emit = defineEmits();
const tier = props.setup.tier;
// === 多手牌管理 ===
const currentRound = ref(1);
const currentPlayerHole = ref(props.setup.playerHole);
const currentDealerHole = ref(props.setup.dealerHole);
const currentCommunity = ref(props.setup.community);
// === 单手牌状态 ===
const street = ref('preflop');
const playerStack = ref(tier.entryFee);
const dealerStack = ref(tier.entryFee);
const pot = ref(0);
const playerBetRound = ref(0);
const dealerBetRound = ref(0);
const isPlayerTurn = ref(true);
const animating = ref(false);
const handOver = ref(false);
const handResult = ref(null);
const playerFolded = ref(false);
const dealerFolded = ref(false);
const playerAllIn = ref(false);
const dealerAllIn = ref(false);
const showDealerCards = ref(false);
const playerHandResult = ref(null);
const dealerHandResult = ref(null);
const sessionOver = ref(false);
const finalResult = ref(null);
const totalInvested = ref(0); // 场外累计投入（不含初始入场费）
const actionLog = ref([]);
const logRef = ref(null);
const toCall = computed(() => Math.max(0, dealerBetRound.value - playerBetRound.value));
const streetLabel = computed(() => {
    const labels = {
        preflop: '翻牌前',
        flop: '翻牌',
        turn: '转牌',
        river: '河牌',
        showdown: '摊牌'
    };
    return labels[street.value];
});
const isRedSuit = (suit) => suit === 'heart' || suit === 'diamond';
const isCommunityVisible = (index) => {
    if (street.value === 'showdown')
        return true;
    if (index < 3)
        return street.value === 'flop' || street.value === 'turn' || street.value === 'river';
    if (index === 3)
        return street.value === 'turn' || street.value === 'river';
    return street.value === 'river';
};
const visibleCommunity = computed(() => {
    const s = street.value;
    if (s === 'preflop')
        return [];
    if (s === 'flop')
        return currentCommunity.value.slice(0, 3);
    if (s === 'turn')
        return currentCommunity.value.slice(0, 4);
    return currentCommunity.value.slice(0, 5);
});
const addActionLog = (msg) => {
    actionLog.value.push(msg);
    void nextTick(() => {
        if (logRef.value)
            logRef.value.scrollTop = logRef.value.scrollHeight;
    });
};
/** 将筹码从一方移入底池 */
const betFromPlayer = (amount) => {
    const actual = Math.min(amount, playerStack.value);
    playerStack.value -= actual;
    playerBetRound.value += actual;
    if (playerStack.value <= 0)
        playerAllIn.value = true;
    return actual;
};
const betFromDealer = (amount) => {
    const actual = Math.min(amount, dealerStack.value);
    dealerStack.value -= actual;
    dealerBetRound.value += actual;
    if (dealerStack.value <= 0)
        dealerAllIn.value = true;
    return actual;
};
/** 收集本轮下注到底池（处理不等额all-in退还多余筹码） */
const collectBets = () => {
    const pBet = playerBetRound.value;
    const dBet = dealerBetRound.value;
    const matched = Math.min(pBet, dBet);
    pot.value += matched * 2;
    // 退还多余的筹码
    if (pBet > matched) {
        const refund = pBet - matched;
        playerStack.value += refund;
    }
    if (dBet > matched) {
        const refund = dBet - matched;
        dealerStack.value += refund;
    }
    playerBetRound.value = 0;
    dealerBetRound.value = 0;
};
/** 进入下一街 */
const advanceStreet = () => {
    collectBets();
    const order = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const idx = order.indexOf(street.value);
    if (idx >= 3 || street.value === 'river') {
        doShowdown();
        return;
    }
    street.value = order[idx + 1];
    sfxCardFlip();
    addActionLog(`—— ${streetLabel.value} ——`);
    if (playerAllIn.value || dealerAllIn.value) {
        setTimeout(() => advanceStreet(), 600);
        return;
    }
    isPlayerTurn.value = true;
};
/** 检查本轮是否结束 */
const checkRoundEnd = (playerActed) => {
    const pBet = playerBetRound.value;
    const dBet = dealerBetRound.value;
    // 下注匹配，或下注少的一方已all-in（无法再加）
    const settled = pBet === dBet || (pBet < dBet && playerAllIn.value) || (dBet < pBet && dealerAllIn.value);
    if (settled) {
        advanceStreet();
        return;
    }
    // 还需要对方行动
    if (playerActed) {
        isPlayerTurn.value = false;
        animating.value = true;
        setTimeout(() => dealerTurn(), 800);
    }
    else {
        isPlayerTurn.value = true;
        animating.value = false;
    }
};
// === 玩家操作 ===
const doCheck = () => {
    sfxChipBet();
    addActionLog('你过牌');
    isPlayerTurn.value = false;
    animating.value = true;
    setTimeout(() => dealerTurn(), 800);
};
const doCall = () => {
    const amount = betFromPlayer(toCall.value);
    sfxChipBet();
    addActionLog(`你跟注 ${amount}`);
    checkRoundEnd(true);
};
const doRaise = (total) => {
    const needed = total - playerBetRound.value;
    const amount = betFromPlayer(needed);
    sfxChipBet();
    addActionLog(`你加注 ${amount}`);
    isPlayerTurn.value = false;
    animating.value = true;
    setTimeout(() => dealerTurn(), 800);
};
const doAllIn = () => {
    const amount = betFromPlayer(playerStack.value);
    sfxChipBet();
    addActionLog(`你全押 ${amount}`);
    playerAllIn.value = true;
    isPlayerTurn.value = false;
    animating.value = true;
    setTimeout(() => dealerTurn(), 800);
};
const doFold = () => {
    sfxFoldCards();
    addActionLog('你弃牌');
    playerFolded.value = true;
    collectBets();
    endHand('lost');
};
// === 庄家AI ===
const dealerTurn = () => {
    const decision = texasDealerAI(currentDealerHole.value, visibleCommunity.value, street.value, pot.value + playerBetRound.value + dealerBetRound.value, dealerStack.value, playerBetRound.value, dealerBetRound.value, playerAllIn.value, tier.blind);
    if (decision.action === 'fold') {
        sfxFoldCards();
        addActionLog('庄家弃牌');
        dealerFolded.value = true;
        collectBets();
        animating.value = false;
        endHand('won');
        return;
    }
    if (decision.action === 'check') {
        sfxChipBet();
        addActionLog('庄家过牌');
        animating.value = false;
        checkRoundEnd(false);
        return;
    }
    if (decision.action === 'call') {
        const callAmt = playerBetRound.value - dealerBetRound.value;
        const amount = betFromDealer(callAmt);
        sfxChipBet();
        addActionLog(`庄家跟注 ${amount}`);
        animating.value = false;
        checkRoundEnd(false);
        return;
    }
    if (decision.action === 'allin') {
        const amount = betFromDealer(dealerStack.value);
        sfxChipBet();
        addActionLog(`庄家全押 ${amount}`);
        dealerAllIn.value = true;
        animating.value = false;
        if (dealerBetRound.value > playerBetRound.value && !playerAllIn.value) {
            isPlayerTurn.value = true;
        }
        else {
            checkRoundEnd(false);
        }
        return;
    }
    // raise
    const amount = betFromDealer(decision.amount);
    sfxChipBet();
    addActionLog(`庄家加注 ${amount}`);
    animating.value = false;
    isPlayerTurn.value = true;
};
// === Showdown ===
const doShowdown = () => {
    street.value = 'showdown';
    showDealerCards.value = true;
    sfxCardFlip();
    addActionLog('—— 摊牌 ——');
    const allCards = currentCommunity.value;
    const pHand = evaluateBestHand([...currentPlayerHole.value, ...allCards]);
    const dHand = evaluateBestHand([...currentDealerHole.value, ...allCards]);
    playerHandResult.value = pHand;
    dealerHandResult.value = dHand;
    addActionLog(`你: ${pHand.label}`);
    addActionLog(`庄家: ${dHand.label}`);
    const cmp = compareHands(pHand, dHand);
    const result = cmp > 0 ? 'won' : cmp === 0 ? 'draw' : 'lost';
    setTimeout(() => endHand(result), 800);
};
// === 单手结算 ===
const endHand = (result) => {
    handOver.value = true;
    if (dealerFolded.value || playerFolded.value) {
        showDealerCards.value = true;
    }
    // 筹码结算：赢家拿走底池
    if (result === 'won') {
        playerStack.value += pot.value;
        sfxCasinoWin();
        addActionLog(`你赢了本手！获得底池 ${pot.value}`);
    }
    else if (result === 'draw') {
        const half = Math.floor(pot.value / 2);
        playerStack.value += half;
        dealerStack.value += pot.value - half;
        addActionLog(`平局，底池平分`);
    }
    else {
        dealerStack.value += pot.value;
        sfxCasinoLose();
        addActionLog(`你输了本手，庄家获得底池 ${pot.value}`);
    }
    pot.value = 0;
    handResult.value = result;
    // 检查是否已打完所有手数，或玩家筹码+场外资金都不够继续
    const playerBroke = playerStack.value <= 0 && playerStore.money <= 0;
    if (playerBroke || currentRound.value >= tier.rounds) {
        endSession();
    }
    else {
        // 还有剩余手数，自动开始下一手
        setTimeout(() => startNextHand(), 1000);
    }
};
// === 开始下一手 ===
const startNextHand = () => {
    currentRound.value++;
    const deal = dealTexas();
    currentPlayerHole.value = deal.playerHole;
    currentDealerHole.value = deal.dealerHole;
    currentCommunity.value = deal.community;
    sfxCardFlip();
    // 庄家筹码不足时补充到入场费
    if (dealerStack.value < tier.blind * 2) {
        const refill = tier.entryFee - dealerStack.value;
        dealerStack.value = tier.entryFee;
        addActionLog(`庄家补充筹码 ${refill}`);
    }
    // 玩家筹码不足时，从场外资金补充
    if (playerStack.value < tier.blind * 2) {
        const needed = tier.entryFee - playerStack.value;
        const canAfford = Math.min(needed, playerStore.money);
        if (canAfford > 0) {
            playerStore.spendMoney(canAfford);
            playerStack.value += canAfford;
            totalInvested.value += canAfford;
            addActionLog(`从场外补充筹码 ${canAfford}`);
        }
    }
    // 重置单手状态
    street.value = 'preflop';
    pot.value = 0;
    playerBetRound.value = 0;
    dealerBetRound.value = 0;
    isPlayerTurn.value = true;
    animating.value = false;
    handOver.value = false;
    handResult.value = null;
    playerFolded.value = false;
    dealerFolded.value = false;
    playerAllIn.value = false;
    dealerAllIn.value = false;
    showDealerCards.value = false;
    playerHandResult.value = null;
    dealerHandResult.value = null;
    // 下盲注
    betFromPlayer(tier.blind);
    betFromDealer(tier.blind);
    collectBets();
    addActionLog(`—— 第 ${currentRound.value} 手 ——`);
    addActionLog(`双方各下盲注 ${tier.blind}`);
    addActionLog('—— 翻牌前 ——');
    isPlayerTurn.value = true;
};
// === 整场结算 ===
const endSession = () => {
    sessionOver.value = true;
    // netProfit: 最终筹码 - 初始入场费 - 场外补充 (不含抽水，抽水已在store扣除)
    const net = playerStack.value - tier.entryFee - totalInvested.value;
    const won = net > 0;
    const draw = net === 0;
    finalResult.value = { won, draw, netProfit: net };
    if (won) {
        addActionLog(`场次结束！你赢了！净赚 ${net}`);
    }
    else if (draw) {
        addActionLog(`场次结束！不赚不亏`);
    }
    else {
        addActionLog(`场次结束！你输了…净亏 ${Math.abs(net)}`);
    }
};
// === 初始化 ===
onMounted(() => {
    betFromPlayer(tier.blind);
    betFromDealer(tier.blind);
    collectBets();
    addActionLog(`—— 第 1 手 ——`);
    addActionLog(`双方各下盲注 ${tier.blind}`);
    addActionLog('—— 翻牌前 ——');
    isPlayerTurn.value = true;
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
const __VLS_0 = Divider || Divider;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    title: true,
    ...{ class: "!mb-1" },
}));
const __VLS_2 = __VLS_1({
    title: true,
    ...{ class: "!mb-1" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['!mb-1']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
(__VLS_ctx.tier.name);
// @ts-ignore
[tier,];
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-center space-x-2 mb-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.currentRound);
(__VLS_ctx.tier.rounds);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.tier.entryFee);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.tier.rake);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between mb-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
(__VLS_ctx.streetLabel);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-accent" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
(__VLS_ctx.pot);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-2" },
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted mb-1" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex justify-center space-x-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
for (const [card, i] of __VLS_vFor((__VLS_ctx.currentCommunity))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        key: (i),
        ...{ class: "poker-card" },
        ...{ class: ({
                'poker-card-hidden': !__VLS_ctx.isCommunityVisible(i),
                'poker-card-red': __VLS_ctx.isCommunityVisible(i) && __VLS_ctx.isRedSuit(card.suit),
                'poker-card-reveal': __VLS_ctx.isCommunityVisible(i)
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['poker-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-red']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-reveal']} */ ;
    if (__VLS_ctx.isCommunityVisible(i)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "poker-card-suit" },
        });
        /** @type {__VLS_StyleScopedClasses['poker-card-suit']} */ ;
        (__VLS_ctx.SUIT_LABELS[card.suit]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "poker-card-rank" },
        });
        /** @type {__VLS_StyleScopedClasses['poker-card-rank']} */ ;
        (__VLS_ctx.RANK_LABELS[card.rank]);
    }
    else {
    }
    // @ts-ignore
    [tier, tier, tier, currentRound, streetLabel, pot, currentCommunity, isCommunityVisible, isCommunityVisible, isCommunityVisible, isCommunityVisible, isRedSuit, SUIT_LABELS, RANK_LABELS,];
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
(__VLS_ctx.playerStack);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex justify-center space-x-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
for (const [card, i] of __VLS_vFor((__VLS_ctx.currentPlayerHole))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        key: (i),
        ...{ class: "poker-card poker-card-reveal" },
        ...{ class: ({ 'poker-card-red': __VLS_ctx.isRedSuit(card.suit) }) },
    });
    /** @type {__VLS_StyleScopedClasses['poker-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-reveal']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-red']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "poker-card-suit" },
    });
    /** @type {__VLS_StyleScopedClasses['poker-card-suit']} */ ;
    (__VLS_ctx.SUIT_LABELS[card.suit]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "poker-card-rank" },
    });
    /** @type {__VLS_StyleScopedClasses['poker-card-rank']} */ ;
    (__VLS_ctx.RANK_LABELS[card.rank]);
    // @ts-ignore
    [isRedSuit, SUIT_LABELS, RANK_LABELS, playerStack, currentPlayerHole,];
}
if (__VLS_ctx.playerHandResult) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center mt-1 text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.playerHandResult.label);
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
(__VLS_ctx.dealerStack);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex justify-center space-x-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
for (const [card, i] of __VLS_vFor((__VLS_ctx.currentDealerHole))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        key: (i),
        ...{ class: "poker-card" },
        ...{ class: ({
                'poker-card-hidden': !__VLS_ctx.showDealerCards,
                'poker-card-red': __VLS_ctx.showDealerCards && __VLS_ctx.isRedSuit(card.suit),
                'poker-card-reveal': __VLS_ctx.showDealerCards
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['poker-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-red']} */ ;
    /** @type {__VLS_StyleScopedClasses['poker-card-reveal']} */ ;
    if (__VLS_ctx.showDealerCards) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "poker-card-suit" },
        });
        /** @type {__VLS_StyleScopedClasses['poker-card-suit']} */ ;
        (__VLS_ctx.SUIT_LABELS[card.suit]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "poker-card-rank" },
        });
        /** @type {__VLS_StyleScopedClasses['poker-card-rank']} */ ;
        (__VLS_ctx.RANK_LABELS[card.rank]);
    }
    else {
    }
    // @ts-ignore
    [isRedSuit, SUIT_LABELS, RANK_LABELS, playerHandResult, playerHandResult, dealerStack, currentDealerHole, showDealerCards, showDealerCards, showDealerCards, showDealerCards,];
}
if (__VLS_ctx.dealerHandResult) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-center mt-1 text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.dealerHandResult.label);
}
if (!__VLS_ctx.handOver && __VLS_ctx.isPlayerTurn && !__VLS_ctx.animating) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap space-x-1 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.toCall <= 0) {
        const __VLS_6 = Button || Button;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }));
        const __VLS_8 = __VLS_7({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        let __VLS_11;
        const __VLS_12 = {
            /** @type {typeof __VLS_11.click} */
            onClick: (__VLS_ctx.doCheck),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_13 } = __VLS_9.slots;
        // @ts-ignore
        [dealerHandResult, dealerHandResult, handOver, isPlayerTurn, animating, toCall, doCheck,];
        var __VLS_9;
        var __VLS_10;
        if (!__VLS_ctx.dealerAllIn && __VLS_ctx.playerStack >= __VLS_ctx.tier.blind * 2) {
            const __VLS_14 = Button || Button;
            // @ts-ignore
            const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }));
            const __VLS_16 = __VLS_15({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_15));
            let __VLS_19;
            const __VLS_20 = {
                /** @type {typeof __VLS_19.click} */
                onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.handOver && __VLS_ctx.isPlayerTurn && !__VLS_ctx.animating))
                        throw 0;
                    if (!(__VLS_ctx.toCall <= 0))
                        throw 0;
                    if (!(!__VLS_ctx.dealerAllIn && __VLS_ctx.playerStack >= __VLS_ctx.tier.blind * 2))
                        throw 0;
                    return __VLS_ctx.doRaise(__VLS_ctx.playerBetRound + __VLS_ctx.tier.blind * 2);
                    // @ts-ignore
                    [tier, tier, playerStack, dealerAllIn, doRaise, playerBetRound,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_21 } = __VLS_17.slots;
            (__VLS_ctx.tier.blind * 2);
            // @ts-ignore
            [tier,];
            var __VLS_17;
            var __VLS_18;
        }
        if (!__VLS_ctx.dealerAllIn && __VLS_ctx.playerStack >= __VLS_ctx.tier.blind * 4) {
            const __VLS_22 = Button || Button;
            // @ts-ignore
            const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }));
            const __VLS_24 = __VLS_23({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_23));
            let __VLS_27;
            const __VLS_28 = {
                /** @type {typeof __VLS_27.click} */
                onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.handOver && __VLS_ctx.isPlayerTurn && !__VLS_ctx.animating))
                        throw 0;
                    if (!(__VLS_ctx.toCall <= 0))
                        throw 0;
                    if (!(!__VLS_ctx.dealerAllIn && __VLS_ctx.playerStack >= __VLS_ctx.tier.blind * 4))
                        throw 0;
                    return __VLS_ctx.doRaise(__VLS_ctx.playerBetRound + __VLS_ctx.tier.blind * 4);
                    // @ts-ignore
                    [tier, tier, playerStack, dealerAllIn, doRaise, playerBetRound,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_29 } = __VLS_25.slots;
            (__VLS_ctx.tier.blind * 4);
            // @ts-ignore
            [tier,];
            var __VLS_25;
            var __VLS_26;
        }
    }
    else {
        const __VLS_30 = Button || Button;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }));
        const __VLS_32 = __VLS_31({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_31));
        let __VLS_35;
        const __VLS_36 = {
            /** @type {typeof __VLS_35.click} */
            onClick: (__VLS_ctx.doCall),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_37 } = __VLS_33.slots;
        (__VLS_ctx.toCall);
        // @ts-ignore
        [toCall, doCall,];
        var __VLS_33;
        var __VLS_34;
        if (!__VLS_ctx.dealerAllIn && __VLS_ctx.playerStack > __VLS_ctx.toCall) {
            const __VLS_38 = Button || Button;
            // @ts-ignore
            const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }));
            const __VLS_40 = __VLS_39({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_39));
            let __VLS_43;
            const __VLS_44 = {
                /** @type {typeof __VLS_43.click} */
                onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.handOver && __VLS_ctx.isPlayerTurn && !__VLS_ctx.animating))
                        throw 0;
                    if (!!(__VLS_ctx.toCall <= 0))
                        throw 0;
                    if (!(!__VLS_ctx.dealerAllIn && __VLS_ctx.playerStack > __VLS_ctx.toCall))
                        throw 0;
                    return __VLS_ctx.doRaise(__VLS_ctx.dealerBetRound + __VLS_ctx.tier.blind * 2);
                    // @ts-ignore
                    [tier, playerStack, toCall, dealerAllIn, doRaise, dealerBetRound,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_45 } = __VLS_41.slots;
            (__VLS_ctx.toCall + __VLS_ctx.tier.blind * 2);
            // @ts-ignore
            [tier, toCall,];
            var __VLS_41;
            var __VLS_42;
        }
    }
    if (!__VLS_ctx.dealerAllIn) {
        const __VLS_46 = Button || Button;
        // @ts-ignore
        const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }));
        const __VLS_48 = __VLS_47({
            ...{ 'onClick': {} },
            ...{ class: "flex-1 justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_47));
        let __VLS_51;
        const __VLS_52 = {
            /** @type {typeof __VLS_51.click} */
            onClick: (__VLS_ctx.doAllIn),
        };
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_53 } = __VLS_49.slots;
        // @ts-ignore
        [dealerAllIn, doAllIn,];
        var __VLS_49;
        var __VLS_50;
    }
    const __VLS_54 = Button || Button;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center text-danger" },
    }));
    const __VLS_56 = __VLS_55({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center text-danger" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    let __VLS_59;
    const __VLS_60 = {
        /** @type {typeof __VLS_59.click} */
        onClick: (__VLS_ctx.doFold),
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    const { default: __VLS_61 } = __VLS_57.slots;
    // @ts-ignore
    [doFold,];
    var __VLS_57;
    var __VLS_58;
}
if (!__VLS_ctx.handOver && !__VLS_ctx.isPlayerTurn && __VLS_ctx.animating) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted/40 text-center mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "border border-accent/10 rounded-xs p-2 mb-2 max-h-24 overflow-y-auto" },
    ref: "logRef",
});
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-24']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
for (const [msg, i] of __VLS_vFor((__VLS_ctx.actionLog))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        key: (i),
        ...{ class: "text-xs text-muted leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    (msg);
    // @ts-ignore
    [handOver, isPlayerTurn, animating, actionLog,];
}
if (__VLS_ctx.sessionOver && __VLS_ctx.finalResult) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-3 text-center mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm" },
        ...{ class: (__VLS_ctx.finalResult.won ? 'text-success' : __VLS_ctx.finalResult.draw ? 'text-accent' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.finalResult.won ? '你赢了！' : __VLS_ctx.finalResult.draw ? '不赚不亏' : '你输了…');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mt-0.5" },
        ...{ class: (__VLS_ctx.finalResult.netProfit >= 0 ? 'text-success' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.finalResult.netProfit >= 0 ? '+' + __VLS_ctx.finalResult.netProfit + '文' : __VLS_ctx.finalResult.netProfit + '文');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.tier.rake);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.currentRound);
    (__VLS_ctx.playerStack);
    const __VLS_62 = Button || Button;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }));
    const __VLS_64 = __VLS_63({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    let __VLS_67;
    const __VLS_68 = {
        /** @type {typeof __VLS_67.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.sessionOver && __VLS_ctx.finalResult))
                throw 0;
            return __VLS_ctx.emit('complete', __VLS_ctx.playerStack, __VLS_ctx.tier.name);
            // @ts-ignore
            [tier, tier, currentRound, playerStack, playerStack, sessionOver, finalResult, finalResult, finalResult, finalResult, finalResult, finalResult, finalResult, finalResult, finalResult, emit,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_69 } = __VLS_65.slots;
    // @ts-ignore
    [];
    var __VLS_65;
    var __VLS_66;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
