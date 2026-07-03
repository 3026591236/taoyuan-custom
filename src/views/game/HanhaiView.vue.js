/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Tent, X, Dices, Trophy, Bug, Gem, Check, CircleDot, Spade, Crosshair, Map, Store, Gift } from 'lucide-vue-next';
import { useHanhaiStore } from '@/stores/useHanhaiStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useMiningStore } from '@/stores/useMiningStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { HANHAI_FIXED_ITEMS, ROULETTE_BET_TIERS, ROULETTE_OUTCOMES, DICE_BET_AMOUNT, MAX_DAILY_BETS, HANHAI_UNLOCK_COST, CUP_BET_AMOUNT, CUP_WIN_MULTIPLIER, CRICKET_BET_AMOUNT, CRICKET_WIN_MULTIPLIER, CRICKETS, CARD_BET_AMOUNT, CARD_TOTAL, CARD_TREASURE_COUNT, TEXAS_TIERS, BUCKSHOT_BET_AMOUNT, BUCKSHOT_WIN_MULTIPLIER, TRADE_EXCHANGE_ITEMS, calcTradePoints } from '@/data/hanhai';
import { getItemById } from '@/data/items';
import { addLog } from '@/composables/useGameLog';
import { useAudio } from '@/composables/useAudio';
import { sfxRouletteSpin, sfxRouletteStop, sfxRouletteTick, sfxDiceRoll, sfxDiceLand, sfxDiceTick, sfxCupShuffle, sfxCupReveal, sfxCupTick, sfxCricketChirp, sfxCricketClash, sfxCricketTick, sfxCardFlip, sfxCasinoWin, sfxCasinoLose, sfxBuy } from '@/composables/useAudio';
import TexasHoldemGame from '@/components/game/TexasHoldemGame.vue';
import BuckshotRouletteGame from '@/components/game/BuckshotRouletteGame.vue';
import Button from '@/components/game/Button.vue';
// suppress unused warnings for template-only refs
void CRICKET_WIN_MULTIPLIER;
void CARD_TREASURE_COUNT;
void BUCKSHOT_WIN_MULTIPLIER;
const hanhaiStore = useHanhaiStore();
const playerStore = usePlayerStore();
const walletStore = useWalletStore();
const { startHanhaiBgm, endHanhaiBgm } = useAudio();
const activeTab = ref('shop');
const shopModalItem = ref(null);
onMounted(() => {
    startHanhaiBgm();
});
onUnmounted(() => {
    endHanhaiBgm();
});
// === 解锁逻辑 ===
const miningStore = useMiningStore();
const bossDefeated = computed(() => miningStore.defeatedBosses.includes('abyss_dragon'));
const canUnlock = computed(() => bossDefeated.value && playerStore.money >= HANHAI_UNLOCK_COST);
const handleUnlock = () => {
    const result = hanhaiStore.unlockHanhai();
    if (result.success)
        addLog(result.message);
};
// === 轮盘动画状态 ===
const showRouletteModal = ref(false);
const roulettePhase = ref('spinning');
const rouletteHighlight = ref(0);
const rouletteAnimResult = ref(null);
const rouletteBetAmount = ref(0);
// === 骰子动画状态 ===
const showDiceModal = ref(false);
const dicePhase = ref('rolling');
const diceDisplay = ref([1, 1]);
const diceAnimResult = ref(null);
const diceGuessIsBig = ref(false);
const diceSum = computed(() => (diceDisplay.value[0] ?? 0) + (diceDisplay.value[1] ?? 0));
/** 骰面点位 (3×3 grid, 0-indexed) */
const DICE_DOTS = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
};
// === 猜杯动画状态 ===
const showCupModal = ref(false);
const cupPhase = ref('shuffling');
const cupGuess = ref(0);
const cupShuffleIndex = ref(0);
const cupAnimResult = ref(null);
// === 斗蛐蛐动画状态 ===
const showCricketModal = ref(false);
const cricketPhase = ref('fighting');
const cricketChoiceName = ref('');
const cricketDisplayPower = ref([5, 5]);
const cricketAnimResult = ref(null);
// === 翻牌动画状态 ===
const showCardModal = ref(false);
const cardPhase = ref('flipping');
const cardPick = ref(0);
const cardFlipIndex = ref(-1);
const cardAnimResult = ref(null);
const handleBuyItem = (itemId) => {
    const result = hanhaiStore.buyShopItem(itemId);
    if (result.success) {
        sfxBuy();
        addLog(result.message);
        shopModalItem.value = null;
    }
};
// === 藏宝图 ===
const inventoryStore = useInventoryStore();
const treasureMapCount = computed(() => inventoryStore.getItemCount('hanhai_map'));
const handleUseTreasureMap = () => {
    const result = hanhaiStore.useTreasureMap();
    if (result.success) {
        sfxCasinoWin();
    }
};
// === 轮盘逻辑 ===
const startRouletteSpin = (targetIndex) => {
    const len = ROULETTE_OUTCOMES.length;
    const fullCycles = 3 + Math.floor(Math.random() * 2); // 3~4 圈增加随机感
    const totalSteps = fullCycles * len + targetIndex;
    let step = 0;
    const tick = () => {
        rouletteHighlight.value = step % len;
        sfxRouletteTick();
        if (step >= totalSteps) {
            // 动画结束，停在 targetIndex 上，延迟显示结果
            sfxRouletteStop();
            setTimeout(() => {
                roulettePhase.value = 'done';
                if (rouletteAnimResult.value && rouletteAnimResult.value.multiplier > 0)
                    sfxCasinoWin();
                else
                    sfxCasinoLose();
            }, 400);
            return;
        }
        step++;
        const remaining = totalSteps - step;
        let delay;
        if (remaining > 10)
            delay = 60;
        else if (remaining > 6)
            delay = 120;
        else if (remaining > 3)
            delay = 200;
        else if (remaining > 1)
            delay = 350;
        else
            delay = 500;
        setTimeout(tick, delay);
    };
    setTimeout(tick, 60);
};
const handleRoulette = (betTier) => {
    const result = hanhaiStore.playRoulette(betTier);
    if (!result.success)
        return;
    rouletteBetAmount.value = betTier;
    rouletteAnimResult.value = { multiplier: result.multiplier, winnings: result.winnings };
    roulettePhase.value = 'spinning';
    rouletteHighlight.value = 0;
    showRouletteModal.value = true;
    sfxRouletteSpin();
    const targetIndex = ROULETTE_OUTCOMES.findIndex(o => o.multiplier === result.multiplier);
    startRouletteSpin(targetIndex >= 0 ? targetIndex : 0);
};
// === 骰子逻辑 ===
const startDiceRoll = (finalDice1, finalDice2) => {
    let step = 0;
    const totalSteps = 14;
    const tick = () => {
        if (step < totalSteps) {
            diceDisplay.value = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
            sfxDiceTick();
            step++;
            const delay = step < 8 ? 80 : step < 11 ? 150 : 250;
            setTimeout(tick, delay);
        }
        else {
            diceDisplay.value = [finalDice1, finalDice2];
            sfxDiceLand();
            setTimeout(() => {
                dicePhase.value = 'done';
                if (diceAnimResult.value?.won)
                    sfxCasinoWin();
                else
                    sfxCasinoLose();
            }, 500);
        }
    };
    tick();
};
const handleDice = (guessBig) => {
    const result = hanhaiStore.playDice(guessBig);
    if (!result.success)
        return;
    diceGuessIsBig.value = guessBig;
    diceAnimResult.value = { won: result.won, winnings: result.winnings };
    dicePhase.value = 'rolling';
    diceDisplay.value = [1, 1];
    showDiceModal.value = true;
    sfxDiceRoll();
    startDiceRoll(result.dice1, result.dice2);
};
// === 猜杯逻辑 ===
const startCupShuffle = () => {
    let step = 0;
    const totalSteps = 12;
    const tick = () => {
        if (step < totalSteps) {
            cupShuffleIndex.value = Math.floor(Math.random() * 3);
            sfxCupTick();
            step++;
            const delay = step < 6 ? 100 : step < 10 ? 180 : 300;
            setTimeout(tick, delay);
        }
        else {
            cupShuffleIndex.value = -1;
            sfxCupReveal();
            setTimeout(() => {
                cupPhase.value = 'done';
                if (cupAnimResult.value?.won)
                    sfxCasinoWin();
                else
                    sfxCasinoLose();
            }, 400);
        }
    };
    tick();
};
const handleCup = (guess) => {
    const result = hanhaiStore.playCup(guess);
    if (!result.success)
        return;
    cupGuess.value = guess;
    cupAnimResult.value = { correctCup: result.correctCup, won: result.won, winnings: result.winnings };
    cupPhase.value = 'shuffling';
    cupShuffleIndex.value = 0;
    showCupModal.value = true;
    sfxCupShuffle();
    startCupShuffle();
};
// === 斗蛐蛐逻辑 ===
const startCricketFight = () => {
    let step = 0;
    const totalSteps = 12;
    const tick = () => {
        if (step < totalSteps) {
            cricketDisplayPower.value = [Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1];
            sfxCricketTick();
            step++;
            const delay = step < 6 ? 120 : step < 10 ? 200 : 350;
            setTimeout(tick, delay);
        }
        else {
            sfxCricketClash();
            setTimeout(() => {
                cricketPhase.value = 'done';
                if (cricketAnimResult.value?.won)
                    sfxCasinoWin();
                else if (!cricketAnimResult.value?.draw)
                    sfxCasinoLose();
            }, 400);
        }
    };
    tick();
};
const handleCricket = (cricket) => {
    const result = hanhaiStore.playCricketFight(cricket.name);
    if (!result.success)
        return;
    cricketChoiceName.value = cricket.name;
    cricketAnimResult.value = {
        playerPower: result.playerPower,
        opponentPower: result.opponentPower,
        won: result.won,
        draw: result.draw,
        winnings: result.winnings
    };
    cricketPhase.value = 'fighting';
    cricketDisplayPower.value = [5, 5];
    showCricketModal.value = true;
    sfxCricketChirp();
    startCricketFight();
};
// === 翻牌逻辑 ===
const startCardFlip = (pickIndex) => {
    let step = 0;
    const order = [];
    // Flip picked card first, then others
    order.push(pickIndex);
    for (let i = 0; i < CARD_TOTAL; i++) {
        if (i !== pickIndex)
            order.push(i);
    }
    const tick = () => {
        if (step < order.length) {
            cardFlipIndex.value = order[step];
            sfxCardFlip();
            step++;
            const delay = step === 1 ? 600 : 300;
            setTimeout(tick, delay);
        }
        else {
            cardFlipIndex.value = -1;
            setTimeout(() => {
                cardPhase.value = 'done';
                if (cardAnimResult.value?.won)
                    sfxCasinoWin();
                else
                    sfxCasinoLose();
            }, 200);
        }
    };
    tick();
};
const handleCardFlip = (pick) => {
    const result = hanhaiStore.playCardFlip(pick);
    if (!result.success)
        return;
    cardPick.value = pick;
    cardAnimResult.value = { treasures: result.treasures, won: result.won, winnings: result.winnings };
    cardPhase.value = 'flipping';
    cardFlipIndex.value = -1;
    showCardModal.value = true;
    startCardFlip(pick);
};
// === 瀚海扑克 ===
const showTexasModal = ref(false);
const texasSetup = ref(null);
const handleTexas = (tierId) => {
    const result = hanhaiStore.startTexas(tierId);
    if (!result.success)
        return;
    texasSetup.value = result;
    showTexasModal.value = true;
};
const handleTexasComplete = (finalChips, tierName) => {
    hanhaiStore.endTexas(finalChips, tierName);
    showTexasModal.value = false;
};
// === 恶魔轮盘 ===
const showBuckshotModal = ref(false);
const buckshotSetup = ref(null);
const handleBuckshot = () => {
    const result = hanhaiStore.startBuckshot();
    if (!result.success)
        return;
    buckshotSetup.value = result;
    showBuckshotModal.value = true;
};
const handleBuckshotComplete = (won, draw) => {
    hanhaiStore.endBuckshot(won, draw);
    showBuckshotModal.value = false;
};
// === 通商系统 ===
const showTradeAddModal = ref(false);
const exchangeModalItem = ref(null);
const getItemName = (itemId) => {
    return getItemById(itemId)?.name ?? itemId;
};
const QUALITY_LABELS = {
    normal: '普通',
    fine: '优良',
    excellent: '卓越',
    supreme: '极品'
};
const qualityLabel = (quality) => QUALITY_LABELS[quality] ?? quality;
const qualityColor = (quality) => {
    if (quality === 'fine')
        return 'text-quality-fine';
    if (quality === 'excellent')
        return 'text-quality-excellent';
    if (quality === 'supreme')
        return 'text-quality-supreme';
    return '';
};
/** 背包中可上架的物品（有售价的物品） */
const sellableItems = computed(() => {
    const result = [];
    for (const item of inventoryStore.items) {
        const def = getItemById(item.itemId);
        if (def && def.sellPrice > 0) {
            result.push({
                id: item.itemId,
                name: def.name,
                quality: item.quality ?? 'normal',
                quantity: item.quantity,
                sellPrice: def.sellPrice
            });
        }
    }
    return result;
});
/** 计算积分预览（含钱袋加成） */
const calcPreviewPoints = (inv) => {
    const base = calcTradePoints(inv.sellPrice * inv.quantity, inv.quality);
    return Math.ceil(base * (1 + walletStore.getTradeBonus()));
};
// 数量选择相关
const tradeSelectedItem = ref(null);
const tradeQuantity = ref(1);
const selectTradeItem = (inv) => {
    tradeSelectedItem.value = inv;
    tradeQuantity.value = 1;
};
const tradePreviewPoints = computed(() => {
    if (!tradeSelectedItem.value)
        return 0;
    const base = calcTradePoints(tradeSelectedItem.value.sellPrice * tradeQuantity.value, tradeSelectedItem.value.quality);
    return Math.ceil(base * (1 + walletStore.getTradeBonus()));
});
const onTradeQuantityInput = (e) => {
    const target = e.target;
    let v = parseInt(target.value, 10);
    if (isNaN(v) || v < 1)
        v = 1;
    if (tradeSelectedItem.value && v > tradeSelectedItem.value.quantity)
        v = tradeSelectedItem.value.quantity;
    tradeQuantity.value = v;
};
const handleConfirmTradeSlot = () => {
    if (!tradeSelectedItem.value)
        return;
    const result = hanhaiStore.addTradeSlot(tradeSelectedItem.value.id, tradeSelectedItem.value.quality, tradeQuantity.value);
    if (result.success) {
        sfxBuy();
        tradeSelectedItem.value = null;
        showTradeAddModal.value = false;
    }
};
const handleUpgradeTrade = () => {
    const result = hanhaiStore.upgradeTradeShop();
    if (result.success) {
        sfxBuy();
        addLog(result.message);
    }
    else {
        addLog(result.message);
    }
};
const getExchangeWeeklyRemaining = (item) => {
    if (!item.weeklyLimit)
        return Infinity;
    return Math.max(0, item.weeklyLimit - (hanhaiStore.weeklyExchangePurchases[item.itemId] ?? 0));
};
const getExchangeTotalRemaining = (item) => {
    if (!item.totalLimit)
        return Infinity;
    return Math.max(0, item.totalLimit - (hanhaiStore.totalExchangePurchases[item.itemId] ?? 0));
};
const canExchange = (item) => {
    if (hanhaiStore.tradePoints < item.pointsCost)
        return false;
    if (item.weeklyLimit && getExchangeWeeklyRemaining(item) <= 0)
        return false;
    if (item.totalLimit && getExchangeTotalRemaining(item) <= 0)
        return false;
    return true;
};
const handleExchange = (itemId) => {
    const result = hanhaiStore.exchangeItem(itemId);
    if (result.success) {
        sfxBuy();
        exchangeModalItem.value = null;
    }
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between mb-1" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center space-x-1.5 text-sm text-accent" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['space-x-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Tent} */
Tent;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
if (__VLS_ctx.hanhaiStore.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-success" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
}
if (!__VLS_ctx.hanhaiStore.unlocked) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center justify-center py-10 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof __VLS_components.Tent} */
    Tent;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        size: (48),
        ...{ class: "text-accent/30" },
    }));
    const __VLS_7 = __VLS_6({
        size: (48),
        ...{ class: "text-accent/30" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    /** @type {__VLS_StyleScopedClasses['text-accent/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted/60 text-center max-w-60" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-60']} */ ;
    (__VLS_ctx.HANHAI_UNLOCK_COST);
    if (__VLS_ctx.bossDefeated) {
        const __VLS_10 = Button || Button;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
            ...{ 'onClick': {} },
            ...{ class: (__VLS_ctx.canUnlock ? '!bg-accent !text-bg' : 'opacity-50') },
            disabled: (!__VLS_ctx.canUnlock),
        }));
        const __VLS_12 = __VLS_11({
            ...{ 'onClick': {} },
            ...{ class: (__VLS_ctx.canUnlock ? '!bg-accent !text-bg' : 'opacity-50') },
            disabled: (!__VLS_ctx.canUnlock),
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        let __VLS_15;
        const __VLS_16 = {
            /** @type {typeof __VLS_15.click} */
            onClick: (__VLS_ctx.handleUnlock),
        };
        const { default: __VLS_17 } = __VLS_13.slots;
        (__VLS_ctx.HANHAI_UNLOCK_COST);
        // @ts-ignore
        [hanhaiStore, hanhaiStore, HANHAI_UNLOCK_COST, HANHAI_UNLOCK_COST, bossDefeated, canUnlock, canUnlock, handleUnlock,];
        var __VLS_13;
        var __VLS_14;
    }
    if (__VLS_ctx.bossDefeated && !__VLS_ctx.canUnlock) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        (__VLS_ctx.HANHAI_UNLOCK_COST);
    }
    if (!__VLS_ctx.bossDefeated) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const __VLS_18 = Button || Button;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'shop' }) },
    }));
    const __VLS_20 = __VLS_19({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'shop' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    let __VLS_23;
    const __VLS_24 = {
        /** @type {typeof __VLS_23.click} */
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                throw 0;
            return __VLS_ctx.activeTab = 'shop';
            // @ts-ignore
            [HANHAI_UNLOCK_COST, bossDefeated, bossDefeated, canUnlock, activeTab, activeTab,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_25 } = __VLS_21.slots;
    // @ts-ignore
    [];
    var __VLS_21;
    var __VLS_22;
    const __VLS_26 = Button || Button;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'trade' }) },
    }));
    const __VLS_28 = __VLS_27({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'trade' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    let __VLS_31;
    const __VLS_32 = {
        /** @type {typeof __VLS_31.click} */
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                throw 0;
            return __VLS_ctx.activeTab = 'trade';
            // @ts-ignore
            [activeTab, activeTab,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_33 } = __VLS_29.slots;
    // @ts-ignore
    [];
    var __VLS_29;
    var __VLS_30;
    const __VLS_34 = Button || Button;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'casino' }) },
    }));
    const __VLS_36 = __VLS_35({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        ...{ class: ({ '!bg-accent !text-bg': __VLS_ctx.activeTab === 'casino' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    let __VLS_39;
    const __VLS_40 = {
        /** @type {typeof __VLS_39.click} */
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                throw 0;
            return __VLS_ctx.activeTab = 'casino';
            // @ts-ignore
            [activeTab, activeTab,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_41 } = __VLS_37.slots;
    // @ts-ignore
    [];
    var __VLS_37;
    var __VLS_38;
    if (__VLS_ctx.activeTab === 'shop') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-80 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-80']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mb-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.HANHAI_FIXED_ITEMS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'shop'))
                            throw 0;
                        return __VLS_ctx.shopModalItem = item;
                        // @ts-ignore
                        [activeTab, HANHAI_FIXED_ITEMS, shopModalItem,];
                    } },
                key: (item.itemId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5 transition-colors mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex-1 min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (item.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (item.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-end ml-2 shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (item.price);
            if (item.weeklyLimit) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px]" },
                    ...{ class: (__VLS_ctx.hanhaiStore.getWeeklyRemaining(item.itemId) > 0 ? 'text-muted' : 'text-danger') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (__VLS_ctx.hanhaiStore.getWeeklyRemaining(item.itemId));
                (item.weeklyLimit);
            }
            // @ts-ignore
            [hanhaiStore, hanhaiStore,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted mt-2 mb-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.hanhaiStore.weeklyRotatingStock))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'shop'))
                            throw 0;
                        return __VLS_ctx.shopModalItem = item;
                        // @ts-ignore
                        [hanhaiStore, shopModalItem,];
                    } },
                key: (item.itemId),
                ...{ class: "flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5 transition-colors mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex-1 min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (item.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (item.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-end ml-2 shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (item.price);
            if (item.weeklyLimit) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px]" },
                    ...{ class: (__VLS_ctx.hanhaiStore.getWeeklyRemaining(item.itemId) > 0 ? 'text-muted' : 'text-danger') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (__VLS_ctx.hanhaiStore.getWeeklyRemaining(item.itemId));
                (item.weeklyLimit);
            }
            // @ts-ignore
            [hanhaiStore, hanhaiStore,];
        }
        if (__VLS_ctx.treasureMapCount > 0) {
            const __VLS_42 = Button || Button;
            // @ts-ignore
            const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
                ...{ 'onClick': {} },
                icon: (Map),
                iconSize: (12),
                ...{ class: "w-full justify-center mt-2" },
            }));
            const __VLS_44 = __VLS_43({
                ...{ 'onClick': {} },
                icon: (Map),
                iconSize: (12),
                ...{ class: "w-full justify-center mt-2" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_43));
            let __VLS_47;
            const __VLS_48 = {
                /** @type {typeof __VLS_47.click} */
                onClick: (__VLS_ctx.handleUseTreasureMap),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            const { default: __VLS_49 } = __VLS_45.slots;
            (__VLS_ctx.treasureMapCount);
            // @ts-ignore
            [treasureMapCount, treasureMapCount, handleUseTreasureMap,];
            var __VLS_45;
            var __VLS_46;
        }
    }
    if (__VLS_ctx.activeTab === 'trade') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.hanhaiStore.tradePoints);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.hanhaiStore.tradeShopConfig.name);
        (__VLS_ctx.hanhaiStore.tradeShopLevel);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_50;
        /** @ts-ignore @type { | typeof __VLS_components.Store} */
        Store;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
            size: (12),
        }));
        const __VLS_52 = __VLS_51({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.hanhaiStore.tradeSlots.length);
        (__VLS_ctx.hanhaiStore.tradeShopConfig.maxSlots);
        for (const [slot, idx] of __VLS_vFor((__VLS_ctx.hanhaiStore.tradeSlots))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (idx),
                ...{ class: "border border-accent/10 rounded-xs px-2 py-1.5 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_ctx.getItemName(slot.itemId));
            (slot.quantity);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (slot.daysRemaining);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            (__VLS_ctx.qualityLabel(slot.quality));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (slot.pointsReward);
            // @ts-ignore
            [hanhaiStore, hanhaiStore, hanhaiStore, hanhaiStore, hanhaiStore, hanhaiStore, activeTab, getItemName, qualityLabel,];
        }
        if (__VLS_ctx.hanhaiStore.tradeSlots.length < __VLS_ctx.hanhaiStore.tradeShopConfig.maxSlots) {
            const __VLS_55 = Button || Button;
            // @ts-ignore
            const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center mt-1" },
            }));
            const __VLS_57 = __VLS_56({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center mt-1" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_56));
            let __VLS_60;
            const __VLS_61 = {
                /** @type {typeof __VLS_60.click} */
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                        throw 0;
                    if (!(__VLS_ctx.activeTab === 'trade'))
                        throw 0;
                    if (!(__VLS_ctx.hanhaiStore.tradeSlots.length < __VLS_ctx.hanhaiStore.tradeShopConfig.maxSlots))
                        throw 0;
                    return __VLS_ctx.showTradeAddModal = true;
                    // @ts-ignore
                    [hanhaiStore, hanhaiStore, showTradeAddModal,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            const { default: __VLS_62 } = __VLS_58.slots;
            // @ts-ignore
            [];
            var __VLS_58;
            var __VLS_59;
        }
        if (__VLS_ctx.hanhaiStore.nextTradeShopUpgrade) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (__VLS_ctx.hanhaiStore.nextTradeShopUpgrade.name);
            (__VLS_ctx.hanhaiStore.nextTradeShopUpgrade.maxSlots);
            (__VLS_ctx.hanhaiStore.nextTradeShopUpgrade.sellDays);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (__VLS_ctx.hanhaiStore.nextTradeShopUpgrade.cost);
            for (const [mat] of __VLS_vFor((__VLS_ctx.hanhaiStore.nextTradeShopUpgrade.materialCost))) {
                __VLS_asFunctionalElement(__VLS_intrinsics.template)({
                    key: (mat.itemId),
                });
                (__VLS_ctx.getItemName(mat.itemId));
                (mat.quantity);
                // @ts-ignore
                [hanhaiStore, hanhaiStore, hanhaiStore, hanhaiStore, hanhaiStore, hanhaiStore, getItemName,];
            }
            const __VLS_63 = Button || Button;
            // @ts-ignore
            const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
            }));
            const __VLS_65 = __VLS_64({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_64));
            let __VLS_68;
            const __VLS_69 = {
                /** @type {typeof __VLS_68.click} */
                onClick: (__VLS_ctx.handleUpgradeTrade),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_70 } = __VLS_66.slots;
            // @ts-ignore
            [handleUpgradeTrade,];
            var __VLS_66;
            var __VLS_67;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xs text-muted text-center mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-accent mb-1 flex items-center space-x-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
        let __VLS_71;
        /** @ts-ignore @type { | typeof __VLS_components.Gift} */
        Gift;
        // @ts-ignore
        const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
            size: (12),
        }));
        const __VLS_73 = __VLS_72({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_72));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [exItem] of __VLS_vFor((__VLS_ctx.TRADE_EXCHANGE_ITEMS))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'trade'))
                            throw 0;
                        return __VLS_ctx.exchangeModalItem = exItem;
                        // @ts-ignore
                        [TRADE_EXCHANGE_ITEMS, exchangeModalItem,];
                    } },
                key: (exItem.itemId),
                ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 transition-colors mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex-1 min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (exItem.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[10px] text-muted truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (exItem.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-end ml-2 shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            (exItem.pointsCost);
            if (exItem.weeklyLimit) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px] text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (__VLS_ctx.getExchangeWeeklyRemaining(exItem));
            }
            if (exItem.totalLimit) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-[10px]" },
                    ...{ class: (__VLS_ctx.getExchangeTotalRemaining(exItem) > 0 ? 'text-muted' : 'text-danger') },
                });
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                (__VLS_ctx.getExchangeTotalRemaining(exItem) > 0 ? '可兑换' : '已兑换');
            }
            // @ts-ignore
            [getExchangeWeeklyRemaining, getExchangeTotalRemaining, getExchangeTotalRemaining,];
        }
    }
    if (__VLS_ctx.activeTab === 'casino') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-2 mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.hanhaiStore.canBet ? 'text-accent' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.hanhaiStore.betsRemaining);
        (__VLS_ctx.MAX_DAILY_BETS);
        if (!__VLS_ctx.hanhaiStore.canBet) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center justify-center py-8 space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            let __VLS_76;
            /** @ts-ignore @type { | typeof __VLS_components.Dices} */
            Dices;
            // @ts-ignore
            const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
                size: (48),
                ...{ class: "text-accent/30" },
            }));
            const __VLS_78 = __VLS_77({
                size: (48),
                ...{ class: "text-accent/30" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_77));
            /** @type {__VLS_StyleScopedClasses['text-accent/30']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted/60" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted/60']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2 flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_81;
            /** @ts-ignore @type { | typeof __VLS_components.CircleDot} */
            CircleDot;
            // @ts-ignore
            const __VLS_82 = __VLS_asFunctionalComponent1(__VLS_81, new __VLS_81({
                size: (12),
            }));
            const __VLS_83 = __VLS_82({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_82));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            for (const [tier] of __VLS_vFor((__VLS_ctx.ROULETTE_BET_TIERS))) {
                const __VLS_86 = Button || Button;
                // @ts-ignore
                const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
                    ...{ 'onClick': {} },
                    key: (tier),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < tier),
                }));
                const __VLS_88 = __VLS_87({
                    ...{ 'onClick': {} },
                    key: (tier),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < tier),
                }, ...__VLS_functionalComponentArgsRest(__VLS_87));
                let __VLS_91;
                const __VLS_92 = {
                    /** @type {typeof __VLS_91.click} */
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'casino'))
                            throw 0;
                        if (!!(!__VLS_ctx.hanhaiStore.canBet))
                            throw 0;
                        return __VLS_ctx.handleRoulette(tier);
                        // @ts-ignore
                        [hanhaiStore, hanhaiStore, hanhaiStore, activeTab, MAX_DAILY_BETS, ROULETTE_BET_TIERS, playerStore, handleRoulette,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_93 } = __VLS_89.slots;
                (tier);
                // @ts-ignore
                [];
                var __VLS_89;
                var __VLS_90;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2 flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_94;
            /** @ts-ignore @type { | typeof __VLS_components.Dices} */
            Dices;
            // @ts-ignore
            const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({
                size: (12),
            }));
            const __VLS_96 = __VLS_95({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_95));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (__VLS_ctx.DICE_BET_AMOUNT);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            const __VLS_99 = Button || Button;
            // @ts-ignore
            const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
                disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.DICE_BET_AMOUNT),
            }));
            const __VLS_101 = __VLS_100({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
                disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.DICE_BET_AMOUNT),
            }, ...__VLS_functionalComponentArgsRest(__VLS_100));
            let __VLS_104;
            const __VLS_105 = {
                /** @type {typeof __VLS_104.click} */
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                        throw 0;
                    if (!(__VLS_ctx.activeTab === 'casino'))
                        throw 0;
                    if (!!(!__VLS_ctx.hanhaiStore.canBet))
                        throw 0;
                    return __VLS_ctx.handleDice(false);
                    // @ts-ignore
                    [playerStore, DICE_BET_AMOUNT, DICE_BET_AMOUNT, handleDice,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_106 } = __VLS_102.slots;
            // @ts-ignore
            [];
            var __VLS_102;
            var __VLS_103;
            const __VLS_107 = Button || Button;
            // @ts-ignore
            const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
                disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.DICE_BET_AMOUNT),
            }));
            const __VLS_109 = __VLS_108({
                ...{ 'onClick': {} },
                ...{ class: "flex-1 justify-center" },
                disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.DICE_BET_AMOUNT),
            }, ...__VLS_functionalComponentArgsRest(__VLS_108));
            let __VLS_112;
            const __VLS_113 = {
                /** @type {typeof __VLS_112.click} */
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                        throw 0;
                    if (!(__VLS_ctx.activeTab === 'casino'))
                        throw 0;
                    if (!!(!__VLS_ctx.hanhaiStore.canBet))
                        throw 0;
                    return __VLS_ctx.handleDice(true);
                    // @ts-ignore
                    [playerStore, DICE_BET_AMOUNT, handleDice,];
                },
            };
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_114 } = __VLS_110.slots;
            // @ts-ignore
            [];
            var __VLS_110;
            var __VLS_111;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2 flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_115;
            /** @ts-ignore @type { | typeof __VLS_components.Trophy} */
            Trophy;
            // @ts-ignore
            const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
                size: (12),
            }));
            const __VLS_117 = __VLS_116({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_116));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (__VLS_ctx.CUP_BET_AMOUNT);
            (__VLS_ctx.CUP_WIN_MULTIPLIER);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            for (const [i] of __VLS_vFor((3))) {
                const __VLS_120 = Button || Button;
                // @ts-ignore
                const __VLS_121 = __VLS_asFunctionalComponent1(__VLS_120, new __VLS_120({
                    ...{ 'onClick': {} },
                    key: (i),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.CUP_BET_AMOUNT),
                }));
                const __VLS_122 = __VLS_121({
                    ...{ 'onClick': {} },
                    key: (i),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.CUP_BET_AMOUNT),
                }, ...__VLS_functionalComponentArgsRest(__VLS_121));
                let __VLS_125;
                const __VLS_126 = {
                    /** @type {typeof __VLS_125.click} */
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'casino'))
                            throw 0;
                        if (!!(!__VLS_ctx.hanhaiStore.canBet))
                            throw 0;
                        return __VLS_ctx.handleCup(i - 1);
                        // @ts-ignore
                        [playerStore, CUP_BET_AMOUNT, CUP_BET_AMOUNT, CUP_WIN_MULTIPLIER, handleCup,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_127 } = __VLS_123.slots;
                (i);
                // @ts-ignore
                [];
                var __VLS_123;
                var __VLS_124;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2 flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_128;
            /** @ts-ignore @type { | typeof __VLS_components.Bug} */
            Bug;
            // @ts-ignore
            const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
                size: (12),
            }));
            const __VLS_130 = __VLS_129({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_129));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (__VLS_ctx.CRICKET_BET_AMOUNT);
            (__VLS_ctx.CRICKET_WIN_MULTIPLIER);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            for (const [c] of __VLS_vFor((__VLS_ctx.CRICKETS))) {
                const __VLS_133 = Button || Button;
                // @ts-ignore
                const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
                    ...{ 'onClick': {} },
                    key: (c.id),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.CRICKET_BET_AMOUNT),
                }));
                const __VLS_135 = __VLS_134({
                    ...{ 'onClick': {} },
                    key: (c.id),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.CRICKET_BET_AMOUNT),
                }, ...__VLS_functionalComponentArgsRest(__VLS_134));
                let __VLS_138;
                const __VLS_139 = {
                    /** @type {typeof __VLS_138.click} */
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'casino'))
                            throw 0;
                        if (!!(!__VLS_ctx.hanhaiStore.canBet))
                            throw 0;
                        return __VLS_ctx.handleCricket(c);
                        // @ts-ignore
                        [playerStore, CRICKET_BET_AMOUNT, CRICKET_BET_AMOUNT, CRICKET_WIN_MULTIPLIER, CRICKETS, handleCricket,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_140 } = __VLS_136.slots;
                (c.name);
                // @ts-ignore
                [];
                var __VLS_136;
                var __VLS_137;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2 flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_141;
            /** @ts-ignore @type { | typeof __VLS_components.Gem} */
            Gem;
            // @ts-ignore
            const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({
                size: (12),
            }));
            const __VLS_143 = __VLS_142({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_142));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (__VLS_ctx.CARD_BET_AMOUNT);
            (__VLS_ctx.CARD_TOTAL);
            (__VLS_ctx.CARD_TREASURE_COUNT);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            for (const [i] of __VLS_vFor((__VLS_ctx.CARD_TOTAL))) {
                const __VLS_146 = Button || Button;
                // @ts-ignore
                const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
                    ...{ 'onClick': {} },
                    key: (i),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.CARD_BET_AMOUNT),
                }));
                const __VLS_148 = __VLS_147({
                    ...{ 'onClick': {} },
                    key: (i),
                    ...{ class: "flex-1 justify-center" },
                    disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.CARD_BET_AMOUNT),
                }, ...__VLS_functionalComponentArgsRest(__VLS_147));
                let __VLS_151;
                const __VLS_152 = {
                    /** @type {typeof __VLS_151.click} */
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'casino'))
                            throw 0;
                        if (!!(!__VLS_ctx.hanhaiStore.canBet))
                            throw 0;
                        return __VLS_ctx.handleCardFlip(i - 1);
                        // @ts-ignore
                        [playerStore, CARD_BET_AMOUNT, CARD_BET_AMOUNT, CARD_TOTAL, CARD_TOTAL, CARD_TREASURE_COUNT, handleCardFlip,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                const { default: __VLS_153 } = __VLS_149.slots;
                (i);
                // @ts-ignore
                [];
                var __VLS_149;
                var __VLS_150;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2 flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_154;
            /** @ts-ignore @type { | typeof __VLS_components.Spade} */
            Spade;
            // @ts-ignore
            const __VLS_155 = __VLS_asFunctionalComponent1(__VLS_154, new __VLS_154({
                size: (12),
            }));
            const __VLS_156 = __VLS_155({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_155));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col space-y-1" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
            for (const [t] of __VLS_vFor((__VLS_ctx.TEXAS_TIERS))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (t.id),
                    ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex-1 min-w-0" },
                });
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (t.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (t.entryFee);
                (t.rake);
                (t.blind);
                (t.rounds);
                const __VLS_159 = Button || Button;
                // @ts-ignore
                const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
                    ...{ 'onClick': {} },
                    ...{ class: "ml-2 shrink-0" },
                    disabled: (__VLS_ctx.playerStore.money < t.minMoney),
                }));
                const __VLS_161 = __VLS_160({
                    ...{ 'onClick': {} },
                    ...{ class: "ml-2 shrink-0" },
                    disabled: (__VLS_ctx.playerStore.money < t.minMoney),
                }, ...__VLS_functionalComponentArgsRest(__VLS_160));
                let __VLS_164;
                const __VLS_165 = {
                    /** @type {typeof __VLS_164.click} */
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hanhaiStore.unlocked))
                            throw 0;
                        if (!(__VLS_ctx.activeTab === 'casino'))
                            throw 0;
                        if (!!(!__VLS_ctx.hanhaiStore.canBet))
                            throw 0;
                        return __VLS_ctx.handleTexas(t.id);
                        // @ts-ignore
                        [playerStore, TEXAS_TIERS, handleTexas,];
                    },
                };
                /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                const { default: __VLS_166 } = __VLS_162.slots;
                (__VLS_ctx.playerStore.money < t.minMoney ? `需${t.minMoney}文` : '入场');
                // @ts-ignore
                [playerStore,];
                var __VLS_162;
                var __VLS_163;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-2" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-accent mb-2 flex items-center space-x-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
            let __VLS_167;
            /** @ts-ignore @type { | typeof __VLS_components.Crosshair} */
            Crosshair;
            // @ts-ignore
            const __VLS_168 = __VLS_asFunctionalComponent1(__VLS_167, new __VLS_167({
                size: (12),
            }));
            const __VLS_169 = __VLS_168({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_168));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (__VLS_ctx.BUCKSHOT_BET_AMOUNT);
            (__VLS_ctx.BUCKSHOT_WIN_MULTIPLIER);
            const __VLS_172 = Button || Button;
            // @ts-ignore
            const __VLS_173 = __VLS_asFunctionalComponent1(__VLS_172, new __VLS_172({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.BUCKSHOT_BET_AMOUNT),
            }));
            const __VLS_174 = __VLS_173({
                ...{ 'onClick': {} },
                ...{ class: "w-full justify-center" },
                disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.BUCKSHOT_BET_AMOUNT),
            }, ...__VLS_functionalComponentArgsRest(__VLS_173));
            let __VLS_177;
            const __VLS_178 = {
                /** @type {typeof __VLS_177.click} */
                onClick: (__VLS_ctx.handleBuckshot),
            };
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            const { default: __VLS_179 } = __VLS_175.slots;
            // @ts-ignore
            [playerStore, BUCKSHOT_BET_AMOUNT, BUCKSHOT_BET_AMOUNT, BUCKSHOT_WIN_MULTIPLIER, handleBuckshot,];
            var __VLS_175;
            var __VLS_176;
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-3 border border-accent/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-2 gap-x-3 gap-y-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-y-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.playerStore.money);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.hanhaiStore.tradePoints);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.MAX_DAILY_BETS - __VLS_ctx.hanhaiStore.betsRemaining);
    (__VLS_ctx.MAX_DAILY_BETS);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.hanhaiStore.tradeShopConfig.name);
}
let __VLS_180;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent1(__VLS_180, new __VLS_180({
    name: "panel-fade",
}));
const __VLS_182 = __VLS_181({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
const { default: __VLS_185 } = __VLS_183.slots;
if (__VLS_ctx.shopModalItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                return __VLS_ctx.shopModalItem = null;
                // @ts-ignore
                [hanhaiStore, hanhaiStore, hanhaiStore, shopModalItem, shopModalItem, MAX_DAILY_BETS, MAX_DAILY_BETS, playerStore,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.shopModalItem))
                    throw 0;
                return __VLS_ctx.shopModalItem = null;
                // @ts-ignore
                [shopModalItem,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_186;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_187 = __VLS_asFunctionalComponent1(__VLS_186, new __VLS_186({
        size: (14),
    }));
    const __VLS_188 = __VLS_187({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_187));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.shopModalItem.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.shopModalItem.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.shopModalItem.price);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.playerStore.money);
    if (__VLS_ctx.shopModalItem.weeklyLimit) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.hanhaiStore.getWeeklyRemaining(__VLS_ctx.shopModalItem.itemId) > 0 ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.hanhaiStore.getWeeklyRemaining(__VLS_ctx.shopModalItem.itemId));
        (__VLS_ctx.shopModalItem.weeklyLimit);
    }
    const __VLS_191 = Button || Button;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent1(__VLS_191, new __VLS_191({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
        disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.shopModalItem.price || __VLS_ctx.hanhaiStore.getWeeklyRemaining(__VLS_ctx.shopModalItem.itemId) <= 0),
    }));
    const __VLS_193 = __VLS_192({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
        disabled: (__VLS_ctx.playerStore.money < __VLS_ctx.shopModalItem.price || __VLS_ctx.hanhaiStore.getWeeklyRemaining(__VLS_ctx.shopModalItem.itemId) <= 0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    let __VLS_196;
    const __VLS_197 = {
        /** @type {typeof __VLS_196.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.shopModalItem))
                throw 0;
            return __VLS_ctx.handleBuyItem(__VLS_ctx.shopModalItem.itemId);
            // @ts-ignore
            [hanhaiStore, hanhaiStore, hanhaiStore, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, shopModalItem, playerStore, playerStore, handleBuyItem,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_198 } = __VLS_194.slots;
    (__VLS_ctx.hanhaiStore.getWeeklyRemaining(__VLS_ctx.shopModalItem.itemId) <= 0 ? '本周已售罄' : '购买');
    // @ts-ignore
    [hanhaiStore, shopModalItem,];
    var __VLS_194;
    var __VLS_195;
}
// @ts-ignore
[];
var __VLS_183;
let __VLS_199;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_200 = __VLS_asFunctionalComponent1(__VLS_199, new __VLS_199({
    name: "panel-fade",
}));
const __VLS_201 = __VLS_200({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_200));
const { default: __VLS_204 } = __VLS_202.slots;
if (__VLS_ctx.showRouletteModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent text-center mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted text-center mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.rouletteBetAmount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [outcome, i] of __VLS_vFor((__VLS_ctx.ROULETTE_OUTCOMES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "border rounded-xs px-3 py-1.5 text-xs text-center transition-all duration-100" },
            ...{ class: (__VLS_ctx.rouletteHighlight === i ? 'border-accent bg-accent/15 text-accent' : 'border-accent/10 text-muted/40') },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['duration-100']} */ ;
        (outcome.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "ml-1 opacity-60" },
        });
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
        (outcome.multiplier);
        // @ts-ignore
        [showRouletteModal, rouletteBetAmount, ROULETTE_OUTCOMES, rouletteHighlight,];
    }
    if (__VLS_ctx.roulettePhase === 'done' && __VLS_ctx.rouletteAnimResult) {
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
            ...{ class: "text-sm mb-0.5" },
            ...{ class: (__VLS_ctx.rouletteAnimResult.multiplier > 0 ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-0.5']} */ ;
        (__VLS_ctx.rouletteAnimResult.multiplier > 0 ? '大赢！' : '落空…');
        if (__VLS_ctx.rouletteAnimResult.multiplier > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-success" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            (__VLS_ctx.rouletteAnimResult.winnings);
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            (__VLS_ctx.rouletteBetAmount);
        }
        const __VLS_205 = Button || Button;
        // @ts-ignore
        const __VLS_206 = __VLS_asFunctionalComponent1(__VLS_205, new __VLS_205({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_207 = __VLS_206({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_206));
        let __VLS_210;
        const __VLS_211 = {
            /** @type {typeof __VLS_210.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showRouletteModal))
                    throw 0;
                if (!(__VLS_ctx.roulettePhase === 'done' && __VLS_ctx.rouletteAnimResult))
                    throw 0;
                return __VLS_ctx.showRouletteModal = false;
                // @ts-ignore
                [showRouletteModal, rouletteBetAmount, roulettePhase, rouletteAnimResult, rouletteAnimResult, rouletteAnimResult, rouletteAnimResult, rouletteAnimResult,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_212 } = __VLS_208.slots;
        // @ts-ignore
        [];
        var __VLS_208;
        var __VLS_209;
    }
}
// @ts-ignore
[];
var __VLS_202;
let __VLS_213;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_214 = __VLS_asFunctionalComponent1(__VLS_213, new __VLS_213({
    name: "panel-fade",
}));
const __VLS_215 = __VLS_214({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_214));
const { default: __VLS_218 } = __VLS_216.slots;
if (__VLS_ctx.showDiceModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent text-center mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted text-center mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.diceGuessIsBig ? '大 (7-12)' : '小 (2-6)');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-4 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [val, di] of __VLS_vFor((__VLS_ctx.diceDisplay))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (di),
            ...{ class: "dice-face" },
            ...{ class: ({ 'dice-rolling': __VLS_ctx.dicePhase === 'rolling' }) },
        });
        /** @type {__VLS_StyleScopedClasses['dice-face']} */ ;
        /** @type {__VLS_StyleScopedClasses['dice-rolling']} */ ;
        for (const [pos] of __VLS_vFor((9))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (pos),
                ...{ class: "flex items-center justify-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            if (__VLS_ctx.DICE_DOTS[val]?.includes(pos - 1)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                    ...{ class: "w-2.5 h-2.5 rounded-full transition-colors" },
                    ...{ class: (__VLS_ctx.dicePhase === 'rolling' ? 'bg-muted/60' : 'bg-text') },
                });
                /** @type {__VLS_StyleScopedClasses['w-2.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-2.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            }
            // @ts-ignore
            [showDiceModal, diceGuessIsBig, diceDisplay, dicePhase, dicePhase, DICE_DOTS,];
        }
        // @ts-ignore
        [];
    }
    if (__VLS_ctx.dicePhase !== 'rolling') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-center mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.diceDisplay[0]);
        (__VLS_ctx.diceDisplay[1]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        (__VLS_ctx.diceSum);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.diceSum >= 7 ? '大' : '小');
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/40 text-center mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    }
    if (__VLS_ctx.dicePhase === 'done' && __VLS_ctx.diceAnimResult) {
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
            ...{ class: (__VLS_ctx.diceAnimResult.won ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_ctx.diceAnimResult.won ? '猜对了！' : '猜错了…');
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-0.5" },
            ...{ class: (__VLS_ctx.diceAnimResult.won ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.diceAnimResult.won ? '+' + __VLS_ctx.diceAnimResult.winnings + '文' : '-' + __VLS_ctx.DICE_BET_AMOUNT + '文');
        const __VLS_219 = Button || Button;
        // @ts-ignore
        const __VLS_220 = __VLS_asFunctionalComponent1(__VLS_219, new __VLS_219({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_221 = __VLS_220({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_220));
        let __VLS_224;
        const __VLS_225 = {
            /** @type {typeof __VLS_224.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showDiceModal))
                    throw 0;
                if (!(__VLS_ctx.dicePhase === 'done' && __VLS_ctx.diceAnimResult))
                    throw 0;
                return __VLS_ctx.showDiceModal = false;
                // @ts-ignore
                [DICE_BET_AMOUNT, showDiceModal, diceDisplay, diceDisplay, dicePhase, dicePhase, diceSum, diceSum, diceAnimResult, diceAnimResult, diceAnimResult, diceAnimResult, diceAnimResult, diceAnimResult,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_226 } = __VLS_222.slots;
        // @ts-ignore
        [];
        var __VLS_222;
        var __VLS_223;
    }
}
// @ts-ignore
[];
var __VLS_216;
let __VLS_227;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_228 = __VLS_asFunctionalComponent1(__VLS_227, new __VLS_227({
    name: "panel-fade",
}));
const __VLS_229 = __VLS_228({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_228));
const { default: __VLS_232 } = __VLS_230.slots;
if (__VLS_ctx.showCupModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent text-center mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted text-center mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    (__VLS_ctx.cupGuess + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-3 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [i] of __VLS_vFor((3))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "cup-box" },
            ...{ class: ({
                    'cup-highlight': __VLS_ctx.cupPhase === 'shuffling' && __VLS_ctx.cupShuffleIndex === i - 1,
                    'cup-correct': __VLS_ctx.cupPhase === 'done' && __VLS_ctx.cupAnimResult && __VLS_ctx.cupAnimResult.correctCup === i - 1,
                    'cup-picked': __VLS_ctx.cupPhase === 'done' && __VLS_ctx.cupGuess === i - 1 && __VLS_ctx.cupAnimResult && !__VLS_ctx.cupAnimResult.won
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['cup-box']} */ ;
        /** @type {__VLS_StyleScopedClasses['cup-highlight']} */ ;
        /** @type {__VLS_StyleScopedClasses['cup-correct']} */ ;
        /** @type {__VLS_StyleScopedClasses['cup-picked']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "cup-body" },
            ...{ class: ({ 'cup-shake': __VLS_ctx.cupPhase === 'shuffling' }) },
        });
        /** @type {__VLS_StyleScopedClasses['cup-body']} */ ;
        /** @type {__VLS_StyleScopedClasses['cup-shake']} */ ;
        let __VLS_233;
        /** @ts-ignore @type { | typeof __VLS_components.Trophy} */
        Trophy;
        // @ts-ignore
        const __VLS_234 = __VLS_asFunctionalComponent1(__VLS_233, new __VLS_233({
            size: (20),
            ...{ class: "text-accent/60" },
        }));
        const __VLS_235 = __VLS_234({
            size: (20),
            ...{ class: "text-accent/60" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_234));
        /** @type {__VLS_StyleScopedClasses['text-accent/60']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-center mt-1" },
            ...{ class: (__VLS_ctx.cupPhase === 'done' && __VLS_ctx.cupAnimResult?.correctCup === i - 1 ? 'text-accent' : 'text-muted/40') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        (i);
        if (__VLS_ctx.cupPhase === 'done' && __VLS_ctx.cupAnimResult?.correctCup === i - 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success flex items-center justify-center" },
            });
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['-top-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['-right-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            let __VLS_238;
            /** @ts-ignore @type { | typeof __VLS_components.Check} */
            Check;
            // @ts-ignore
            const __VLS_239 = __VLS_asFunctionalComponent1(__VLS_238, new __VLS_238({
                size: (10),
                ...{ class: "text-bg" },
            }));
            const __VLS_240 = __VLS_239({
                size: (10),
                ...{ class: "text-bg" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_239));
            /** @type {__VLS_StyleScopedClasses['text-bg']} */ ;
        }
        // @ts-ignore
        [showCupModal, cupGuess, cupGuess, cupPhase, cupPhase, cupPhase, cupPhase, cupPhase, cupPhase, cupShuffleIndex, cupAnimResult, cupAnimResult, cupAnimResult, cupAnimResult, cupAnimResult, cupAnimResult,];
    }
    if (__VLS_ctx.cupPhase === 'shuffling') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/40 text-center mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    }
    if (__VLS_ctx.cupPhase === 'done' && __VLS_ctx.cupAnimResult) {
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
            ...{ class: (__VLS_ctx.cupAnimResult.won ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_ctx.cupAnimResult.won ? '猜中了！' : '猜错了…');
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-0.5" },
            ...{ class: (__VLS_ctx.cupAnimResult.won ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.cupAnimResult.won ? '+' + __VLS_ctx.cupAnimResult.winnings + '文' : '-' + __VLS_ctx.CUP_BET_AMOUNT + '文');
        const __VLS_243 = Button || Button;
        // @ts-ignore
        const __VLS_244 = __VLS_asFunctionalComponent1(__VLS_243, new __VLS_243({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_245 = __VLS_244({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_244));
        let __VLS_248;
        const __VLS_249 = {
            /** @type {typeof __VLS_248.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCupModal))
                    throw 0;
                if (!(__VLS_ctx.cupPhase === 'done' && __VLS_ctx.cupAnimResult))
                    throw 0;
                return __VLS_ctx.showCupModal = false;
                // @ts-ignore
                [CUP_BET_AMOUNT, showCupModal, cupPhase, cupPhase, cupAnimResult, cupAnimResult, cupAnimResult, cupAnimResult, cupAnimResult, cupAnimResult,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_250 } = __VLS_246.slots;
        // @ts-ignore
        [];
        var __VLS_246;
        var __VLS_247;
    }
}
// @ts-ignore
[];
var __VLS_230;
let __VLS_251;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent1(__VLS_251, new __VLS_251({
    name: "panel-fade",
}));
const __VLS_253 = __VLS_252({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
const { default: __VLS_256 } = __VLS_254.slots;
if (__VLS_ctx.showCricketModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent text-center mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted text-center mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.cricketChoiceName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between space-x-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-accent mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    (__VLS_ctx.cricketChoiceName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cricket-icon" },
        ...{ class: ({ 'cricket-fight': __VLS_ctx.cricketPhase === 'fighting' }) },
    });
    /** @type {__VLS_StyleScopedClasses['cricket-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['cricket-fight']} */ ;
    let __VLS_257;
    /** @ts-ignore @type { | typeof __VLS_components.Bug} */
    Bug;
    // @ts-ignore
    const __VLS_258 = __VLS_asFunctionalComponent1(__VLS_257, new __VLS_257({
        size: (24),
        ...{ class: "text-accent" },
    }));
    const __VLS_259 = __VLS_258({
        size: (24),
        ...{ class: "text-accent" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_258));
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-1 h-1.5 bg-panel rounded-full overflow-hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full transition-all duration-500" },
        ...{ class: (__VLS_ctx.cricketPhase === 'fighting'
                ? 'bg-accent/40'
                : __VLS_ctx.cricketAnimResult && __VLS_ctx.cricketAnimResult.won
                    ? 'bg-success'
                    : __VLS_ctx.cricketAnimResult && __VLS_ctx.cricketAnimResult.draw
                        ? 'bg-accent'
                        : 'bg-danger') },
        ...{ style: ({
                width: __VLS_ctx.cricketPhase === 'fighting'
                    ? (__VLS_ctx.cricketDisplayPower[0] ?? 5) * 10 + '%'
                    : (__VLS_ctx.cricketAnimResult?.playerPower ?? 0) * 10 + '%'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    /** @type {__VLS_StyleScopedClasses['duration-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mt-0.5" },
        ...{ class: (__VLS_ctx.cricketPhase === 'fighting' ? 'text-muted/40' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.cricketPhase === 'fighting' ? '?' : __VLS_ctx.cricketAnimResult?.playerPower);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted/40" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-danger mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-danger/20 rounded-xs p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-danger/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cricket-icon" },
        ...{ class: ({ 'cricket-fight': __VLS_ctx.cricketPhase === 'fighting' }) },
    });
    /** @type {__VLS_StyleScopedClasses['cricket-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['cricket-fight']} */ ;
    let __VLS_262;
    /** @ts-ignore @type { | typeof __VLS_components.Bug} */
    Bug;
    // @ts-ignore
    const __VLS_263 = __VLS_asFunctionalComponent1(__VLS_262, new __VLS_262({
        size: (24),
        ...{ class: "text-danger -scale-x-100" },
    }));
    const __VLS_264 = __VLS_263({
        size: (24),
        ...{ class: "text-danger -scale-x-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_263));
    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
    /** @type {__VLS_StyleScopedClasses['-scale-x-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-1 h-1.5 bg-panel rounded-full overflow-hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "h-full transition-all duration-500" },
        ...{ class: (__VLS_ctx.cricketPhase === 'fighting'
                ? 'bg-danger/40'
                : __VLS_ctx.cricketAnimResult && !__VLS_ctx.cricketAnimResult.won && !__VLS_ctx.cricketAnimResult.draw
                    ? 'bg-success'
                    : __VLS_ctx.cricketAnimResult && __VLS_ctx.cricketAnimResult.draw
                        ? 'bg-accent'
                        : 'bg-danger') },
        ...{ style: ({
                width: __VLS_ctx.cricketPhase === 'fighting'
                    ? (__VLS_ctx.cricketDisplayPower[1] ?? 5) * 10 + '%'
                    : (__VLS_ctx.cricketAnimResult?.opponentPower ?? 0) * 10 + '%'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    /** @type {__VLS_StyleScopedClasses['duration-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs mt-0.5" },
        ...{ class: (__VLS_ctx.cricketPhase === 'fighting' ? 'text-muted/40' : 'text-danger') },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    (__VLS_ctx.cricketPhase === 'fighting' ? '?' : __VLS_ctx.cricketAnimResult?.opponentPower);
    if (__VLS_ctx.cricketPhase === 'fighting') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/40 text-center mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    }
    if (__VLS_ctx.cricketPhase === 'done' && __VLS_ctx.cricketAnimResult) {
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
            ...{ class: (__VLS_ctx.cricketAnimResult.won ? 'text-success' : __VLS_ctx.cricketAnimResult.draw ? 'text-accent' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_ctx.cricketAnimResult.won ? '大获全胜！' : __VLS_ctx.cricketAnimResult.draw ? '势均力敌' : '败下阵来…');
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-0.5" },
            ...{ class: (__VLS_ctx.cricketAnimResult.won ? 'text-success' : __VLS_ctx.cricketAnimResult.draw ? 'text-muted' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.cricketAnimResult.won
            ? '+' + __VLS_ctx.cricketAnimResult.winnings + '文'
            : __VLS_ctx.cricketAnimResult.draw
                ? '退还' + __VLS_ctx.CRICKET_BET_AMOUNT + '文'
                : '-' + __VLS_ctx.CRICKET_BET_AMOUNT + '文');
        const __VLS_267 = Button || Button;
        // @ts-ignore
        const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_269 = __VLS_268({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_268));
        let __VLS_272;
        const __VLS_273 = {
            /** @type {typeof __VLS_272.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCricketModal))
                    throw 0;
                if (!(__VLS_ctx.cricketPhase === 'done' && __VLS_ctx.cricketAnimResult))
                    throw 0;
                return __VLS_ctx.showCricketModal = false;
                // @ts-ignore
                [CRICKET_BET_AMOUNT, CRICKET_BET_AMOUNT, showCricketModal, showCricketModal, cricketChoiceName, cricketChoiceName, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketPhase, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketAnimResult, cricketDisplayPower, cricketDisplayPower,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_274 } = __VLS_270.slots;
        // @ts-ignore
        [];
        var __VLS_270;
        var __VLS_271;
    }
}
// @ts-ignore
[];
var __VLS_254;
let __VLS_275;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({
    name: "panel-fade",
}));
const __VLS_277 = __VLS_276({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_276));
const { default: __VLS_280 } = __VLS_278.slots;
if (__VLS_ctx.showCardModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent text-center mb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted text-center mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    (__VLS_ctx.cardPick + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center space-x-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [i] of __VLS_vFor((__VLS_ctx.CARD_TOTAL))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "card-tile" },
            ...{ class: ({
                    'card-flipping': __VLS_ctx.cardPhase === 'flipping' && __VLS_ctx.cardFlipIndex === i - 1,
                    'card-treasure': __VLS_ctx.cardPhase === 'done' && __VLS_ctx.cardAnimResult && __VLS_ctx.cardAnimResult.treasures.includes(i - 1),
                    'card-empty': __VLS_ctx.cardPhase === 'done' && __VLS_ctx.cardAnimResult && !__VLS_ctx.cardAnimResult.treasures.includes(i - 1),
                    'card-picked': __VLS_ctx.cardPick === i - 1
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['card-tile']} */ ;
        /** @type {__VLS_StyleScopedClasses['card-flipping']} */ ;
        /** @type {__VLS_StyleScopedClasses['card-treasure']} */ ;
        /** @type {__VLS_StyleScopedClasses['card-empty']} */ ;
        /** @type {__VLS_StyleScopedClasses['card-picked']} */ ;
        if (__VLS_ctx.cardPhase === 'done' && __VLS_ctx.cardAnimResult) {
            if (__VLS_ctx.cardAnimResult.treasures.includes(i - 1)) {
                let __VLS_281;
                /** @ts-ignore @type { | typeof __VLS_components.Gem} */
                Gem;
                // @ts-ignore
                const __VLS_282 = __VLS_asFunctionalComponent1(__VLS_281, new __VLS_281({
                    size: (16),
                    ...{ class: "text-success" },
                }));
                const __VLS_283 = __VLS_282({
                    size: (16),
                    ...{ class: "text-success" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_282));
                /** @type {__VLS_StyleScopedClasses['text-success']} */ ;
            }
            else {
                let __VLS_286;
                /** @ts-ignore @type { | typeof __VLS_components.X} */
                X;
                // @ts-ignore
                const __VLS_287 = __VLS_asFunctionalComponent1(__VLS_286, new __VLS_286({
                    size: (14),
                    ...{ class: "text-muted/30" },
                }));
                const __VLS_288 = __VLS_287({
                    size: (14),
                    ...{ class: "text-muted/30" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_287));
                /** @type {__VLS_StyleScopedClasses['text-muted/30']} */ ;
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm" },
                ...{ class: (__VLS_ctx.cardPhase === 'flipping' && __VLS_ctx.cardFlipIndex === i - 1 ? 'text-accent' : 'text-muted/30') },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-0.5" },
            ...{ class: (__VLS_ctx.cardPick === i - 1 ? 'text-accent' : 'text-muted/30') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (i);
        // @ts-ignore
        [CARD_TOTAL, showCardModal, cardPick, cardPick, cardPick, cardPhase, cardPhase, cardPhase, cardPhase, cardPhase, cardFlipIndex, cardFlipIndex, cardAnimResult, cardAnimResult, cardAnimResult, cardAnimResult, cardAnimResult, cardAnimResult,];
    }
    if (__VLS_ctx.cardPhase === 'flipping') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted/40 text-center mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    }
    if (__VLS_ctx.cardPhase === 'done' && __VLS_ctx.cardAnimResult) {
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
            ...{ class: (__VLS_ctx.cardAnimResult.won ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_ctx.cardAnimResult.won ? '翻到宝了！' : '空牌…');
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs mt-0.5" },
            ...{ class: (__VLS_ctx.cardAnimResult.won ? 'text-success' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.cardAnimResult.won ? '+' + __VLS_ctx.cardAnimResult.winnings + '文' : '-' + __VLS_ctx.CARD_BET_AMOUNT + '文');
        const __VLS_291 = Button || Button;
        // @ts-ignore
        const __VLS_292 = __VLS_asFunctionalComponent1(__VLS_291, new __VLS_291({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }));
        const __VLS_293 = __VLS_292({
            ...{ 'onClick': {} },
            ...{ class: "w-full justify-center" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_292));
        let __VLS_296;
        const __VLS_297 = {
            /** @type {typeof __VLS_296.click} */
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCardModal))
                    throw 0;
                if (!(__VLS_ctx.cardPhase === 'done' && __VLS_ctx.cardAnimResult))
                    throw 0;
                return __VLS_ctx.showCardModal = false;
                // @ts-ignore
                [CARD_BET_AMOUNT, showCardModal, cardPhase, cardPhase, cardAnimResult, cardAnimResult, cardAnimResult, cardAnimResult, cardAnimResult, cardAnimResult,];
            },
        };
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        const { default: __VLS_298 } = __VLS_294.slots;
        // @ts-ignore
        [];
        var __VLS_294;
        var __VLS_295;
    }
}
// @ts-ignore
[];
var __VLS_278;
let __VLS_299;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_300 = __VLS_asFunctionalComponent1(__VLS_299, new __VLS_299({
    name: "panel-fade",
}));
const __VLS_301 = __VLS_300({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_300));
const { default: __VLS_304 } = __VLS_302.slots;
if (__VLS_ctx.showTexasModal && __VLS_ctx.texasSetup) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    const __VLS_305 = TexasHoldemGame;
    // @ts-ignore
    const __VLS_306 = __VLS_asFunctionalComponent1(__VLS_305, new __VLS_305({
        ...{ 'onComplete': {} },
        setup: (__VLS_ctx.texasSetup),
    }));
    const __VLS_307 = __VLS_306({
        ...{ 'onComplete': {} },
        setup: (__VLS_ctx.texasSetup),
    }, ...__VLS_functionalComponentArgsRest(__VLS_306));
    let __VLS_310;
    const __VLS_311 = {
        /** @type {typeof __VLS_310.complete} */
        onComplete: (__VLS_ctx.handleTexasComplete),
    };
    var __VLS_308;
    var __VLS_309;
}
// @ts-ignore
[showTexasModal, texasSetup, texasSetup, handleTexasComplete,];
var __VLS_302;
let __VLS_312;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent1(__VLS_312, new __VLS_312({
    name: "panel-fade",
}));
const __VLS_314 = __VLS_313({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
const { default: __VLS_317 } = __VLS_315.slots;
if (__VLS_ctx.showBuckshotModal && __VLS_ctx.buckshotSetup) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    const __VLS_318 = BuckshotRouletteGame;
    // @ts-ignore
    const __VLS_319 = __VLS_asFunctionalComponent1(__VLS_318, new __VLS_318({
        ...{ 'onComplete': {} },
        setup: (__VLS_ctx.buckshotSetup),
    }));
    const __VLS_320 = __VLS_319({
        ...{ 'onComplete': {} },
        setup: (__VLS_ctx.buckshotSetup),
    }, ...__VLS_functionalComponentArgsRest(__VLS_319));
    let __VLS_323;
    const __VLS_324 = {
        /** @type {typeof __VLS_323.complete} */
        onComplete: (__VLS_ctx.handleBuckshotComplete),
    };
    var __VLS_321;
    var __VLS_322;
}
// @ts-ignore
[showBuckshotModal, buckshotSetup, buckshotSetup, handleBuckshotComplete,];
var __VLS_315;
let __VLS_325;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent1(__VLS_325, new __VLS_325({
    name: "panel-fade",
}));
const __VLS_327 = __VLS_326({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_326));
const { default: __VLS_330 } = __VLS_328.slots;
if (__VLS_ctx.showTradeAddModal && !__VLS_ctx.tradeSelectedItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showTradeAddModal && !__VLS_ctx.tradeSelectedItem))
                    throw 0;
                return __VLS_ctx.showTradeAddModal = false;
                // @ts-ignore
                [showTradeAddModal, showTradeAddModal, tradeSelectedItem,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showTradeAddModal && !__VLS_ctx.tradeSelectedItem))
                    throw 0;
                return __VLS_ctx.showTradeAddModal = false;
                // @ts-ignore
                [showTradeAddModal,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_331;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_332 = __VLS_asFunctionalComponent1(__VLS_331, new __VLS_331({
        size: (14),
    }));
    const __VLS_333 = __VLS_332({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_332));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col space-y-1 max-h-60 overflow-y-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    for (const [inv] of __VLS_vFor((__VLS_ctx.sellableItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showTradeAddModal && !__VLS_ctx.tradeSelectedItem))
                        throw 0;
                    return __VLS_ctx.selectTradeItem(inv);
                    // @ts-ignore
                    [sellableItems, selectTradeItem,];
                } },
            key: (inv.id + '-' + inv.quality),
            ...{ class: "flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent/5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1 min-w-0" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (inv.name);
        if (inv.quality !== 'normal') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] ml-1" },
                ...{ class: (__VLS_ctx.qualityColor(inv.quality)) },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
            (__VLS_ctx.qualityLabel(inv.quality));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-muted ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (inv.quantity);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-accent shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        (__VLS_ctx.calcPreviewPoints(inv));
        // @ts-ignore
        [qualityLabel, qualityColor, calcPreviewPoints,];
    }
    if (__VLS_ctx.sellableItems.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-muted text-center py-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    }
}
// @ts-ignore
[sellableItems,];
var __VLS_328;
let __VLS_336;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent1(__VLS_336, new __VLS_336({
    name: "panel-fade",
}));
const __VLS_338 = __VLS_337({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
const { default: __VLS_341 } = __VLS_339.slots;
if (__VLS_ctx.tradeSelectedItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.tradeSelectedItem))
                    throw 0;
                return __VLS_ctx.tradeSelectedItem = null;
                // @ts-ignore
                [tradeSelectedItem, tradeSelectedItem,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.tradeSelectedItem))
                    throw 0;
                return __VLS_ctx.tradeSelectedItem = null;
                // @ts-ignore
                [tradeSelectedItem,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_342;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_343 = __VLS_asFunctionalComponent1(__VLS_342, new __VLS_342({
        size: (14),
    }));
    const __VLS_344 = __VLS_343({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_343));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.tradeSelectedItem.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
        ...{ class: (__VLS_ctx.qualityColor(__VLS_ctx.tradeSelectedItem.quality)) },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.qualityLabel(__VLS_ctx.tradeSelectedItem.quality));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.tradeSelectedItem.quantity);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.hanhaiStore.tradeShopConfig.sellDays);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mb-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    const __VLS_347 = Button || Button;
    // @ts-ignore
    const __VLS_348 = __VLS_asFunctionalComponent1(__VLS_347, new __VLS_347({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.tradeQuantity <= 1),
    }));
    const __VLS_349 = __VLS_348({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.tradeQuantity <= 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_348));
    let __VLS_352;
    const __VLS_353 = {
        /** @type {typeof __VLS_352.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.tradeSelectedItem))
                throw 0;
            return __VLS_ctx.tradeQuantity--;
            // @ts-ignore
            [hanhaiStore, qualityLabel, tradeSelectedItem, tradeSelectedItem, tradeSelectedItem, tradeSelectedItem, qualityColor, tradeQuantity, tradeQuantity,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_354 } = __VLS_350.slots;
    // @ts-ignore
    [];
    var __VLS_350;
    var __VLS_351;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onTradeQuantityInput) },
        type: "number",
        value: (__VLS_ctx.tradeQuantity),
        min: "1",
        max: (__VLS_ctx.tradeSelectedItem.quantity),
        ...{ class: "w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors" },
    });
    /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['outline-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:border-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    const __VLS_355 = Button || Button;
    // @ts-ignore
    const __VLS_356 = __VLS_asFunctionalComponent1(__VLS_355, new __VLS_355({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.tradeQuantity >= __VLS_ctx.tradeSelectedItem.quantity),
    }));
    const __VLS_357 = __VLS_356({
        ...{ 'onClick': {} },
        ...{ class: "h-6 px-1.5 py-0.5 text-xs justify-center" },
        disabled: (__VLS_ctx.tradeQuantity >= __VLS_ctx.tradeSelectedItem.quantity),
    }, ...__VLS_functionalComponentArgsRest(__VLS_356));
    let __VLS_360;
    const __VLS_361 = {
        /** @type {typeof __VLS_360.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.tradeSelectedItem))
                throw 0;
            return __VLS_ctx.tradeQuantity++;
            // @ts-ignore
            [tradeSelectedItem, tradeSelectedItem, tradeQuantity, tradeQuantity, tradeQuantity, onTradeQuantityInput,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['h-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_362 } = __VLS_358.slots;
    // @ts-ignore
    [];
    var __VLS_358;
    var __VLS_359;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex space-x-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-1']} */ ;
    const __VLS_363 = Button || Button;
    // @ts-ignore
    const __VLS_364 = __VLS_asFunctionalComponent1(__VLS_363, new __VLS_363({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.tradeQuantity <= 1),
    }));
    const __VLS_365 = __VLS_364({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.tradeQuantity <= 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_364));
    let __VLS_368;
    const __VLS_369 = {
        /** @type {typeof __VLS_368.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.tradeSelectedItem))
                throw 0;
            return __VLS_ctx.tradeQuantity = 1;
            // @ts-ignore
            [tradeQuantity, tradeQuantity,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_370 } = __VLS_366.slots;
    // @ts-ignore
    [];
    var __VLS_366;
    var __VLS_367;
    const __VLS_371 = Button || Button;
    // @ts-ignore
    const __VLS_372 = __VLS_asFunctionalComponent1(__VLS_371, new __VLS_371({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.tradeQuantity >= __VLS_ctx.tradeSelectedItem.quantity),
    }));
    const __VLS_373 = __VLS_372({
        ...{ 'onClick': {} },
        ...{ class: "flex-1 justify-center" },
        disabled: (__VLS_ctx.tradeQuantity >= __VLS_ctx.tradeSelectedItem.quantity),
    }, ...__VLS_functionalComponentArgsRest(__VLS_372));
    let __VLS_376;
    const __VLS_377 = {
        /** @type {typeof __VLS_376.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.tradeSelectedItem))
                throw 0;
            return __VLS_ctx.tradeQuantity = __VLS_ctx.tradeSelectedItem.quantity;
            // @ts-ignore
            [tradeSelectedItem, tradeSelectedItem, tradeQuantity, tradeQuantity,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    const { default: __VLS_378 } = __VLS_374.slots;
    // @ts-ignore
    [];
    var __VLS_374;
    var __VLS_375;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mt-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.tradePreviewPoints);
    const __VLS_379 = Button || Button;
    // @ts-ignore
    const __VLS_380 = __VLS_asFunctionalComponent1(__VLS_379, new __VLS_379({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
    }));
    const __VLS_381 = __VLS_380({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_380));
    let __VLS_384;
    const __VLS_385 = {
        /** @type {typeof __VLS_384.click} */
        onClick: (__VLS_ctx.handleConfirmTradeSlot),
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_386 } = __VLS_382.slots;
    (__VLS_ctx.tradeQuantity);
    // @ts-ignore
    [tradeQuantity, tradePreviewPoints, handleConfirmTradeSlot,];
    var __VLS_382;
    var __VLS_383;
}
// @ts-ignore
[];
var __VLS_339;
let __VLS_387;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_388 = __VLS_asFunctionalComponent1(__VLS_387, new __VLS_387({
    name: "panel-fade",
}));
const __VLS_389 = __VLS_388({
    name: "panel-fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_388));
const { default: __VLS_392 } = __VLS_390.slots;
if (__VLS_ctx.exchangeModalItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.exchangeModalItem))
                    throw 0;
                return __VLS_ctx.exchangeModalItem = null;
                // @ts-ignore
                [exchangeModalItem, exchangeModalItem,];
            } },
        ...{ class: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "game-panel max-w-xs w-full relative" },
    });
    /** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.exchangeModalItem))
                    throw 0;
                return __VLS_ctx.exchangeModalItem = null;
                // @ts-ignore
                [exchangeModalItem,];
            } },
        ...{ class: "absolute top-2 right-2 text-muted hover:text-text" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text']} */ ;
    let __VLS_393;
    /** @ts-ignore @type { | typeof __VLS_components.X} */
    X;
    // @ts-ignore
    const __VLS_394 = __VLS_asFunctionalComponent1(__VLS_393, new __VLS_393({
        size: (14),
    }));
    const __VLS_395 = __VLS_394({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_394));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-accent mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.exchangeModalItem.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    (__VLS_ctx.exchangeModalItem.description);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/10 rounded-xs p-2 mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.exchangeModalItem.pointsCost);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center justify-between mt-0.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.hanhaiStore.tradePoints);
    if (__VLS_ctx.exchangeModalItem.weeklyLimit) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getExchangeWeeklyRemaining(__VLS_ctx.exchangeModalItem));
    }
    if (__VLS_ctx.exchangeModalItem.totalLimit) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs" },
            ...{ class: (__VLS_ctx.getExchangeTotalRemaining(__VLS_ctx.exchangeModalItem) > 0 ? '' : 'text-danger') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getExchangeTotalRemaining(__VLS_ctx.exchangeModalItem));
    }
    const __VLS_398 = Button || Button;
    // @ts-ignore
    const __VLS_399 = __VLS_asFunctionalComponent1(__VLS_398, new __VLS_398({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
        disabled: (!__VLS_ctx.canExchange(__VLS_ctx.exchangeModalItem)),
    }));
    const __VLS_400 = __VLS_399({
        ...{ 'onClick': {} },
        ...{ class: "w-full justify-center !bg-accent !text-bg" },
        disabled: (!__VLS_ctx.canExchange(__VLS_ctx.exchangeModalItem)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_399));
    let __VLS_403;
    const __VLS_404 = {
        /** @type {typeof __VLS_403.click} */
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.exchangeModalItem))
                throw 0;
            return __VLS_ctx.handleExchange(__VLS_ctx.exchangeModalItem.itemId);
            // @ts-ignore
            [hanhaiStore, exchangeModalItem, exchangeModalItem, exchangeModalItem, exchangeModalItem, exchangeModalItem, exchangeModalItem, exchangeModalItem, exchangeModalItem, exchangeModalItem, exchangeModalItem, getExchangeWeeklyRemaining, getExchangeTotalRemaining, getExchangeTotalRemaining, canExchange, handleExchange,];
        },
    };
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['!bg-accent']} */ ;
    /** @type {__VLS_StyleScopedClasses['!text-bg']} */ ;
    const { default: __VLS_405 } = __VLS_401.slots;
    (__VLS_ctx.canExchange(__VLS_ctx.exchangeModalItem) ? '兑换' : '无法兑换');
    // @ts-ignore
    [exchangeModalItem, canExchange,];
    var __VLS_401;
    var __VLS_402;
}
// @ts-ignore
[];
var __VLS_390;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
